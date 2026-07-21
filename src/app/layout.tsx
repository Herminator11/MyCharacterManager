import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Charakter-Manager",
  description: "Live-Dashboard für D&D-5e-Charaktere am Spieltisch",
};

export const viewport: Viewport = {
  themeColor: "#0e1113",
  // Kein Pinch-Zoom-Sprung beim Antippen kleiner Ziele.
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
