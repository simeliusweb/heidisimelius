import { defineConfig, devices } from "@playwright/test";

// Migration regression suite (docs/supabase-migration-plan.md, Appendix C).
// BASE_URL picks the environment: http://localhost:4173 (L), a *.vercel.app preview (P) or
// https://www.heidisimelius.fi (Prod). EXPECTED_SUPABASE_REF / FORBIDDEN_SUPABASE_REF are required
// and checked against the bundle in global-setup, so a test never runs against the wrong database.
const baseURL = process.env.BASE_URL;
if (!baseURL && !process.argv.includes("--list")) {
  throw new Error("BASE_URL is required (L: http://localhost:4173, P: preview URL, Prod: https://www.heidisimelius.fi)");
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  // CMS writes must be serialised; read-only runs can raise this with --workers.
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: baseURL || "http://localhost:4173",
    timezoneId: "Europe/Helsinki",
    locale: "fi-FI",
    // Preview bypass cookie only (scoped to the preview origin by global-setup). Never a global header.
    storageState: "e2e/.auth/state.json",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], timezoneId: "Europe/Helsinki", locale: "fi-FI" } },
    // iPhone presets need WebKit, which isn't installed; Pixel 7 runs on Chromium.
    { name: "mobile", use: { ...devices["Pixel 7"], timezoneId: "Europe/Helsinki", locale: "fi-FI" }, grep: /@mobile/ },
  ],
});
