import { describe, expect, it } from "vitest";
import { getYouTubeEmbedUrl } from "./utils";

// A36: YouTube URL forms the CMS accepts. Forms marked FU6 aren't supported yet (follow-up).
const ID = "nNooz5tHV6U";
const embed = `https://www.youtube.com/embed/${ID}`;

describe("getYouTubeEmbedUrl (A36)", () => {
  it.each([
    [`https://youtu.be/${ID}?si=abc123`],
    [`https://www.youtube.com/watch?v=${ID}&t=42`],
    [`https://m.youtube.com/watch?v=${ID}`],
    [`https://www.youtube.com/embed/${ID}`],
    [`youtu.be/${ID}`],
  ])("%s", (url) => {
    expect(getYouTubeEmbedUrl(url)).toBe(embed);
  });

  it.fails.each([
    [`https://www.youtube.com/shorts/${ID}`],
    [`https://www.youtube.com/live/${ID}`],
    [`https://www.youtube.com/watch?feature=share&v=${ID}`],
  ])("FU6: %s", (url) => {
    expect(getYouTubeEmbedUrl(url)).toBe(embed);
  });

  it("rejects non-YouTube input", () => {
    expect(getYouTubeEmbedUrl("abc")).toBeUndefined();
    expect(getYouTubeEmbedUrl("https://vimeo.com/123456")).toBeUndefined();
  });
});
