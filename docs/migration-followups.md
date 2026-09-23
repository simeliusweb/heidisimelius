# heidisimelius.fi — post-go-live follow-up runbook

**For a fresh Claude session.** This file lives in the repo at `docs/migration-followups.md` (public repo: no secrets, only names and paths). Read it whole first, then `node scripts/migration/status.mjs` in the repo
(`~/Documents/Freelancin/projects/valmiit/HeidiSimelius/heidisimelius`). Background: `docs/supabase-migration-plan.md`
§14–§17 and `~/.heidisimelius-migration/READY.md`. Append what you do to `~/.heidisimelius-migration/run-log.md`.

## Facts (as of go-live, 2026-09-23)
- **GL:** `main` @ `d67fe4e` pushed 13:03:18 UTC, deployment `dpl_GZgQ8s9pYPdHWRWwrKXyAyYdsz5X`, bundle `assets/index-COg8Uq1i.js`.
  `state.json` has `golive_at`, so `import.mjs` refuses to run and `probes.mjs` needs `ALLOW_PROD_WRITES=1`. **Never re-import after GL:**
  the new DB now holds Heidi's live edits.
- **Rollback target** `D_OLD` = `dpl_6yobH7Aoj6QAVcdUeWrhLXcbcoda` (bundle `index-BxnMSrKf.js`, old DB). **Rollback horizon ends 2026-09-25 13:04 UTC**
  (and not before Heidi's first real edit is confirmed). Before that: **no pushes to `main`**.
- New Supabase project `neqprqqhiifqemphpwhu` (simeliusweb org, eu-north-1, **Free**). Old Lovable project `yctdrwogilljanzxcgow`
  is **frozen read-only** (write privileges revoked + `migration_freeze_*` storage policies). Unfreeze SQL:
  `node scripts/migration/freeze-old.mjs --print-unfreeze` (only for a rollback).
- Vercel env: Production, Preview and Development `VITE_SUPABASE_*` all point at the new project. The local `.env` too
  (the old values are backed up in `~/.heidisimelius-migration/env-before-14.5.bak`; the old key is also `OLD_ANON` in `.env.generated`).
- **The agent's secret key is deleted** (14.6), and so is the test admin. Users = exactly the two admins. Scripts that need
  `NEW_SECRET` (`users.mjs --gate*`, `copy-storage --report-extras`, `probes.mjs`) first need a temporary key:
  `node scripts/migration/keys.mjs` (creates `migration_agent`), and afterwards delete it again:
  `DELETE /v1/projects/$NEW_REF/api-keys/$NEW_SECRET_ID` via `mgmt()` in lib.mjs (it takes ~3 min to stop working).
- Tokens expire ~2026-10-23: `SUPABASE_PAT` and `VERCEL_TOKEN` (in `heidisimelius/.env.migration.local`). A 401 from either = stop and ask the owner.
- Tooling rules still apply (plan §5): no `supabase` CLI and no Supabase/Vercel MCP (they belong to another client's account),
  never `vercel link` / `vercel env pull` / `vercel curl`, no writes to the old ref, secrets never printed, commit on `main` only,
  **the agent pushes only when the owner says so** (the owner did so for GL).
- Browser work (Lovable SQL editor, Vercel dashboard, Gmail, GSC) = the Playwright MCP window (profile `heidisimelius`, hidden):
  stub rAF with `page.context().addInitScript`, set CodeMirror text via `.cm-line`.cmTile → EditorView (see the driver
  `~/Documents/Freelancin/projects/valmiit/HeidiSimelius/.playwright-mcp/mig/mk.sh`: `./mk.sh <name>` turns `<name>.sql` into `<name>.js`
  for `browser_run_code_unsafe`; SELECT only). Any SQL containing DELETE/TRUNCATE opens Lovable's "Confirm destructive operation"
  dialog = STOP and ask the owner.

## Standing verification (run any time; all read-only)
```bash
cd ~/Documents/Freelancin/projects/valmiit/HeidiSimelius/heidisimelius
# live bundle + ref, routes, keep-alive fails closed
node --input-type=module -e 'import {goLiveStatus} from "./scripts/migration/lib.mjs"; console.log(await goLiveStatus())'   # prodOnNew: true
for p in / /keikat /bio /galleria /laulunopetus /bilebandi-heidi-and-the-hot-stuff /nope; do curl -s -o /dev/null -w "$p %{http_code}\n" https://www.heidisimelius.fi$p; done
curl -s -o /dev/null -w "keep-alive %{http_code}\n" https://www.heidisimelius.fi/api/keep-db-alive   # 401
# production read-only suite (expect 0 failed)
BASE_URL=https://www.heidisimelius.fi EXPECTED_SUPABASE_REF=neqprqqhiifqemphpwhu FORBIDDEN_SUPABASE_REF=yctdrwogilljanzxcgow \
  npx playwright test --grep "@prod" --grep-invert "@cms-write|@mutates-real|@pre-gl"
# A26/A27/A28/A32/E3/D11/D12 data checks
BASE_URL=https://www.heidisimelius.fi EXPECTED_SUPABASE_REF=neqprqqhiifqemphpwhu FORBIDDEN_SUPABASE_REF=yctdrwogilljanzxcgow \
  npx playwright test --grep "@direct" --grep-invert "@cms-write|@cleanup|E-probes|@test-rows"
```
`compare-rest.mjs` (old vs new) will start to DIFFER once Heidi edits. That's expected after GL, not a failure.
It stays useful only for R-C (listing the rows changed since `artifacts/8/q4-final.json`).

## Dated checklist (G = 2026-09-23 13:04 UTC)
| When | Task | How / pass criteria | Status |
|---|---|---|---|
| G+1 h (≈14:05 UTC 23.9) | B21: old DB still frozen and unchanged | Lovable SQL editor: `.playwright-mcp/mig/q4.js` → md5 per table = `artifacts/8/q4-lovable-final.json`; `privs.js` → i/u/d/anon_i false, freeze_policies 3 | done if logged in run-log, else do it |
| G+1 d (24.9) | E7: www never calls the old ref; A1 on prod | standing suite above (A1 passes = 0 old-ref requests) | |
| G+1 d (24.9) after 12:00 UTC | **E10: the daily cron ran and returned 200** | Vercel dashboard → heidisimelius → Logs, search `requestPath:/api/keep-db-alive`: a `GET 200 "Pinged Supabase"` near 12:00–13:00 UTC each day (Hobby keeps logs ~1 h, so look within the hour or use the dashboard's cron "View Logs"). Also the new project's edge logs: `mgmt('/v1/projects/$NEW_REF/analytics/endpoints/logs.all?sql=…')` for `gigs?select=id&limit=1 \| node`. **If it's missing: the Free project pauses after 7 idle days, so fix it the same day.** | |
| 14.4 | Heidi re-login + one small edit + one real contact-form mail (C7) | **Asked 2026-09-23 ~13:30 UTC** by email from simeliusweb@gmail.com (subject "Sivuston päivitys valmis – kirjaudu /admin-sivulle uudelleen"); her reply comes to that inbox (MCP browser Gmail: `in:anywhere subject:"Sivuston päivitys valmis"`). Verify: the edit shows on the site and in `page_content`/gigs `updated_at`; her test message reached simelius.heidi@gmail.com (she confirms); if possible, DKIM/DMARC pass (C21). Tell the owner the result. **Agent pre-check done 2026-09-23 ~13:40 UTC (owner-requested): logged in as Heidi on production (no logout), all 6 admin tabs, gig create+image+edit+delete, video create+delete, gallery create+photo+delete, unchanged Bio re-save: 22/22 passed, test items and files removed.** | asked; agent CMS check passed |
| G+2 d (25.9 ≥13:04 UTC) **horizon ends** | 1) Owner pushes the local commits (`git log origin/main..HEAD`: post-GL script tweaks). 2) Verify the new deployment is READY, then run the standing suite. After this push, Instant Rollback to the Lovable build is gone for good. | only after Heidi's edit is confirmed | |
| after the horizon | **Gig ticket fields on** (separate owner-pushed commit): apply the `types.ts` hunk from `git show 6959434 -- src/integrations/supabase/types.ts` (2 columns), set `GIG_TICKET_FIELDS_ENABLED = true` in `src/components/admin/gigTicketFieldsSchema.ts`, `npx tsc --noEmit -p tsconfig.app.json && npm run lint && npm run build && npm run test:unit`, pre-check G1–G11 on a local build against the new DB (plan Appendix C "Ticket fields"; CMS writes need a recreated test admin: `users.mjs` + a temp key, delete both after). Owner pushes. Then G1–G11 on prod with `ALLOW_PROD_WRITES=1`, E2E-TESTI rows only. | |
| after the horizon | Delete the dead env vars `SUPABASE_FUNCTION_URL` (all targets) and `VITE_SUPABASE_PROJECT_ID` (preview+production) in Vercel: nothing reads them | Vercel API with the token (names in `prod-env.mjs --show`) | |
| after the horizon | The owner / Heidi enter real ticket prices and durations; fix the tour gigs' combined venue data (K-DATA) | CMS | |
| Week 1 (by 30.9) | **Backups** (Free has none): owner decision — Pro ($25/mo, 7-day backups) or a daily GitHub Action in a PRIVATE repo running `pg_dump` (v17 client) through the session pooler + a weekly storage mirror. Then **E22 restore drill**. Meanwhile the local archive exists: `exports/*-old-H_old0/` + `exports/storage-mirror/` (as of GL). | | |
| Week 1 and 4 | E23: usage/egress < 50 % of the Free limits | Supabase dashboard → Usage (or the Management API) | |
| G+14 d (7.10) | GSC: Coverage + Events clean; Rich Results Test (D4, D7) | GSC property `sc-domain:heidisimelius.fi` (MCP browser) | |
| G+28 d (21.10) | F3: PSI/CrUX field data vs before | PSI API | |
| ~23.10 | PAT + Vercel token expire | Let them expire, or the owner revokes them | |
| Week 4 (≈21.10) | Final Lovable check: `copy-storage --verify-only` (old ⊆ new), a last Q4. Then the **owner Pauses Lovable Cloud** | | |
| Week 6+ (≥4.11) | The **owner Removes Lovable Cloud / deletes the Lovable project** (not before: it's the fallback). Cancel/downgrade the plan. Revoke the Vercel bypass secret "migration-e2e". Rotate both CMS passwords (and set `password_min_length` back to 12 if it changes). Move `READY.md` + exports to the vault, then delete them here. Update the memory note. | | |

## Rollback (only while the horizon lasts, and only for a broken site)
Plan §15. Summary: `vercel rollback dpl_6yobH7Aoj6QAVcdUeWrhLXcbcoda` (owner token), `node scripts/migration/prod-env.mjs --to old`
and `--preview-to old`, unfreeze the old DB (the printed SQL in the Lovable editor, owner OK), the owner tells Heidi.
If Heidi already edited the new DB: R-C (fix forward by default).

## Open owner decisions (report back, don't act)
Public contact address in the contact-form error? · Make the GitHub repo private (it is PUBLIC; the login emails are in the plan) ·
Vercel Pro (commercial use) · Supabase Pro vs a DIY backup.
