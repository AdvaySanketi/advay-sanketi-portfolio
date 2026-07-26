"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  NormalBlending,
  Vector3,
  type Points,
  type ShaderMaterial,
} from "three";

import { PARTICLE_COUNT, buildReel } from "@/components/hero/scenes";

/**
 * A looping reel drawn as 18,000 particles.
 *
 * On load the particles fly in from a loose shell and settle into the first
 * scene; from there the reel holds each scene, then dissolves it into the next.
 * Moving the cursor across it drops coloured ripples that travel out through
 * the field and fade, leaving the scene as they found it.
 *
 * All motion is in the vertex shader. A scene pair lives in two static
 * attributes and the transition is one uniform sliding 0 → 1, so a morph costs
 * no per-frame CPU work — only the swap at the end of one, which copies the
 * next scene's buffers in.
 */

const VERTEX = /* glsl */ `
  #define RIPPLES 8

  uniform float uTime;
  uniform float uProgress;
  uniform float uMorph;
  uniform vec3  uRipple[RIPPLES];
  uniform float uRippleAge[RIPPLES];
  uniform float uReach;
  uniform float uSize;
  uniform float uPixelRatio;

  attribute vec3  aTo;
  attribute vec3  aOrigin;
  attribute float aTone;
  attribute float aToneTo;
  attribute float aSeed;

  varying float vWave;
  varying float vHue;
  varying float vTone;
  varying float vDepth;
  varying float vFlight;

  void main() {
    // Stagger the morph per particle so a scene dissolves in a sweep rather
    // than snapping over as one sheet.
    float m = clamp((uMorph - aSeed * 0.3) / 0.7, 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);

    vec3 pos = mix(position, aTo, m);

    // Bow the path out of the plane at mid-transition — travelling in straight
    // lines reads as a slide, travelling on an arc reads as a swarm.
    float arc = sin(m * 3.14159265);
    pos.z += arc * (0.3 + aSeed * 0.5);
    pos.x += arc * (aSeed - 0.5) * 0.15;
    pos.y += arc * (fract(aSeed * 7.31) - 0.5) * 0.15;

    // Assembly from the shell on first load, staggered the same way.
    float t = clamp((uProgress - aSeed * 0.3) / 0.7, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    pos = mix(aOrigin, pos, t);

    // Idle drift, strongest before the scene has settled.
    float phase = aSeed * 6.2831853;
    float calm = mix(2.2, 1.0, t);
    pos.x += sin(uTime * 0.42 + phase) * 0.009 * calm;
    pos.y += cos(uTime * 0.37 + phase * 1.3) * 0.009 * calm;
    pos.z += sin(uTime * 0.31 + phase * 0.7) * 0.014 * calm;

    // Cursor ripples. Moving the pointer drops expanding rings into the field;
    // each one travels outward, lifts the particles its crest passes through,
    // and carries a colour with it. Nothing is attached to the cursor itself,
    // so there is no hole to bead or smear — the surface is only ever
    // disturbed by a wave in transit, and it settles the moment one has gone by.
    //
    // Each ripple is independent, so the ring buffer they live in needs no
    // ordering: age alone decides how far a ring has travelled and how much of
    // it is left.
    float wave = 0.0;
    float hue = 0.0;

    for (int i = 0; i < RIPPLES; i++) {
      float age = uRippleAge[i];
      if (age >= 1.0) continue;

      vec2 delta = pos.xy - uRipple[i].xy;
      float dist = length(delta);

      // The crest travels out at a constant rate and the band widens as it
      // goes, the way a real wavefront loses definition with distance.
      // Squared by multiplication, not pow(): pow() is undefined for a
      // negative base in GLSL, and (dist - crest) is negative for every
      // particle inside the ring — on ANGLE/D3D it returns NaN and the whole
      // cloud vanishes while a ripple is alive.
      float crest = age * uReach;
      float width = mix(0.05, 0.18, age);
      float off = (dist - crest) / width;
      float band = exp(-off * off);

      // Amplitude falls off with age, so a ring dies out rather than reaching
      // the edge of the scene at full strength.
      float fade = 1.0 - age;
      float amp = band * fade * fade * t;

      // Push out along the wavefront and lift toward the camera: the lift is
      // what makes the crest legible from straight on, where an in-plane
      // displacement alone would only read as thinning. Kept gentle — the
      // ring should read as a wash passing through, not shove the scene out
      // of shape.
      pos.xy += normalize(delta + 0.0001) * amp * 0.075;
      pos.z += amp * 0.2;

      // Strongest ring wins the colour, rather than blending several — mixed
      // hues average out to grey, which is the one thing this must not do.
      if (amp > wave) {
        wave = amp;
        hue = uRipple[i].z;
      }
    }

    vWave = wave;
    vHue = hue;
    vTone = mix(aTone, aToneTo, m);
    vFlight = arc;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vDepth = clamp((-mvPosition.z - 3.0) / 4.0, 0.0, 1.0);

    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize =
      uSize * uPixelRatio * (0.7 + vTone * 0.7) * (1.0 + wave * 0.7) *
      (1.0 / -mvPosition.z);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;

  varying float vWave;
  varying float vHue;
  varying float vTone;
  varying float vDepth;
  varying float vFlight;

  vec3 hue2rgb(float h) {
    return clamp(
      abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0,
      0.0,
      1.0
    );
  }

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.08, d);
    if (alpha < 0.01) discard;

    // Duotone: the densest parts of a scene pick up the accent, so the form has
    // depth without adding a second hue to the page.
    vec3 color = mix(uColor, uAccent, vTone * 0.3);
    color = mix(color, uAccent, vFlight * 0.45);

    // Colour arrives with the wave and leaves with it. Held back from full
    // saturation and eased in on the crest, so the page picks up a passing
    // wash rather than a permanent second palette.
    float crest = clamp(vWave * 1.4, 0.0, 1.0);
    color = mix(color, hue2rgb(vHue), crest * 0.8);

    // Density carries the form. The floor is high enough that the sparse areas
    // are still clearly present rather than fading out against the paper.
    alpha *= mix(0.34, 1.0, vTone);
    alpha *= mix(1.0, 0.62, vDepth);

    // Particles in flight thin out, so a transition never reads as heavier than
    // the scenes on either side of it.
    alpha *= mix(1.0, 0.55, vFlight);

    // The crest also lifts the sparse particles, so the ring reads as a band of
    // light passing through rather than only a change of colour.
    alpha = clamp(alpha * (1.0 + crest * 0.9), 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

/** Seconds a scene is held, and seconds spent morphing to the next. */
const HOLD = 2.5;
const MORPH = 1.0;

/**
 * Cursor ripples: how many can be in flight at once, how long one lives, how
 * far its crest travels in that time, and how far the pointer must move before
 * the next is dropped.
 *
 * These are in the cloud's normalised space, where the subject spans roughly
 * [-1, 1]: a reach of 1 carries a ring from the centre to the edge. Lifetime
 * and reach together set the wave's speed. Spacing is a distance, not a time,
 * so dragging fast throws more rings than drifting slowly does — the field
 * answers how hard it was disturbed.
 */
const RIPPLES = 8;
const RIPPLE_LIFE = 1.5;
const RIPPLE_REACH = 1.0;
const RIPPLE_SPACING = 0.14;

/** How far the hue advances per ripple, so successive rings differ. */
const RIPPLE_HUE_STEP = 0.17;

/**
 * Fraction of the view the scene is allowed to fill. The remainder is the
 * deliberate empty margin around the object: it lets the reel sit in any canvas
 * shape — the column is portrait now, not 16:9 — and, more importantly, gives
 * a ripple launched near the object's edge somewhere to travel before it would
 * run off the canvas and clip.
 *
 * The subject spans two units (normalised to [-1, 1]); scaling by half the
 * smaller view dimension makes it fill that fraction of the shorter side, so a
 * tall column and a wide one both frame it the same way.
 */
const FIT_MARGIN = 0.8;

function ParticleReel() {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const reel = useMemo(() => buildReel(PARTICLE_COUNT), []);

  /** Index of the scene currently being held, or morphed away from. */
  const sceneRef = useRef(0);
  /** Seconds spent in the current hold; the morph starts when it passes HOLD. */
  const clockRef = useRef(0);
  /** Where the last ripple was dropped, and the hue the next one will carry. */
  const lastDropRef = useRef(new Vector3(999, 999, 0));
  const hueRef = useRef(0);
  /** Current contain-scale of the cloud, so pointer maths can undo it. */
  const fitRef = useRef(1);
  /** Latest pointer position in client pixels, and whether one has been seen. */
  const pointerRef = useRef({ clientX: 0, clientY: 0, seen: false });

  // Pointer tracked on the window rather than through the canvas's own event
  // system — the hero's type columns are full-width layers stacked above this
  // canvas, and a transparent div still hit-tests over its whole box, so the
  // canvas only ever received moves in the gaps between them. Mapping window
  // coordinates to the canvas rect each frame is what NameFlow and TextRipple
  // do, and it never misses a move.
  useEffect(() => {
    const p = pointerRef.current;
    const onMove = (event: PointerEvent) => {
      p.clientX = event.clientX;
      p.clientY = event.clientY;
      p.seen = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  /**
   * Geometry is built imperatively and owned here. Declaring the attributes as
   * JSX would hand them to the reconciler, which rebuilds an attribute whenever
   * its array identity changes — discarding the in-flight morph on any
   * incidental re-render.
   *
   * `position` and `aTone` hold the scene being left; `aTo` and `aToneTo` hold
   * the one being entered. Both pairs are copies, never references into the
   * reel, so the source scenes survive being cycled through repeatedly.
   */
  const geometry = useMemo(() => {
    const first = reel.scenes[0];
    const geo = new BufferGeometry();
    geo.setAttribute(
      "position",
      new BufferAttribute(Float32Array.from(first.positions), 3)
    );
    geo.setAttribute(
      "aTo",
      new BufferAttribute(Float32Array.from(reel.scenes[1].positions), 3)
    );
    geo.setAttribute(
      "aTone",
      new BufferAttribute(Float32Array.from(first.tones), 1)
    );
    geo.setAttribute(
      "aToneTo",
      new BufferAttribute(Float32Array.from(reel.scenes[1].tones), 1)
    );
    geo.setAttribute("aOrigin", new BufferAttribute(reel.origins, 3));
    geo.setAttribute("aSeed", new BufferAttribute(reel.seeds, 1));
    return geo;
  }, [reel]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uMorph: { value: 0 },
      // Origin in xy and hue in z. Ages start past their lifetime, so nothing
      // is disturbed until the pointer has actually moved over the scene.
      uRipple: {
        value: Array.from({ length: RIPPLES }, () => new Vector3()),
      },
      uRippleAge: { value: new Float32Array(RIPPLES).fill(99) },
      uReach: { value: RIPPLE_REACH },
      uSize: { value: 8.5 },
      uPixelRatio: { value: 1 },
      uColor: { value: new Color("#14140f") },
      uAccent: { value: new Color("#3f5b3a") },
    }),
    []
  );

  /** Lands the incoming scene and arms the one after it. */
  const advance = () => {
    const next = (sceneRef.current + 1) % reel.scenes.length;
    const after = (next + 1) % reel.scenes.length;

    const position = geometry.getAttribute("position") as BufferAttribute;
    const to = geometry.getAttribute("aTo") as BufferAttribute;
    const tone = geometry.getAttribute("aTone") as BufferAttribute;
    const toneTo = geometry.getAttribute("aToneTo") as BufferAttribute;

    (position.array as Float32Array).set(reel.scenes[next].positions);
    (tone.array as Float32Array).set(reel.scenes[next].tones);
    (to.array as Float32Array).set(reel.scenes[after].positions);
    (toneTo.array as Float32Array).set(reel.scenes[after].tones);

    position.needsUpdate = true;
    to.needsUpdate = true;
    tone.needsUpdate = true;
    toneTo.needsUpdate = true;

    sceneRef.current = next;
  };

  useFrame((state, delta) => {
    const material = materialRef.current;
    const points = pointsRef.current;
    if (!material || !points) return;

    // Restoring a backgrounded tab, or any hitch during load, arrives as one
    // very large delta. Left unclamped it would fast-forward the reel through
    // whole scenes in a single frame; clamped, the reel simply resumes.
    const step = Math.min(delta, 0.05);

    material.uniforms.uTime.value += step;
    material.uniforms.uPixelRatio.value = Math.min(
      state.gl.getPixelRatio(),
      1.75
    );

    // Fit the normalised subject to the shorter side of whatever shape the
    // canvas is, with a margin. The margin is the empty room the ripples need,
    // and fitting to the shorter side keeps the subject the same size whether
    // the column is tall or wide.
    const fit =
      (FIT_MARGIN * Math.min(state.viewport.width, state.viewport.height)) / 2;
    points.scale.setScalar(fit);
    fitRef.current = fit;

    const progress = material.uniforms.uProgress.value as number;
    if (progress < 1) {
      material.uniforms.uProgress.value = Math.min(1, progress + step * 0.62);
    } else {
      // The reel only starts once the first scene has assembled, so the load-in
      // is never cut short by a transition.
      clockRef.current += step;

      if (clockRef.current > HOLD) {
        const morph = Math.min(1, (clockRef.current - HOLD) / MORPH);
        material.uniforms.uMorph.value = morph;

        if (morph >= 1) {
          advance();
          material.uniforms.uMorph.value = 0;
          clockRef.current = 0;
        }
      }
    }

    // Age every ripple. Ages are normalised, so the shader reads 0 at the drop
    // and 1 when the ring has died; past that it contributes nothing and its
    // slot is free.
    const ages = material.uniforms.uRippleAge.value as Float32Array;
    for (let i = 0; i < RIPPLES; i++) {
      if (ages[i] < 1) ages[i] = Math.min(1, ages[i] + step / RIPPLE_LIFE);
    }

    // Map the window pointer into the canvas's normalised space each frame.
    // Until the first move nothing is dropped, and the cloud rests level.
    const pointer = pointerRef.current;
    let nx = 0;
    let ny = 0;
    let overCanvas = false;
    if (pointer.seen) {
      const rect = state.gl.domElement.getBoundingClientRect();
      if (rect.width && rect.height) {
        nx = ((pointer.clientX - rect.left) / rect.width) * 2 - 1;
        ny = 1 - ((pointer.clientY - rect.top) / rect.height) * 2;
        overCanvas = nx >= -1 && nx <= 1 && ny >= -1 && ny <= 1;
      }
    }

    // Ripples are only dropped while the pointer is actually over the reel;
    // moves elsewhere on the page still steer the tilt but leave the field
    // undisturbed.
    if (overCanvas) {
      const ripples = material.uniforms.uRipple.value as Vector3[];
      // The pointer is in world units; the particles live in the scaled cloud's
      // local space, so undo the contain-scale to drop the ripple where the
      // cursor actually is on the object.
      const x = (nx * state.viewport.width) / 2 / fitRef.current;
      const y = (ny * state.viewport.height) / 2 / fitRef.current;
      const last = lastDropRef.current;

      if (Math.hypot(last.x - x, last.y - y) > RIPPLE_SPACING) {
        // Oldest slot is overwritten. Rings are independent, so which slot a
        // ring occupies carries no meaning — only its age does.
        let oldest = 0;
        for (let i = 1; i < RIPPLES; i++) {
          if (ages[i] > ages[oldest]) oldest = i;
        }

        hueRef.current = (hueRef.current + RIPPLE_HUE_STEP) % 1;
        ripples[oldest].set(x, y, hueRef.current);
        ages[oldest] = 0;
        last.set(x, y, 0);
      }
    }

    // The scenes are near-flat, so the cloud is tilted toward the cursor rather
    // than spun: a full rotation would edge-on them and lose the silhouette.
    // Clamped, because the window pointer can range far outside the canvas.
    const tiltX = Math.max(-1, Math.min(1, nx));
    const tiltY = Math.max(-1, Math.min(1, ny));
    const time = material.uniforms.uTime.value as number;
    const yawTarget = tiltX * 0.16 + Math.sin(time * 0.24) * 0.05;
    const pitchTarget = -tiltY * 0.12 + Math.sin(time * 0.19) * 0.035;
    const ease = Math.min(1, step * 2.2);
    points.rotation.y += (yawTarget - points.rotation.y) * ease;
    points.rotation.x += (pitchTarget - points.rotation.x) * ease;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={NormalBlending}
      />
    </points>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.1], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <ParticleReel />
    </Canvas>
  );
}
