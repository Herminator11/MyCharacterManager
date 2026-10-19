import { IBM_Plex_Mono, Rajdhani } from "next/font/google";
import type { Metadata, Viewport } from "next";

import { I18nProvider } from "@/lib/i18n/client";
import { localeOf } from "@/lib/i18n/modes";
import { getMode, getT } from "@/lib/i18n/server";

import "./globals.css";

// Zwei Schriften zusätzlich zur System-Sans, beide zur Build-Zeit
// selbst gehostet (next/font lädt kein CDN zur Laufzeit — die App muss
// ohne Netz starten, siehe Brand.tsx).
//
// Rajdhani: die Schrift des Namensschilds. Kondensiert, technisch,
// wie auf ein Bedienfeld graviert — für die Marke und die eine große
// Überschrift, sonst nirgends. Zwei, drei Auftritte sind eine Setzung;
// jeder weitere macht daraus wieder generische Deko.
const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display-raw",
  display: "swap",
});

// IBM Plex Mono: die Ziffern der Instrumente — HP, RK, Initiative. Echte
// Laufweite pro Zeichen statt nur tabular-nums, damit die Zahl wirklich wie
// eine Anzeige wirkt und nicht wie fett gesetzter Fließtext.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-numeral-raw",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.meta.title, description: t.meta.description };
}

export const viewport: Viewport = {
  themeColor: "#0e1113",
  // Kein Pinch-Zoom-Sprung beim Antippen kleiner Ziele.
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Der Modus kommt aus dem Cookie dieses Geräts (siehe lib/i18n/modes).
  // `lang` folgt der Bedienung, damit Silbentrennung und Vorlesen zur
  // Sprache der Sätze passen, nicht zu einzelnen Regelbegriffen darin.
  const mode = await getMode();

  return (
    <html
      lang={localeOf(mode).slice(0, 2)}
      className={`h-full ${rajdhani.variable} ${plexMono.variable}`}
    >
      <body className="min-h-full">
        <I18nProvider mode={mode}>{children}</I18nProvider>
      </body>
    </html>
  );
}
