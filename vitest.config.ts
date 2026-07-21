import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Die Server-Module sollen im Testlauf direkt importierbar sein.
      "server-only": path.resolve(__dirname, "src/test/server-only.stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/setup-db.ts"],
    // Jede Datei bekommt ihre eigene DB — sonst teilen sie sich Zustand.
    isolate: true,
    pool: "forks",
  },
});
