# heidisimelius.fi — post-go-live follow-up runbook

## Prompt to paste into a new Claude Code session
> Run the heidisimelius.fi follow-ups: read `docs/migration-followups.md` in
> `~/Documents/Freelancin/projects/valmiit/HeidiSimelius/heidisimelius`, run the standing verification, and do every row of the
> "Open follow-ups" table that is due by today's date. Update the table and `~/.heidisimelius-migration/run-log.md`, commit on
> `main`, and report what passed, what failed and what needs me. Ask me before pushing to production or before anything that
> touches Heidi's account or site content.

**For a fresh Claude session.** This file lives in the repo at `docs/migration-followups.md` (public repo: no secrets, only names
and paths). Read it whole first. Background: `docs/supabase-migration-plan.md` §14–§17, `~/.heidisimelius-migration/READY.md`, and
`~/.heidisimelius-migration/run-log.md` (append what you do there).

## Facts (as of 2026-09-28)
- **Live since GL 2026-09-23 13:04 UTC** on the owner's Supabase project `neqprqqhiifqemphpwhu` (simeliusweb org, eu-north-1,
  **Free**). `state.json` has `golive_at`, so `import.mjs` refuses to run and `probes.mjs` needs `ALLOW_PROD_WRITES=1`.
  **Never re-import:** the DB holds Heidi's live edits.
- **Lovable is gone.** The owner deleted the Lovable account on 2026-09-28, so the old project `yctdrwogilljanzxcgow`, its DB
  and its backups no longer exist. There is **no rollback** any more: the post-GL push `0df549d` (28.9) also replaced the
  previous production deployment. The fallback now is the R2 backups (below) plus the GL archive in `~/.heidisimelius-migration/exports/`.
  The freeze/rollback scripts (`freeze-old.mjs`, `compare-rest.mjs`, `prod-env.mjs --to old`) and the Lovable SQL-editor drivers
  in `.playwright-mcp/mig/` are obsolete.
- Vercel env: Production, Preview and Development `VITE_SUPABASE_*` point at the new project, and so does the local `.env`.
  The protection-bypass secret "migration-e2e" was revoked on 28.9, so `deploy-preview.mjs` and `capture.mjs` against protected
  previews need a new one (Vercel → Deployment Protection → Protection Bypass for Automation) if they are ever used again.
- **The agent has no secret key and no test admin.** Users = exactly the two CMS admins. Scripts that need `NEW_SECRET`
  (`users.mjs`, `copy-storage`, `probes.mjs`) first need a temporary key, `node scripts/migration/keys.mjs` (creates
  `migration_agent`). Delete it afterwards: `DELETE /v1/projects/$NEW_REF/api-keys/$NEW_SECRET_ID` via `mgmt()` in lib.mjs (it takes
  ~3 min to stop working). Delete any recreated test admin too.
- **Tokens expire ~2026-10-23:** `SUPABASE_PAT` and `VERCEL_TOKEN` (in `heidisimelius/.env.migration.local`). A 401 from either
  means stop and ask the owner for a new one. Everything that uses `sbq()`/`mgmt()` or the Vercel API depends on them.
- Tooling rules (plan §5): no `supabase` CLI and no Supabase/Vercel MCP (they belong to another client's account), never
  `vercel link` / `vercel env pull` / `vercel curl`, secrets never printed, commit on `main` only, **push only when the owner says so**.
- Browser work (Vercel dashboard, Gmail, GSC, GitHub and Cloudflare as simeliusweb) goes through the Playwright MCP window (profile
  `heidisimelius`; may be hidden): stub rAF with `page.context().addInitScript`, use JS/dispatch clicks. The local `gh` login
  (`januzgi`) cannot see the private backup repo; use the browser.
- Supabase logs: `logs.all` is gone (410). Use `mgmt('/v1/projects/$NEW_REF/analytics/endpoints/logs?sql=…&iso_timestamp_start=…&iso_timestamp_end=…')`,
  ClickHouse SQL on table `logs` with column `source` (e.g. `source = 'edge_logs'`), text in `event_message`. The Free plan keeps
  ~1 day, ingestion can lag hours, and the API throttles (429) after a few quick calls.

## Standing verification (run any time; all read-only)
```bash
cd ~/Documents/Freelancin/projects/valmiit/HeidiSimelius/heidisimelius
# live bundle + ref, routes, keep-alive fails closed
node --input-type=module -e 'import {goLiveStatus} from "./scripts/migration/lib.mjs"; console.log(await goLiveStatus())'   # prodOnNew: true
for p in / /keikat /bio /galleria /laulunopetus /bilebandi-heidi-and-the-hot-stuff /nope; do curl -s -o /dev/null -w "$p %{http_code}\n" https://www.heidisimelius.fi$p; done
curl -s -o /dev/null -w "keep-alive %{http_code}\n" https://www.heidisimelius.fi/api/keep-db-alive   # 401
# production read-only suite. B16, B3 and A24 fail while no test admin exists (they sign in with TEST_ADMIN_*);
# everything else must pass. A1 = 0 old-ref requests.
BASE_URL=https://www.heidisimelius.fi EXPECTED_SUPABASE_REF=neqprqqhiifqemphpwhu FORBIDDEN_SUPABASE_REF=yctdrwogilljanzxcgow \
  npx playwright test --grep "@prod" --grep-invert "@cms-write|@mutates-real|@pre-gl"
# A26/A27/A28/A32/E3/D11/D12 data checks
BASE_URL=https://www.heidisimelius.fi EXPECTED_SUPABASE_REF=neqprqqhiifqemphpwhu FORBIDDEN_SUPABASE_REF=yctdrwogilljanzxcgow \
  npx playwright test --grep "@direct" --grep-invert "@cms-write|@cleanup|E-probes|@test-rows"
```
Also every session: **backups ran** (github.com/simeliusweb/heidisimelius-backup/actions: a green "Backup" run every day, and
the Monday one with both jobs; R2 bucket `heidisimelius-backups` has a `db/` dump per day and a `media/` archive per week), and
**the keep-alive cron ran** (edge logs: `GET | 200 | …/rest/v1/gigs?select=id&limit=1 | node` around 12:00–13:00 UTC; the Free
project pauses after 7 idle days, but the daily backup also counts as activity). Check usage while you're at it (DB size, storage size,
`usage.api-counts`).

## Open follow-ups
| When | Task | How / pass criteria | Status |
|---|---|---|---|
| Next session | **14.4: Heidi re-login + one small edit + one real contact-form mail (C7)** | Asked 2026-09-23 ~13:30 UTC by email from simeliusweb@gmail.com (subject "Sivuston päivitys valmis – kirjaudu /admin-sivulle uudelleen"; Gmail in the browser: `in:anywhere subject:"Sivuston päivitys valmis"`). Signs: `auth.users.last_sign_in_at` for `sime…` later than 2026-09-23 13:36 (that was the agent's check), a newer `page_content.updated_at` / gig `created_at`. Verify the edit shows on the site; her test message reached simelius.heidi@gmail.com (she confirms). Tell the owner the result; don't contact Heidi without the owner. | 28.9: no reply, no sign-in since 23.9 |
| Now (was "after the horizon") | Delete the dead Vercel env vars `SUPABASE_FUNCTION_URL` (all targets) and `VITE_SUPABASE_PROJECT_ID` (preview+production) | First `grep -rn` the repo (src, api, vite config) to confirm nothing reads them. Vercel API with `VERCEL_TOKEN` (names in `prod-env.mjs --show`). Takes effect on the next deployment; no redeploy needed. | |
| After Heidi's edit is confirmed (owner OK) | **Gig ticket fields on** (separate commit, owner pushes) | Apply the `types.ts` hunk from `git show 6959434 -- src/integrations/supabase/types.ts` (2 columns), set `GIG_TICKET_FIELDS_ENABLED = true` in `src/components/admin/gigTicketFieldsSchema.ts`, `npx tsc --noEmit -p tsconfig.app.json && npm run lint && npm run build && npm run test:unit`, pre-check G1–G11 on a local build against the DB (plan Appendix C "Ticket fields"; CMS writes need a recreated test admin: `users.mjs` + a temp key, delete both after). Owner pushes. Then G1–G11 on prod with `ALLOW_PROD_WRITES=1`, E2E-TESTI rows only. | |
| After ticket fields | The owner / Heidi enter real ticket prices and durations; fix the tour gigs' combined venue data (K-DATA) | CMS | |
| 7.10 | GSC: Coverage + Events clean; Rich Results Test (D4, D7) | GSC property `sc-domain:heidisimelius.fi` (browser; UI in Finnish; URL inspection can't be automated) | |
| After 19.10 | The backup workflow still passes on the new runner image (GitHub moves `ubuntu-latest` to Ubuntu 26 from 19.10; the job installs `postgresql-client-17` from PGDG for `$(lsb_release -cs)`) | First runs after 19.10 green. If PGDG has no repo for the new codename: set `runs-on: ubuntu-24.04` in both jobs (edit in the GitHub web editor as simeliusweb, and in `../heidisimelius-backup/`). HeroHim and Fyrk use the same pattern; tell the owner. | |
| ~21.10 (week 4) | E23: usage/egress < 50 % of the Free limits; F3: PSI/CrUX field data vs before | Management API (`sbq` sizes, `usage.api-counts`) or the Supabase dashboard → Usage; PSI API | wk 1 done 28.9: DB 12 MB / 500, storage 40 MB / 1 GB, <120 REST req/day |
| Before ~23.10 | Tokens: the owner decides whether to renew `SUPABASE_PAT` / `VERCEL_TOKEN` or let them expire (then later sessions need new ones for API checks) | Ask the owner | |
| When the owner is ready | **Cleanup:** rotate both CMS passwords (owner coordinates Heidi's; keep `password_min_length` ≥ 12); the owner moves `~/.heidisimelius-migration/READY.md` + `exports/` (+ `drill/`) to the vault, then the agent deletes them here (keep `backup_ro.env`, `run-log.md`, `state.json`, `.env.generated`); update the memory note | Owner confirms each step | 28.9: bypass secret revoked |
| Every ~3 months (next ~1/2027) | Restore drill again from the newest R2 dump + media archive | Same as E22 below; tables md5 = live, media files = manifest | |

### Done
- 28.9 (G+5d): B21 old DB frozen and unchanged (before the deletion); E7/A1 on prod; E10 ping seen 26.9 12:23 UTC; E23 week 1.
- 28.9: owner pushed `d67fe4e..0df549d` (docs, scripts, `backup_ro` migration), `dpl_HcVotGnHpMRnWZtE24B8pD8EE6CG` READY, bundle unchanged,
  standing checks pass. Backups set up and E22 drill passed (below). Lovable account deleted by the owner. Vercel bypass secret revoked.

## Backups (set up 2026-09-28)
- Private repo `simeliusweb/heidisimelius-backup` (only `simeliusweb` can open it), workflow `.github/workflows/db-backup.yml`
  (source copy: `../heidisimelius-backup/` next to this repo). Daily 03:00 UTC `pg_dump --schema=public -Fc` → `db/` (30 days);
  Mondays 03:30 UTC every Storage object + `manifest.tsv` as a tar.gz → `media/` (90 days). Run by hand: Actions → Backup → Run workflow (runs both).
  Failure emails go to simeliusweb.
- Destination: Cloudflare account simeliusweb@gmail.com, R2 bucket `heidisimelius-backups` (EU jurisdiction, private), endpoint
  `https://df8b5349b8573e0ed1f4909aaf5cd520.eu.r2.cloudflarestorage.com`. Account API token `heidisimelius-backup-github-actions`
  (Object Read & Write, this bucket only). The token's `cfat…` value is not used.
- DB login: role `backup_ro` (`supabase/migrations/20260928100000_backup_ro_role.sql`: SELECT on public + `storage.objects`, BYPASSRLS,
  no writes) through the session pooler `aws-0-eu-north-1.pooler.supabase.com:5432`, user `backup_ro.neqprqqhiifqemphpwhu`. The URL is in
  the repo secret `SUPABASE_DB_URL` and in `~/.heidisimelius-migration/backup_ro.env`. New password: `alter role backup_ro with password …`
  via `sbq()`, then update both.
- Not in the backup: the auth schema (the 2 CMS admins; recreate with `users.mjs`).
- Drill notes (E22, 28.9): the dump contains `CREATE SCHEMA public` and policies that use role `authenticated` and `auth.jwt()`. On a plain
  Postgres, `drop schema public cascade`, create roles `anon`/`authenticated`/`service_role` and a stub `auth.jwt()` first. Download from the
  dashboard (object → Download; in the automated browser the download event doesn't fire, so wrap `window.fetch` to capture the
  `/api/v4/…/r2/buckets/…/objects/…` response) or with the R2 keys. The first manual run's DB upload failed with an SSL handshake error
  because the new account's R2 certificate wasn't ready yet; a re-run minutes later passed.
- **Restore** (into a fresh Supabase project, or a local `postgres:17` for the drill): apply `supabase/migrations/*` in order, then
  `pg_restore --data-only --no-owner --disable-triggers -d "$TARGET" heidisimelius-db-….dump` (on a plain local Postgres, which has none of
  Supabase's roles, use `--no-owner --no-privileges` without `--data-only` instead). Storage: untar `media/`, upload each file to
  `<bucket>/<name>` from `manifest.tsv` (`copy-storage.mjs` has the upload code), recreate the admins, point the Vercel env at the project.

## Open owner decisions (report back, don't act)
Public contact address in the contact-form error? · Make the GitHub repo private (it is PUBLIC; the login emails are in the plan) ·
Vercel Pro (commercial use).
