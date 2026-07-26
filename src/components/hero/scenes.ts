export const PARTICLE_COUNT = 18000;

const WIDTH = 528;
const HEIGHT = 297;

export const WORLD_H = 3.32;
export const WORLD_W = (WORLD_H * WIDTH) / HEIGHT;

export type Scene = {
  name: string;
  positions: Float32Array;
  tones: Float32Array;
};

export type Reel = {
  scenes: Scene[];
  origins: Float32Array;
  seeds: Float32Array;
};

function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const drawCode: Draw = (ctx, w, h) => {
  const round = (x: number, y: number, bw: number, bh: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + bw, y, x + bw, y + bh, r);
    ctx.arcTo(x + bw, y + bh, x, y + bh, r);
    ctx.arcTo(x, y + bh, x, y, r);
    ctx.arcTo(x, y, x + bw, y, r);
    ctx.closePath();
  };

  ctx.strokeStyle = "rgba(0,0,0,1)";
  ctx.lineWidth = h * 0.022;
  round(w * 0.035, h * 0.07, w * 0.93, h * 0.86, h * 0.07);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(w * 0.035, h * 0.21);
  ctx.lineTo(w * 0.965, h * 0.21);
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = h * 0.012;
  ctx.stroke();

  ctx.fillStyle = "rgba(0,0,0,0.9)";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(w * (0.07 + i * 0.035), h * 0.14, h * 0.022, 0, Math.PI * 2);
    ctx.fill();
  }

  const column = (
    left: number,
    lines: [indent: number, length: number, weight: number][]
  ) => {
    const top = h * 0.31;
    const step = h * 0.083;
    lines.forEach(([indent, length, weight], i) => {
      ctx.fillStyle = `rgba(0,0,0,${0.28 + weight * 0.5})`;
      ctx.fillRect(
        w * (left + indent),
        top + i * step,
        w * length,
        h * 0.03
      );
    });
  };

  column(0.075, [
    [0, 0.2, 1],
    [0, 0.13, 0.55],
    [0.05, 0.22, 1],
    [0.05, 0.16, 0.75],
    [0.1, 0.12, 1],
    [0.05, 0.19, 0.6],
    [0, 0.17, 0.9],
  ]);

  column(0.55, [
    [0, 0.15, 0.8],
    [0.05, 0.21, 1],
    [0.1, 0.13, 0.6],
    [0.1, 0.17, 0.85],
    [0.05, 0.1, 0.5],
    [0, 0.19, 1],
    [0, 0.08, 0.55],
  ]);

  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(w * 0.645, h * 0.31 + 6 * h * 0.083 - h * 0.012, w * 0.011, h * 0.055);
};

const drawGamepad: Draw = (ctx, w, h) => {
  const cx = w * 0.5;
  const cy = h * 0.55;

  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.235, cy + h * 0.06, w * 0.14, h * 0.29, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.235, cy + h * 0.06, w * 0.14, h * 0.29, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy - h * 0.03, w * 0.27, h * 0.23, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.22, cy - h * 0.26, w * 0.08, h * 0.08, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.22, cy - h * 0.26, w * 0.08, h * 0.08, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,1)";
  const arm = h * 0.13;
  const thick = h * 0.048;
  const dx = cx - w * 0.235;
  ctx.fillRect(dx - arm, cy - thick / 2, arm * 2, thick);
  ctx.fillRect(dx - thick / 2, cy - arm, thick, arm * 2);

  const bx = cx + w * 0.235;
  const spread = h * 0.11;
  const buttons: [number, number][] = [
    [0, -spread],
    [spread, 0],
    [0, spread],
    [-spread, 0],
  ];
  buttons.forEach(([ox, oy]) => {
    ctx.beginPath();
    ctx.arc(bx + ox, cy + oy, h * 0.045, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "rgba(0,0,0,0.85)";
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.arc(cx + side * w * 0.085, cy + h * 0.19, h * 0.075, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalCompositeOperation = "destination-out";
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.arc(cx + side * w * 0.085, cy + h * 0.19, h * 0.034, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalCompositeOperation = "source-over";
};

function drawEyeAt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ew: number,
  eh: number,
  flip: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) {
    ctx.translate(ew, 0);
    ctx.scale(-1, 1);
  }

  const cx = ew * 0.5;
  const cy = eh * 0.5;
  const r = Math.min(ew, eh);

  const opening = () => {
    ctx.beginPath();
    ctx.moveTo(ew * 0.08, eh * 0.5);
    ctx.bezierCurveTo(ew * 0.26, eh * 0.16, ew * 0.74, eh * 0.12, ew * 0.93, eh * 0.42);
    ctx.bezierCurveTo(ew * 0.74, eh * 0.82, ew * 0.28, eh * 0.84, ew * 0.08, eh * 0.5);
    ctx.closePath();
  };

  ctx.fillStyle = "rgba(0,0,0,0.09)";
  opening();
  ctx.fill();

  ctx.save();
  opening();
  ctx.clip();

  const ix = cx - ew * 0.02;
  const iy = cy + eh * 0.03;
  const ir = r * 0.34;
  const iris = ctx.createRadialGradient(ix, iy, ir * 0.15, ix, iy, ir);
  iris.addColorStop(0, "rgba(0,0,0,0.18)");
  iris.addColorStop(0.55, "rgba(0,0,0,0.42)");
  iris.addColorStop(1, "rgba(0,0,0,0.88)");
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(ix, iy, ir, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.beginPath();
  ctx.arc(ix, iy, ir * 0.42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.beginPath();
  ctx.moveTo(0, eh * 0.06);
  ctx.bezierCurveTo(ew * 0.3, eh * 0.4, ew * 0.7, eh * 0.4, ew, eh * 0.1);
  ctx.lineTo(ew, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  ctx.strokeStyle = "rgba(0,0,0,1)";
  ctx.lineCap = "round";
  ctx.lineWidth = r * 0.09;
  ctx.beginPath();
  ctx.moveTo(ew * 0.08, eh * 0.49);
  ctx.bezierCurveTo(ew * 0.26, eh * 0.16, ew * 0.74, eh * 0.12, ew * 0.93, eh * 0.41);
  ctx.stroke();

  ctx.lineWidth = r * 0.028;
  ctx.beginPath();
  ctx.moveTo(ew * 0.16, eh * 0.6);
  ctx.bezierCurveTo(ew * 0.38, eh * 0.82, ew * 0.7, eh * 0.78, ew * 0.88, eh * 0.53);
  ctx.stroke();

  ctx.lineWidth = r * 0.038;
  const lashes: [number, number, number, number][] = [
    [0.88, 0.4, 1.0, 0.25],
    [0.8, 0.28, 0.9, 0.13],
    [0.68, 0.21, 0.73, 0.06],
  ];
  lashes.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(ew * x1, eh * y1);
    ctx.lineTo(ew * x2, eh * y2);
    ctx.stroke();
  });

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(ix + ir * 0.45, iy - ir * 0.45, ir * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ix - ir * 0.5, iy + ir * 0.45, ir * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  ctx.restore();
}

const drawEyes: Draw = (ctx, w, h) => {
  const ew = w * 0.4;
  const eh = h * 0.56;
  const top = h * 0.3;

  drawEyeAt(ctx, w * 0.04, top, ew, eh, true);
  drawEyeAt(ctx, w * 0.56, top, ew, eh, false);

  ctx.strokeStyle = "rgba(0,0,0,1)";
  ctx.lineCap = "round";
  ctx.lineWidth = h * 0.038;

  ctx.beginPath();
  ctx.moveTo(w * 0.06, h * 0.16);
  ctx.bezierCurveTo(w * 0.16, h * 0.06, w * 0.3, h * 0.05, w * 0.4, h * 0.14);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(w * 0.94, h * 0.16);
  ctx.bezierCurveTo(w * 0.84, h * 0.06, w * 0.7, h * 0.05, w * 0.6, h * 0.14);
  ctx.stroke();
};

const drawPlanet: Draw = (ctx, w, h) => {
  const cx = w * 0.5;
  const cy = h * 0.52;
  const r = h * 0.34;

  const ring = (from: number, to: number) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.3, h * 0.14, -0.28, from, to);
    ctx.stroke();
  };
  ctx.strokeStyle = "rgba(0,0,0,0.38)";
  ctx.lineWidth = h * 0.018;
  ring(Math.PI, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = h * 0.026;
  ring(0, Math.PI);

  const body = ctx.createRadialGradient(
    cx + r * 0.42,
    cy - r * 0.42,
    r * 0.06,
    cx,
    cy,
    r
  );
  body.addColorStop(0, "rgba(0,0,0,0.03)");
  body.addColorStop(0.62, "rgba(0,0,0,0.15)");
  body.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  const craters: [number, number, number][] = [
    [-0.3, -0.25, 0.17],
    [0.24, 0.3, 0.22],
    [-0.1, 0.45, 0.12],
    [0.45, -0.2, 0.14],
    [0.05, -0.55, 0.1],
  ];
  craters.forEach(([ox, oy, cr]) => {
    ctx.beginPath();
    ctx.arc(cx + ox * r, cy + oy * r, cr * r, 0, Math.PI * 2);
    ctx.fill();
  });

  const stars: [number, number, number][] = [
    [0.06, 0.18, 1],
    [0.13, 0.62, 0.7],
    [0.2, 0.9, 0.5],
    [0.09, 0.42, 0.45],
    [0.28, 0.12, 0.6],
    [0.44, 0.06, 0.45],
    [0.62, 0.11, 0.75],
    [0.78, 0.2, 0.5],
    [0.88, 0.42, 0.9],
    [0.94, 0.72, 0.6],
    [0.82, 0.88, 0.7],
    [0.68, 0.94, 0.45],
    [0.36, 0.93, 0.55],
  ];
  stars.forEach(([sx, sy, weight]) => {
    const px = w * sx;
    const py = h * sy;
    const len = h * (0.018 + weight * 0.03);

    ctx.strokeStyle = `rgba(0,0,0,${0.35 + weight * 0.5})`;
    ctx.lineWidth = h * 0.008;
    ctx.beginPath();
    ctx.moveTo(px - len, py);
    ctx.lineTo(px + len, py);
    ctx.moveTo(px, py - len);
    ctx.lineTo(px, py + len);
    ctx.stroke();
  });
};

const drawHeadphones: Draw = (ctx, w, h) => {
  const cx = w * 0.5;
  const cy = h * 0.46;

  ctx.strokeStyle = "rgba(0,0,0,0.9)";
  ctx.lineCap = "round";
  ctx.lineWidth = h * 0.055;
  ctx.beginPath();
  ctx.arc(cx, cy, h * 0.34, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();

  const cup = (side: number) => {
    const x = cx + side * h * 0.335;
    const y = cy + h * 0.09;

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.ellipse(x, y, h * 0.115, h * 0.175, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.95)";
    ctx.beginPath();
    ctx.ellipse(x, y, h * 0.06, h * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.ellipse(x, y, h * 0.028, h * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  };
  cup(-1);
  cup(1);

  [-1, 1].forEach((side) => {
    const x = cx + side * h * 0.335;
    const y = cy + h * 0.09;

    [0.24, 0.38, 0.52].forEach((radius, i) => {
      ctx.strokeStyle = `rgba(0,0,0,${0.5 - i * 0.12})`;
      ctx.lineWidth = h * (0.028 - i * 0.005);
      ctx.beginPath();
      ctx.arc(
        x,
        y,
        h * radius,
        side > 0 ? -Math.PI * 0.32 : Math.PI * 1.32,
        side > 0 ? Math.PI * 0.32 : Math.PI * 0.68
      );
      ctx.stroke();
    });
  });
};

const drawLife: Draw = (ctx, w, h) => {
  const cols = 16;
  const rows = 9;
  const cell = Math.min((w * 0.86) / cols, (h * 0.86) / rows);
  const left = (w - cell * cols) / 2;
  const top = (h - cell * rows) / 2;

  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(1, h * 0.005);
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(left + c * cell, top);
    ctx.lineTo(left + c * cell, top + rows * cell);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(left, top + r * cell);
    ctx.lineTo(left + cols * cell, top + r * cell);
    ctx.stroke();
  }

  const live: [number, number][] = [
    [2, 1], [3, 2], [1, 3], [2, 3], [3, 3],
    [7, 1], [7, 2], [7, 3],
    [12, 1], [13, 1], [12, 2], [13, 2],
    [5, 6], [6, 6], [7, 6], [6, 5], [6, 7],
    [10, 5], [11, 5], [10, 6], [11, 6],
    [13, 6], [14, 6], [13, 7], [14, 7],
    [1, 6], [2, 7], [0, 7],
  ];

  ctx.fillStyle = "rgba(0,0,0,0.92)";
  live.forEach(([c, r]) => {
    ctx.fillRect(
      left + c * cell + cell * 0.1,
      top + r * cell + cell * 0.1,
      cell * 0.8,
      cell * 0.8
    );
  });
};

const drawNetwork: Draw = (ctx, w, h) => {
  const layers = [3, 5, 5, 2];
  const nodes: { x: number; y: number }[][] = layers.map((count, li) => {
    const x = w * (0.14 + (li / (layers.length - 1)) * 0.72);
    return Array.from({ length: count }, (_, ni) => ({
      x,
      y: h * (0.5 + ((ni - (count - 1) / 2) / Math.max(1, count - 1)) * 0.76),
    }));
  });

  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = h * 0.007;
  for (let li = 0; li < nodes.length - 1; li++) {
    nodes[li].forEach((from) => {
      nodes[li + 1].forEach((to) => {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      });
    });
  }

  nodes.forEach((layer) => {
    layer.forEach(({ x, y }) => {
      ctx.fillStyle = "rgba(0,0,0,0.95)";
      ctx.beginPath();
      ctx.arc(x, y, h * 0.055, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, h * 0.03, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.arc(x, y, h * 0.028, 0, Math.PI * 2);
      ctx.fill();
    });
  });
};

const drawLaptop: Draw = (ctx, w, h) => {
  const cx = w * 0.5;

  const sx = w * 0.29;
  const sy = h * 0.1;
  const sw = w * 0.42;
  const sh = h * 0.52;
  ctx.strokeStyle = "rgba(0,0,0,1)";
  ctx.lineWidth = h * 0.017;
  roundRect(ctx, sx, sy, sw, sh, h * 0.03);
  ctx.stroke();

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  roundRect(ctx, sx + h * 0.03, sy + h * 0.03, sw - h * 0.06, sh - h * 0.06, h * 0.016);
  ctx.fill();

  const lines: [number, number, number][] = [
    [0.06, 0.3, 1],
    [0.12, 0.2, 0.6],
    [0.06, 0.36, 0.9],
    [0.16, 0.18, 0.7],
    [0.06, 0.26, 1],
  ];
  const lx = sx + h * 0.06;
  const lt = sy + h * 0.09;
  const lstep = h * 0.08;
  lines.forEach(([indent, length, weight], i) => {
    ctx.fillStyle = `rgba(0,0,0,${0.3 + weight * 0.5})`;
    ctx.fillRect(lx + sw * indent, lt + i * lstep, sw * length, h * 0.02);
  });

  const topY = sy + sh;
  const botY = topY + h * 0.17;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.moveTo(sx - w * 0.015, topY);
  ctx.lineTo(sx + sw + w * 0.015, topY);
  ctx.lineTo(sx + sw + w * 0.06, botY);
  ctx.lineTo(sx - w * 0.06, botY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(cx - w * 0.05, botY - h * 0.045, w * 0.1, h * 0.024);
};

const drawPhone: Draw = (ctx, w, h) => {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const pw = h * 0.44;
  const ph = h * 0.86;
  const x = cx - pw / 2;
  const y = cy - ph / 2;

  ctx.strokeStyle = "rgba(0,0,0,1)";
  ctx.lineWidth = h * 0.02;
  roundRect(ctx, x, y, pw, ph, h * 0.09);
  ctx.stroke();

  ctx.fillStyle = "rgba(0,0,0,0.1)";
  roundRect(ctx, x + h * 0.03, y + h * 0.055, pw - h * 0.06, ph - h * 0.11, h * 0.05);
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.9)";
  ctx.fillRect(cx - pw * 0.14, y + h * 0.032, pw * 0.28, h * 0.012);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.beginPath();
      ctx.arc(cx + (c - 1) * pw * 0.26, y + ph * 0.3 + r * ph * 0.15, h * 0.03, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = "rgba(0,0,0,0.7)";
  roundRect(ctx, cx - pw * 0.18, y + ph - h * 0.055, pw * 0.36, h * 0.012, h * 0.006);
  ctx.fill();
};

const drawDumbbell: Draw = (ctx, w, h) => {
  const cx = w * 0.5;
  const cy = h * 0.5;

  ctx.fillStyle = "rgba(0,0,0,0.85)";
  roundRect(ctx, cx - w * 0.17, cy - h * 0.035, w * 0.34, h * 0.07, h * 0.02);
  ctx.fill();

  const plate = (px: number, pw: number, phh: number, alpha: number) => {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    roundRect(ctx, px - pw / 2, cy - phh / 2, pw, phh, pw * 0.35);
    ctx.fill();
  };

  [-1, 1].forEach((s) => {
    plate(cx + s * w * 0.19, w * 0.055, h * 0.54, 0.9);
    plate(cx + s * w * 0.26, w * 0.045, h * 0.38, 0.7);
    plate(cx + s * w * 0.31, w * 0.03, h * 0.18, 0.92);
  });
};

const drawCoffee: Draw = (ctx, w, h) => {
  const cx = w * 0.5;
  const cy = h * 0.56;
  const cupW = h * 0.46;
  const cupH = h * 0.36;

  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.moveTo(cx - cupW / 2, cy - cupH / 2);
  ctx.lineTo(cx + cupW / 2, cy - cupH / 2);
  ctx.lineTo(cx + cupW * 0.4, cy + cupH / 2);
  ctx.lineTo(cx - cupW * 0.4, cy + cupH / 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.9)";
  ctx.lineWidth = h * 0.02;
  ctx.beginPath();
  ctx.ellipse(cx, cy - cupH / 2, cupW / 2, h * 0.05, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,0.82)";
  ctx.beginPath();
  ctx.ellipse(cx, cy - cupH / 2, cupW / 2 - h * 0.02, h * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = h * 0.03;
  ctx.beginPath();
  ctx.arc(cx + cupW * 0.46, cy - h * 0.01, h * 0.1, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = h * 0.02;
  ctx.beginPath();
  ctx.ellipse(cx, cy + cupH / 2 + h * 0.04, cupW * 0.72, h * 0.05, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0,0,0,0.38)";
  ctx.lineWidth = h * 0.014;
  ctx.lineCap = "round";
  [-1, 1].forEach((s) => {
    const bx = cx + s * cupW * 0.16;
    const by = cy - cupH / 2 - h * 0.05;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.bezierCurveTo(
      bx - s * h * 0.06,
      by - h * 0.1,
      bx + s * h * 0.06,
      by - h * 0.18,
      bx - s * h * 0.02,
      by - h * 0.28
    );
    ctx.stroke();
  });
};

const drawBook: Draw = (ctx, w, h) => {
  const cx = w * 0.5;
  const cy = h * 0.52;
  const bw = h * 0.82;
  const bh = h * 0.5;

  const page = (dir: number) => {
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.moveTo(cx, cy - bh * 0.4);
    ctx.quadraticCurveTo(
      cx + dir * bw * 0.28,
      cy - bh * 0.5,
      cx + dir * bw * 0.5,
      cy - bh * 0.34
    );
    ctx.lineTo(cx + dir * bw * 0.5, cy + bh * 0.34);
    ctx.quadraticCurveTo(
      cx + dir * bw * 0.28,
      cy + bh * 0.5,
      cx,
      cy + bh * 0.4
    );
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    for (let i = 0; i < 6; i++) {
      const yy = cy - bh * 0.24 + i * bh * 0.1;
      const inset = bw * 0.08;
      const len = bw * (0.32 - (i % 3) * 0.05);
      const start = dir > 0 ? cx + inset : cx - inset - len;
      ctx.fillRect(start, yy, len, h * 0.014);
    }
  };
  page(-1);
  page(1);

  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.lineWidth = h * 0.016;
  ctx.beginPath();
  ctx.moveTo(cx, cy - bh * 0.4);
  ctx.lineTo(cx, cy + bh * 0.4);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = h * 0.012;
  [-1, 1].forEach((dir) => {
    ctx.beginPath();
    ctx.moveTo(cx + dir * bw * 0.5, cy - bh * 0.34);
    ctx.lineTo(cx + dir * bw * 0.5, cy + bh * 0.34);
    ctx.stroke();
  });
};

const DRAWINGS: { name: string; draw: Draw }[] = [
  { name: "laptop", draw: drawLaptop },
  { name: "phone", draw: drawPhone },
  { name: "code", draw: drawCode },
  { name: "gamepad", draw: drawGamepad },
  { name: "headphones", draw: drawHeadphones },
  { name: "eyes", draw: drawEyes },
  { name: "dumbbell", draw: drawDumbbell },
  { name: "coffee", draw: drawCoffee },
  { name: "book", draw: drawBook },
  { name: "life", draw: drawLife },
  { name: "network", draw: drawNetwork },
  { name: "planet", draw: drawPlanet },
];

export const SCENE_COUNT = DRAWINGS.length;

function sampleDrawing(draw: Draw, count: number, random: () => number): Scene {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2d context unavailable");

  draw(ctx, WIDTH, HEIGHT);
  const alpha = ctx.getImageData(0, 0, WIDTH, HEIGHT).data;

  const xs = new Float32Array(count);
  const ys = new Float32Array(count);
  const tones = new Float32Array(count);
  const order = new Float32Array(count);

  let filled = 0;
  let attempts = 0;
  const maxAttempts = count * 400;

  while (filled < count && attempts < maxAttempts) {
    attempts++;

    const px = Math.floor(random() * WIDTH);
    const py = Math.floor(random() * HEIGHT);
    const a = alpha[(py * WIDTH + px) * 4 + 3] / 255;
    if (a < 0.04) continue;

    if (random() > 0.25 + a * 0.75) continue;

    const u = (px + random()) / WIDTH - 0.5;
    const v = (py + random()) / HEIGHT - 0.5;

    xs[filled] = u * WORLD_W;
    ys[filled] = -v * WORLD_H;
    tones[filled] = Math.min(1, 0.22 + a * 0.85);
    order[filled] = Math.atan2(-v, u);
    filled++;
  }

  for (let i = filled; i < count; i++) {
    const src = filled > 0 ? i % filled : 0;
    xs[i] = xs[src];
    ys[i] = ys[src];
    tones[i] = tones[src];
    order[i] = order[src];
  }

  const index = Array.from({ length: count }, (_, i) => i);
  index.sort((a, b) => order[a] - order[b]);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < count; i++) {
    if (xs[i] < minX) minX = xs[i];
    if (xs[i] > maxX) maxX = xs[i];
    if (ys[i] < minY) minY = ys[i];
    if (ys[i] > maxY) maxY = ys[i];
  }
  const centreX = (minX + maxX) / 2;
  const centreY = (minY + maxY) / 2;
  const norm = 2 / Math.max(maxX - minX, maxY - minY, 0.0001);

  const positions = new Float32Array(count * 3);
  const sorted = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const j = index[i];
    const x = (xs[j] - centreX) * norm;
    const y = (ys[j] - centreY) * norm;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] =
      Math.sin(x * 4.5) * 0.04 +
      Math.cos(y * 4.0) * 0.035 +
      (tones[j] - 0.5) * 0.05;

    sorted[i] = tones[j];
  }

  return { name: "", positions, tones: sorted };
}

export function buildReel(count = PARTICLE_COUNT): Reel {
  const random = makeRandom(20260721);

  const scenes = DRAWINGS.map(({ name, draw }) => {
    const scene = sampleDrawing(draw, count, random);
    scene.name = name;
    return scene;
  });

  const origins = new Float32Array(count * 3);
  const seeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const rad = 1.7 + random() * 1.5;
    origins[i * 3] = Math.sin(phi) * Math.cos(theta) * rad;
    origins[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * rad;
    origins[i * 3 + 2] = Math.cos(phi) * rad;

    seeds[i] = random();
  }

  return { scenes, origins, seeds };
}
