"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderTarget,
} from "three";

import { prefersReducedMotion } from "@/lib/gsap";
import { canUseWebGL } from "@/lib/webgl";
import { SplitText } from "@/components/Reveal";
import { TextRipple } from "@/components/effects/TextRipple";
import {
  DisplayMaterial,
  StampMaterial,
  drawName,
} from "@/components/hero/flowmap";

/**
 * The hero headline, with a mouse-flowmap deformation.
 *
 * Gated exactly like the other scenes: only a wide viewport with a fine pointer,
 * real WebGL, and motion allowed gets the effect. Everything else — touch, no
 * WebGL, reduced motion, and the first server render — gets the original
 * animated headline, so the name is always present and legible.
 */

/** Resolution of the flowmap buffers. Low on purpose: it is a velocity field, */
const FLOW_SIZE = 220;

function makeFlowTarget() {
  return new WebGLRenderTarget(FLOW_SIZE, FLOW_SIZE, {
    // Velocity is signed, so the field cannot be stored in unsigned bytes.
    type: HalfFloatType,
    magFilter: LinearFilter,
    minFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

function FlowRenderer() {
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const dpr = useThree((state) => state.viewport.dpr);

  // The name, drawn to a canvas and kept as a texture. Redrawn on resize so it
  // stays crisp; the font family is read from the page so it always matches the
  // CSS headline, and the draw is deferred until the font has actually loaded.
  const textCanvas = useMemo(() => document.createElement("canvas"), []);
  const textTexture = useMemo(() => {
    const texture = new CanvasTexture(textCanvas);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }, [textCanvas]);

  useEffect(() => {
    let alive = true;
    const family =
      getComputedStyle(document.body).getPropertyValue("--font-display") ||
      "serif";

    const render = () => {
      if (!alive) return;
      drawName(textCanvas, size.width, size.height, dpr, family);
      textTexture.needsUpdate = true;
    };

    render();
    // Redraw once the webfont resolves, or the first paint is a fallback face.
    document.fonts?.ready.then(render);

    return () => {
      alive = false;
    };
  }, [textCanvas, textTexture, size.width, size.height, dpr]);

  useEffect(() => () => textTexture.dispose(), [textTexture]);

  // Ping-pong flow buffers and the two fullscreen passes that drive them.
  const passes = useMemo(() => {
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new PlaneGeometry(2, 2);

    const stampMaterial = new StampMaterial();
    const stampScene = new Scene();
    stampScene.add(new Mesh(quad, stampMaterial));

    const displayMaterial = new DisplayMaterial({ text: textTexture });
    const displayScene = new Scene();
    displayScene.add(new Mesh(quad, displayMaterial));

    return {
      camera,
      quad,
      stampMaterial,
      stampScene,
      displayMaterial,
      displayScene,
      read: makeFlowTarget(),
      write: makeFlowTarget(),
    };
  }, [textTexture]);

  // Clear both buffers to zero, so nothing is displaced before the first stamp.
  useEffect(() => {
    const previous = gl.getRenderTarget();
    for (const target of [passes.read, passes.write]) {
      gl.setRenderTarget(target);
      gl.clear();
    }
    gl.setRenderTarget(previous);
  }, [gl, passes]);

  useEffect(
    () => () => {
      passes.read.dispose();
      passes.write.dispose();
      passes.quad.dispose();
      passes.stampMaterial.dispose();
      passes.displayMaterial.dispose();
    },
    [passes]
  );

  const state = useRef({
    last: new Vector2(0.5, 0.5),
    velocity: new Vector2(0, 0),
    intro: 0,
    // The pointer's first reported position after being idle is a jump, not
    // movement; this skips one frame of velocity whenever tracking resumes.
    prime: true,
    // Latest pointer position in client pixels, and whether it has been seen.
    clientX: 0,
    clientY: 0,
    seen: false,
    read: passes.read,
    write: passes.write,
  });

  // Pointer tracked on the window rather than through the canvas's own event
  // system: the flow canvas is a small overlay, and depending on it to receive
  // every move is what left the field empty. Mapping window coordinates to the
  // canvas rect each frame is what TextRipple does, and it never misses a move.
  useEffect(() => {
    const s = state.current;
    const onMove = (event: PointerEvent) => {
      s.clientX = event.clientX;
      s.clientY = event.clientY;
      s.seen = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(({ gl: renderer }, delta) => {
    const s = state.current;
    const step = Math.min(delta, 0.05);

    // Intro ramp, eased.
    s.intro = Math.min(1, s.intro + step / 1.2);
    const introEased = 1 - Math.pow(1 - s.intro, 3);
    passes.displayMaterial.uniforms.uIntro.value = introEased;

    // Pointer velocity in UV space, mapped from window coordinates to the
    // canvas box. UV y is flipped so it rises with the pointer.
    const rect = renderer.domElement.getBoundingClientRect();
    const px = rect.width ? (s.clientX - rect.left) / rect.width : 0.5;
    const py = rect.height ? 1 - (s.clientY - rect.top) / rect.height : 0.5;
    let dx = px - s.last.x;
    let dy = py - s.last.y;
    s.last.set(px, py);

    if (s.prime && s.seen) {
      // First real reading: adopt the position without counting the jump.
      s.prime = false;
      dx = 0;
      dy = 0;
    }

    // Smooth toward the current movement, and clamp so a fast flick still reads
    // as a streak rather than a tear. Idle frames pull it back to zero.
    const gain = 6;
    s.velocity.x += (dx * gain - s.velocity.x) * Math.min(1, step * 12);
    s.velocity.y += (dy * gain - s.velocity.y) * Math.min(1, step * 12);
    const speed = s.velocity.length();
    if (speed > 1.6) s.velocity.multiplyScalar(1.6 / speed);

    passes.stampMaterial.uniforms.uMouse.value.set(px, py);
    passes.stampMaterial.uniforms.uVelocity.value.copy(s.velocity);
    passes.stampMaterial.uniforms.uAspect.value = size.width / size.height;

    // Stamp pass: previous field in, new field out, then swap.
    passes.stampMaterial.uniforms.tFlow.value = s.read.texture;
    renderer.setRenderTarget(s.write);
    renderer.render(passes.stampScene, passes.camera);

    const swap = s.read;
    s.read = s.write;
    s.write = swap;

    // Display pass: the text, dragged along the fresh field, to the canvas.
    passes.displayMaterial.uniforms.tFlow.value = s.read.texture;
    renderer.setRenderTarget(null);
    renderer.render(passes.displayScene, passes.camera);
  }, 1);

  return null;
}

const FlowCanvas = dynamic(() => Promise.resolve(FlowCanvasImpl), {
  ssr: false,
});

function FlowCanvasImpl() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        powerPreference: "high-performance",
      }}
      style={{ background: "transparent" }}
      // No camera work: every pass uses its own orthographic camera.
      camera={{ position: [0, 0, 1] }}
    >
      <FlowRenderer />
    </Canvas>
  );
}

/** The effect version: transparent real text for layout and screen readers, */
function FlowName() {
  return (
    <h1 className="display relative isolate" aria-label="Advay Sanketi">
      <span aria-hidden className="block text-transparent">
        Advay
      </span>
      <span aria-hidden className="block pl-[6vw] italic text-transparent">
        Sanketi
      </span>
      <span aria-hidden className="absolute inset-0 block">
        <FlowCanvas />
      </span>
    </h1>
  );
}

/** The fallback: the original masked word reveal, under a soft cursor ripple. */
function FallbackName() {
  return (
    <TextRipple>
      <h1 className="display">
        <SplitText
          as="span"
          text="Advay"
          className="block"
          trigger="preload"
          delay={0.15}
        />
        <SplitText
          as="span"
          text="Sanketi"
          className="block pl-[6vw] italic"
          trigger="preload"
          delay={0.28}
        />
      </h1>
    </TextRipple>
  );
}

export function HeroName() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(
      window.matchMedia("(min-width: 768px) and (pointer: fine)").matches &&
        !prefersReducedMotion() &&
        canUseWebGL()
    );
  }, []);

  return enabled ? <FlowName /> : <FallbackName />;
}
