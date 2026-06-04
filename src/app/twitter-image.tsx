import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { OWNER, SEO } from "@/lib/constants";

export const alt = SEO.description;
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default async function Image() {
  const logoData = await readFile(
    join(process.cwd(), "public/logo-white.svg"),
    "utf-8",
  );
  const logoSrc = `data:image/svg+xml;base64,${Buffer.from(logoData).toString("base64")}`;

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
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 120,
          height: 120,
          borderRadius: "100%",
          background: "linear-gradient(135deg, #52525b, #3f3f46)",
          fontSize: 48,
          fontWeight: 700,
          color: "#fafafa",
        }}
      >
        {OWNER.name
          .split(" ")
          .map((n) => n[0])
          .join("")}
      </div>
      <div
        style={{
          marginTop: 32,
          fontSize: 64,
          fontWeight: 700,
          color: "#fafafa",
          letterSpacing: "-0.02em",
        }}
      >
        {OWNER.name}
      </div>
      <div
        style={{
          marginTop: 12,
          fontSize: 28,
          color: "#a1a1aa",
        }}
      >
        {OWNER.bio}
      </div>
    </div>,
    { ...size },
  );
}
