import { BackSide, NormalBlending, ShaderMaterial, type Texture } from "three";

/**
 * Multiside refraction, ported from drcmda's "the substance".
 *
 * A single-pass refractive material only ever knows the normal of the face the
 * camera can see, so light bends once on the way in and never on the way out.
 * That is what makes a gem read as a lump of glass: the interior is flat.
 *
 * The fix is to render the shape twice. The *back* faces go into one buffer as
 * raw normals, the scene behind the stone goes into another, and then the front
 * faces are drawn with both to hand: the normal used for refraction is a blend
 * of the near face and the far one, so the ray is bent by the whole solid
 * rather than by its front surface alone.
 *
 * Reference: https://github.com/drcmda/the-substance (src/diamonds), after the
 * Codrops article "Real-time Multiside Refraction in Three Steps".
 */

/** Pass one: the far side of the stone, written out as normals-as-colour. */
export class BackfaceMaterial extends ShaderMaterial {
  constructor() {
    super({
      vertexShader: /* glsl */ `
        varying vec3 worldNormal;

        void main() {
          worldNormal = normalize(modelViewMatrix * vec4(normal, 0.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 worldNormal;

        void main() {
          gl_FragColor = vec4(worldNormal, 1.0);
        }
      `,
      side: BackSide,
    });
  }
}

export type RefractionOptions = {
  /** The scene behind the stone, rendered to a target. */
  envMap: Texture;
  /** The stone's own back faces, as normals. */
  backfaceMap: Texture;
  /** Drawing-buffer size, for turning gl_FragCoord into a UV. */
  resolution: [number, number];
};

/**
 * Hue to RGB, as a full-saturation rainbow.
 *
 * Cheaper than a full HSV conversion and it is all this needs: the light in the
 * stone is always saturated, only its hue and brightness change.
 */
const HUE = /* glsl */ `
  vec3 hue2rgb(float h) {
    return clamp(
      abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0,
      0.0,
      1.0
    );
  }
`;

/** Pass three: the near side, refracting the environment through both normals. */
export class RefractionMaterial extends ShaderMaterial {
  constructor({ envMap, backfaceMap, resolution }: RefractionOptions) {
    super({
      vertexShader: /* glsl */ `
        varying vec3 worldNormal;
        varying vec3 viewDirection;

        void main() {
          worldNormal = normalize(modelViewMatrix * vec4(normal, 0.0)).xyz;
          viewDirection = normalize(
            (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition
          );
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D envMap;
        uniform sampler2D backfaceMap;
        uniform vec2 resolution;
        uniform vec3 rimColor;

        uniform vec2  culet;
        uniform float time;
        uniform float dispersion;
        uniform float glow;
        uniform float shine;
        uniform vec3  lift;

        varying vec3 worldNormal;
        varying vec3 viewDirection;

        ${HUE}

        // One virtual light. Written as a function rather than an array of
        // directions because GLSL ES 1.00 has no array initialisers.
        float lamp(vec3 n, vec3 direction, float power) {
          return pow(max(dot(n, normalize(direction)), 0.0), power);
        }

        // Edge term. The reference uses an exponent of 100 against a dark page,
        // where a pale rim is what separates stone from ground. This page is
        // near-white, so the rim is inked instead and widened a little — a
        // light rim on light paper is exactly how a silhouette disappears.
        float fresnelFunc(vec3 viewDirection, vec3 worldNormal) {
          return pow(1.05 + dot(viewDirection, worldNormal), 45.0);
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / resolution;

          // Front normal and far-side normal, mixed 0.3 / 0.7. Weighting the
          // back face this heavily is what gives the interior its depth.
          vec3 normal =
            worldNormal * (1.0 - 0.7) - texture2D(backfaceMap, uv).rgb * 0.7;

          // 1.0 / 1.5 rather than diamond's true 2.42: the screen-space
          // environment is a flat capture, and a stronger index shears it into
          // mush instead of bending it into facets.
          // Hovering widens the split between the channels, so the stone
          // visibly throws more colour when the pointer is on it.
          float spread = dispersion * (1.0 + shine * 0.8);

          vec2 shiftR = refract(viewDirection, normal, 1.0 / (1.5 - spread)).xy;
          vec2 shiftG = refract(viewDirection, normal, 1.0 / 1.5).xy;
          vec2 shiftB = refract(viewDirection, normal, 1.0 / (1.5 + spread)).xy;

          // One index per channel. Glass bends short wavelengths harder than
          // long ones, and sampling the environment three times is what turns
          // that into the coloured fringing a stone actually shows.
          vec3 color = vec3(
            texture2D(envMap, uv + shiftR).r,
            texture2D(envMap, uv + shiftG).g,
            texture2D(envMap, uv + shiftB).b
          );

          // Interior lift.
          //
          // With nothing on the environment layer every facet samples pure
          // black, and the stone goes so dark that only the culet light shows.
          // This stands in for the room the stone would be sitting in — but as
          // hard structure, not ambient light.
          //
          // That distinction is the whole thing. Raising every facet by a
          // smooth gradient lands them all in one narrow band of grey, which
          // reads as frosted plastic. A gem reads through the contrast between
          // neighbouring facets, so the ramp below is quantised into a handful
          // of plateaus with hard edges: adjacent facets fall onto different
          // steps and the crown gets light and dark faces to be cut from.
          vec3 n = normalize(normal);
          vec2 room = clamp(uv + shiftG, 0.0, 1.0);

          float ramp =
            smoothstep(0.05, 0.95, room.y) * 0.6 +
            (0.5 + 0.5 * dot(n, vec3(0.35, 0.78, 0.52))) * 0.4;

          float steps = 4.0;
          float banded = clamp(floor(ramp * steps) / (steps - 1.0), 0.0, 1.0);

          color += lift * mix(0.25, 1.35, banded);

          // Virtual lamps. Nothing exists to reflect, so the highlights are
          // computed straight off the normal: a high exponent makes each one a
          // small hard hit on whichever facets happen to face it, which is what
          // actually reads as lit. These sweep across the crown as it turns.
          float spec =
            lamp(n, vec3(0.5, 0.8, 0.6), 60.0) +
            lamp(n, vec3(-0.7, 0.3, 0.5), 80.0) * 0.7 +
            lamp(n, vec3(0.1, -0.6, 0.8), 45.0) * 0.5;

          color += vec3(1.0) * spec * (0.9 + shine * 0.8);

          // A multicolour source sitting at the culet. Its position is taken in
          // the *refracted* frame, so every facet picks up a different slice of
          // it and the light appears to break up inside the solid rather than
          // being painted over it.
          vec2 delta = (uv + shiftG) - culet;
          float dist = length(delta);
          float angle = atan(delta.y, delta.x);

          // Hue runs around the source and outward from it at once, so the
          // stone shows both radial spokes and concentric bands of colour.
          //
          // Both of the terms below relax as the stone lights up, and only
          // then. At rest the light is a small, tightly banded, fully saturated
          // point at the culet, which is what makes it read as a source. Those
          // same values applied once the light reaches the girdle would band
          // the entire crown into a spectrum chart, so hovering widens the
          // bands and pulls the colour toward white — dispersion is white light
          // splitting at edges, and a facet that bright should blow out white
          // with coloured fringes rather than fill with flat hue.
          float banding = mix(1.6, 0.8, shine);
          vec3 hue = hue2rgb(fract(angle / 6.2831853 + dist * banding + time * 0.05));
          vec3 fire = mix(vec3(1.0), hue, mix(1.0, 0.6, shine));

          // Inverse-square-ish falloff: bright at the tip, gone by the girdle.
          // Hovering turns the source up and lets it reach further, so the
          // whole stone lights from within rather than just the pavilion.
          // Hovering brightens the source and widens its reach, but only a
          // little of each. Pushed harder, the light stops falling off before
          // the girdle and every facet clips to a primary — which reads as an
          // oil slick, not a stone. The widened dispersion above is what
          // carries "it caught the light"; this is only support.
          float reach = mix(90.0, 60.0, shine);
          color += fire * glow * (1.0 + shine * 0.5) / (1.0 + dist * dist * reach);

          // Ink the edge so the silhouette holds against pale paper. Hovering
          // lifts it slightly toward the fire, but never far: the outline is
          // the only thing separating the stone from the page, and a rainbow
          // rim gives that up.
          float edge = fresnelFunc(viewDirection, normal);
          vec3 rim = mix(rimColor, fire, shine * 0.25);

          gl_FragColor = vec4(mix(color, rim, edge), 1.0);
        }
      `,
      uniforms: {
        envMap: { value: envMap },
        backfaceMap: { value: backfaceMap },
        resolution: { value: resolution },
        // The page's ink, not the reference's mid grey: this rim exists to hold
        // the outline against near-white paper.
        rimColor: { value: [0.08, 0.08, 0.06] },
        // Screen-space position of the stone's tip, updated per frame.
        culet: { value: [0.5, 0.5] },
        time: { value: 0 },
        dispersion: { value: 0.055 },
        glow: { value: 1.5 },
        shine: { value: 0 },
        // How bright the stone sits with an empty environment. Kept low on
        // purpose: the virtual lamps supply the brightness, and this only has
        // to keep the unlit facets from being pure black. Raising it much past
        // 0.25 flattens the contrast the faceting depends on.
        lift: { value: [0.2, 0.2, 0.195] },
      },
    });
  }
}

export type SpillOptions = {
  /** Drawing-buffer size, for turning gl_FragCoord into a UV. */
  resolution: [number, number];
};

/**
 * The light that escapes the stone.
 *
 * A real gem does not keep its fire inside: it throws coloured light onto
 * whatever it is sitting on. This is a quad behind the stone, drawn in the same
 * screen-space frame as the refraction and sharing its `culet` uniform, so the
 * halo is anchored to the same source.
 *
 * It depth-tests against the stone, which is opaque and drawn first, so the
 * spill is only ever visible *around* the silhouette — never washed over the
 * facets it is supposed to be escaping from.
 *
 * Blending is normal rather than additive on purpose: the page is near-white,
 * and adding light to white paper produces white. Tinting it is what reads as
 * coloured light falling on a pale surface.
 */
export class SpillMaterial extends ShaderMaterial {
  constructor({ resolution }: SpillOptions) {
    super({
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
      vertexShader: /* glsl */ `
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec2  resolution;
        uniform vec2  culet;
        uniform float time;
        uniform float shine;
        uniform float strength;

        ${HUE}

        void main() {
          vec2 uv = gl_FragCoord.xy / resolution;
          vec2 delta = uv - culet;
          float dist = length(delta);
          float angle = atan(delta.y, delta.x);

          // Same hue field as the stone's interior — including the way its
          // radial rate relaxes as the stone lights up, or the bands would stop
          // lining up across the silhouette — so the halo reads as that light
          // continuing outward, not a separate effect. Kept fully saturated
          // here: this is light falling on pale paper, where the white the
          // interior needs would simply vanish.
          float banding = mix(1.6, 0.8, shine);
          vec3 fire = hue2rgb(fract(angle / 6.2831853 + dist * banding + time * 0.05));

          // Rays: a soft angular ripple, so the spill breaks into beams the way
          // light through facets does instead of being an even disc.
          float rays = 0.72 + 0.28 * sin(angle * 9.0 - time * 0.35);

          float radius = mix(0.26, 0.46, shine);
          float falloff = smoothstep(radius, 0.0, dist);
          falloff *= falloff;

          // Fade out toward the canvas edges independently of the radial
          // falloff above: on a small or off-centre container the culet can
          // sit close enough to a side that the rays haven't reached zero by
          // the time they hit it, so the quad's own rectangle shows as a hard
          // line. This keeps the halo inside its box no matter where the
          // stone sits.
          vec2 edgeDist = min(uv, 1.0 - uv);
          float edgeFade = smoothstep(0.0, 0.1, min(edgeDist.x, edgeDist.y));

          float alpha = falloff * rays * strength * edgeFade * (0.45 + shine * 0.85);

          gl_FragColor = vec4(fire, clamp(alpha, 0.0, 1.0));
        }
      `,
      uniforms: {
        resolution: { value: resolution },
        culet: { value: [0.5, 0.5] },
        time: { value: 0 },
        shine: { value: 0 },
        strength: { value: 0.85 },
      },
    });
  }
}
