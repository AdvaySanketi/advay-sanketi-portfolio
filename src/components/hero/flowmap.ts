import { ShaderMaterial, Vector2, Vector3, type Texture } from "three";

export function drawName(
  canvas: HTMLCanvasElement,
  cssW: number,
  cssH: number,
  dpr: number,
  fontFamily: string
) {
  const w = Math.max(1, Math.round(cssW * dpr));
  const h = Math.max(1, Math.round(cssH * dpr));
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#14140f";
  ctx.textBaseline = "alphabetic";

  const setFont = (px: number, italic: boolean) => {
    ctx.font = `${italic ? "italic " : ""}400 ${px}px ${fontFamily}`;
    ctx.letterSpacing = `${-0.02 * px}px`;
  };

  const indent = w * 0.12;
  const lineWidth = (px: number) => {
    setFont(px, false);
    const upper = ctx.measureText("Advay").width;
    setFont(px, true);
    const lower = indent + ctx.measureText("Sanketi").width;
    return Math.max(upper, lower);
  };

  let fontPx = h / 1.9;
  while (fontPx > 8 && lineWidth(fontPx) > w * 0.98) fontPx *= 0.96;

  const leading = fontPx * 0.9;
  const blockTop = (h - leading * 2) / 2;
  const ascent = fontPx * 0.74;

  setFont(fontPx, false);
  ctx.fillText("Advay", 0, blockTop + ascent);

  setFont(fontPx, true);
  ctx.fillText("Sanketi", indent, blockTop + leading + ascent);
}

const FULLSCREEN_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export class StampMaterial extends ShaderMaterial {
  constructor() {
    super({
      depthTest: false,
      depthWrite: false,
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: /* glsl */ `
        uniform sampler2D tFlow;
        uniform vec2  uMouse;
        uniform vec2  uVelocity;
        uniform float uAspect;
        uniform float uFalloff;
        uniform float uDissipation;

        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(tFlow, vUv) * uDissipation;

          vec2 cursor = vUv - uMouse;
          cursor.x *= uAspect;

          vec3 stamp = vec3(
            uVelocity * vec2(1.0, -1.0),
            1.0 - pow(1.0 - min(1.0, length(uVelocity)), 3.0)
          );

          float falloff = smoothstep(uFalloff, 0.0, length(cursor));
          color.rgb = mix(color.rgb, stamp, falloff);

          gl_FragColor = color;
        }
      `,
      uniforms: {
        tFlow: { value: null as Texture | null },
        uMouse: { value: new Vector2(0.5, 0.5) },
        uVelocity: { value: new Vector2(0, 0) },
        uAspect: { value: 1 },
        uFalloff: { value: 0.28 },
        uDissipation: { value: 0.94 },
      },
    });
  }
}

export type DisplayOptions = {
  text: Texture;
};

export class DisplayMaterial extends ShaderMaterial {
  constructor({ text }: DisplayOptions) {
    super({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: /* glsl */ `
        uniform sampler2D tText;
        uniform sampler2D tFlow;
        uniform float uIntro;
        uniform float uStrength;
        uniform float uChroma;
        uniform vec3  uInk;
        uniform vec3  uAccent;

        varying vec2 vUv;

        void main() {
          vec2 flow = texture2D(tFlow, vUv).xy;
          float mag = clamp(length(flow), 0.0, 1.0);

          vec2 uv = vUv;
          uv.y -= (1.0 - uIntro) * 0.06;

          vec2 disp = flow * uStrength;
          vec2 chroma = flow * uChroma * (0.35 + mag);

          float aR = texture2D(tText, uv - disp + chroma).a;
          float aG = texture2D(tText, uv - disp).a;
          float aB = texture2D(tText, uv - disp - chroma).a;

          float a = max(aR, max(aG, aB)) * uIntro;
          if (a < 0.003) discard;

          vec3 col = uInk;
          float split = (aR - aG) + (aB - aG);
          col = mix(col, uAccent, clamp(split * 1.6 + mag * 0.4, 0.0, 0.85));

          gl_FragColor = vec4(col, a);
        }
      `,
      uniforms: {
        tText: { value: text },
        tFlow: { value: null as Texture | null },
        uIntro: { value: 0 },
        uStrength: { value: 0.32 },
        uChroma: { value: 0.06 },
        uInk: { value: new Vector3(0.08, 0.08, 0.06) },
        uAccent: { value: new Vector3(0.25, 0.36, 0.23) },
      },
    });
  }
}
