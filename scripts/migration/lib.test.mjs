// 3.4: the R4 write guard. Run with `node --test scripts/migration/`.
import test from "node:test";
import assert from "node:assert/strict";
import { assertAllowed, guardFetch, OLD_URL } from "./lib.mjs";

test("non-GET requests to the old project are refused", async () => {
  for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
    assert.throws(() => assertAllowed(`${OLD_URL}/rest/v1/gigs`, method), /R4 guard/);
    assert.throws(() => assertAllowed(`${OLD_URL}/storage/v1/object/images/x.jpg`, method), /R4 guard/);
    assert.throws(() => assertAllowed(`${OLD_URL}/auth/v1/admin/users`, method), /R4 guard/);
  }
  await assert.rejects(() => guardFetch(`${OLD_URL}/rest/v1/gigs`, { method: "DELETE" }), /R4 guard/);
});

test("reads, the read-only storage listing and other hosts are allowed", () => {
  assert.doesNotThrow(() => assertAllowed(`${OLD_URL}/rest/v1/gigs?select=*`, "GET"));
  assert.doesNotThrow(() => assertAllowed(`${OLD_URL}/storage/v1/object/list/images`, "POST"));
  assert.doesNotThrow(() => assertAllowed("https://neqprqqhiifqemphpwhu.supabase.co/rest/v1/gigs", "POST"));
});
