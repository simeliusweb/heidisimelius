// Run environment for the e2e suite. Secrets come from ~/.heidisimelius-migration via the
// migration lib (never from the repo) and are never printed.
import fs from "node:fs";
import path from "node:path";
import { env as migrationEnv, STATE, OLD_REF, REPO } from "../../scripts/migration/lib.mjs";

export { STATE, OLD_REF, REPO };

export type EnvName = "L" | "P" | "prod";

export interface RunInfo {
  targetRef: string;
  prodRef: string;
  bundle: string;
  env: EnvName;
  allowCmsWrite: boolean;
  runId: string;
  t0: string;
}

export const secrets = migrationEnv() as Record<string, string>;
export const NEW_REF: string = secrets.NEW_REF;
export const PROD_ORIGIN = "https://www.heidisimelius.fi";
export const T0 = secrets.T0 || "2026-09-23T12:00:00.000Z";
export const RUN_ID = secrets.RUN_ID || "local";

export const BASE_URL = (process.env.BASE_URL || "http://localhost:4173").replace(/\/$/, "");
export const BASE_ORIGIN = new URL(BASE_URL).origin;

export function envOf(url: string): EnvName {
  const h = new URL(url).hostname;
  if (h === "localhost" || h === "127.0.0.1") return "L";
  if (h.endsWith(".vercel.app")) return "P";
  if (h === "www.heidisimelius.fi" || h === "heidisimelius.fi") return "prod";
  throw new Error(`Unknown BASE_URL host ${h}`);
}
export const CURRENT_ENV: EnvName = envOf(BASE_URL);

export const RUN_FILE = path.join(REPO, "e2e/.auth/run.json");
export function runInfo(): RunInfo {
  return JSON.parse(fs.readFileSync(RUN_FILE, "utf8"));
}

/** Supabase URL + publishable key for a project ref this suite knows. */
export function projectFor(ref: string): { url: string; key: string } {
  if (ref === NEW_REF) return { url: `https://${NEW_REF}.supabase.co`, key: secrets.NEW_PUB };
  if (ref === OLD_REF) return { url: `https://${OLD_REF}.supabase.co`, key: secrets.OLD_ANON };
  throw new Error(`unknown project ref ${ref}`);
}

/** Headers for a request to the preview origin (bypass). Only ever sent to that origin. */
export function previewHeaders(url: string): Record<string, string> {
  if (!new URL(url).hostname.endsWith(".vercel.app")) return {};
  if (new URL(url).origin !== BASE_ORIGIN) return {};
  return { "x-vercel-protection-bypass": secrets.VERCEL_AUTOMATION_BYPASS_SECRET };
}

export const ROUTES = [
  "/",
  "/bio",
  "/keikat",
  "/galleria",
  "/bilebandi-heidi-and-the-hot-stuff",
  "/laulunopetus",
] as const;
