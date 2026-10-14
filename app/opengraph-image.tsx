import { ImageResponse } from "next/og";

export const alt = "MorphMatch — compare your measurements with 350 professional athletes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: 80,
        background: "#f4f6f2",
        color: "#131c2b",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 38, fontWeight: 700 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: 12,
            background: "#131c2b",
            color: "#f5b800",
          }}
        >
          M
        </div>
        MorphMatch
      </div>
      <div style={{ marginTop: 44, fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>
        Who are you built like?
      </div>
      <div style={{ marginTop: 28, fontSize: 30, color: "#4c5870", lineHeight: 1.5 }}>
        350 athletes. Four sports. Your measurements.
      </div>
      <div
        style={{ marginTop: 48, display: "flex", width: "100%", height: 10, background: "#f5b800" }}
      />
    </div>,
    size
  );
}
