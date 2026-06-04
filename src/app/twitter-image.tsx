import { ImageResponse } from "next/og";
import { OWNER, SEO } from "@/lib/constants";

export const alt = SEO.description;
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#09090b",
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <img
          src={OWNER.avatar || undefined}
          width={120}
          height={120}
          style={{
            borderRadius: "100%",
            objectFit: "cover",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#fafafa",
            }}
          >
            {OWNER.name}
          </span>
          <span
            style={{
              fontSize: 18,
              color: "#a1a1aa",
            }}
          >
            {OWNER.handle}
          </span>
        </div>

        {OWNER.bio && (
          <span
            style={{
              maxWidth: 420,
              textAlign: "center",
              fontSize: 20,
              lineHeight: 1.6,
              color: "#71717a",
            }}
          >
            {OWNER.bio}
          </span>
        )}
      </div>
    </div>,
    { ...size },
  );
}
