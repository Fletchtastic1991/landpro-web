// Light test setup: only the "@" alias is needed (the app's vite.config also loads dev-only plugins).
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
