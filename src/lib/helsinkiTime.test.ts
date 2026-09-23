import { describe, expect, it } from "vitest";
import { formatHelsinki } from "./helsinkiTime";

describe("formatHelsinki", () => {
  it("shows 19:00 for a summer-time evening gig (UTC+3)", () => {
    expect(formatHelsinki("2026-09-25T16:00:00Z", "HH:mm")).toBe("19:00");
    expect(formatHelsinki("2026-09-25T16:00:00Z", "dd.MM.yyyy")).toBe("25.09.2026");
  });

  it("shows 19:00 for a winter-time evening gig (UTC+2)", () => {
    expect(formatHelsinki("2026-11-14T17:00:00Z", "HH:mm")).toBe("19:00");
    expect(formatHelsinki("2026-11-14T17:00:00+00:00", "d.M.yyyy")).toBe("14.11.2026");
  });

  it("uses the Helsinki date around midnight", () => {
    // 22:30 UTC on 31.12. is already 1.1. in Helsinki
    expect(formatHelsinki("2026-12-31T22:30:00Z", "yyyy-MM-dd HH:mm")).toBe("2027-01-01 00:30");
  });

  it("does not depend on the process timezone", () => {
    const original = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      expect(formatHelsinki(new Date("2026-09-25T16:00:00Z"), "HH:mm")).toBe("19:00");
    } finally {
      process.env.TZ = original;
    }
  });
});
