import type { MetadataRoute } from "next";

import { getT } from "@/lib/i18n/server";

/**
 * Macht die App am Handy über „Zum Homescreen“ installierbar — dann startet
 * sie ohne Browserleiste, was am Spieltisch spürbar mehr Platz lässt.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // Browser holen das Manifest meist ohne Cookies — dann entscheidet die
  // Browsersprache, wie überall, wo noch kein Modus gewählt ist. Der Name
  // auf dem Homescreen bleibt danach, wie er beim Installieren war.
  const t = await getT();
  return {
    name: t.meta.name,
    short_name: t.meta.shortName,
    description: t.meta.description,
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
