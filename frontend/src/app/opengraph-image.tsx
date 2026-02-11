import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BankRead — Bank Statement Reader";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "100px",
              background: "white",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "48px",
              fontWeight: "bold",
              color: "#2563eb",
            }}
          >
            $
          </div>
          <div
            style={{
              fontSize: "64px",
              fontWeight: "bold",
              color: "white",
            }}
          >
            BankRead
          </div>
        </div>
        <div
          style={{
            fontSize: "28px",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          Parse bank statements into structured transactions
        </div>
      </div>
    ),
    { ...size }
  );
}
