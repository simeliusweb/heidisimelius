// B1, B2, B4, B16, B20, B21: auth guard, login, the real admin account, prod smoke.
// Never sign out with Heidi's or the developer's account: signOut is global (ends their real sessions).
import fs from "node:fs";
import { spec, expect, record, test } from "../support/fixtures";
import { BASE_URL, NEW_REF, REPO, secrets } from "../support/env";
import { openAdminTab } from "../support/cms";

spec({ id: "B1", title: "auth guard: /admin → /login without a session; /login → /admin with one", tier: "gate", env: ["L", "prod"], data: "read", smoke: true }, async ({ page, run }) => {
  await page.goto("/admin");
  await page.waitForURL(/\/login$/, { timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Kirjaudu sisään" })).toBeVisible();
  const adminState = `${REPO}/e2e/.auth/admin.json`;
  if (run.targetRef !== NEW_REF || !fs.readFileSync(adminState, "utf8").includes("auth-token")) {
    record(test.info(), "second half", "needs the logged-in test admin (new ref, cms writes allowed)");
    return;
  }
  const ctx = await page.context().browser()!.newContext({ baseURL: BASE_URL, storageState: adminState });
  const p = await ctx.newPage();
  await p.goto("/login");
  await p.waitForURL(/\/admin$/, { timeout: 20_000 });
  await ctx.close();
});

spec({ id: "B2", title: "login: wrong password → error toast; correct → all 6 tabs from the new ref", tier: "gate", env: ["L"], data: "read", liveClock: true }, async ({ page, rec, run }) => {
  test.skip(run.targetRef !== NEW_REF || !secrets.TEST_ADMIN_EMAIL, "needs the new project's test admin");
  await page.goto("/login");
  await page.getByPlaceholder("Sähköposti").fill(secrets.TEST_ADMIN_EMAIL);
  await page.getByPlaceholder("••••••••").fill("wrong-password-e2e");
  await page.getByRole("button", { name: "Kirjaudu sisään" }).click();
  await expect(page.getByText("Login failed").first()).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByPlaceholder("••••••••").fill(secrets.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Kirjaudu sisään" }).click();
  await page.waitForURL(/\/admin$/);
  for (const tab of ["Keikat", "Galleria", "Videot", "Bio", "Kuvat", "Laulunopetus"] as const) {
    await openAdminTab(page, tab);
    await expect(page.getByText(/^Virhe/).filter({ visible: true })).toHaveCount(0);
  }
  expect(rec.refCounts().new).toBeGreaterThan(0);
  expect(rec.refCounts().old).toBe(0);
});

spec({ id: "B4", title: "real admin account logs in on L (read-only, no logout)", tier: "gate", env: ["L"], data: "read", liveClock: true }, async ({ page, run }) => {
  test.skip(run.targetRef !== NEW_REF, "new project only");
  const accounts = [
    { email: secrets.CMS_ACCOUNT, password: secrets.CMS_ACCOUNT_PASSWORD },
    { email: "simelius.heidi@gmail.com", password: secrets.HEIDI_CMS_PASSWORD },
  ].filter((a) => a.email && a.password);
  expect(accounts.length).toBe(2);
  for (const a of accounts) {
    const ctx = await page.context().browser()!.newContext({ baseURL: BASE_URL, storageState: `${REPO}/e2e/.auth/state.json` });
    const p = await ctx.newPage();
    await p.goto("/login");
    await p.getByPlaceholder("Sähköposti").fill(a.email);
    await p.getByPlaceholder("••••••••").fill(a.password);
    await p.getByRole("button", { name: "Kirjaudu sisään" }).click();
    await p.waitForURL(/\/admin$/, { timeout: 30_000 });
    await expect(p.getByRole("heading", { name: "Sisällön hallinta" })).toBeVisible();
    // Close the context without signing out (signOut is global).
    await ctx.close();
  }
});

spec({ id: "B16", title: "prod CMS smoke as the test admin: every tab, no writes", tier: "gate", env: ["prod"], data: "read", post: true, liveClock: true }, async ({ page }) => {
  test.skip(!secrets.TEST_ADMIN_EMAIL, "test admin required");
  await page.goto("/login");
  await page.getByPlaceholder("Sähköposti").fill(secrets.TEST_ADMIN_EMAIL);
  await page.getByPlaceholder("••••••••").fill(secrets.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Kirjaudu sisään" }).click();
  await page.waitForURL(/\/admin$/);
  for (const tab of ["Keikat", "Galleria", "Videot", "Bio", "Kuvat", "Laulunopetus"] as const) await openAdminTab(page, tab);
  await page.getByRole("button", { name: "Kirjaudu ulos" }).click();
  await page.waitForURL(/\/login$/);
});

spec({ id: "B20", title: "stale tab across cutover keeps using the old ref (record)", tier: "record", env: ["prod"], data: "read", post: true }, async (_args, info) => {
  record(info, "procedure", "open /keikat before GL in a persistent tab, note its REST host after GL; this documents why 8.1 freezes the old DB");
});

spec({ id: "B21", title: "Lovable write freeze holds (Q4 = q4-final)", tier: "gate", env: ["direct"], data: "read", post: true }, async (_args, info) => {
  record(info, "procedure", "AGENT-BR: run Q4 in the Lovable SQL editor at +1 h / +24 h / before Pause and compare with $STATE/artifacts/8/q4-final.json");
  test.skip(true, "runs in the Lovable SQL editor (AGENT-BR), not in the suite");
});
