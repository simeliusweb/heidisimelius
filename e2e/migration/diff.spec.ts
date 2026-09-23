// A17, A18: BL1 ≡ BL2 at T0 (repeatable captures; rendered text snapshot). Wraps diff.mjs on two
// capture.mjs baselines: DIFF_A / DIFF_B are labels under $STATE/baselines (e.g. BL1 BL2).
import { execFileSync } from "node:child_process";
import { spec, expect, record, test } from "../support/fixtures";
import { REPO } from "../support/env";

function diff(layers: string) {
  const a = process.env.DIFF_A, b = process.env.DIFF_B;
  test.skip(!a || !b, "set DIFF_A and DIFF_B to two capture labels (e.g. BL1 BL2)");
  try {
    return { code: 0, out: execFileSync("node", ["scripts/migration/diff.mjs", a!, b!, "--layers", layers], { cwd: REPO, encoding: "utf8" }) };
  } catch (e) {
    const err = e as { status: number; stdout: string };
    return { code: err.status, out: err.stdout };
  }
}

spec({ id: "A17", title: "repeatable captures: same splits, JSON-LD and dates at T0", tier: "gate", env: ["direct"], data: "read" }, async (_args, info) => {
  const r = diff("rendered-data");
  record(info, "diff", r.out.slice(-2000));
  expect(r.code).toBe(0);
});

spec({ id: "A18", title: "rendered text snapshot of every route = BL1", tier: "gate", env: ["direct"], data: "read" }, async (_args, info) => {
  const r = diff("rendered-text");
  record(info, "diff", r.out.slice(-2000));
  expect(r.code).toBe(0);
});
