// R5 / C22 mail guard: nothing the suite sends may ever reach Heidi's inbox.
// A payload that could pass the API's validation is only allowed when assessSpam() says "spam"
// (then send-email.ts routes it to simeliusweb@gmail.com), and only with PA_SPAM_PATH_EMAIL.
import type { APIRequestContext, APIResponse } from "@playwright/test";
import { assessSpam, type SpamInput } from "../../api/_lib/spamCheck";
import { BASE_URL, previewHeaders, secrets } from "./env";

/** Mirror of api/send-email.ts validateRequest(): true when the API would try to send. */
export function wouldPassValidation(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const d = body as Record<string, unknown>;
  if (typeof d.name !== "string" || d.name.trim().length === 0) return false;
  if (typeof d.email !== "string" || !d.email.includes("@")) return false;
  if (typeof d.message !== "string" || d.message.trim().length === 0) return false;
  if (d.formType !== "contact" && d.formType !== "booking") return false;
  if (d.formType === "booking" && (typeof d.phone !== "string" || d.phone.trim().length === 0)) return false;
  if (d.name.trim().length > 100 || d.email.trim().length > 255 || d.message.trim().length > 2000) return false;
  return true;
}

export function mailGuardVerdict(body: unknown): { allowed: boolean; reason: string } {
  if (!wouldPassValidation(body)) return { allowed: true, reason: "invalid payload (400 path, never sends)" };
  const d = body as Record<string, unknown>;
  const verdict = assessSpam({
    ...(d as unknown as SpamInput),
    website: typeof d.website === "string" ? d.website : undefined,
    elapsedMs: typeof d.elapsedMs === "number" ? d.elapsedMs : undefined,
  }).verdict;
  if (verdict !== "spam") return { allowed: false, reason: `R5: payload would be mailed to Heidi (verdict ${verdict})` };
  if (secrets.PA_SPAM_PATH_EMAIL !== "yes") return { allowed: false, reason: "R5: PA_SPAM_PATH_EMAIL not granted" };
  return { allowed: true, reason: "honeypot/spam path → simeliusweb@" };
}

/** The only way specs may POST to /api/send-email. */
export async function postSendEmail(request: APIRequestContext, body: unknown, opts: { raw?: string; contentType?: string } = {}): Promise<APIResponse> {
  const ct = opts.contentType || "application/json";
  // Vercel parses urlencoded bodies into an object, so judge them the way the API will see them.
  const parsed = opts.raw === undefined ? body : ct.includes("urlencoded") ? Object.fromEntries(new URLSearchParams(opts.raw)) : ct.includes("json") ? safeParse(opts.raw) : null;
  const v = mailGuardVerdict(parsed);
  if (!v.allowed) throw new Error(v.reason);
  const url = `${BASE_URL}/api/send-email`;
  return request.post(url, {
    headers: { ...previewHeaders(url), "content-type": ct },
    data: opts.raw !== undefined ? opts.raw : JSON.stringify(body),
  });
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

/** A payload that validates but is certainly routed to the tech inbox (honeypot filled). */
export function honeypotPayload(tag: string, extra: Record<string, unknown> = {}) {
  return {
    formType: "contact",
    name: `E2E-TESTI ${tag}`,
    email: "simeliusweb+e2e@gmail.com",
    message: `E2E-TESTI ${tag} – automaattinen testiviesti, ei toimenpiteitä.`,
    website: "e2e-honeypot",
    elapsedMs: 10_000,
    ...extra,
  };
}
