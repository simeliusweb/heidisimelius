// /api/send-email contract on a preview (P): C3, C5, C8, C9, C10, C11, C12, C19, C22, C23.
// Only invalid payloads or honeypot payloads (→ simeliusweb@ tech inbox) are ever sent (R5).
import { spec, expect, record, test } from "../support/fixtures";
import { BASE_URL, RUN_ID, previewHeaders, secrets } from "../support/env";
import { honeypotPayload, mailGuardVerdict, postSendEmail } from "../support/mail";

const url = `${BASE_URL}/api/send-email`;
const hdr = () => previewHeaders(url);

spec({ id: "C3", title: "API contract: 400s, 405, OPTIONS", tier: "regression", env: ["P"], data: "read" }, async ({ request }) => {
  expect((await postSendEmail(request, { formType: "contact" })).status()).toBe(400);
  expect((await postSendEmail(request, { formType: "nope", name: "a", email: "a@b", message: "m" })).status()).toBe(400);
  expect((await request.get(url, { headers: hdr() })).status()).toBe(405);
  expect((await request.fetch(url, { method: "OPTIONS", headers: hdr() })).status()).toBe(200);
});

/** Brevo transactional events for an address since `since` (negative/positive delivery checks). */
async function brevoEvents(email: string, since: Date) {
  if (!secrets.BREVO_API_KEY) return null;
  const d = (x: Date) => x.toISOString().slice(0, 10);
  const r = await fetch(`https://api.brevo.com/v3/smtp/statistics/events?limit=100&email=${encodeURIComponent(email)}&startDate=${d(since)}&endDate=${d(new Date())}`, {
    headers: { "api-key": secrets.BREVO_API_KEY, accept: "application/json" },
  });
  if (!r.ok) return null;
  return ((await r.json()).events || []) as { subject?: string; event: string; date: string }[];
}

spec({ id: "C5", title: "spam path: honeypot mail goes only to the tech inbox", tier: "gate", env: ["P"], data: "read" }, async ({ request }, info) => {
  test.setTimeout(180_000);
  const tag = `E2E-TESTI-${RUN_ID}-C5-${Date.now()}`;
  const payload = honeypotPayload(tag);
  expect(mailGuardVerdict(payload).allowed).toBe(true);
  const since = new Date(Date.now() - 60_000);
  const r = await postSendEmail(request, payload);
  expect(r.status()).toBe(200);
  record(info, "gmail check (AGENT-BR)", `search simeliusweb@gmail.com: in:anywhere "${tag}"`);
  // Brevo: something went to the tech inbox, nothing with this tag to Heidi.
  let tech: unknown[] | null = null;
  for (let i = 0; i < 12; i++) {
    const ev = await brevoEvents("simeliusweb@gmail.com", since);
    if (ev === null) break;
    tech = ev.filter((e) => (e.subject || "").includes(tag));
    if (tech.length) break;
    await new Promise((res) => setTimeout(res, 10_000));
  }
  record(info, "brevo tech-inbox events", tech ?? "no BREVO_API_KEY / API unavailable");
  const heidi = await brevoEvents("simelius.heidi@gmail.com", since);
  if (heidi) expect(heidi.filter((e) => (e.subject || "").includes(tag))).toEqual([]);
});

spec({ id: "C8", title: "validation matrix, exact limits, methods", tier: "regression", env: ["P"], data: "read" }, async ({ request }, info) => {
  const base = { formType: "contact", name: "n", email: "a@b.fi", message: "m" };
  const bad: Record<string, unknown>[] = [
    {}, { ...base, name: "" }, { ...base, name: "   " }, { ...base, name: 5 }, { ...base, email: "nope" }, { ...base, email: 1 },
    { ...base, message: "" }, { ...base, message: " " }, { ...base, formType: undefined }, { ...base, formType: "booking" },
    { ...base, formType: "booking", phone: "  " }, { ...base, name: "n".repeat(101) }, { ...base, email: `${"a".repeat(250)}@b.fi` }, { ...base, message: "m".repeat(2001) },
  ];
  for (const b of bad) expect((await postSendEmail(request, b)).status(), JSON.stringify(b).slice(0, 80)).toBe(400);
  // Exact limits pass validation: honeypot only.
  const tag = `E2E-TESTI-${RUN_ID}-C8`;
  for (const extra of [{ name: `${tag} `.padEnd(100, "n") }, { email: `simeliusweb+${"e".repeat(255 - "simeliusweb+@gmail.com".length)}@gmail.com` }, { message: `${tag} `.padEnd(2000, "m") }]) {
    const p = honeypotPayload(tag, extra);
    const st = (await postSendEmail(request, p)).status();
    // A 255-char address passes our validation but breaks RFC 5321's 64-char local part, so Brevo may refuse it.
    if ("email" in extra) record(info, "255-char email", st);
    else expect(st, Object.keys(extra)[0]).toBe(200);
  }
  for (const method of ["PUT", "DELETE", "PATCH"]) expect((await request.fetch(url, { method, headers: hdr(), data: "{}" })).status(), method).toBe(405);
});

spec({ id: "C9", title: "body formats (record)", tier: "record", env: ["P"], data: "read" }, async ({ request }, info) => {
  const invalid = await postSendEmail(request, null, { raw: "{not json", contentType: "application/json" });
  const plain = await postSendEmail(request, null, { raw: "hello", contentType: "text/plain" });
  const form = await postSendEmail(request, null, { raw: new URLSearchParams(honeypotPayload(`E2E-TESTI-${RUN_ID}-C9`) as unknown as Record<string, string>).toString(), contentType: "application/x-www-form-urlencoded" });
  record(info, "statuses", { invalidJson: invalid.status(), textPlain: plain.status(), urlencoded: form.status() });
  expect(plain.status()).toBe(400);
});

spec({ id: "C10", title: "CORS behaviour (record)", tier: "record", env: ["P", "prod"], data: "read" }, async ({ request }, info) => {
  const r = await postSendEmail(request, { formType: "contact" }, {});
  const evil = await request.fetch(url, { method: "OPTIONS", headers: { ...hdr(), Origin: "https://evil.example", "Access-Control-Request-Method": "POST" } });
  record(info, "cors", { acaoOnPost: r.headers()["access-control-allow-origin"] ?? null, acaoOnPreflight: evil.headers()["access-control-allow-origin"] ?? null, bodyKeys: Object.keys(await r.json()) });
});

spec({ id: "C11", title: "HTML escaping in the mail (tech inbox)", tier: "regression", env: ["P"], data: "read" }, async ({ request }, info) => {
  const tag = `E2E-TESTI-${RUN_ID}-C11`;
  const p = honeypotPayload(tag, { message: `${tag} <img src=x onerror=alert(1)> "><script>alert(1)</script> &amp; javascript:alert(1)\nrivi 2` });
  expect((await postSendEmail(request, p)).status()).toBe(200);
  record(info, "manual check (AGENT-BR)", `Gmail "${tag}" → Show original: entities only, nothing remote loads`);
});

spec({ id: "C12", title: "header injection and Reply-To", tier: "regression", env: ["P"], data: "read" }, async ({ request }, info) => {
  const tag = `E2E-TESTI-${RUN_ID}-C12`;
  const a = honeypotPayload(tag, { name: `${tag}\r\nBcc: attacker@example.invalid`, to: "x@example.invalid", cc: "y@example.invalid", bcc: "z@example.invalid" });
  expect((await postSendEmail(request, a)).status()).toBe(200);
  const b = honeypotPayload(tag, { formType: "booking", phone: "040", name: `"Ä, <x> ${tag}` });
  expect((await postSendEmail(request, b)).status()).toBe(200);
  record(info, "manual check (AGENT-BR)", `Gmail "${tag}": 2 messages, no Bcc header, Reply-To quoted safely`);
});

spec({ id: "C19", title: "field size limits (record)", tier: "record", env: ["P"], data: "read" }, async ({ request }, info) => {
  const big = "9".repeat(100_000);
  const r1 = await postSendEmail(request, honeypotPayload(`E2E-TESTI-${RUN_ID}-C19`, { formType: "booking", phone: big, location: big }));
  const huge = await request.post(url, { headers: { ...hdr(), "content-type": "application/json" }, data: JSON.stringify({ formType: "contact", pad: "x".repeat(4_700_000) }) });
  record(info, "statuses", { hundredKbFields: r1.status(), over45MB: huge.status(), over45MBType: huge.headers()["content-type"] });
});

spec({ id: "C22", title: "suite guard refuses anything that could mail Heidi", tier: "gate", env: ["direct"], data: "read" }, async ({ request }) => {
  const ham = { formType: "contact", name: "Keikkatiedustelu", email: "matti@example.fi", message: "Hei, olisitko vapaana kesäkuussa?", website: "", elapsedMs: 20_000 };
  expect(mailGuardVerdict(ham).allowed).toBe(false);
  await expect(postSendEmail(request, ham)).rejects.toThrow(/R5/);
  expect(mailGuardVerdict(honeypotPayload("x")).allowed).toBe(secrets.PA_SPAM_PATH_EMAIL === "yes");
  expect(mailGuardVerdict({ formType: "contact" }).allowed).toBe(true);
});

spec({ id: "C23", title: "helper module is not a route", tier: "regression", env: ["P", "prod"], data: "read" }, async ({ request }) => {
  const u = `${BASE_URL}/api/_lib/spamCheck`;
  expect((await request.get(u, { headers: previewHeaders(u) })).status()).toBe(404);
});
