import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Bit Link - Encurtador de URLs com Analytics";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default async function Image() {
  const logoData = await readFile(
    join(process.cwd(), "public/logo-white.svg"),
    "utf-8",
  );
  const logoSrc = `data:image/svg+xml;base64,${Buffer.from(logoData).toString("base64")}`;

  return new ImageResponse(
    (
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
        <img src={logoSrc} width={120} height={160} />
        <div
          style={{
            marginTop: 32,
            fontSize: 64,
            fontWeight: 700,
            color: "#fafafa",
            letterSpacing: "-0.02em",
          }}
        >
          Bit Link
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 28,
            color: "#a1a1aa",
          }}
        >
          Encurte, compartilhe e monitore seus links
        </div>
      </div>
    ),
    { ...size },
  );
}
