const NOISE = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="180" height="180" filter="url(#n)" opacity="0.55"/></svg>`;

const GRAIN_URL = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  NOISE
)}")`;

export function Grain() {
  return (
    <div
      className="grain"
      aria-hidden="true"
      style={{ "--grain-url": GRAIN_URL } as React.CSSProperties}
    />
  );
}
