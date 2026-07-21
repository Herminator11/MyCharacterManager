import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 ist ein natives Modul und darf nicht gebündelt werden.
  // Next.js führt es zwar in seiner Default-Liste, wir sind hier explizit.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
