import { BackSide, NormalBlending, ShaderMaterial, type Texture } from "three";

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
  envMap: Texture;
  backfaceMap: Texture;
  resolution: [number, number];
};

const HUE = /* glsl */ `
  vec3 hue2rgb(float h) {
    return clamp(
      abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0,
      0.0,
      1.0
    );
  }
`;

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

        float lamp(vec3 n, vec3 direction, float power) {
          return pow(max(dot(n, normalize(direction)), 0.0), power);
        }

        float fresnelFunc(vec3 viewDirection, vec3 worldNormal) {
          return pow(1.05 + dot(viewDirection, worldNormal), 45.0);
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / resolution;

          vec3 normal =
            worldNormal * (1.0 - 0.7) - texture2D(backfaceMap, uv).rgb * 0.7;

          float spread = dispersion * (1.0 + shine * 0.8);

          vec2 shiftR = refract(viewDirection, normal, 1.0 / (1.5 - spread)).xy;
          vec2 shiftG = refract(viewDirection, normal, 1.0 / 1.5).xy;
          vec2 shiftB = refract(viewDirection, normal, 1.0 / (1.5 + spread)).xy;

          vec3 color = vec3(
            texture2D(envMap, uv + shiftR).r,
            texture2D(envMap, uv + shiftG).g,
            texture2D(envMap, uv + shiftB).b
          );

          vec3 n = normalize(normal);
          vec2 room = clamp(uv + shiftG, 0.0, 1.0);

          float ramp =
            smoothstep(0.05, 0.95, room.y) * 0.6 +
            (0.5 + 0.5 * dot(n, vec3(0.35, 0.78, 0.52))) * 0.4;

          float steps = 4.0;
          float banded = clamp(floor(ramp * steps) / (steps - 1.0), 0.0, 1.0);

          color += lift * mix(0.25, 1.35, banded);

          float spec =
            lamp(n, vec3(0.5, 0.8, 0.6), 60.0) +
            lamp(n, vec3(-0.7, 0.3, 0.5), 80.0) * 0.7 +
            lamp(n, vec3(0.1, -0.6, 0.8), 45.0) * 0.5;

          color += vec3(1.0) * spec * (0.9 + shine * 0.8);

          vec2 delta = (uv + shiftG) - culet;
          float dist = length(delta);
          float angle = atan(delta.y, delta.x);

          float banding = mix(1.6, 0.8, shine);
          vec3 hue = hue2rgb(fract(angle / 6.2831853 + dist * banding + time * 0.05));
          vec3 fire = mix(vec3(1.0), hue, mix(1.0, 0.6, shine));

          float reach = mix(90.0, 60.0, shine);
          color += fire * glow * (1.0 + shine * 0.5) / (1.0 + dist * dist * reach);

          float edge = fresnelFunc(viewDirection, normal);
          vec3 rim = mix(rimColor, fire, shine * 0.25);

          gl_FragColor = vec4(mix(color, rim, edge), 1.0);
        }
      `,
      uniforms: {
        envMap: { value: envMap },
        backfaceMap: { value: backfaceMap },
        resolution: { value: resolution },
        rimColor: { value: [0.08, 0.08, 0.06] },
        culet: { value: [0.5, 0.5] },
        time: { value: 0 },
        dispersion: { value: 0.055 },
        glow: { value: 1.5 },
        shine: { value: 0 },
        lift: { value: [0.2, 0.2, 0.195] },
      },
    });
  }
}

export type SpillOptions = {
  resolution: [number, number];
};

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

          float banding = mix(1.6, 0.8, shine);
          vec3 fire = hue2rgb(fract(angle / 6.2831853 + dist * banding + time * 0.05));

          float rays = 0.72 + 0.28 * sin(angle * 9.0 - time * 0.35);

          float radius = mix(0.26, 0.46, shine);
          float falloff = smoothstep(radius, 0.0, dist);
          falloff *= falloff;

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
