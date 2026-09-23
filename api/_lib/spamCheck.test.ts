import { describe, expect, it } from "vitest";
import { assessSpam, type SpamInput } from "./spamCheck";

// C6 / C16 / C17: pinned verdicts. A real customer must never become "spam".
const human = (over: Partial<SpamInput> = {}): SpamInput => ({
  formType: "contact",
  name: "Keikkatiedustelu",
  email: "matti.virtanen@example.fi",
  message: "Hei! Olisitko vapaana esiintymään yrityksemme pikkujouluissa joulukuussa?",
  website: "",
  elapsedMs: 25_000,
  ...over,
});
const verdict = (over: Partial<SpamInput>) => assessSpam(human(over)).verdict;

describe("assessSpam: ham (C16)", () => {
  it.each([
    ["Finnish names", { name: "Äijälä", message: "Moi, kysyisin keikasta Tampereella." }],
    ["double-barrelled name", { formType: "booking" as const, name: "Pääkkönen-Öhman", phone: "040 123 4567" }],
    ["Swedish name", { name: "Sjöström-Åkerblom" }],
    ["mixed case", { name: "McDonald-VanDerBerg" }],
    ["Cyrillic", { name: "Анна Смирнова", message: "Здравствуйте! Хотим пригласить вас на праздник." }],
    ["CJK", { name: "山田太郎", message: "コンサートについて質問があります。" }],
    ["Vietnamese", { name: "Nguyễn Thị Hương", message: "Xin chào, tôi muốn đặt lịch biểu diễn." }],
    ["short greeting", { message: "Moi" }],
    ["all caps", { name: "HÄÄKEIKKA KESÄKUUSSA" }],
    ["emoji", { message: "Ihana keikka eilen 😍🎶 kiitos!" }],
    ["three URLs", { message: "Katso https://a.fi https://b.fi https://c.fi" }],
    ["SEO pitch without timing", { message: "We can improve your SEO and website traffic." }],
  ])("%s", (_label, over) => {
    expect(verdict(over)).toBe("ham");
  });
});

describe("assessSpam: suspect (C16)", () => {
  it("fast submit + 3-dot gmail", () => {
    expect(verdict({ elapsedMs: 800, email: "j.p.k.laine@gmail.com" })).toBe("suspect");
  });
  it("a pasted order code as the message", () => {
    expect(verdict({ message: "4cOdK2wGLETKBW3PvgPWqT" })).toBe("suspect");
  });
});

describe("assessSpam: spam (C16)", () => {
  it("fast submit + 3 URLs", () => {
    expect(verdict({ elapsedMs: 500, message: "https://a.example https://b.example https://c.example" })).toBe("spam");
  });
  it("fast submit + 4-dot gmail", () => {
    expect(verdict({ elapsedMs: 500, email: "a.b.c.d.e@gmail.com" })).toBe("spam");
  });
  it("the weekly bot sample", () => {
    expect(verdict({ name: "DZiZYBAuexMthkZAU", email: "m.o.r.e.co.p.exu.t32@gmail.com", message: "sMFXjOECFaCAQTQxBTLYD" })).toBe("spam");
  });
  it("a filled honeypot alone", () => {
    expect(verdict({ website: "http://spam.example" })).toBe("spam");
  });
});

describe("assessSpam: honeypot and timer tampering (C17)", () => {
  it("whitespace-only honeypot is not flagged", () => {
    expect(verdict({ website: "   " })).toBe("ham");
  });
  it("a numeric honeypot (as the API passes it: undefined) is not flagged", () => {
    expect(verdict({ website: undefined })).toBe("ham");
  });
  it.each([
    ["missing", undefined],
    ["negative", -5],
    ["huge", 1e12],
    ["NaN", Number.NaN],
  ])("elapsedMs %s gives no fast signal", (_l, elapsedMs) => {
    const a = assessSpam(human({ elapsedMs: elapsedMs as number | undefined }));
    expect(a.reasons.some((r) => r.includes("ms after render"))).toBe(false);
  });
  it("a string elapsedMs never reaches the check (the API passes undefined)", () => {
    const a = assessSpam(human({ elapsedMs: "100" as unknown as number }));
    expect(a.reasons.some((r) => r.includes("ms after render"))).toBe(false);
  });
});
