import { afterEach, describe, expect, it, vi } from "vitest";
import { sendForm, sendFormFailedMessage } from "./sendForm";

const mail = "heidi@example.invalid";

describe("sendForm", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("resolves on a successful send", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 })));
    await expect(sendForm({ formType: "contact" }, mail)).resolves.toBeUndefined();
  });

  it("turns a JSON error into the Finnish fallback message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: "Internal server error" }), { status: 500 })));
    await expect(sendForm({}, mail)).rejects.toThrow(sendFormFailedMessage(mail));
  });

  it("does not leak a SyntaxError for an HTML error page", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>502 Bad Gateway</html>", { status: 502 })));
    await expect(sendForm({}, mail)).rejects.toThrow(sendFormFailedMessage(mail));
  });

  it("handles a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(sendForm({}, mail)).rejects.toThrow(sendFormFailedMessage(mail));
  });
});
