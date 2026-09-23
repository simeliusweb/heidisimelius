// X2 seed builder (B.2). Takes an X1 export dir and emits one transaction:
//   truncate; insert via jsonb_populate_recordset from the raw export bytes (no JSON round-trip);
//   optional storage-host rewrite; asserts (counts, touched rows, zero old refs) that raise inside the txn.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { OLD_REF, TABLES } from "./lib.mjs";

// Sorted key sets per table (types.ts Row types, without the 2 new gig columns).
export const EXPECTED_KEYS = {
  gigs: ["address_country", "address_locality", "created_at", "description", "event_page_url", "gig_group_id", "gig_type", "id", "image_alt", "image_url", "organizer_name", "organizer_url", "performance_date", "tickets_url", "title", "venue"],
  videos: ["created_at", "description", "id", "is_featured", "order_index", "section", "title", "url"],
  photo_sets: ["created_at", "id", "is_press_kit", "order_index", "photographer_name", "photographer_url", "photos", "press_kit_zip_url", "title"],
  page_content: ["content", "created_at", "page_name", "updated_at"],
};

const storagePrefix = (ref) => `https://${ref}.supabase.co/storage/v1/object/public/`;

export function makeSeed(exportDir, { rewriteNewRef } = {}) {
  const raw = {};
  const counts = {};
  const touched = {};
  for (const t of TABLES) {
    const buf = fs.readFileSync(path.join(exportDir, `${t}.json`));
    const rows = JSON.parse(buf.toString("utf8")); // validation only; the SQL gets the raw bytes
    for (const r of rows) {
      const k = Object.keys(r).sort();
      if (JSON.stringify(k) !== JSON.stringify(EXPECTED_KEYS[t])) throw new Error(`${t}: unexpected key set ${k.join(",")}`);
    }
    raw[t] = buf.toString("utf8");
    counts[t] = rows.length;
    touched[t] = rows.filter((r) => JSON.stringify(r).includes(OLD_REF)).length;
  }
  let tag;
  do tag = `$seed_${crypto.randomBytes(6).toString("hex")}$`;
  while (TABLES.some((t) => raw[t].includes(tag)));

  const cols = (t) => EXPECTED_KEYS[t].join(", ");
  const parts = ["begin;", "set local statement_timeout = '60s';", "truncate public.gigs, public.videos, public.photo_sets, public.page_content;"];
  for (const t of TABLES) {
    parts.push(`insert into public.${t} (${cols(t)}) select ${cols(t)} from jsonb_populate_recordset(null::public.${t}, ${tag}${raw[t]}${tag}::jsonb);`);
  }
  const asserts = [];
  for (const t of TABLES) asserts.push(`if (select count(*) from public.${t}) <> ${counts[t]} then raise exception 'X2 count ${t}'; end if;`);
  if (rewriteNewRef) {
    const o = storagePrefix(OLD_REF), n = storagePrefix(rewriteNewRef);
    const lit = (s) => `'${s.replace(/'/g, "''")}'`;
    parts.push(`create temp table _x2_touched(tbl text, n int) on commit drop;`);
    parts.push(`with u as (update public.gigs set image_url = replace(image_url, ${lit(o)}, ${lit(n)}) where to_jsonb(gigs)::text like ${lit("%" + OLD_REF + "%")} returning 1) insert into _x2_touched select 'gigs', count(*) from u;`);
    parts.push(`with u as (update public.photo_sets set photos = replace(photos::text, ${lit(o)}, ${lit(n)})::jsonb, press_kit_zip_url = replace(press_kit_zip_url, ${lit(o)}, ${lit(n)}) where to_jsonb(photo_sets)::text like ${lit("%" + OLD_REF + "%")} returning 1) insert into _x2_touched select 'photo_sets', count(*) from u;`);
    parts.push(`with u as (update public.page_content set content = replace(content::text, ${lit(o)}, ${lit(n)})::jsonb where content::text like ${lit("%" + OLD_REF + "%")} returning 1) insert into _x2_touched select 'page_content', count(*) from u;`);
    for (const t of ["gigs", "photo_sets", "page_content"]) {
      asserts.push(`if (select n from _x2_touched where tbl = '${t}') <> ${touched[t]} then raise exception 'X2 touched ${t}'; end if;`);
    }
    const a4 = TABLES.map((t) => `(select count(*) from public.${t} t where to_jsonb(t)::text like ${lit("%" + OLD_REF + "%")})`).join(" + ");
    asserts.push(`if (${a4}) <> 0 then raise exception 'X2 old refs remain'; end if;`);
  }
  parts.push(`do $x2$ begin ${asserts.join(" ")} end $x2$;`);
  parts.push("commit;");
  return { sql: parts.join("\n"), counts, touched: rewriteNewRef ? touched : {} };
}
