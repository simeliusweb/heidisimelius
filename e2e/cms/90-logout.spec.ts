// B3, B19: logout with the TEST admin only (signOut is global). These run last among the CMS
// specs and use their own fresh sessions, so the shared test-admin state isn't revoked early.
import type { Browser } from "@playwright/test";
import { spec, expect, test } from "../support/fixtures";
import { BASE_URL, NEW_REF, REPO, secrets } from "../support/env";

async function freshAdmin(browser: Browser) {
  const ctx = await browser.newContext({ baseURL: BASE_URL, storageState: `${REPO}/e2e/.auth/state.json` });
  const p = await ctx.newPage();
  await p.goto("/login");
  await p.getByPlaceholder("Sähköposti").fill(secrets.TEST_ADMIN_EMAIL);
  await p.getByPlaceholder("••••••••").fill(secrets.TEST_ADMIN_PASSWORD);
  await p.getByRole("button", { name: "Kirjaudu sisään" }).click();
  await p.waitForURL(/\/admin$/);
  return { ctx, p };
}

spec({ id: "B3", title: "logout (test admin): toast, /login, auth token removed", tier: "gate", env: ["L", "prod"], data: "read", liveClock: true, prodSafe: true }, async ({ page, run }) => {
  test.skip(run.targetRef !== NEW_REF || !secrets.TEST_ADMIN_EMAIL, "needs the new project's test admin");
  const { ctx, p } = await freshAdmin(page.context().browser()!);
  await p.getByRole("button", { name: "Kirjaudu ulos" }).click();
  await expect(p.getByText("Kirjauduit ulos.").first()).toBeVisible();
  await p.waitForURL(/\/login$/);
  expect(await p.evaluate((ref) => localStorage.getItem(`sb-${ref}-auth-token`), NEW_REF)).toBeNull();
  await ctx.close();
});

spec({ id: "B19", title: "logout in tab B redirects tab A; a second context at its next refresh", tier: "regression", env: ["L"], data: "read", liveClock: true }, async ({ page, run }) => {
  test.skip(run.targetRef !== NEW_REF || !secrets.TEST_ADMIN_EMAIL, "needs the new project's test admin");
  const { ctx, p } = await freshAdmin(page.context().browser()!);
  const a = await ctx.newPage();
  await a.goto("/admin");
  await expect(a.getByRole("heading", { name: "Sisällön hallinta" })).toBeVisible();
  const other = await freshAdmin(page.context().browser()!);
  await p.getByRole("button", { name: "Kirjaudu ulos" }).click();
  await a.waitForURL(/\/login$/, { timeout: 5_000 });
  await other.p.reload();
  await other.p.waitForURL(/\/(login|admin)$/);
  test.info().annotations.push({ type: "second context after reload", description: other.p.url() });
  await other.ctx.close();
  await ctx.close();
});
