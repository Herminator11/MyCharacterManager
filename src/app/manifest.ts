import type { MetadataRoute } from "next";

/**
 * Macht die App am Handy über „Zum Homescreen“ installierbar — dann startet
 * sie ohne Browserleiste, was am Spieltisch spürbar mehr Platz lässt.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "D&D Charakter-Manager",
    short_name: "Charaktere",
    description: "Live-Dashboard für D&D-5e-Charaktere am Spieltisch",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0e1113",
    theme_color: "#0e1113",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
