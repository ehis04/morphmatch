import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: "#131c2b",
      }}
    >
      <svg width="136" height="136" viewBox="0 0 26 26">
        <path
          d="M6 19V7M6 19h4M6 15h3M6 11h3M6 7h4"
          stroke="#f5b800"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <circle cx="17.5" cy="9" r="2.4" fill="#f4f6f2" />
        <path d="M17.5 12.2c-2.6 0-4 1.9-4 4.3h8c0-2.4-1.4-4.3-4-4.3Z" fill="#f4f6f2" />
      </svg>
    </div>,
    size
  );
}
