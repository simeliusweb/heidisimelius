// B15: clean up after the CMS writes (new project only, secret key).
//   1. delete ledgered storage objects by exact key (never by folder listing)
//   2. sweep E2E-TESTI-% rows + ledgered video ids
//   3. X2 re-import with rewrite (restores D-class content), rewrite-check (Q4 = the Lovable snapshot),
//      copy-storage (re-copies the CV) and --report-extras = 0
// Run it on its own: `--grep @cleanup`.
import { execFileSync } from "node:child_process";
import { spec, expect, record, test } from "../support/fixtures";
import { NEW_REF, REPO } from "../support/env";
import { readLedger, ledgerRemove, serviceRest, serviceStorageDelete } from "../support/rest";

const node = (args: string[]) => {
  try {
    return execFileSync("node", args, { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 24 });
  } catch (e) {
    return String((e as { stdout?: string }).stdout || "") + String((e as Error).message);
  }
};

spec({ id: "B15", title: "cleanup: ledger objects, E2E rows, X2 re-import, Q4, extras = 0", tier: "gate", env: ["direct"], data: "test-rows", extraTags: ["@cleanup"] }, async ({ run }, info) => {
  test.skip(process.env.E2E_CLEANUP !== "1", "set E2E_CLEANUP=1 (runs on its own after the CMS writes)");
  test.skip(run.targetRef !== NEW_REF || run.prodRef === NEW_REF, "only on the new project, before GL");
  test.setTimeout(900_000);
  const ledger = readLedger();
  const protectedKeys = [/^documents\/cv\/CV-Simelius-Heidi\.pdf$/, /3e033265-92db-4d61-a15e-fdd6933b66b3\.zip$/];
  let deleted = 0;
  for (const key of ledger.objects) {
    if (protectedKeys.some((re) => re.test(key))) continue; // never the real CV or press kit zip
    const [bucket, ...rest] = key.split("/");
    if (await serviceStorageDelete(bucket, rest.join("/"))) {
      deleted++;
      ledgerRemove("objects", key);
    }
  }
  const swept: Record<string, number> = {};
  for (const [table, col] of [["gigs", "title"], ["photo_sets", "title"], ["videos", "title"], ["page_content", "page_name"]] as const) {
    const r = await serviceRest("DELETE", `${table}?${col}=like.${encodeURIComponent("E2E-TESTI%")}`);
    swept[table] = ((await r.json()) as unknown[]).length;
  }
  const vids = ledger.videos.length ? await serviceRest("DELETE", `videos?id=in.(${ledger.videos.join(",")})`) : null;
  swept.videosById = vids ? ((await vids.json()) as unknown[]).length : 0;
  const fake = await serviceRest("DELETE", `videos?url=like.${encodeURIComponent("%E2E%")}`);
  swept.videosByUrl = ((await fake.json()) as unknown[]).length;
  record(info, "cleanup", { objectsDeleted: deleted, swept });

  // Restore real content (D-class) from a fresh export of the old DB, then verify.
  const x1 = node(["scripts/migration/export.mjs", "--project", "old", "--label", "B15"]);
  expect(x1, "X1").toMatch(/RESULT X1 ok/);
  const x2 = node(["scripts/migration/import.mjs"]);
  expect(x2, "X2").toMatch(/RESULT X2 ok/);
  const rw = node(["scripts/migration/rewrite-check.mjs", "--q4-out", "B15/q4-after-cleanup.json"]);
  expect(rw, "rewrite-check").toMatch(/RESULT rewrite-check ok/);
  expect(rw, "Q4 = Lovable snapshot").toMatch(/RESULT q4-compare ok/);
  const cp = node(["scripts/migration/copy-storage.mjs"]);
  expect(cp).toMatch(/RESULT copy-storage (ok|skipped)/);
  node(["scripts/migration/copy-storage.mjs", "--prune-extras"]);
  const ex = node(["scripts/migration/copy-storage.mjs", "--report-extras"]);
  record(info, "extras", ex.trim().split("\n").pop());
  expect(ex).toMatch(/RESULT copy-storage-extras ok/);
});
