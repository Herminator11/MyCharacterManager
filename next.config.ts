import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 ist ein natives Modul und darf nicht gebündelt werden.
  // Next.js führt es zwar in seiner Default-Liste, wir sind hier explizit.
  serverExternalPackages: ["better-sqlite3"],

  experimental: {
    // Server Actions kappen den Request-Body per Default bei 1 MB. Der
    // PDF-Import lässt bis 25 MB zu (siehe MAX_BYTES in app/import/actions)
    // und prüft die Größe selbst mit einer verständlichen Meldung — ohne
    // diese Anhebung schlägt jeder echte ausfüllbare Bogen über 1 MB schon
    // im Framework mit einem nackten 413 fehl, bevor die Prüfung greift.
    // Etwas über 25 MB, damit der Multipart-Overhead noch hineinpasst.
    serverActions: {
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;
