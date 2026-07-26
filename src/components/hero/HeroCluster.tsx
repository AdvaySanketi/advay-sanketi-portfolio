"use client";

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  Box3,
  BufferGeometry,
  CanvasTexture,
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  HalfFloatType,
  Line as ThreeLine,
  LineDashedMaterial,
  LinearFilter,
  Matrix4,
  Mesh,
  NoColorSpace,
  Quaternion,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type BufferAttribute,
  type Group,
  type MeshStandardMaterial,
  type Texture,
} from "three";

const FLOW_SIZE = 288;

const WAKE_REACH = 0.55;

const SCENE_COLUMN = 0.56;

const STAMP_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

class PigmentStampMaterial extends ShaderMaterial {
  constructor() {
    super({
      depthTest: false,
      depthWrite: false,
      vertexShader: STAMP_VERTEX,
      fragmentShader: /* glsl */ `
        uniform sampler2D tFlow;
        uniform vec2  uMouse;
        uniform vec2  uVelocity;
        uniform float uAspect;
        uniform float uFalloff;
        uniform float uDissipation;
        uniform float uHue;

        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(tFlow, vUv);
          color.rgb *= uDissipation;

          vec2 cursor = vUv - uMouse;
          cursor.x *= uAspect;

          float mvel = length(uVelocity);
          float speed =
            smoothstep(0.015, 0.09, mvel) * mix(0.82, 1.0, smoothstep(0.09, 0.5, mvel));
          vec2 vel = uVelocity * vec2(1.0, -1.0);
          float falloff = smoothstep(uFalloff, 0.0, length(cursor));

          color.rg = mix(color.rg, vel, falloff);

          float deposit = speed * falloff;
          color.b = max(color.b, deposit);
          color.a = mix(color.a, uHue, deposit);

          gl_FragColor = color;
        }
      `,
      uniforms: {
        tFlow: { value: null },
        uMouse: { value: new Vector2(0.5, 0.5) },
        uVelocity: { value: new Vector2(0, 0) },
        uAspect: { value: 1 },
        uFalloff: { value: 0.12 },
        uDissipation: { value: 0.99 },
        uHue: { value: 0.125 },
      },
    });
  }
}

const VERTEX = /* glsl */ `
  uniform sampler2D tFlow;
  uniform float uPuff;

  varying vec3  vNormal;
  varying vec3  vWorld;
  varying vec2  vUv;
  varying float vPaint;

  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);

    vec4 clip = projectionMatrix * viewMatrix * world;
    vec2 screen = clip.xy / clip.w * 0.5 + 0.5;
    float paint = clamp(texture2D(tFlow, screen).b, 0.0, 1.0);
    vPaint = paint;
    world.xyz += vNormal * paint * uPuff;

    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D tFlow;
  uniform sampler2D uMap;
  uniform vec3  uBase;
  uniform vec2  uResolution;
  uniform float uOpacity;
  uniform float uUnlit;
  uniform float uHaze;

  varying vec3  vNormal;
  varying vec3  vWorld;
  varying vec2  vUv;
  varying float vPaint;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 keyDir = normalize(vec3(0.35, 0.85, 0.5));

    vec3 tint = texture2D(uMap, vUv).rgb * uBase;

    float lit = clamp(dot(n, keyDir) * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = tint * mix(0.38, 1.06, pow(lit, 1.2));

    vec3 view = normalize(cameraPosition - vWorld);
    float rim = pow(1.0 - clamp(dot(n, view), 0.0, 1.0), 2.5);
    col += tint * rim * 0.25 + rim * 0.06;

    col = mix(col, col * vec3(0.72, 0.86, 0.66), (1.0 - lit) * 0.45);

    float grey = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(grey), uHaze * 0.5);
    col = mix(col, vec3(0.949, 0.941, 0.918), uHaze);

    col = mix(col, tint, uUnlit);

    vec2 screen = gl_FragCoord.xy / uResolution;
    vec4 flow = texture2D(tFlow, screen);
    float amount = clamp(flow.b, 0.0, 1.0);

    float flowLen = length(flow.rg);
    vec2 dir = flowLen > 0.0001 ? flow.rg / flowLen : vec2(1.0, 0.0);
    vec2 perp = vec2(-dir.y, dir.x);
    float across = dot(gl_FragCoord.xy, perp);
    float along = dot(gl_FragCoord.xy, dir);

    float lane = floor(across / 3.0);
    float laneJitter = fract(sin(lane * 127.1) * 43758.5453);
    float bristle = mix(0.72, 1.08, laneJitter);
    float breakup = 0.92 + 0.12 * sin(along * 0.1 + laneJitter * 6.2831853);
    float body = amount * bristle * breakup;

    float cov = smoothstep(0.14, 0.36, body);

    float sector = mod(floor(flow.a * 4.0 + (laneJitter - 0.5) * 0.5), 4.0);
    vec3 pigment =
      sector < 1.0 ? vec3(0.30, 0.56, 0.24) :
      sector < 2.0 ? vec3(0.21, 0.34, 0.78) :
      sector < 3.0 ? vec3(0.88, 0.36, 0.23) :
                     vec3(0.90, 0.64, 0.24);
    pigment *= mix(0.9, 1.08, laneJitter);
    float edgeBand = smoothstep(0.14, 0.2, body) - smoothstep(0.2, 0.52, body);
    pigment *= 1.0 - edgeBand * 0.3;

    col = mix(col, pigment, cov * (0.75 + 0.25 * lit));

    vec3 hv = normalize(view + keyDir);
    float spec = pow(clamp(dot(n, hv), 0.0, 1.0), 42.0) * 0.16;
    col += spec * (1.0 + vPaint * 2.5);

    gl_FragColor = vec4(col, uOpacity);
  }
`;

const WHITE = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
WHITE.needsUpdate = true;

function makeClusterMaterial(
  map: Texture | null,
  base: Color,
  opacity: number,
  unlit = false,
  haze = 0
) {
  return new ShaderMaterial({
    transparent: true,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      tFlow: { value: null },
      uMap: { value: map ?? WHITE },
      uBase: { value: base },
      uResolution: { value: new Vector2(1, 1) },
      uOpacity: { value: opacity },
      uPuff: { value: 0.015 },
      uUnlit: { value: unlit ? 1 : 0 },
      uHaze: { value: haze },
    },
  });
}

class PaintLayerMaterial extends ShaderMaterial {
  constructor() {
    super({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      vertexShader: /* glsl */ `
        void main() {
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tFlow;
        uniform vec2  uResolution;
        uniform float uStrength;

        void main() {
          vec2 screen = gl_FragCoord.xy / uResolution;
          vec4 flow = texture2D(tFlow, screen);
          float amount = clamp(flow.b, 0.0, 1.0);
          if (amount < 0.002) discard;

          float flowLen = length(flow.rg);
          vec2 dir = flowLen > 0.0001 ? flow.rg / flowLen : vec2(1.0, 0.0);
          vec2 perp = vec2(-dir.y, dir.x);
          float across = dot(gl_FragCoord.xy, perp);
          float along = dot(gl_FragCoord.xy, dir);

          float lane = floor(across / 3.0);
          float laneJitter = fract(sin(lane * 127.1) * 43758.5453);
          float bristle = mix(0.72, 1.08, laneJitter);
          float breakup = 0.92 + 0.12 * sin(along * 0.1 + laneJitter * 6.2831853);
          float body = amount * bristle * breakup;

          float cov = smoothstep(0.14, 0.36, body);
          if (cov < 0.001) discard;

          float sector = mod(floor(flow.a * 4.0 + (laneJitter - 0.5) * 0.5), 4.0);
          vec3 pigment =
            sector < 1.0 ? vec3(0.30, 0.56, 0.24) :
            sector < 2.0 ? vec3(0.21, 0.34, 0.78) :
            sector < 3.0 ? vec3(0.88, 0.36, 0.23) :
                           vec3(0.90, 0.64, 0.24);
          pigment *= mix(0.9, 1.08, laneJitter);
          float edgeBand = smoothstep(0.14, 0.2, body) - smoothstep(0.2, 0.52, body);
          pigment *= 1.0 - edgeBand * 0.3;

          gl_FragColor = vec4(pigment, cov * uStrength);
        }
      `,
      uniforms: {
        tFlow: { value: null },
        uResolution: { value: new Vector2(1, 1) },
        uStrength: { value: 0.9 },
      },
    });
  }
}

function makeEditorTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const texture = new CanvasTexture(canvas);
  texture.flipY = false;
  texture.colorSpace = NoColorSpace;
  const ctx = canvas.getContext("2d");
  if (!ctx) return texture;

  ctx.fillStyle = "#14140f";
  ctx.fillRect(0, 0, 1024, 512);

  ctx.fillStyle = "#1f1f18";
  ctx.fillRect(0, 0, 1024, 44);
  ["#cd5b34", "#e6a23c", "#55833f"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(34 + i * 34, 22, 9, 0, Math.PI * 2);
    ctx.fill();
  });

  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  ctx.fillStyle = "#191913";
  ctx.fillRect(0, 44, 150, 424);
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = "rgba(236, 231, 217, 0.25)";
    ctx.fillRect(24 + (i % 3) * 10, 70 + i * 34, 70 + rand() * 40, 8);
  }

  const colors = [
    "#55833f",
    "#3d5fc4",
    "#cd5b34",
    "#e6a23c",
    "#8f8d80",
    "#ece7d9",
  ];
  let indent = 0;
  ctx.globalAlpha = 0.85;
  for (let line = 0; line < 17; line++) {
    indent = Math.max(
      0,
      Math.min(4, indent + (rand() > 0.6 ? 1 : rand() > 0.5 ? -1 : 0))
    );
    let x = 190 + indent * 34;
    const chunks = 2 + Math.floor(rand() * 3);
    for (let c = 0; c < chunks; c++) {
      const w = 30 + rand() * 110;
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
      ctx.fillRect(x, 76 + line * 22, w, 9);
      x += w + 18;
    }
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#3f5b3a";
  ctx.fillRect(0, 468, 1024, 44);
  ctx.fillStyle = "#ece7d9";
  ctx.font = "600 20px monospace";
  ctx.fillText("advay — portfolio.tsx", 24, 497);

  return texture;
}

type Drifter = {
  role: string;
  file: string;
  size: number;
  home: readonly [number, number, number];
  rest: readonly [number, number, number];
  opacity: number;
  bob: number;
  bobSpeed: number;
  sway: readonly [number, number];
  phase: number;
  parallax: number;
  haze?: number;
  screen?: boolean;
};

const DRIFTERS: Drifter[] = [
  {
    role: "banded planet (anchor)",
    file: "/models/opt/jupiter.glb",
    size: 1.1,
    home: [0.0, 0.12, 0],
    rest: [0.25, 0.05, -0.25],
    opacity: 1,
    bob: 0.05,
    bobSpeed: 0.4,
    sway: [0.05, 0.2],
    phase: 0,
    parallax: 0.14,
  },
  {
    role: "open laptop",
    file: "/models/opt/laptop.glb",
    size: 0.8,
    home: [0.64, -0.7, -0.3],
    rest: [0.12, -0.18, 0.02],
    opacity: 1,
    bob: 0.06,
    bobSpeed: 0.5,
    sway: [0.04, 0.15],
    phase: 1.7,
    parallax: 0.28,
    screen: true,
  },
  {
    role: "cassette (Mixtape)",
    file: "/models/opt/cassette.glb",
    size: 0.5,
    home: [-0.74, -0.8, -0.15],
    rest: [0.3, 0.5, -0.12],
    opacity: 1,
    bob: 0.05,
    bobSpeed: 0.45,
    sway: [0.12, 0.35],
    phase: 3.1,
    parallax: 0.34,
  },
  {
    role: "chess rook",
    file: "/models/opt/chess.glb",
    size: 0.55,
    home: [-0.74, 0.88, -0.7],
    rest: [0.12, 0.6, -0.08],
    opacity: 0.95,
    bob: 0.07,
    bobSpeed: 0.55,
    sway: [0.05, 0.28],
    phase: 4.4,
    parallax: 0.06,
    haze: 0.22,
  },
  {
    role: "katana (the anime seat)",
    file: "/models/opt/katana.glb",
    size: 0.82,
    home: [0.58, 0.56, 0.26],
    rest: [0.15, 0.2, -0.9],
    opacity: 1,
    bob: 0.08,
    bobSpeed: 0.6,
    sway: [0.1, 0.3],
    phase: 5.6,
    parallax: 0.4,
    haze: 0,
  },
];

const MOON_FILE = "/models/opt/moon.glb";
const MOON_SIZE = 0.16;

const ORBIT_RISE = 0.0;

const ORBIT_DEPTH = 0.82;

const BRUSH_FILE = "/models/opt/paintbrush.glb";
const BRUSH_SIZE = 0.32;
const BRUSH_REST = [0.2, 0.15, 2.4] as const;
const BRUSH_TIP = { x: 0.11, y: 0.11 };

const BRUSH_ENABLED = false;

for (const d of DRIFTERS) useGLTF.preload(d.file);
useGLTF.preload(MOON_FILE);
if (BRUSH_ENABLED) useGLTF.preload(BRUSH_FILE);

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

function GlbModel({
  file,
  size,
  opacity,
  rest,
  groupRef,
  register,
  screenTexture,
  haze = 0,
}: {
  file: string;
  size: number;
  opacity: number;
  rest: readonly [number, number, number];
  groupRef: (group: Group | null) => void;
  register: (materials: ShaderMaterial[]) => void;
  screenTexture?: Texture;
  haze?: number;
}) {
  const gltf = useGLTF(file);

  const baked = useMemo(() => {
    const source = gltf.scene;
    source.updateWorldMatrix(true, true);

    const entries: { geometry: BufferGeometry; material: ShaderMaterial }[] =
      [];
    let screenGeometry: BufferGeometry | null = null;

    source.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;

      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);

      const isScreen =
        !!screenTexture &&
        (geometry.getAttribute("position")?.count ?? Infinity) <= 8;
      if (isScreen) screenGeometry = geometry;

      const std = (
        Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      ) as MeshStandardMaterial;
      const map = isScreen ? screenTexture : std?.map ?? null;
      if (map && !isScreen) {
        map.colorSpace = NoColorSpace;
        map.needsUpdate = true;
      }
      const base = isScreen
        ? new Color(1, 1, 1)
        : (std?.color ?? new Color(1, 1, 1)).clone().convertLinearToSRGB();

      entries.push({
        geometry,
        material: makeClusterMaterial(map, base, opacity, isScreen, haze),
      });
    });

    if (screenGeometry) {
      const geo: BufferGeometry = screenGeometry;
      const normal = new Vector3()
        .fromBufferAttribute(geo.getAttribute("normal") as BufferAttribute, 0)
        .normalize();

      geo.computeBoundingBox();
      const screenCenter = geo.boundingBox!.getCenter(new Vector3());
      const bodyBox = new Box3();
      for (const entry of entries) {
        if (entry.geometry === screenGeometry) continue;
        entry.geometry.computeBoundingBox();
        if (entry.geometry.boundingBox) {
          bodyBox.union(entry.geometry.boundingBox);
        }
      }
      const bodyCenter = bodyBox.getCenter(new Vector3());
      if (normal.dot(screenCenter.sub(bodyCenter)) > 0) normal.negate();

      const face = new Quaternion().setFromUnitVectors(
        normal,
        new Vector3(0, 0, 1)
      );
      const up = new Vector3(0, 1, 0).applyQuaternion(face);
      face.premultiply(
        new Quaternion().setFromAxisAngle(
          new Vector3(0, 0, 1),
          Math.atan2(up.x, up.y)
        )
      );
      const align = new Matrix4().makeRotationFromQuaternion(face);
      for (const entry of entries) entry.geometry.applyMatrix4(align);
    }

    const box = new Box3();
    for (const entry of entries) {
      entry.geometry.computeBoundingBox();
      if (entry.geometry.boundingBox) box.union(entry.geometry.boundingBox);
    }
    const center = box.getCenter(new Vector3());
    const dims = box.getSize(new Vector3());
    const scale = size / Math.max(dims.x, dims.y, dims.z, 1e-6);
    for (const entry of entries) {
      entry.geometry.translate(-center.x, -center.y, -center.z);
      entry.geometry.scale(scale, scale, scale);
    }

    return entries;
  }, [gltf, size, opacity, screenTexture, haze]);

  useEffect(() => {
    register(baked.map((entry) => entry.material));
    return () => register([]);
  }, [baked, register]);

  useEffect(
    () => () => {
      for (const entry of baked) {
        entry.geometry.dispose();
        entry.material.dispose();
      }
    },
    [baked]
  );

  return (
    <group
      ref={groupRef}
      rotation={[rest[0], rest[1], rest[2]]}
      scale={0}
    >
      {baked.map((entry, i) => (
        <mesh key={i} geometry={entry.geometry} material={entry.material} />
      ))}
    </group>
  );
}

class ModelBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const BRUSH_TARGET = new Vector3();

const BRUSH_Z = 1.05;

function Cluster() {
  const groupRef = useRef<Group>(null);
  const drifterRefs = useRef<(Group | null)[]>([]);
  const moonRef = useRef<Group | null>(null);
  const brushRef = useRef<Group | null>(null);
  const editorTexture = useMemo(() => makeEditorTexture(), []);
  const noopRegister = useCallback(() => {}, []);
  const materialsRef = useRef<ShaderMaterial[][]>(
    Array.from({ length: DRIFTERS.length + 1 }, () => [])
  );
  const pointerRef = useRef({
    clientX: 0,
    clientY: 0,
    seen: false,
    splat: false,
  });

  const register = useCallback(
    (index: number, materials: ShaderMaterial[]) => {
      materialsRef.current[index] = materials;
    },
    []
  );

  const paintLayer = useMemo(
    () => ({ geometry: new PlaneGeometry(2, 2), material: new PaintLayerMaterial() }),
    []
  );
  useEffect(
    () => () => {
      paintLayer.geometry.dispose();
      paintLayer.material.dispose();
    },
    [paintLayer]
  );

  const brush = useMemo(() => {
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new PlaneGeometry(2, 2);
    const material = new PigmentStampMaterial();
    const scene = new Scene();
    scene.add(new Mesh(quad, material));
    return { camera, quad, material, scene };
  }, []);

  useEffect(
    () => () => {
      brush.quad.dispose();
      brush.material.dispose();
    },
    [brush]
  );

  useEffect(() => () => editorTexture.dispose(), [editorTexture]);

  const orbit = useMemo(() => {
    const anchor = DRIFTERS[0].home;
    const points: Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      points.push(
        new Vector3(
          anchor[0] + Math.cos(a) * 0.95,
          anchor[1] + ORBIT_RISE + Math.sin(a) * 0.2,
          anchor[2] + Math.sin(a) * ORBIT_DEPTH
        )
      );
    }
    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineDashedMaterial({
      color: new Color("#14140f"),
      transparent: true,
      opacity: 0,
      dashSize: 0.05,
      gapSize: 0.045,
      depthWrite: false,
    });
    const line = new ThreeLine(geometry, material);
    line.computeLineDistances();
    line.renderOrder = 2;
    return line;
  }, []);

  useEffect(
    () => () => {
      orbit.geometry.dispose();
      (orbit.material as LineDashedMaterial).dispose();
    },
    [orbit]
  );

  useEffect(() => {
    const p = pointerRef.current;
    const onMove = (event: PointerEvent) => {
      p.clientX = event.clientX;
      p.clientY = event.clientY;
      p.seen = true;
    };
    const onDown = (event: PointerEvent) => {
      p.clientX = event.clientX;
      p.clientY = event.clientY;
      p.seen = true;
      p.splat = true;
      window.getSelection()?.removeAllRanges();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  const sim = useRef({
    time: 0,
    intro: 0,
    strength: 0,
    last: new Vector2(0.5, 0.5),
    vel: new Vector2(0, 0),
    prime: true,
    read: makeFlowTarget(),
    write: makeFlowTarget(),
    resolution: new Vector2(1, 1),
    pigment: 0,
    paintT: 0,
    brushPos: new Vector2(0, 0),
    brushPulse: 0,
    brushShown: false,
    ghost: { phase: 0 as 0 | 1 | 2, wait: 0, t: 0 },
    springs: DRIFTERS.map(() => ({
      off: new Vector2(),
      vel: new Vector2(),
      pulse: 0,
      pulseVel: 0,
    })),
  });

  const cleared = useRef(false);
  useFrame((state) => {
    if (cleared.current) return;
    cleared.current = true;
    const previous = state.gl.getRenderTarget();
    for (const target of [sim.current.read, sim.current.write]) {
      state.gl.setRenderTarget(target);
      state.gl.clear();
    }
    state.gl.setRenderTarget(previous);
  });

  useEffect(() => {
    const s = sim.current;
    return () => {
      s.read.dispose();
      s.write.dispose();
    };
  }, []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const step = Math.min(delta, 0.05);
    const s = sim.current;
    s.time += step;

    const columnW = state.viewport.width * SCENE_COLUMN;
    const fit = (0.85 * Math.min(columnW, state.viewport.height)) / 2;
    const offsetX = (state.viewport.width * (1 - SCENE_COLUMN)) / 2;
    group.scale.setScalar(fit);
    group.position.x = offsetX;

    const p = pointerRef.current;
    let nx = 0;
    let ny = 0;
    let near = false;
    if (p.seen) {
      const rect = state.gl.domElement.getBoundingClientRect();
      if (rect.width && rect.height) {
        nx = ((p.clientX - rect.left) / rect.width) * 2 - 1;
        ny = 1 - ((p.clientY - rect.top) / rect.height) * 2;
        near = Math.abs(nx) <= 1.15 && Math.abs(ny) <= 1.15;
      }
    }
    const realNx = nx;
    const realNy = ny;

    const g = s.ghost;
    let ghost = false;
    let gdx = 0;
    let gdy = 0;
    if (BRUSH_ENABLED && g.phase === 0 && s.intro >= 1) {
      if (near && s.vel.length() > 0.25) {
        g.phase = 2;
      } else {
        g.wait += step;
        if (g.wait > 2.6) {
          g.phase = 1;
          g.t = 0;
        }
      }
    }
    if (g.phase === 1) {
      ghost = true;
      const prev = g.t;
      g.t = Math.min(1, g.t + step / 1.2);
      const at = (t: number): [number, number] => {
        const e = t * t * (3.0 - 2.0 * t);
        const cx = -0.85 + e * 1.7;
        const cy = 0.04 + Math.sin(e * Math.PI) * 0.3;
        return [
          0.5 + (cx * fit + offsetX) / state.viewport.width,
          0.5 + (cy * fit) / state.viewport.height,
        ];
      };
      const [gx, gy] = at(g.t);
      const [hx, hy] = at(prev);
      gdx = gx - hx;
      gdy = gy - hy;
      nx = gx * 2 - 1;
      ny = gy * 2 - 1;
      near = true;
      if (g.t >= 1) {
        g.phase = 2;
        s.prime = true;
      }
    }
    s.strength += ((near ? 1 : 0) - s.strength) * Math.min(1, step * 5);

    const uvx = (nx + 1) / 2;
    const uvy = (ny + 1) / 2;
    if (ghost) {
      const len = Math.hypot(gdx, gdy);
      if (len > 0.0001) {
        s.vel.set((gdx / len) * 0.55, (gdy / len) * 0.55);
      }
      s.last.set(uvx, uvy);
    } else {
      let dx = 0;
      let dy = 0;
      if (p.seen) {
        if (s.prime) {
          s.prime = false;
        } else {
          dx = uvx - s.last.x;
          dy = uvy - s.last.y;
        }
        s.last.set(uvx, uvy);
      }
      const gain = 6;
      const targetX = near ? dx * gain : 0;
      const targetY = near ? dy * gain : 0;
      s.vel.x += (targetX - s.vel.x) * Math.min(1, step * 12);
      s.vel.y += (targetY - s.vel.y) * Math.min(1, step * 12);
      const speed = s.vel.length();
      if (speed > 1.6) s.vel.multiplyScalar(1.6 / speed);
    }

    const splat = p.splat && near && !ghost;
    p.splat = false;
    if (splat) {
      s.pigment = (s.pigment + 1) % 4;
      s.paintT = 0;
    }

    if (!ghost && near && s.vel.length() > 0.2) {
      s.paintT += step;
      if (s.paintT > 0.9) {
        s.paintT = 0;
        s.pigment = (s.pigment + 1) % 4;
      }
    }
    brush.material.uniforms.uHue.value = (s.pigment + 0.5) / 4;

    if (BRUSH_ENABLED) {
      brush.material.uniforms.uMouse.value.set(uvx, uvy);
      brush.material.uniforms.uFalloff.value = splat ? 0.26 : 0.12;
      if (splat) {
        brush.material.uniforms.uVelocity.value.set(1.1, 0.9);
      } else {
        brush.material.uniforms.uVelocity.value.copy(s.vel);
      }
      brush.material.uniforms.uAspect.value =
        state.size.width / state.size.height;
      brush.material.uniforms.tFlow.value = s.read.texture;
      state.gl.setRenderTarget(s.write);
      state.gl.render(brush.scene, brush.camera);
      state.gl.setRenderTarget(null);

      const swap = s.read;
      s.read = s.write;
      s.write = swap;
    }

    state.gl.getDrawingBufferSize(s.resolution);
    for (const materials of materialsRef.current) {
      for (const material of materials) {
        material.uniforms.tFlow.value = s.read.texture;
        material.uniforms.uResolution.value.copy(s.resolution);
      }
    }
    paintLayer.material.uniforms.tFlow.value = s.read.texture;
    paintLayer.material.uniforms.uResolution.value.copy(s.resolution);

    const lx = ((nx * state.viewport.width) / 2 - offsetX) / fit;
    const ly = (ny * state.viewport.height) / 2 / fit;

    const scroll = Math.min(
      1,
      Math.max(0, window.scrollY / Math.max(1, window.innerHeight))
    );

    if (drifterRefs.current.some(Boolean)) {
      s.intro = Math.min(1, s.intro + step / 1.1);
    }
    const enter = (index: number) => {
      const t = Math.min(1, Math.max(0, (s.intro - index * 0.1) / 0.55));
      const u = t - 1;
      return t === 0 ? 0 : 1 + 2.70158 * u * u * u + 1.70158 * u * u;
    };

    DRIFTERS.forEach((d, i) => {
      const mesh = drifterRefs.current[i];
      if (!mesh) return;
      const spring = s.springs[i];
      const entered = enter(i);

      const dxw = d.home[0] + spring.off.x - lx;
      const dyw = d.home[1] + spring.off.y - ly;
      const dist = Math.hypot(dxw, dyw);
      const brushSpeed = s.vel.length();
      if (s.strength > 0.05 && dist < WAKE_REACH && dist > 0.0001) {
        const prox = 1 - dist / WAKE_REACH;
        const push = prox * (0.6 + brushSpeed * 1.1) * s.strength;
        spring.vel.x += (dxw / dist) * push * step;
        spring.vel.y += (dyw / dist) * push * step;

        spring.pulseVel += prox * brushSpeed * 9 * s.strength * step;
      }

      if (splat && dist > 0.0001 && dist < WAKE_REACH * 1.4) {
        const proxS = 1 - dist / (WAKE_REACH * 1.4);
        spring.pulseVel += proxS * 2.2;
        spring.vel.x += (dxw / dist) * proxS * 0.9;
        spring.vel.y += (dyw / dist) * proxS * 0.9;
      }

      spring.pulseVel += (-spring.pulse * 45 - spring.pulseVel * 5.5) * step;
      spring.pulse += spring.pulseVel * step;
      mesh.scale.setScalar(
        entered * (1 + Math.max(-0.18, Math.min(0.22, spring.pulse)))
      );
      for (const material of materialsRef.current[i]) {
        material.uniforms.uOpacity.value = d.opacity * Math.min(1, entered);
      }

      spring.vel.x += (-spring.off.x * 3.2 - spring.vel.x * 2.4) * step;
      spring.vel.y += (-spring.off.y * 3.2 - spring.vel.y * 2.4) * step;
      spring.off.x += spring.vel.x * step;
      spring.off.y += spring.vel.y * step;

      const bobY = Math.sin(s.time * d.bobSpeed + d.phase) * d.bob;
      const bobX =
        Math.cos(s.time * d.bobSpeed * 0.8 + d.phase * 1.3) * d.bob * 0.6;
      mesh.position.set(
        d.home[0] + bobX + spring.off.x,
        d.home[1] + bobY + spring.off.y + scroll * d.parallax,
        d.home[2]
      );
      mesh.rotation.x =
        d.rest[0] + Math.sin(s.time * d.bobSpeed * 0.7 + d.phase) * d.sway[0];
      mesh.rotation.y =
        d.rest[1] +
        Math.sin(s.time * d.bobSpeed * 0.5 + d.phase * 1.7) * d.sway[1];
    });

    const moonMesh = moonRef.current;
    if (moonMesh) {
      const a = s.time * 0.4 + 1.2;
      const anchor = DRIFTERS[0];
      const lift = scroll * anchor.parallax;
      moonMesh.position.set(
        anchor.home[0] + Math.cos(a) * 0.95,
        anchor.home[1] + ORBIT_RISE + Math.sin(a) * 0.2 + lift,
        anchor.home[2] + Math.sin(a) * ORBIT_DEPTH
      );
      const entered = enter(DRIFTERS.length);
      moonMesh.scale.setScalar(entered);
      moonMesh.rotation.y = s.time * 0.3;
      for (const material of materialsRef.current[DRIFTERS.length]) {
        material.uniforms.uOpacity.value = Math.min(1, entered);
      }
      orbit.position.y = lift;
      (orbit.material as LineDashedMaterial).opacity = 0.28 * entered;
    }

    const brushMesh = brushRef.current;
    if (brushMesh) {
      const dip = Math.min(1, s.vel.length());
      const localZ = BRUSH_Z - dip * 0.12;
      const worldZ = localZ * fit;

      BRUSH_TARGET.set(nx, ny, 0.5)
        .unproject(state.camera)
        .sub(state.camera.position)
        .normalize();
      const travel =
        (worldZ - state.camera.position.z) / BRUSH_TARGET.z;
      BRUSH_TARGET.multiplyScalar(travel).add(state.camera.position);

      group.updateWorldMatrix(true, false);
      group.worldToLocal(BRUSH_TARGET);

      s.brushPos.x += (BRUSH_TARGET.x - s.brushPos.x) * Math.min(1, step * 18);
      s.brushPos.y += (BRUSH_TARGET.y - s.brushPos.y) * Math.min(1, step * 18);
      brushMesh.position.set(
        s.brushPos.x + BRUSH_TIP.x,
        s.brushPos.y + BRUSH_TIP.y,
        localZ
      );
      brushMesh.rotation.x = BRUSH_REST[0] + s.vel.y * 0.1;
      brushMesh.rotation.z = BRUSH_REST[2] + s.vel.x * 0.14;
      if (splat) s.brushPulse = 1;
      s.brushPulse *= Math.max(0, 1 - step * 6);
      brushMesh.scale.setScalar(s.strength * (1 + s.brushPulse * 0.18));
      brushMesh.visible = s.strength > 0.02;
    }

    if (BRUSH_ENABLED) {
      const inCanvas = p.seen && Math.abs(realNx) <= 1 && Math.abs(realNy) <= 1;
      if (inCanvas !== s.brushShown) {
        s.brushShown = inCanvas;
        const hero = state.gl.domElement.closest<HTMLElement>(".hero-brush");
        if (hero) hero.dataset.brush3d = inCanvas ? "true" : "false";
      }
    }

    const tx = Math.max(-1, Math.min(1, nx));
    const ty = Math.max(-1, Math.min(1, ny));
    const yaw = tx * 0.14 + Math.sin(s.time * 0.22) * 0.04;
    const pitch = -ty * 0.1 + Math.sin(s.time * 0.18) * 0.03;
    const ease = Math.min(1, step * 2.2);
    group.rotation.y += (yaw - group.rotation.y) * ease;
    group.rotation.x += (pitch - group.rotation.x) * ease;
  });

  return (
    <>
      {BRUSH_ENABLED && (
        <mesh
          geometry={paintLayer.geometry}
          material={paintLayer.material}
          renderOrder={-100}
          frustumCulled={false}
        />
      )}
      <group ref={groupRef}>
        <primitive object={orbit} />
        <ModelBoundary>
        <Suspense fallback={null}>
          {DRIFTERS.map((d, i) => (
            <GlbModel
              key={d.role}
              file={d.file}
              size={d.size}
              opacity={d.opacity}
              rest={d.rest}
              haze={d.haze}
              groupRef={(mesh) => {
                drifterRefs.current[i] = mesh;
              }}
              register={(materials) => register(i, materials)}
              screenTexture={d.screen ? editorTexture : undefined}
            />
          ))}
          {BRUSH_ENABLED && (
            <GlbModel
              file={BRUSH_FILE}
              size={BRUSH_SIZE}
              opacity={1}
              rest={BRUSH_REST}
              groupRef={(mesh) => {
                brushRef.current = mesh;
              }}
              register={noopRegister}
            />
          )}
          <GlbModel
            file={MOON_FILE}
            size={MOON_SIZE}
            opacity={1}
            rest={[0, 0, 0]}
            groupRef={(mesh) => {
              moonRef.current = mesh;
            }}
            register={(materials) => register(DRIFTERS.length, materials)}
          />
        </Suspense>
        </ModelBoundary>
      </group>
    </>
  );
}

export default function HeroCluster() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.1], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <Cluster />
    </Canvas>
  );
}
