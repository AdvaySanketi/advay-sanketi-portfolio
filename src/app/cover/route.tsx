import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * Generated project cover (16:9). Used as a fallback "poster" for projects
 * that don't have real screenshots yet.
 *
 * /cover?title=LUNA&sub=Flutter%20%C2%B7%20Mistral%20AI&cat=Mobile&c1=10b981&c2=064e3b
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = url.searchParams.get("title") || "Project";
  const sub = url.searchParams.get("sub") || "";
  const cat = url.searchParams.get("cat") || "";
  const c1 = "#" + (url.searchParams.get("c1") || "6d28d9").replace(/[^0-9a-fA-F]/g, "");
  const c2 = "#" + (url.searchParams.get("c2") || "312e81").replace(/[^0-9a-fA-F]/g, "");
  const glyph = title.trim().charAt(0).toUpperCase();

  const fontData = await fetch(
    new URL("../../../public/fonts/Inter.ttf", import.meta.url)
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          fontFamily: "Inter",
          color: "#fff",
          background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
          overflow: "hidden",
        }}
      >
        {/* radial highlight */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 78% 22%, rgba(255,255,255,0.25), rgba(255,255,255,0) 55%)`,
          }}
        />
        {/* oversized translucent glyph */}
        <div
          style={{
            position: "absolute",
            right: "-2rem",
            top: "-9rem",
            fontSize: "44rem",
            fontWeight: 900,
            lineHeight: 1,
            color: "rgba(255,255,255,0.10)",
            letterSpacing: "-2rem",
          }}
        >
          {glyph}
        </div>
        {/* bottom scrim */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)",
          }}
        />
        {/* content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "5rem 5.5rem",
          }}
        >
          <div style={{ display: "flex", fontSize: "2rem", fontWeight: 700, letterSpacing: "0.5rem", opacity: 0.85 }}>
            {cat.toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                fontSize: title.length > 16 ? "6.5rem" : "9rem",
                fontWeight: 900,
                lineHeight: 1.0,
                letterSpacing: "-0.35rem",
                textWrap: "balance",
              }}
            >
              {title}
            </div>
            {sub ? (
              <div style={{ display: "flex", fontSize: "3rem", fontWeight: 500, opacity: 0.82 }}>
                {sub}
              </div>
            ) : null}
            <div style={{ display: "flex", fontSize: "2rem", fontWeight: 600, opacity: 0.6, marginTop: "1rem" }}>
              Advay Sanketi
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1600,
      height: 900,
      fonts: [{ name: "Inter", data: fontData, style: "normal" }],
    }
  );
}
