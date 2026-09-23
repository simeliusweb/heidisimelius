import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./keep-db-alive";

const call = async (authorization?: string) => {
  const res = { statusCode: 0, body: undefined as unknown };
  const response = {
    status(code: number) {
      res.statusCode = code;
      return this;
    },
    json(body: unknown) {
      res.body = body;
      return this;
    },
  } as unknown as VercelResponse;
  const req = { headers: authorization ? { authorization } : {} } as VercelRequest;
  await handler(req, response);
  return res;
};

describe("keep-db-alive", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.VITE_SUPABASE_URL = "https://example.supabase.co";
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("refuses every call when CRON_SECRET is unset", async () => {
    expect((await call()).statusCode).toBe(401);
    expect((await call("Bearer anything")).statusCode).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a missing or wrong bearer", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await call()).statusCode).toBe(401);
    expect((await call("Bearer wrong")).statusCode).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("pings the configured project with the right bearer", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await call("Bearer s3cret");
    expect(res.statusCode).toBe(200);
    expect(JSON.stringify(res.body)).toContain("Pinged Supabase");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/gigs?select=id&limit=1",
      expect.objectContaining({ headers: expect.objectContaining({ apikey: "sb_publishable_test" }) }),
    );
  });

  it("does not leak the upstream error text", async () => {
    process.env.CRON_SECRET = "s3cret";
    fetchMock.mockResolvedValue(new Response("secret upstream detail", { status: 503 }));
    const res = await call("Bearer s3cret");
    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("upstream");
    expect(JSON.stringify(res.body)).not.toContain("503");
  });
});
