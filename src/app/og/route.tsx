import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = url.searchParams.get("title") || "Advay Sanketi";
  const sub = url.searchParams.get("sub") || "Full-Stack Developer";

  const fontData = await fetch(
    new URL("../../../public/fonts/Inter.ttf", import.meta.url)
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "5rem 5.5rem",
          background: "#f2f0ea",
          color: "#14140f",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: "1.75rem",
            fontWeight: 600,
            letterSpacing: "0.35rem",
            textTransform: "uppercase",
            opacity: 0.45,
          }}
        >
          Advay Sanketi
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 24 ? "5.5rem" : "7.5rem",
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.28rem",
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", fontSize: "2.25rem", opacity: 0.55 }}>
            {sub}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: "100%",
            height: "14px",
            background: "#3f5b3a",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Inter", data: fontData, style: "normal" }],
    }
  );
}
