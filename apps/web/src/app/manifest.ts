import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MaRoutine",
    short_name: "MaRoutine",
    description: "Suivi de musculation : progression, suggestions de charge et alimentation.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F7F9",
    theme_color: "#F5F7F9",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
