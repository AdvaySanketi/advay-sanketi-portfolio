import { CanvasTexture, SRGBColorSpace } from "three";

const WARM = "#ffd9a0";
const COOL = "#a7e0ff";
const ACCENT = "#6d8f63";
const DEEP = "#3f5b3a";
const PAPER = "#f2f0ea";

export function drawGemBackdrop(
  ctx: CanvasRenderingContext2D,
  size: number,
  name = ""
) {
  ctx.fillStyle = "#04050a";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#0c0f14";
  ctx.fillRect(0, size * 0.62, size, size * 0.38);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(0, size * 0.62, size, Math.max(1, size * 0.004));

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

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${size * 0.2}px ui-monospace, "SF Mono", Menlo, monospace`;
  ctx.letterSpacing = "0.12em";
  ctx.fillStyle = PAPER;
  ctx.fillText(name, size * 0.5, size * 0.45);

  ctx.font = `700 ${size * 0.055}px ui-monospace, "SF Mono", Menlo, monospace`;
  ctx.letterSpacing = "0.5em";
  ctx.fillStyle = "rgba(242,240,234,0.55)";
  ctx.fillText(name, size * 0.5, size * 0.68);
  ctx.restore();
}

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
