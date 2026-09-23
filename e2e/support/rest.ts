// Direct Supabase access for assertions ("assert the database, not the toast").
// Anon reads work against either project; anything with the secret key is NEW-project only (R4).
import fs from "node:fs";
import path from "node:path";
import { NEW_REF, OLD_REF, RUN_ID, STATE, projectFor, secrets } from "./env";

export type Row = Record<string, unknown>;

export async function anonGet<T = Row>(ref: string, pathAndQuery: string): Promise<T[]> {
  const { url, key } = projectFor(ref);
  const r = await fetch(`${url}/rest/v1/${pathAndQuery}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`anon GET ${pathAndQuery}: ${r.status}`);
  return (await r.json()) as T[];
}

export async function anonCount(ref: string, table: string, filter = ""): Promise<number> {
  const { url, key } = projectFor(ref);
  const r = await fetch(`${url}/rest/v1/${table}?select=*${filter ? "&" + filter : ""}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
  });
  return Number((r.headers.get("content-range") || "/0").split("/")[1]);
}

function assertNew(ref: string) {
  if (ref === OLD_REF || ref !== NEW_REF) throw new Error("R4: secret-key access is only allowed on the new project");
}

/** Service (secret key) REST on the NEW project only. */
export async function serviceRest(method: string, pathAndQuery: string, body?: unknown): Promise<Response> {
  assertNew(NEW_REF);
  return fetch(`https://${NEW_REF}.supabase.co/rest/v1/${pathAndQuery}`, {
    method,
    headers: {
      apikey: secrets.NEW_SECRET,
      Authorization: `Bearer ${secrets.NEW_SECRET}`,
      "content-type": "application/json",
      Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function serviceStorageDelete(bucket: string, objectPath: string): Promise<boolean> {
  const r = await fetch(`https://${NEW_REF}.supabase.co/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: { apikey: secrets.NEW_SECRET, Authorization: `Bearer ${secrets.NEW_SECRET}`, "content-type": "application/json" },
    body: JSON.stringify({ prefixes: [objectPath] }),
  });
  if (!r.ok) return false;
  return ((await r.json()) as unknown[]).length === 1;
}

// ---- ledger of everything the suite creates ($STATE/ledger-<runId>.json)
export interface Ledger { rows: string[]; objects: string[]; videos: string[] }
const LEDGER = path.join(STATE, `ledger-${RUN_ID}.json`);
export function readLedger(): Ledger {
  const l = fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, "utf8")) : {};
  return { rows: l.rows || [], objects: l.objects || [], videos: l.videos || [] };
}
export function ledgerAdd(kind: keyof Ledger, key: string) {
  const l = readLedger();
  if (!l[kind].includes(key)) l[kind].push(key);
  fs.writeFileSync(LEDGER, JSON.stringify(l, null, 1), { mode: 0o600 });
}
export function ledgerRemove(kind: keyof Ledger, key: string) {
  const l = readLedger();
  l[kind] = l[kind].filter((k) => k !== key);
  fs.writeFileSync(LEDGER, JSON.stringify(l, null, 1), { mode: 0o600 });
}

/** "https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>" -> "<bucket>/<path>" */
export function storageKey(url: string): string | null {
  const m = url.match(/\/storage\/v1\/object\/public\/([^?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Upcoming gigs at a moment, grouped the way the site groups them. */
export async function upcomingAt(ref: string, at: string) {
  const rows = await anonGet<{ id: string; gig_group_id: string | null; gig_type: string; performance_date: string; title: string }>(
    ref,
    `gigs?select=id,gig_group_id,gig_type,performance_date,title&performance_date=gte.${encodeURIComponent(at)}&order=performance_date.asc`,
  );
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = r.gig_group_id || r.id;
    groups.set(k, [...(groups.get(k) || []), r]);
  }
  return { rows, groups: [...groups.values()] };
}
