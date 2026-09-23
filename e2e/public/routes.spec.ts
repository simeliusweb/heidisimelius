// A1, A2 (+ live-clock run), A3, A16, A24: every public route renders from the expected project.
import { spec, expect, record, test, KNOWN_PREEXISTING } from "../support/fixtures";
import { ROUTES, NEW_REF, OLD_REF, T0, projectFor, secrets } from "../support/env";
import { gotoSettled, expandAll, jsonLd, eventsOf, countInSections, loadAllImages } from "../support/site";
import { anonCount, anonGet, upcomingAt } from "../support/rest";

spec({ id: "A1", title: "project-ref isolation on every page load", tier: "gate", env: ["L", "P", "prod"], data: "read", smoke: true }, async ({ page, rec, run }) => {
  for (const route of ROUTES) {
    rec.requests.length = 0;
    await gotoSettled(page, route);
    const target = rec.requests.filter((r) => r.url.includes(`${run.targetRef}.supabase.co`));
    const other = run.targetRef === NEW_REF ? OLD_REF : NEW_REF;
    // The bilebandi page is static (no DB content); every other route must hit the target project.
    if (route !== "/bilebandi-heidi-and-the-hot-stuff") expect(target.length, `${route}: requests to the target ref`).toBeGreaterThan(0);
    expect(rec.requests.filter((r) => r.url.includes(other)).length, `${route}: requests to the other ref`).toBe(0);
    // Proves the publishable key works: every REST call answered 2xx.
    const rest = target.filter((r) => r.url.includes("/rest/v1/"));
    expect(rest.every((r) => (r.status ?? 0) >= 200 && (r.status ?? 0) < 300), `${route}: REST statuses ${rest.map((r) => r.status)}`).toBe(true);
  }
  const { url, key } = projectFor(run.targetRef);
  const r = await fetch(`${url}/rest/v1/gigs?select=id&limit=1`, { headers: { apikey: key } });
  expect(r.headers.get("sb-project-ref")).toBe(run.targetRef);
});

async function expectedCounts(ref: string, at: string) {
  const up = await upcomingAt(ref, at);
  const sets = await anonGet<{ is_press_kit: boolean }>(ref, "photo_sets?select=is_press_kit");
  const videos = await anonGet<{ section: string }>(ref, "videos?select=section");
  return {
    upcomingRows: up.rows.length,
    upcomingGroups: up.groups.length,
    galleries: sets.filter((s) => !s.is_press_kit).length,
    pressKit: sets.some((s) => s.is_press_kit),
    music: videos.filter((v) => v.section === "Musavideot").length,
    other: videos.filter((v) => v.section === "Muut videot").length,
  };
}

async function assertRoutes(page: import("@playwright/test").Page, ref: string, at: string, info: import("@playwright/test").TestInfo) {
  const exp = await expectedCounts(ref, at);
  record(info, "expected", exp);
  for (const route of ROUTES) {
    const resp = await gotoSettled(page, route);
    expect(resp?.status(), route).toBe(200);
    await expect(page.locator(".animate-pulse"), `${route}: skeletons gone`).toHaveCount(0);
    await expect(page.getByText(/Virhe haettaessa/), `${route}: no error text`).toHaveCount(0);
  }
  await gotoSettled(page, "/");
  await expect(page.locator('a[href^="/keikat#"]')).toHaveCount(Math.min(3, exp.upcomingGroups));
  await expect(page.locator('iframe[src*="youtube.com/embed/"]')).toHaveCount(exp.music);

  await gotoSettled(page, "/keikat");
  expect(await countInSections(page, ["Musiikkikeikat", "Teatteriesitykset"], "h2"), "keikat event cards").toBe(exp.upcomingGroups);
  expect(eventsOf(await jsonLd(page)).length, "keikat JSON-LD events").toBe(exp.upcomingRows);

  await gotoSettled(page, "/galleria");
  await expect(page.getByRole("heading", { name: "Pressikuvat" }).first()).toHaveCount(exp.pressKit ? 1 : 0);
  expect(await countInSections(page, ["Kuvagalleria"], "h3"), "galleries").toBe(exp.galleries);
  await expect(page.locator('iframe[src*="youtube.com/embed/"]')).toHaveCount(exp.music + exp.other);
}

spec({ id: "A2", title: "every route renders from the DB (T0 counts)", tier: "gate", env: ["L", "P", "prod"], data: "read", smoke: true }, async ({ page, run }, info) => {
  await assertRoutes(page, run.targetRef, T0, info);
});

spec({ id: "A2-live", title: "live clock: upcoming = REST count >= now", tier: "gate", env: ["L", "P", "prod"], data: "read", liveClock: true }, async ({ page, run }, info) => {
  const now = new Date().toISOString();
  const rows = await anonCount(run.targetRef, "gigs", `performance_date=gte.${encodeURIComponent(now)}`);
  await gotoSettled(page, "/keikat");
  const events = eventsOf(await jsonLd(page)).length;
  record(info, "live", { restUpcoming: rows, jsonLdEvents: events });
  // A few seconds pass between the REST call and the page's own query; a gig starting in that window is the only allowed difference.
  expect(Math.abs(events - rows)).toBeLessThanOrEqual(0);
});

spec({ id: "A3", title: "images load and use the target ref", tier: "gate", env: ["L", "prod"], data: "read" }, async ({ page, run }) => {
  test.setTimeout(300_000);
  for (const route of ROUTES) {
    await gotoSettled(page, route);
    await expandAll(page);
    await loadAllImages(page);
    const imgs = await page.evaluate(() => [...document.images].map((i) => ({ src: i.currentSrc || i.src, w: i.naturalWidth, complete: i.complete })));
    for (const i of imgs.filter((x) => x.src.includes(".supabase.co"))) {
      expect(i.src, `${route}: image host`).toContain(`${run.targetRef}.supabase.co`);
      expect(i.w, `${route}: ${i.src.slice(-60)} naturalWidth`).toBeGreaterThan(0);
    }
    const broken = imgs.filter((i) => i.complete && i.w === 0 && i.src && !i.src.startsWith("data:"));
    expect(broken.map((b) => b.src), `${route}: broken images`).toEqual([]);
    // Hero CSS backgrounds
    const bgs = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[style*='background-image']")]
        .map((e) => getComputedStyle(e).backgroundImage.match(/url\("?([^")]+)"?\)/)?.[1])
        .filter((u): u is string => Boolean(u)),
    );
    for (const u of bgs) {
      const abs = new URL(u, page.url()).toString();
      if (abs.includes(".supabase.co")) expect(abs).toContain(`${run.targetRef}.supabase.co`);
      const r = await page.request.get(abs, { headers: { Range: "bytes=0-0" } });
      expect([200, 206], `${route}: hero ${abs.slice(-60)}`).toContain(r.status());
    }
  }
});

spec({ id: "A16", title: "no uncaught errors or failed first-party requests", tier: "gate", env: ["L", "P", "prod"], data: "read" }, async ({ page, rec, run }) => {
  for (const route of [...ROUTES, "/this-page-does-not-exist-e2e"]) {
    await gotoSettled(page, route);
  }
  expect(rec.consoleErrors, "console errors").toEqual([]);
  const firstParty = rec.requests.filter((r) => {
    const u = new URL(r.url);
    return u.origin === new URL(page.url()).origin || u.host === `${run.targetRef}.supabase.co`;
  });
  const failed = firstParty.filter(
    (r) => (r.status ?? 0) >= 400 && !(r.url.endsWith("/this-page-does-not-exist-e2e") && r.status === 404) && !KNOWN_PREEXISTING.some((k) => k.re.test(r.url)),
  );
  expect(failed.map((f) => `${f.status} ${f.url}`)).toEqual([]);
});

spec({ id: "A24", title: "stored sessions: old token, admin session, garbage token", tier: "gate", env: ["L", "prod"], data: "read" }, async ({ page, rec, run }, info) => {
  // (a) a stale Lovable-era session left in localStorage
  const fakeJwt = "x.eyJzdWIiOiJvbGQifQ.y";
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [
    `sb-${OLD_REF}-auth-token`,
    JSON.stringify({ access_token: fakeJwt, refresh_token: "old", expires_at: 4102444800, token_type: "bearer", user: { id: "old" } }),
  ]);
  for (const route of ["/", "/keikat"]) await gotoSettled(page, route);
  if (run.targetRef === NEW_REF) {
    // After the move the old project's storage key is simply ignored by the new client.
    expect(rec.refCounts().old, "requests to the old ref").toBe(0);
    await expect(page.getByText(/Virhe haettaessa/)).toHaveCount(0);
  } else {
    // On the old project that key IS the live session key, so this is case (c): record only.
    record(info, "A24a on the old project (= garbage token for the target)", { errorTexts: await page.getByText(/Virhe haettaessa/).count() });
  }

  // (c) a garbage, unexpired token for the target project: record the behaviour
  const ctx = await page.context().browser()!.newContext({ baseURL: page.url(), timezoneId: "Europe/Helsinki" });
  const p2 = await ctx.newPage();
  await p2.addInitScript(([k, v]) => localStorage.setItem(k, v), [
    `sb-${run.targetRef}-auth-token`,
    JSON.stringify({ access_token: fakeJwt, refresh_token: "garbage", expires_at: 4102444800, token_type: "bearer", user: { id: "garbage" } }),
  ]);
  const statuses: number[] = [];
  p2.on("response", (r) => { if (r.url().includes("/rest/v1/")) statuses.push(r.status()); });
  await p2.goto(new URL("/keikat", page.url()).toString());
  await p2.waitForTimeout(4000);
  record(info, "A24c garbage token REST statuses", statuses);
  record(info, "A24c error text shown", await p2.getByText(/Virhe haettaessa/).count());
  await ctx.close();

  // (b) the authenticated SELECT path: test admin session on the new project
  if (run.targetRef === NEW_REF && secrets.TEST_ADMIN_EMAIL) {
    const { url, key } = projectFor(NEW_REF);
    const tok = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      body: JSON.stringify({ email: secrets.TEST_ADMIN_EMAIL, password: secrets.TEST_ADMIN_PASSWORD }),
    }).then((r) => r.json());
    const anon = await fetch(`${url}/rest/v1/gigs?select=id&order=id`, { headers: { apikey: key } }).then((r) => r.json());
    const authed = await fetch(`${url}/rest/v1/gigs?select=id&order=id`, { headers: { apikey: key, Authorization: `Bearer ${tok.access_token}` } }).then((r) => r.json());
    expect(authed).toEqual(anon);
  }
});
