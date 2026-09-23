import path from "path";
import { defineConfig } from "vitest/config";

// Unit tests only; the Playwright suite in e2e/ runs with `npm run test:e2e`.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    include: ["api/**/*.test.ts", "src/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    environment: "node",
    passWithNoTests: true,
  },
});
