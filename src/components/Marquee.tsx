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
      <span className="sr-only">{items.join(", ")}</span>
      {track}
      {track}
    </div>
  );
}
