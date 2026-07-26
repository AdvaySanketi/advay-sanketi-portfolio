/**
 * Seamless CSS marquee. The track is duplicated and translated by exactly
 * -100% of its own width, so the loop has no visible seam. Pure CSS, so it
 * costs nothing on the main thread and pauses under `prefers-reduced-motion`.
 */
export function Marquee({
  items,
  duration = 36,
  direction = "left",
  separator = "◆",
  className,
}: {
  items: string[];
  duration?: number;
  direction?: "left" | "right";
  separator?: string;
  className?: string;
}) {
  if (!items.length) return null;

  const track = (
    <div
      className="marquee__track"
      style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
      aria-hidden="true"
    >
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className="flex shrink-0 items-center gap-8">
          <span>{item}</span>
          <span className="text-accent">{separator}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className={`marquee ${className ?? ""}`} data-direction={direction}>
      {/* Screen readers get the list once, in plain order. */}
      <span className="sr-only">{items.join(", ")}</span>
      {track}
      {track}
    </div>
  );
}
