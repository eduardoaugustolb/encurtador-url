import type { MetadataRoute } from "next";
import { OWNER, SEO } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SEO.defaultTitle,
    short_name: SEO.defaultTitle,
    description: SEO.description,
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
