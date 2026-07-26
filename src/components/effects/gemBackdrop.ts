import { CanvasTexture, SRGBColorSpace } from "three";

/**
 * The world the diamond refracts.
 *
 * This is the single biggest lever on how the stone looks, and it is worth
 * being precise about why. Refraction maps a small change in surface normal to
 * a large jump in the environment UV, so what a facet shows is not an average
 * of the backdrop — it is a *point sample* of it, and the neighbouring facet
 * samples somewhere else entirely.
 *
 * That has one consequence that decides everything: **only hard, high-contrast
 * structure survives.** A soft gradient sampled at two nearby points gives two
 * nearly identical greys, and the stone reads as flat plastic. Pure white
 * against pure black gives one blazing facet beside a dead one, which is what
 * the eye reads as a gem.
 *
 * So this is built like a jewellery photographer's set: mostly black, with a
 * few hard-edged coloured lights and blown highlights. The proportion matters
 * as much as the contrast — the page is near-white, and a bright backdrop makes
 * a bright stone that dissolves into the paper.
 *
 * To use a photograph instead, load any image and hand its texture to the gem:
 *
 *     const texture = useLoader(TextureLoader, "/images/projects/astral-1.png");
 *
 * Anything with hard bright/dark structure works — a lit product shot, a neon
 * sign, a window at night. Anything soft and evenly lit will not.
 */

/** Palette: the site's own ink, paper and accent, plus two gel colours. */
const WARM = "#ffd9a0";
const COOL = "#a7e0ff";
const ACCENT = "#6d8f63";
const DEEP = "#3f5b3a";
const PAPER = "#f2f0ea";

/** Drawn into a square canvas of `size` pixels. Exported for previewing. */
export function drawGemBackdrop(
  ctx: CanvasRenderingContext2D,
  size: number,
  name = ""
) {
  // Ground. Nearly everything stays this dark; the lights are the exception,
  // which is what keeps the stone reading dark against pale paper.
  ctx.fillStyle = "#04050a";
  ctx.fillRect(0, 0, size, size);

  // Floor, with a hard horizon. A facet that catches the horizon shows a clean
  // split rather than a smudge.
  ctx.fillStyle = "#0c0f14";
  ctx.fillRect(0, size * 0.62, size, size * 0.38);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(0, size * 0.62, size, Math.max(1, size * 0.004));

  // Vertical light bars — the studio's strip lights. Narrow, hard-edged, and
  // separated by black: the gaps do as much work as the bars.
  const bars: [x: number, width: number, color: string, top: number, bottom: number][] =
    [
      [0.06, 0.018, PAPER, 0.0, 1.0],
      [0.13, 0.01, ACCENT, 0.12, 0.78],
      [0.22, 0.026, WARM, 0.0, 0.62],
      [0.31, 0.008, PAPER, 0.3, 1.0],
      [0.45, 0.014, COOL, 0.0, 0.55],
      [0.58, 0.03, PAPER, 0.18, 0.9],
      [0.68, 0.01, DEEP, 0.0, 1.0],
      [0.76, 0.022, ACCENT, 0.35, 1.0],
      [0.85, 0.012, WARM, 0.0, 0.7],
      [0.93, 0.02, PAPER, 0.22, 0.86],
    ];

  bars.forEach(([x, width, color, top, bottom]) => {
    ctx.fillStyle = color;
    ctx.fillRect(size * x, size * top, size * width, size * (bottom - top));
  });

  // Horizontal streaks, so a facet turning the other way still finds an edge.
  const streaks: [y: number, height: number, from: number, to: number, color: string][] =
    [
      [0.18, 0.006, 0.0, 0.42, PAPER],
      [0.4, 0.004, 0.55, 1.0, COOL],
      [0.74, 0.008, 0.1, 0.66, WARM],
      [0.88, 0.004, 0.4, 0.95, ACCENT],
    ];

  streaks.forEach(([y, height, from, to, color]) => {
    ctx.fillStyle = color;
    ctx.fillRect(size * from, size * y, size * (to - from), size * height);
  });

  // Blown highlights: small, very bright, white-cored. These are what a facet
  // catches as a hard sparkle when the stone turns.
  const lamps: [x: number, y: number, r: number, color: string][] = [
    [0.2, 0.28, 0.075, PAPER],
    [0.72, 0.2, 0.055, WARM],
    [0.5, 0.52, 0.045, COOL],
    [0.88, 0.6, 0.06, PAPER],
    [0.35, 0.8, 0.05, ACCENT],
  ];

  lamps.forEach(([x, y, r, color]) => {
    const grad = ctx.createRadialGradient(
      size * x,
      size * y,
      0,
      size * x,
      size * y,
      size * r
    );
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.35, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(size * x, size * y, size * r, 0, Math.PI * 2);
    ctx.fill();
  });

  // The name, big and bright. Letterforms are the best possible refraction
  // subject: hard edges in every direction, at several scales at once.
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${size * 0.2}px ui-monospace, "SF Mono", Menlo, monospace`;
  ctx.letterSpacing = "0.12em";
  ctx.fillStyle = PAPER;
  ctx.fillText(name, size * 0.5, size * 0.45);

  // Repeated small and dim, so mid-size facets have something to find too.
  ctx.font = `700 ${size * 0.055}px ui-monospace, "SF Mono", Menlo, monospace`;
  ctx.letterSpacing = "0.5em";
  ctx.fillStyle = "rgba(242,240,234,0.55)";
  ctx.fillText(name, size * 0.5, size * 0.68);
  ctx.restore();
}

/** Builds the backdrop as a texture. Client-side only — it needs a canvas. */
export function createGemBackdrop(size = 1024, name?: string) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  drawGemBackdrop(ctx, size, name);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
