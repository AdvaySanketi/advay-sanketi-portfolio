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
    float m = clamp((uMorph - aSeed * 0.3) / 0.7, 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);

    vec3 pos = mix(position, aTo, m);

    float arc = sin(m * 3.14159265);
    pos.z += arc * (0.3 + aSeed * 0.5);
    pos.x += arc * (aSeed - 0.5) * 0.15;
    pos.y += arc * (fract(aSeed * 7.31) - 0.5) * 0.15;

    float t = clamp((uProgress - aSeed * 0.3) / 0.7, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    pos = mix(aOrigin, pos, t);

    float phase = aSeed * 6.2831853;
    float calm = mix(2.2, 1.0, t);
    pos.x += sin(uTime * 0.42 + phase) * 0.009 * calm;
    pos.y += cos(uTime * 0.37 + phase * 1.3) * 0.009 * calm;
    pos.z += sin(uTime * 0.31 + phase * 0.7) * 0.014 * calm;

    float wave = 0.0;
    float hue = 0.0;

    for (int i = 0; i < RIPPLES; i++) {
      float age = uRippleAge[i];
      if (age >= 1.0) continue;

      vec2 delta = pos.xy - uRipple[i].xy;
      float dist = length(delta);

      float crest = age * uReach;
      float width = mix(0.05, 0.18, age);
      float off = (dist - crest) / width;
      float band = exp(-off * off);

      float fade = 1.0 - age;
      float amp = band * fade * fade * t;

      pos.xy += normalize(delta + 0.0001) * amp * 0.075;
      pos.z += amp * 0.2;

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

    vec3 color = mix(uColor, uAccent, vTone * 0.3);
    color = mix(color, uAccent, vFlight * 0.45);

    float crest = clamp(vWave * 1.4, 0.0, 1.0);
    color = mix(color, hue2rgb(vHue), crest * 0.8);

    alpha *= mix(0.34, 1.0, vTone);
    alpha *= mix(1.0, 0.62, vDepth);

    alpha *= mix(1.0, 0.55, vFlight);

    alpha = clamp(alpha * (1.0 + crest * 0.9), 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

const HOLD = 2.5;
const MORPH = 1.0;

const RIPPLES = 8;
const RIPPLE_LIFE = 1.5;
const RIPPLE_REACH = 1.0;
const RIPPLE_SPACING = 0.14;

const RIPPLE_HUE_STEP = 0.17;

const FIT_MARGIN = 0.8;

function ParticleReel() {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const reel = useMemo(() => buildReel(PARTICLE_COUNT), []);

  const sceneRef = useRef(0);
  const clockRef = useRef(0);
  const lastDropRef = useRef(new Vector3(999, 999, 0));
  const hueRef = useRef(0);
  const fitRef = useRef(1);
  const pointerRef = useRef({ clientX: 0, clientY: 0, seen: false });

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

    const step = Math.min(delta, 0.05);

    material.uniforms.uTime.value += step;
    material.uniforms.uPixelRatio.value = Math.min(
      state.gl.getPixelRatio(),
      1.75
    );

    const fit =
      (FIT_MARGIN * Math.min(state.viewport.width, state.viewport.height)) / 2;
    points.scale.setScalar(fit);
    fitRef.current = fit;

    const progress = material.uniforms.uProgress.value as number;
    if (progress < 1) {
      material.uniforms.uProgress.value = Math.min(1, progress + step * 0.62);
    } else {
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

    const ages = material.uniforms.uRippleAge.value as Float32Array;
    for (let i = 0; i < RIPPLES; i++) {
      if (ages[i] < 1) ages[i] = Math.min(1, ages[i] + step / RIPPLE_LIFE);
    }

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

    if (overCanvas) {
      const ripples = material.uniforms.uRipple.value as Vector3[];
      const x = (nx * state.viewport.width) / 2 / fitRef.current;
      const y = (ny * state.viewport.height) / 2 / fitRef.current;
      const last = lastDropRef.current;

      if (Math.hypot(last.x - x, last.y - y) > RIPPLE_SPACING) {
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
