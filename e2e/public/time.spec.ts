// A22, A23: the upcoming/past boundary, DST, and times that don't depend on the viewer's timezone.
import { spec, expect, record, pinClock } from "../support/fixtures";
import { BASE_URL, REPO, T0 } from "../support/env";
import { gotoSettled, jsonLd, eventsOf } from "../support/site";
import { anonGet } from "../support/rest";

const hki = (iso: string) =>
  new Intl.DateTimeFormat("fi-FI", { timeZone: "Europe/Helsinki", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)).replace(".", ":");

spec({ id: "A22", title: "upcoming/past boundary moves one gig; DST shows 19:00 both sides", tier: "regression", env: ["L"], data: "read" }, async ({ page, run }, info) => {
  const up = await anonGet<{ id: string; title: string; performance_date: string; gig_group_id: string | null }>(
    run.targetRef,
    `gigs?select=id,title,performance_date,gig_group_id&performance_date=gte.${encodeURIComponent(T0)}&order=performance_date.asc`,
  );
  if (!up.length) return record(info, "skipped", "no upcoming gig at T0");
  const g = up[0];
  const at = new Date(g.performance_date).getTime();
  const startsOf = async () => eventsOf(await jsonLd(page)).map((e) => String(e.startDate));

  await page.clock.setSystemTime(new Date(at - 60_000));
  await gotoSettled(page, "/keikat");
  const before = await startsOf();
  await page.clock.setSystemTime(new Date(at + 60_000));
  await gotoSettled(page, "/keikat");
  const after = await startsOf();
  expect(before.length - after.length, "exactly this gig's rows at that instant move to the past").toBe(up.filter((x) => x.performance_date === g.performance_date).length);
  const pastFirst = await page.evaluate(() => {
    const h = [...document.querySelectorAll("h2")].find((x) => x.textContent?.trim() === "Menneet keikat");
    return h?.closest("section")?.querySelector("h3")?.textContent?.trim();
  });
  expect(pastFirst).toBe(g.title);

  // DST: every upcoming time shown on /keikat is the Helsinki wall-clock time of its row.
  await page.clock.setSystemTime(new Date(T0));
  await gotoSettled(page, "/keikat");
  const shown = (await page.getByText(/^klo \d{2}:\d{2}$/).allInnerTexts()).map((t) => t.replace("klo ", ""));
  const want = [...new Set(up.map((x) => hki(x.performance_date)))];
  record(info, "times", { shown: [...new Set(shown)], want });
  for (const t of shown) expect(want).toContain(t);
});

spec({ id: "A23", title: "viewer timezone doesn't change the times shown", tier: "known", env: ["L"], data: "read", extraTags: ["@FX8"] }, async ({ page }) => {
  const browser = page.context().browser()!;
  const grab = async (timezoneId: string) => {
    const ctx = await browser.newContext({ baseURL: BASE_URL, timezoneId, locale: "fi-FI", storageState: `${REPO}/e2e/.auth/state.json` });
    const p = await ctx.newPage();
    await pinClock(p);
    const out: Record<string, string[]> = {};
    for (const route of ["/", "/keikat"]) {
      await gotoSettled(p, route);
      out[route] = (await p.locator("main, body").first().innerText()).match(/\b\d{1,2}[.:]\d{2}\b/g) || [];
      out[`${route} jsonld`] = eventsOf(await jsonLd(p)).map((e) => String(e.startDate));
    }
    await ctx.close();
    return out;
  };
  const helsinki = await grab("Europe/Helsinki");
  for (const tz of ["UTC", "America/Los_Angeles"]) {
    const other = await grab(tz);
    expect(other, `${tz} vs Helsinki`).toEqual(helsinki);
  }
});
