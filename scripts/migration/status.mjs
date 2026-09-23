// §0: print step statuses, open halts and the next runnable steps from $STATE/state.json.
import { readState } from "./lib.mjs";

const ORDER = [
  "STEP1", "2A.1", "2A.2", "2A.3", "2A.4", "2A.5",
  "2B.0", "2B.1", "2B.2", "2B.2k", "2B.3", "2B.4", "2B.5", "2B.6", "2B.7", "2B.8",
  "2C", "2D", "2E", "2F.1", "2F.2", "2F.3", "2F.4", "2F.5", "2F.6", "2F.7",
  "3", "5.1", "5.2", "5.3", "5.4", "5.5", "11",
  "8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "8.8", "8.9", "GL",
];
const s = readState();
const steps = s.steps || {};
for (const id of ORDER) {
  const st = steps[id];
  console.log(`${id.padEnd(6)} ${st ? st.status.padEnd(9) : "pending  "} ${st?.at || ""}${st?.note ? "  " + st.note : ""}`);
}
const running = Object.entries(steps).filter(([, v]) => v.status === "running").map(([k]) => k);
if (running.length) console.log(`\nRESUME: re-run the Success check of: ${running.join(", ")}`);
const halts = (s.halts || []).filter((h) => !h.resolved);
if (halts.length) console.log(`\nOPEN HALTS:\n${halts.map((h) => `- ${h.id}: ${h.reason}`).join("\n")}`);
const next = ORDER.find((id) => !steps[id] || !["done", "fallback", "skipped"].includes(steps[id].status));
console.log(`\nNEXT: ${next || "(all done)"}${s.golive_at ? `  (golive_at ${s.golive_at})` : ""}`);

// 14.1: record go-live once the production deployment of the tested SHA is READY on the new ref.
if (process.argv[2] === "--mark-golive") {
  const { writeState, goLiveStatus } = await import("./lib.mjs");
  const g = await goLiveStatus();
  if (g.prodOnNew !== true) {
    console.error("refused: the production bundle does not point at the new project yet");
    process.exit(2);
  }
  writeState((st) => { st.golive_at ||= new Date().toISOString(); });
  console.log("golive_at recorded");
}
