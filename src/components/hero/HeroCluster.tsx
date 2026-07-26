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

/**
 * A drifting constellation of real glTF models the cursor — a modelled 3D
 * paintbrush riding the pointer, see BRUSH_FILE — lays fresh strokes over.
 *
 * The models are downloaded GLBs living in /public/models/opt (Draco'd and
 * texture-crunched by gltf-transform; the raw downloads stay in
 * /public/models). Each model keeps its own base-color texture: the cluster
 * shader samples it as the surface tint, so Saturn's bands and the laptop's
 * keys survive — while the lighting, paint, splat, and wake systems apply
 * on top exactly as they did to the procedural set.
 *
 * Systems, all deliberately quiet:
 *
 *   - **Drift.** Every object bobs on its own slow phase and sways around
 *     its resting pose — never a full tumble, because a real object spends
 *     most of a tumble at an unrecognisable angle.
 *   - **The brush.** A ping-pong flowmap (same technique as the name effect)
 *     keeps a screen-space trail of the pointer. Object surfaces sample it
 *     where they sit on screen and blend toward pigment where the trail is
 *     fresh; bristle lanes, thresholded coverage and edge pooling shape the
 *     blob into a stroke. The brush carries one loaded pigment at a time
 *     (stamped into the trail's alpha) and reloads as you paint — one
 *     gesture, one colour. Strokes are long-lived on purpose: paint
 *     accumulates until overpainted.
 *   - **The wake.** Sweeping past an object shoves it off its home slot in
 *     proportion to stroke speed; springs ease it back. Brush contact kicks
 *     a jelly scale-pulse, and fresh paint swells the surface it covers.
 *   - **The splat.** A click drops a wide solid blot of the next pigment and
 *     kicks everything nearby.
 *   - **Entrance & moonlet.** Objects pop in staggered with a back-out ease;
 *     a small moon orbits the planet on an inclined path — perpetual motion
 *     the cursor doesn't own — with its route drawn as a faint dashed ellipse.
 *   - **The demo stroke.** If the visitor hasn't painted a few seconds after
 *     the cluster settles, the brush lays one stroke across the planet by
 *     itself — the paint system taught by demonstration, at most once.
 *   - **Depth.** Back-row objects sit in a paper-toned haze, and scrolling
 *     lifts each object at its own rate, near ones fastest.
 *
 * Conventions shared with the old reel: normalised cluster space (though the
 * canvas is now full-bleed across the hero and the cluster contain-fits into
 * its right column — see SCENE_COLUMN), window-level pointer tracking (the
 * hero's type columns sit above this canvas and would starve it of its own
 * events), and a gentle tilt toward the cursor.
 */

/** Resolution of the brush trail buffers. Low on purpose: it is a soft mask.
 * Raised from 220 when the canvas went full-bleed — the same texels now
 * cover the whole hero's width, not just the right column. */
const FLOW_SIZE = 288;

/** How far (in cluster-normalised units) the wake reaches around the cursor. */
const WAKE_REACH = 0.55;

/**
 * Fraction of the hero's width the cluster is composed into — the right
 * column the canvas itself used to occupy before it went full-bleed to let
 * the brush paint across the whole section. The static fallback in
 * SceneMount keeps the same column, so both compositions match.
 */
const SCENE_COLUMN = 0.56;

const STAMP_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * The cluster's stamp pass: rg/b are velocity + eased speed, fading each
 * frame; alpha carries the brush's currently loaded pigment. Hue is a
 * property of the brush, not the pixel — deriving it per-pixel from stroke
 * direction fingerprinted every large sweep with contour-line moiré. Alpha
 * does not dissipate: dried paint keeps its colour until overpainted.
 */
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

          // Deposit strength from stroke speed. Two-stage on purpose: a small
          // gate near zero so a stationary cursor still lays nothing (the
          // no-erase fix), then a quick ramp to a high floor so any deliberate
          // stroke deposits thick, even paint — the old cubic curve peaked
          // only at a flick's top speed and left normal strokes thin and
          // patchy next to the demo stroke's steady, full-bodied line. The
          // clicked blot fakes a high velocity, so it still lands at full.
          float mvel = length(uVelocity);
          float speed =
            smoothstep(0.015, 0.09, mvel) * mix(0.82, 1.0, smoothstep(0.09, 0.5, mvel));
          vec2 vel = uVelocity * vec2(1.0, -1.0);
          float falloff = smoothstep(uFalloff, 0.0, length(cursor));

          // Velocity field follows the cursor — it drives the stroke-direction
          // warp, and should read zero where the brush isn't moving.
          color.rg = mix(color.rg, vel, falloff);

          // Paint body and pigment only ever accumulate. The old code mixed
          // the whole rgb toward the stamp, and the stamp's blue (paint
          // amount) is zero at rest — so a stopped or clicked-then-still
          // cursor scrubbed a hole in the paint around it. Depositing with
          // max instead means a moving brush lays paint, a click blots it,
          // and a stationary or lifting cursor leaves what is already down.
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
        // Long-lived on purpose: strokes accumulate like actual paint on
        // the set and only vanish by being overpainted.
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

    // Paint has body: project this vertex to screen, read how much fresh
    // paint sits there, and swell the surface along its normal.
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

    // The surface's own colour: its base-color texture (kept in display
    // space — see GlbModel) multiplied by the material's flat colour factor.
    vec3 tint = texture2D(uMap, vUv).rgb * uBase;

    // Soft wrap key light shapes the tint; nothing crushed to black.
    float lit = clamp(dot(n, keyDir) * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = tint * mix(0.38, 1.06, pow(lit, 1.2));

    // View-edge lift, so interior detail separates from the object's mass.
    vec3 view = normalize(cameraPosition - vWorld);
    float rim = pow(1.0 - clamp(dot(n, view), 0.0, 1.0), 2.5);
    col += tint * rim * 0.25 + rim * 0.06;

    // Shadows lean toward the page's green rather than dead grey.
    col = mix(col, col * vec3(0.72, 0.86, 0.66), (1.0 - lit) * 0.45);

    // Depth haze: objects at the back of the stack lose a little saturation
    // and drift toward the paper, so distance reads as atmosphere rather than
    // as transparency. Applied before the paint lands, so fresh strokes stay
    // vivid even on a hazed surface.
    float grey = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(grey), uHaze * 0.5);
    col = mix(col, vec3(0.949, 0.941, 0.918), uHaze);

    // Unlit surfaces (the laptop's display) glow with their own image:
    // lighting, rim and shadow bypassed. Paint still lands on them.
    col = mix(col, tint, uUnlit);

    // The brush trail, sampled where this fragment sits on screen.
    vec2 screen = gl_FragCoord.xy / uResolution;
    vec4 flow = texture2D(tFlow, screen);
    float amount = clamp(flow.b, 0.0, 1.0);

    // Stroke frame: along/across coordinates oriented by the local flow.
    float flowLen = length(flow.rg);
    vec2 dir = flowLen > 0.0001 ? flow.rg / flowLen : vec2(1.0, 0.0);
    vec2 perp = vec2(-dir.y, dir.x);
    float across = dot(gl_FragCoord.xy, perp);
    float along = dot(gl_FragCoord.xy, dir);

    // Bristle lanes, kept low-contrast so they never marble.
    float lane = floor(across / 3.0);
    float laneJitter = fract(sin(lane * 127.1) * 43758.5453);
    float bristle = mix(0.72, 1.08, laneJitter);
    float breakup = 0.92 + 0.12 * sin(along * 0.1 + laneJitter * 6.2831853);
    float body = amount * bristle * breakup;

    // Crisp-edged coverage: paint has a boundary, not a glow.
    float cov = smoothstep(0.14, 0.36, body);

    // Pigment read off the trail's alpha — the colour the brush was loaded
    // with when this paint was laid down. One gesture, one colour.
    float sector = mod(floor(flow.a * 4.0 + (laneJitter - 0.5) * 0.5), 4.0);
    vec3 pigment =
      sector < 1.0 ? vec3(0.30, 0.56, 0.24) :  // leaf green — the site accent
      sector < 2.0 ? vec3(0.21, 0.34, 0.78) :  // cobalt
      sector < 3.0 ? vec3(0.88, 0.36, 0.23) :  // vermilion
                     vec3(0.90, 0.64, 0.24);   // marigold
    pigment *= mix(0.9, 1.08, laneJitter);
    float edgeBand = smoothstep(0.14, 0.2, body) - smoothstep(0.2, 0.52, body);
    pigment *= 1.0 - edgeBand * 0.3;

    // Near-opaque where covered, following the form only slightly.
    col = mix(col, pigment, cov * (0.75 + 0.25 * lit));

    // A tight glint from the key light; wet-glossy where fresh paint sits.
    vec3 hv = normalize(view + keyDir);
    float spec = pow(clamp(dot(n, hv), 0.0, 1.0), 42.0) * 0.16;
    col += spec * (1.0 + vPaint * 2.5);

    gl_FragColor = vec4(col, uOpacity);
  }
`;

/** Shared 1×1 white texture for meshes without a base-color map — their
 * colour then comes entirely from uBase. */
const WHITE = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
WHITE.needsUpdate = true;

/** One instance of the cluster's surface material. */
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
      /** World-units surface swell under fully fresh paint. Kept small: it
       * displaces vertices along their normals, which on the hard-edged models
       * (duplicated edge vertices, divergent normals) splits faces into visible
       * cracks — the "breaking apart" on a painted object. Since the paint now
       * deposits at full thickness, even a little goes a long way. */
      uPuff: { value: 0.015 },
      uUnlit: { value: unlit ? 1 : 0 },
      uHaze: { value: haze },
    },
  });
}

/**
 * The paper paint layer: a full-screen quad that draws the same brush trail
 * onto the empty page around the objects, so a stroke doesn't stop at a
 * model's edge — the whole hero takes paint, not just the 3D set.
 *
 * It samples the identical flow field the model shader reads and reuses its
 * exact bristle / coverage / pigment maths, so a stroke crossing off an object
 * onto the paper is continuous, with no seam at the silhouette. Drawn first
 * (renderOrder well below everything) as a transparent background: pigment
 * where paint has been laid, nothing elsewhere, so the CSS paper shows through
 * and the models composite on top. Its clip-space vertex shader ignores all
 * matrices, so it fills the viewport regardless of the parent group's
 * scale/tilt/offset.
 */
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

          // Stroke frame — identical to the model shader, so paper strokes
          // and object strokes share one grain.
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
            sector < 1.0 ? vec3(0.30, 0.56, 0.24) :  // leaf green — the accent
            sector < 2.0 ? vec3(0.21, 0.34, 0.78) :  // cobalt
            sector < 3.0 ? vec3(0.88, 0.36, 0.23) :  // vermilion
                           vec3(0.90, 0.64, 0.24);   // marigold
          pigment *= mix(0.9, 1.08, laneJitter);
          float edgeBand = smoothstep(0.14, 0.2, body) - smoothstep(0.2, 0.52, body);
          pigment *= 1.0 - edgeBand * 0.3;

          // Slightly softer than on the objects: paint on bare paper wants to
          // read as a wash, not a decal.
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

/**
 * The laptop's display, drawn at runtime: a little code editor in the
 * site's palette instead of the stock desktop screenshot the model shipped
 * with. Deterministic, so every visitor sees the same screen.
 */
function makeEditorTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const texture = new CanvasTexture(canvas);
  // glTF UVs use a top-left origin, as a canvas already does — three's
  // default flipY would show the screen upside down.
  texture.flipY = false;
  // Display-space, like every other colour in the cluster shader.
  texture.colorSpace = NoColorSpace;
  const ctx = canvas.getContext("2d");
  if (!ctx) return texture;

  ctx.fillStyle = "#14140f";
  ctx.fillRect(0, 0, 1024, 512);

  // Title bar, traffic lights.
  ctx.fillStyle = "#1f1f18";
  ctx.fillRect(0, 0, 1024, 44);
  ["#cd5b34", "#e6a23c", "#55833f"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(34 + i * 34, 22, 9, 0, Math.PI * 2);
    ctx.fill();
  });

  // Seeded LCG, so the "code" never changes between visits.
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  // File tree.
  ctx.fillStyle = "#191913";
  ctx.fillRect(0, 44, 150, 424);
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = "rgba(236, 231, 217, 0.25)";
    ctx.fillRect(24 + (i % 3) * 10, 70 + i * 34, 70 + rand() * 40, 8);
  }

  // Code: indented bars in the paint palette.
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

  // Status bar.
  ctx.fillStyle = "#3f5b3a";
  ctx.fillRect(0, 468, 1024, 44);
  ctx.fillStyle = "#ece7d9";
  ctx.font = "600 20px monospace";
  ctx.fillText("advay — portfolio.tsx", 24, 497);

  return texture;
}

type Drifter = {
  role: string;
  /** GLB under /public, already optimised. */
  file: string;
  /** Longest dimension after normalisation, in cluster units. */
  size: number;
  /** Home slot in cluster-normalised space, roughly [-1, 1]. */
  home: readonly [number, number, number];
  /** Resting orientation; the sway oscillates around it, never leaves it. */
  rest: readonly [number, number, number];
  opacity: number;
  bob: number;
  bobSpeed: number;
  /** Sway amplitude around the rest pose, radians, [pitch, yaw]. */
  sway: readonly [number, number];
  phase: number;
  /**
   * Extra scroll rate in cluster units over the hero's scroll-out, on top of
   * the whole-sheet drift in Hero.tsx. Near objects leave faster than far
   * ones, which is what makes scrolling reveal the stack's depth.
   */
  parallax: number;
  /** Atmospheric fade toward the paper, for objects deep in the stack. */
  haze?: number;
  /** Replace this model's display quad with the runtime-drawn editor. */
  screen?: boolean;
};

/**
 * The roster. A scale hierarchy, not equals: the planet anchors the centre,
 * two mid satellites, two smaller ones behind — a solar system, not a pile.
 */
const DRIFTERS: Drifter[] = [
  {
    // Jupiter for now — saturn.glb is still in /models/opt, but its source
    // model keeps its planet surface on the stripped heavy mesh, so what
    // remains renders as a white blob. Swap the file back if that gets fixed.
    role: "banded planet (anchor)",
    file: "/models/opt/jupiter.glb",
    // A bare globe: smaller than the ringed planet's 1.5, which budgeted for
    // ring span.
    size: 1.1,
    home: [0.0, 0.12, 0],
    // Slight roll so the cloud bands cross the frame at an angle.
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
    // Down-left of its old slot: off the planet's limb and clear of the
    // canvas edge.
    home: [0.64, -0.7, -0.3],
    // The bake already turns the display toward the camera (see GlbModel's
    // screen-facing alignment), so rest is just a slight turn for depth.
    rest: [0.12, -0.18, 0.02],
    opacity: 1,
    bob: 0.06,
    bobSpeed: 0.5,
    // Yaw sway kept tight so the screen stays readable through the swing.
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
    // Up and out, so the piece's base clears the planet's limb — but below
    // the contain-fit's visible ceiling (~1.17 cluster units on a portrait
    // canvas), which the old 0.96 slot put the crown right against.
    home: [-0.74, 0.88, -0.7],
    rest: [0.12, 0.6, -0.08],
    // Full-bodied; the depth haze below carries the distance instead.
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
    // In front of the planet's plane (z > 0) instead of deep behind it: at
    // z = -0.8 its long blade was constantly swept behind Jupiter's disc and
    // swallowed. Frontmost now, so it always reads — with the haze dropped
    // and full opacity to match its new place at the near edge of the stack.
    // Lowered and shrunk from [0.56, 0.74, 0.32]/0.9: the long blade points
    // up-left, so at that height (enlarged by the forward push) its tip ran
    // off the top edge.
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

/** How far the moon's orbit sits above the planet's centre. Near zero, so the
 * ring crosses the middle of Jupiter's disc rather than riding over its top. */
const ORBIT_RISE = 0.0;

/** Depth amplitude of the orbit — how far the moon swings toward and away from
 * the camera. Must clear the planet's front bulge (radius ~0.55): at the old
 * 0.45 the moon's front pass sat inside Jupiter's surface and was occluded by
 * it, reading as the moon dissolving into the planet. */
const ORBIT_DEPTH = 0.82;

/**
 * The 3D paintbrush that rides the pointer — the hero's cursor. A CSS cursor
 * cannot be a model (cursors are 2D bitmaps, capped around 128px), so the
 * brush lives in the scene instead: it follows the pointer, leans into
 * strokes, dips as it paints, and the native cursor is hidden while it does
 * (see the data-brush3d toggle).
 */
const BRUSH_FILE = "/models/opt/paintbrush.glb";
/** Longest side of the brush, cluster units. */
const BRUSH_SIZE = 0.32;
/** Held orientation: handle up-right, bristles pointing down-left. The
 * model's tip is authored along +Y, so the roll is π minus the lean — the
 * first guess had it exactly backwards. */
const BRUSH_REST = [0.2, 0.15, 2.4] as const;
/** Offset from the model's centre to where its bristle tip should sit, so
 * the tip — not the middle of the handle — lands on the pointer. */
const BRUSH_TIP = { x: 0.11, y: 0.11 };

/** Switches off the 3D paintbrush cursor and its painting mechanic (the
 * stamp pass, the demo stroke, and the paper/model paint compositing) while
 * leaving the rest of the cluster — the drifting models, their wake, and the
 * moon — untouched. Flip back to true to bring painting back. */
const BRUSH_ENABLED = false;

for (const d of DRIFTERS) useGLTF.preload(d.file);
useGLTF.preload(MOON_FILE);
if (BRUSH_ENABLED) useGLTF.preload(BRUSH_FILE);

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

/**
 * One loaded model, normalised into the cluster's units: geometry baked to
 * world transforms, centred on its bounding-box centre, longest side scaled
 * to `size`, and every mesh re-materialed with the cluster shader (keeping
 * its base-color texture as the tint source).
 */
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
  /** When set, any tiny quad mesh (≤8 vertices) gets this texture, unlit —
   * how the laptop's display quad is found and replaced. */
  screenTexture?: Texture;
  /** Baseline depth haze for this model's materials. */
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

      // The display: in this laptop model the screen is a bare 2-triangle
      // quad, so a vertex-count test finds it without relying on names.
      const isScreen =
        !!screenTexture &&
        (geometry.getAttribute("position")?.count ?? Infinity) <= 8;
      if (isScreen) screenGeometry = geometry;

      const std = (
        Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      ) as MeshStandardMaterial;
      const map = isScreen ? screenTexture : std?.map ?? null;
      if (map && !isScreen) {
        // The shader works in display space; leave the texture's sRGB bytes
        // as-is instead of letting three decode them to linear on sample.
        map.colorSpace = NoColorSpace;
        map.needsUpdate = true;
      }
      // Display-space flat colour factor (white for purely textured parts).
      const base = isScreen
        ? new Color(1, 1, 1)
        : (std?.color ?? new Color(1, 1, 1)).clone().convertLinearToSRGB();

      entries.push({
        geometry,
        material: makeClusterMaterial(map, base, opacity, isScreen, haze),
      });
    });

    // When the model has a display, rotate the whole machine so the display
    // faces the camera — measured from the quad's own normal, instead of
    // guessing yaw per model. The quad's two possible facings are
    // disambiguated by pointing away from the body's mass, and the roll is
    // corrected afterwards so the model's up stays up.
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
      // A clamshell's base sticks out on the *viewing* side of its display,
      // so the true screen normal points toward the body's mass — the
      // vector from body to screen should oppose it.
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

    // Normalise: centre on the bounding-box centre, longest side = size.
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

/** A missing or corrupt GLB must cost the hero its decoration, not the page
 * its render. */
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

/** Scratch vector for solving the brush's position against its depth plane. */
const BRUSH_TARGET = new Vector3();

/** The brush floats this far toward the camera, in cluster-local units, so it
 * sits over the objects rather than in among them. */
const BRUSH_Z = 1.05;

function Cluster() {
  const groupRef = useRef<Group>(null);
  const drifterRefs = useRef<(Group | null)[]>([]);
  const moonRef = useRef<Group | null>(null);
  const brushRef = useRef<Group | null>(null);
  /** The laptop's display content, drawn once. */
  const editorTexture = useMemo(() => makeEditorTexture(), []);
  /** The brush is deliberately never registered for paint uniforms, so the
   * brush itself cannot be painted. */
  const noopRegister = useCallback(() => {}, []);
  /** Per-drifter materials (moon last), registered as models load. */
  const materialsRef = useRef<ShaderMaterial[][]>(
    Array.from({ length: DRIFTERS.length + 1 }, () => [])
  );
  /** Latest pointer position in client pixels, whether one has been seen,
   * and whether a click is waiting to become a splat. */
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

  // The paper paint layer: one full-screen quad and its material, drawn as
  // the scene's background so paint lands on the page, not only the models.
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

  // The brush: the pigment-carrying stamp pass and its ping-pong targets.
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
      // Faded in alongside the moon's entrance, in the frame loop.
      opacity: 0,
      dashSize: 0.05,
      gapSize: 0.045,
      depthWrite: false,
    });
    const line = new ThreeLine(geometry, material);
    // Dashes need per-vertex line distances, or the material draws solid.
    line.computeLineDistances();
    // Drawn after the models. Everything here is in the transparent pass, so
    // three sorts by object-centre depth — and the line's centre is the
    // planet's centre, which left the whole ellipse drawn first and buried
    // under the planet's depth write. Pushed late, the depth test does the
    // right thing instead: the far half dips behind the planet, the near
    // half crosses in front of it.
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

  // Window-level pointer tracking: the hero's type columns are full-width
  // layers above this canvas and swallow its events, so the canvas can never
  // be trusted to see every move itself.
  useEffect(() => {
    const p = pointerRef.current;
    const onMove = (event: PointerEvent) => {
      p.clientX = event.clientX;
      p.clientY = event.clientY;
      p.seen = true;
    };
    // A click over the canvas is a splat (consumed in the frame loop; a
    // click elsewhere on the page does nothing). It also drops any active
    // text selection — the click reads as a deliberate paint gesture, not a
    // continuation of a drag-select that happened to end over the canvas.
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
    /** Entrance progress: objects pop in staggered on load. */
    intro: 0,
    /** Pointer presence, eased — gates the wake and the brush's stamping. */
    strength: 0,
    /** Last pointer position in canvas UV space, and smoothed velocity. */
    last: new Vector2(0.5, 0.5),
    vel: new Vector2(0, 0),
    /** First reading after idle is a jump, not movement; skip its velocity. */
    prime: true,
    read: makeFlowTarget(),
    write: makeFlowTarget(),
    resolution: new Vector2(1, 1),
    /** Which of the four pigments the brush is loaded with, and how long it
     * has been painting with it. */
    pigment: 0,
    paintT: 0,
    /** The 3D brush: smoothed position, splat pulse, cursor-handover flag. */
    brushPos: new Vector2(0, 0),
    brushPulse: 0,
    brushShown: false,
    /** The demo stroke: 0 waiting, 1 running, 2 done (or forfeited). */
    ghost: { phase: 0 as 0 | 1 | 2, wait: 0, t: 0 },
    springs: DRIFTERS.map(() => ({
      off: new Vector2(),
      vel: new Vector2(),
      // Jelly pulse: a scale oscillator kicked by brush contact.
      pulse: 0,
      pulseVel: 0,
    })),
  });

  // Clear both trail buffers on the first frame, so nothing is painted
  // before the first stroke.
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

    // Clamped so a restored tab resumes instead of fast-forwarding.
    const step = Math.min(delta, 0.05);
    const s = sim.current;
    s.time += step;

    // The canvas spans the whole hero so the brush can paint anywhere in it,
    // but the cluster keeps its old seat: contain-fitted to the right column
    // (SCENE_COLUMN of the width — the box the canvas itself used to be) and
    // shifted to that column's centre. Everything downstream that maps the
    // pointer into cluster space undoes the same shift.
    const columnW = state.viewport.width * SCENE_COLUMN;
    const fit = (0.85 * Math.min(columnW, state.viewport.height)) / 2;
    const offsetX = (state.viewport.width * (1 - SCENE_COLUMN)) / 2;
    group.scale.setScalar(fit);
    group.position.x = offsetX;

    // Pointer → canvas-normalised coordinates.
    const p = pointerRef.current;
    let nx = 0;
    let ny = 0;
    let near = false;
    if (p.seen) {
      const rect = state.gl.domElement.getBoundingClientRect();
      if (rect.width && rect.height) {
        nx = ((p.clientX - rect.left) / rect.width) * 2 - 1;
        ny = 1 - ((p.clientY - rect.top) / rect.height) * 2;
        // A soft margin, so a stroke can start just off the edge.
        near = Math.abs(nx) <= 1.15 && Math.abs(ny) <= 1.15;
      }
    }
    // The real pointer, before the demo stroke may take the controls: cursor
    // handover must always follow the visitor's hand.
    const realNx = nx;
    const realNy = ny;

    // The demo stroke. The paint system is the hero's best trick and also its
    // most hidden one, so if the visitor hasn't painted within a few seconds
    // of the cluster settling, the brush lifts itself and lays one stroke
    // across the planet — the whole mechanic demonstrated without a tooltip.
    // Painting first forfeits it; it runs at most once. It works by steering
    // the same pointer-derived variables the visitor's hand would, so the
    // brush model, wake, and stamp all behave exactly as they do for a real
    // gesture.
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
      // A shallow arc across the planet's face, eased at both ends the way a
      // hand strokes: slow touch-down, confident middle, gentle lift. Plotted
      // in cluster space and converted to canvas UV here, so the stroke stays
      // on the planet no matter what shape the full-bleed canvas is.
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
        // The next real pointer reading is a jump, not a stroke.
        s.prime = true;
      }
    }
    s.strength += ((near ? 1 : 0) - s.strength) * Math.min(1, step * 5);

    // Pointer velocity in the canvas's UV space, smoothed and clamped.
    const uvx = (nx + 1) / 2;
    const uvy = (ny + 1) / 2;
    if (ghost) {
      // The stroke's own pace, not the pointer's: a steady, deliberate speed
      // along the path, strong enough to lay full paint. Per-frame deltas
      // through the usual gain would come out frame-rate dependent and faint.
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

    // A click over the canvas is a splat: one frame of a wide, fully loaded
    // stamp — a solid blot of the next pigment — plus a physical kick to
    // everything nearby (below, in the drifter loop).
    const splat = p.splat && near && !ghost;
    p.splat = false;
    if (splat) {
      s.pigment = (s.pigment + 1) % 4;
      s.paintT = 0;
    }

    // Reload the brush while it is actually painting — about a second per
    // pigment, cycling the palette — so successive gestures lay different
    // colors, and one gesture stays one color. The demo stroke is exempt: it
    // is one gesture by definition, so it holds one pigment start to finish.
    if (!ghost && near && s.vel.length() > 0.2) {
      s.paintT += step;
      if (s.paintT > 0.9) {
        s.paintT = 0;
        s.pigment = (s.pigment + 1) % 4;
      }
    }
    brush.material.uniforms.uHue.value = (s.pigment + 0.5) / 4;

    // Stamp pass: previous trail in, faded + freshly stamped trail out, then
    // swap. Runs at default priority, so r3f still renders the scene after.
    // Skipped entirely while the brush is disabled, so the flow buffers stay
    // cleared and no paint ever shows on the models or the paper layer.
    if (BRUSH_ENABLED) {
      brush.material.uniforms.uMouse.value.set(uvx, uvy);
      brush.material.uniforms.uFalloff.value = splat ? 0.26 : 0.12;
      if (splat) {
        // A fake full-speed velocity, so the blot stamps at full strength
        // even from a standing click.
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
    // Same fresh trail into the paper layer, so it and the models paint in
    // lockstep off one field.
    paintLayer.material.uniforms.tFlow.value = s.read.texture;
    paintLayer.material.uniforms.uResolution.value.copy(s.resolution);

    // Cursor in cluster-normalised space, for the wake maths — undoing both
    // the contain-scale and the cluster's seat in the right column.
    const lx = ((nx * state.viewport.width) / 2 - offsetX) / fit;
    const ly = (ny * state.viewport.height) / 2 / fit;

    // Hero scroll-out progress, for the per-object parallax. The hero spans
    // one viewport from the top of the page, so this is simply how far into
    // leaving it the visitor is.
    const scroll = Math.min(
      1,
      Math.max(0, window.scrollY / Math.max(1, window.innerHeight))
    );

    // Entrance: staggered back-out pop-in, once models are actually here.
    if (drifterRefs.current.some(Boolean)) {
      s.intro = Math.min(1, s.intro + step / 1.1);
    }
    const enter = (index: number) => {
      const t = Math.min(1, Math.max(0, (s.intro - index * 0.1) / 0.55));
      // Back-out: overshoots to ~1.1 and settles, so arrival has weight.
      const u = t - 1;
      return t === 0 ? 0 : 1 + 2.70158 * u * u * u + 1.70158 * u * u;
    };

    DRIFTERS.forEach((d, i) => {
      const mesh = drifterRefs.current[i];
      if (!mesh) return;
      const spring = s.springs[i];
      const entered = enter(i);

      // The wake: a push away from the cursor that fades with distance and
      // scales with stroke speed — a drift barely stirs, a swipe shoves...
      const dxw = d.home[0] + spring.off.x - lx;
      const dyw = d.home[1] + spring.off.y - ly;
      const dist = Math.hypot(dxw, dyw);
      const brushSpeed = s.vel.length();
      if (s.strength > 0.05 && dist < WAKE_REACH && dist > 0.0001) {
        const prox = 1 - dist / WAKE_REACH;
        const push = prox * (0.6 + brushSpeed * 1.1) * s.strength;
        spring.vel.x += (dxw / dist) * push * step;
        spring.vel.y += (dyw / dist) * push * step;

        // Brush contact: a fast stroke over an object makes it flinch.
        spring.pulseVel += prox * brushSpeed * 9 * s.strength * step;
      }

      // Splat kick: a one-off impulse, wider than the wake.
      if (splat && dist > 0.0001 && dist < WAKE_REACH * 1.4) {
        const proxS = 1 - dist / (WAKE_REACH * 1.4);
        spring.pulseVel += proxS * 2.2;
        spring.vel.x += (dxw / dist) * proxS * 0.9;
        spring.vel.y += (dyw / dist) * proxS * 0.9;
      }

      // The pulse is a stiff, lightly damped spring — jelly, not a knob.
      spring.pulseVel += (-spring.pulse * 45 - spring.pulseVel * 5.5) * step;
      spring.pulse += spring.pulseVel * step;
      mesh.scale.setScalar(
        entered * (1 + Math.max(-0.18, Math.min(0.22, spring.pulse)))
      );
      for (const material of materialsRef.current[i]) {
        material.uniforms.uOpacity.value = d.opacity * Math.min(1, entered);
      }

      // ...against a critically-damped-ish spring back to the home slot.
      spring.vel.x += (-spring.off.x * 3.2 - spring.vel.x * 2.4) * step;
      spring.vel.y += (-spring.off.y * 3.2 - spring.vel.y * 2.4) * step;
      spring.off.x += spring.vel.x * step;
      spring.off.y += spring.vel.y * step;

      const bobY = Math.sin(s.time * d.bobSpeed + d.phase) * d.bob;
      const bobX =
        Math.cos(s.time * d.bobSpeed * 0.8 + d.phase * 1.3) * d.bob * 0.6;
      mesh.position.set(
        d.home[0] + bobX + spring.off.x,
        // Scrolling lifts each object at its own rate — near ones fastest —
        // so the stack's depth shows the moment the page starts to move.
        d.home[1] + bobY + spring.off.y + scroll * d.parallax,
        d.home[2]
      );
      mesh.rotation.x =
        d.rest[0] + Math.sin(s.time * d.bobSpeed * 0.7 + d.phase) * d.sway[0];
      mesh.rotation.y =
        d.rest[1] +
        Math.sin(s.time * d.bobSpeed * 0.5 + d.phase * 1.7) * d.sway[1];
    });

    // The moonlet's orbit: inclined around the planet's home, swinging in
    // front of and behind it, one lap roughly every 16 seconds.
    const moonMesh = moonRef.current;
    if (moonMesh) {
      const a = s.time * 0.4 + 1.2;
      const anchor = DRIFTERS[0];
      // The moon and its drawn orbit ride the planet's parallax, so the
      // little system scrolls out as one body.
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

    // The 3D paintbrush riding the pointer: eased position for weight, a
    // dip toward the set while a stroke is laid, a lean into the stroke's
    // direction, and a pulse on splat.
    //
    // The brush floats toward the camera (local z ~1.05) while lx/ly were
    // solved on the z=0 plane, so placing it straight at (lx, ly) leaves it
    // off the cursor — and, because it is a perspective error, further off the
    // further the pointer is from screen centre. Instead aim a ray from the
    // camera through the pointer and drop the brush where that ray crosses its
    // own depth plane, then bring that world point back into the group's
    // scaled, tilted, column-shifted local space. Now the tip tracks the
    // cursor everywhere in the canvas.
    const brushMesh = brushRef.current;
    if (brushMesh) {
      const dip = Math.min(1, s.vel.length());
      const localZ = BRUSH_Z - dip * 0.12;
      const worldZ = localZ * fit;

      // Ray camera → pointer, intersected with world z = worldZ.
      BRUSH_TARGET.set(nx, ny, 0.5)
        .unproject(state.camera)
        .sub(state.camera.position)
        .normalize();
      const travel =
        (worldZ - state.camera.position.z) / BRUSH_TARGET.z;
      BRUSH_TARGET.multiplyScalar(travel).add(state.camera.position);

      // World → group-local: undoes the group's scale, cursor tilt, and the
      // cluster's seat in the right column in one step. The matrix is a frame
      // stale in useFrame, so refresh it first — the tilt eases slowly enough
      // that this only matters to sub-pixel accuracy, but it is free here.
      group.updateWorldMatrix(true, false);
      group.worldToLocal(BRUSH_TARGET);

      // Eased in the same local space lx/ly lived in, so weight and lag read
      // exactly as before.
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

    // The brush is the hero's only cursor: while the (real) pointer is over
    // the canvas the native cursor hides and the modelled brush carries it.
    // Judged on the real pointer — while the demo stroke borrows nx/ny, the
    // visitor's cursor may be nowhere near the canvas, and hiding it there
    // would be wrong.
    if (BRUSH_ENABLED) {
      const inCanvas = p.seen && Math.abs(realNx) <= 1 && Math.abs(realNy) <= 1;
      if (inCanvas !== s.brushShown) {
        s.brushShown = inCanvas;
        const hero = state.gl.domElement.closest<HTMLElement>(".hero-brush");
        if (hero) hero.dataset.brush3d = inCanvas ? "true" : "false";
      }
    }

    // Gentle tilt toward the cursor, clamped because the window pointer can
    // range far outside the canvas.
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
      {/* The paper paint layer — outside the group, so the group's scale,
          tilt and column offset never touch its full-screen quad. Drawn first
          (renderOrder well below the models and orbit) as the background the
          rest of the scene composites over. Skipped while the brush is
          disabled — see BRUSH_ENABLED. */}
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
