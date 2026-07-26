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

const FLOW_SIZE = 220;

function makeFlowTarget() {
  return new WebGLRenderTarget(FLOW_SIZE, FLOW_SIZE, {
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
    document.fonts?.ready.then(render);

    return () => {
      alive = false;
    };
  }, [textCanvas, textTexture, size.width, size.height, dpr]);

  useEffect(() => () => textTexture.dispose(), [textTexture]);

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
    prime: true,
    clientX: 0,
    clientY: 0,
    seen: false,
    read: passes.read,
    write: passes.write,
  });

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

    s.intro = Math.min(1, s.intro + step / 1.2);
    const introEased = 1 - Math.pow(1 - s.intro, 3);
    passes.displayMaterial.uniforms.uIntro.value = introEased;

    const rect = renderer.domElement.getBoundingClientRect();
    const px = rect.width ? (s.clientX - rect.left) / rect.width : 0.5;
    const py = rect.height ? 1 - (s.clientY - rect.top) / rect.height : 0.5;
    let dx = px - s.last.x;
    let dy = py - s.last.y;
    s.last.set(px, py);

    if (s.prime && s.seen) {
      s.prime = false;
      dx = 0;
      dy = 0;
    }

    const gain = 6;
    s.velocity.x += (dx * gain - s.velocity.x) * Math.min(1, step * 12);
    s.velocity.y += (dy * gain - s.velocity.y) * Math.min(1, step * 12);
    const speed = s.velocity.length();
    if (speed > 1.6) s.velocity.multiplyScalar(1.6 / speed);

    passes.stampMaterial.uniforms.uMouse.value.set(px, py);
    passes.stampMaterial.uniforms.uVelocity.value.copy(s.velocity);
    passes.stampMaterial.uniforms.uAspect.value = size.width / size.height;

    passes.stampMaterial.uniforms.tFlow.value = s.read.texture;
    renderer.setRenderTarget(s.write);
    renderer.render(passes.stampScene, passes.camera);

    const swap = s.read;
    s.read = s.write;
    s.write = swap;

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
      camera={{ position: [0, 0, 1] }}
    >
      <FlowRenderer />
    </Canvas>
  );
}

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
