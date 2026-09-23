import { describe, expect, it } from "vitest";
import { gigAnchorId } from "./gigAnchor";

describe("gigAnchorId", () => {
  it("folds Finnish letters and punctuation into a readable slug", () => {
    expect(gigAnchorId({ id: "11111111-2222-3333-4444-555555555555", title: "Häikäisevän kirkas!", gig_group_id: null }))
      .toBe("haikaisevan-kirkas-11111111");
  });

  it("uses the group id, so every performance of a group links to the same card", () => {
    const group = "abcdef12-0000-0000-0000-000000000000";
    const a = gigAnchorId({ id: "11111111-0000-0000-0000-000000000000", title: "Ruuhkavuosi", gig_group_id: group });
    const b = gigAnchorId({ id: "22222222-0000-0000-0000-000000000000", title: "Ruuhkavuosi", gig_group_id: group });
    expect(a).toBe(b);
    expect(a).toBe("ruuhkavuosi-abcdef12");
  });

  it("keeps same-titled groups apart", () => {
    const a = gigAnchorId({ id: "1", title: "Ruuhkavuosi", gig_group_id: "aaaaaaaa-1" });
    const b = gigAnchorId({ id: "2", title: "Ruuhkavuosi", gig_group_id: "bbbbbbbb-1" });
    expect(a).not.toBe(b);
  });

  it("is a valid, non-empty CSS id for titles without letters", () => {
    expect(gigAnchorId({ id: "12345678-aaaa", title: "!!!", gig_group_id: null })).toBe("keikka-12345678");
    expect(gigAnchorId({ id: "12345678-aaaa", title: "2026 – Tour", gig_group_id: null })).toMatch(/^[a-z0-9-]+$/);
  });
});
