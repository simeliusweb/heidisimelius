# Migrate the backend from Lovable Cloud to our own Supabase project

**Status:** 📝 **v2 (audited), ready for the owner prep session.** Nothing has been changed on either database yet.
**Date:** 2026-09-23
**History:**
- v1 was built from 5 read-only planning passes.
- v2 folds in 10 read-only audits: DB and data, storage/auth/security, cutover/Vercel, autonomous-execution design, test feasibility, public-site test gaps, CMS test gaps, SEO/GEO/performance gaps, forms/infra/security gaps, and a whole-plan red team.
- Facts were re-measured on 2026-09-23 with read-only GETs against production and the public REST/storage APIs.

**How to use this document:** it is written so that one agent session can run §7–§12 **in a single continuous flow**. Before that, the owner does one prep session (§6). After the flow, the owner's only go-live action is **`git push`** (§13).

---

## 0. Resume here (for a fresh session)

1. Read §4 (operating model) and §5 (safety rails). These rules apply to everything below.
2. Run state lives **outside the repo**, in `~/.heidisimelius-migration/` (called `$STATE` below):
   - `state.json`: status per step ID
   - `run-log.md`: append-only, never contains secrets
   - `artifacts/`, `exports/`, `baselines/`, `build/`
3. `node scripts/migration/status.mjs` prints the next runnable steps and any open halts. (The script is created in 2D. Before that exists, read `state.json` directly.)
4. **Resume rule:** if a step is marked `running`, re-run its *Success* check first. If it passes, mark it `done`. Otherwise re-run the step, which is safe because every step is idempotent (§5.3).
5. This document is static. It holds no run state, so progress doesn't create commits.

---

## 1. Goal

**Where things are now:**
- The site's database, storage and auth run on **Lovable Cloud**: a Supabase project that Lovable manages.
- Ref `yctdrwogilljanzxcgow`, AWS eu-west-2 (London), Lovable project "heidi-web-forge".
- Lovable never gives out the DB password, the connection string or the service-role key.

**Where they're going:**
- A Supabase project in the **`simeliusweb`** org, which we control, in eu-north-1 (Stockholm).

**Requirements:**
- Same behaviour after the move.
- Zero visitor downtime.
- No content lost.
- Every credential stored in a password manager.
- Then retire Lovable Cloud.

**Out of scope:** DNS, Brevo and email routing. None of these change.

## 2. Inventory (measured 2026-09-23)

| Item | Value |
|---|---|
| `gigs` | 41 rows (7 upcoming as of 23.9: 3 cards on `/keikat`, 7 Events in the JSON-LD). 13 `gig_group_id` groups. 16 columns. NULLs: `event_page_url` 7, `organizer_*` 1. 23 rows use site-relative `/images/…` paths; 18 use storage URLs. |
| `videos` | 10 rows: 8 Musavideot + 2 Muut videot. `order_index` is per section. Featured video `nNooz5tHV6U`. |
| `photo_sets` | 6 rows: 1 press kit (3 photos + zip) and 5 galleries (9/5/6/5/6 photos). `order_index` is separate for press kit and galleries. |
| `page_content` | 3 rows: `bio`, `laulunopetus`, `page_images`. The only table with `updated_at`, and the client sets it. |
| Export size | about 85 KB of JSON. It contains no `$` characters. The only numbers inside jsonb are integers. |
| Storage | **75 objects, 41,874,215 B, 4 public buckets:** `images` 13, `documents` 1 (CV), `photo_sets_images` 37 (includes the 6.9 MB zip), `gigs-images` 24. The DB references 54. There are 21 orphans (gigs-images 14, images 5, photo_sets_images 2). All names match `^[A-Za-z0-9._/-]+$`. Metadata `cacheControl` is `max-age=3600`. 2 objects have multipart ETags: the zip, and `photo_sets_images/public/9ad746cf-….jpg`. |
| Old-host URLs in DB | **62 occurrences, 54 unique, 26 rows:** gigs 18, photo_sets 6, page_content 2. Per column: `gigs.image_url` 18, `photos[].src` 34, `press_kit_zip_url` 1, bio `cvUrl` + `bioImage1-3` 4, page_images heroes 5. All use the form `https://yctdrwogilljanzxcgow.supabase.co/storage/v1/object/public/<bucket>/<path>`. |
| Auth | Email + password only. `disable_signup: true`, no anonymous or OAuth sign-in. The app uses `signInWithPassword`, `getSession`, `onAuthStateChange` and `signOut` (default **global** scope). |
| Old key | Legacy anon JWT (HS256). |
| Edge function `keep-db-alive` | Deployed on Lovable. Obsolete: the Vercel cron `api/keep-db-alive.ts` replaces it. |
| Schema | 10 migrations in `supabase/migrations/`. `types.ts` matches both the migrations and the live REST columns. Lovable-side drift is checked in 2A. |
| Production | `main` @ `3807eb1`, deployed 2026-09-23 08:33 UTC. Canonicals, real 404s, 308 redirects, `/api/keep-db-alive` → 401 without the secret. Bundle `index-BxnMSrKf.js`, a single chunk, 357,815 B brotli. It contains the old ref once, the legacy key, and supabase-js 2.75.0. |

## 3. Findings that shape the plan

1. **🔴 Any logged-in user is a CMS admin.** Every table has a `FOR ALL … auth.uid() IS NOT NULL` policy, and storage writes are `TO authenticated`. **New Supabase projects allow signups by default.**
   - The auth lockdown (2B.1) is the first write to the new project.
   - A user-list gate runs three times (E24).
   - The CMS write policies additionally require a service-role-only JWT claim (decision **D-SEC**, 2B.4).
2. **🔴 Grants are mandatory.** Projects created after 2026-05-30 don't expose `public` tables to `anon`, `authenticated` or `service_role`. Without explicit grants, every page shows no data. The grants are committed as a migration file (2B.3).
3. **🔴 The CLI uploads ignored files.** `vercel deploy` from the working copy uploads `.env` (the old values) and `dist/`; only `.env.local` is excluded.
   - Every CLI deploy runs from a **fresh clone** of the tested commit.
   - A `.vercelignore` is committed as a second guard.
4. **🔴 A stale admin tab keeps writing to Lovable.** An `/admin` tab left open, or Heidi forgetting the freeze, writes to the old DB, and those edits are silently lost. At the final sync the old DB is made **read-only** (revoke), so any stray write fails loudly (8.1).
5. **🟠 Lovable can still push to `main`**, which deploys to production. It has 320 bot commits, and `main` has no branch protection. Disconnect Lovable **before anything is done in Lovable** (P3). Never type into the Lovable AI chat (R3).
6. **🟠 The machine's Vercel login (`januzgi`) can't see the project**, and `gh` has push but not admin rights. So the owner provides:
   - a Vercel token
   - a Vercel protection-bypass secret
   - branch protection on `main`
7. **🟠 Key format was a false alarm.** Supabase accepts an `sb_publishable_` key as `Authorization: Bearer` when it's identical to the `apikey` header, which is exactly what supabase-js 2.75 and `keep-db-alive` send.
   - **No supabase-js upgrade is needed.**
   - The **Storage** API needs **both** headers.
   - Test A1 on the new-DB preview proves it.
8. **🟠 Old-host URLs are stored in the DB.** Skip the rewrite and the site looks fine but breaks the day Lovable is removed. The rewrite is done inside the import transaction, with a whole-row zero check (X2).
9. **🟠 Lovable credits.** If the workspace runs out of credits, Lovable **pauses the backend** and the live site shows no data. The owner has **5 daily credits**, and whether Cloud usage draws on them is unknown (P4). **We never use Lovable's AI.** Everything here reads over the public API or uses UI buttons.
10. **🟠 Hobby Instant Rollback reaches only the immediately previous deployment.** After a rollback, domains stop auto-assigning.
    - So the go-live is a **single** production deploy: env vars are switched first, then one push.
    - After it, a **rollback horizon** blocks all pushes for 48 h (§15).
11. **🟡 Old-DB CMS tests are forbidden.** The test suite refuses any non-GET request to the old ref (R4). CMS write tests only ever run against the new DB before cutover. That DB is re-imported at the final sync, so test damage fixes itself. Storage damage does not, so storage objects are cleaned by ledger.
12. **🟡 Pre-existing bugs.** The audits found ~40 existing bugs. None are migration-caused, and several would make tests fail or mislead:
    - 8 of 41 gigs can't be edited
    - the home hero can't be updated
    - a press kit can't be created
    - CMS writes report success when 0 rows changed
    - home→keikat anchors are broken
    - times depend on the viewer's timezone

    A bounded **fix list** (FX1–FX16, Appendix D) is part of the flow (decision **D-FIX**). Everything else is reported as a follow-up.
13. **🟡 The repo is public.** No exports, backups, secrets, screenshots of secrets or test credentials ever go in it. Pre-commit secret scan: R7.

---

## 4. Operating model

### 4.1 The owner's 8-step flow, mapped

| Owner's step | Section | Pauses? |
|---|---|---|
| 1. Audit and revise the plan | §7 (preflight re-check only; this v2 is the big audit) | no |
| 2. Implement | §8 (2A source record, 2B target build, 2C code, 2D scripts, 2E test suite, 2F data rehearsal) | no |
| 3. Audit the changes | §9 | no |
| 4. Fix the findings | §9 | no |
| 5. E2E test | §10 | no |
| 6. Fix issues | §11 | no |
| 7. Re-test | §11 | no |
| 8. Report leftovers | §12 (final sync, then the READY report) | **end of the continuous flow** |
| Owner pushes to prod | §13 (**GL**: `git push origin main`) | owner |
| Full E2E on prod + fix round | §14 | no (fixes are committed locally; the owner pushes them after the horizon) |

### 4.2 What "going to prod" means here

- Everything before §13 happens in **local commits** and **CLI preview deployments**. Production is never touched, and the agent **never pushes** (R2).
- At the end of the flow (§12), the agent:
  - locks the old DB
  - runs the final sync
  - sets the **Production** env vars to the new project
  - builds nothing to production

  Env vars only take effect at the next build.
- **GL (owner):** `git push origin main`. Vercel builds the tested SHA with the new env vars, and it goes live automatically.
- The Instant-Rollback target is then today's known-good Lovable deployment.
- The agent verifies within minutes, and auto-rolls back on hard triggers if pre-authorised (§15).
- The bundle Vercel builds must be **byte-identical to the BL2 preview bundle**: same SHA plus same `VITE_*` values gives the same hash. That's the proof that what went live is what was tested.

### 4.3 Executor classes

| Class | Meaning |
|---|---|
| **AGENT** | Bash, Node, curl, git (local), `gh` (read), Vercel CLI/API with the owner token, Supabase Management API with the owner PAT, headless `@playwright/test` |
| **AGENT-BR** | The Playwright MCP browser (persistent profile `heidisimelius`), in sessions the owner logged into during prep: Lovable, Gmail (simeliusweb@), Vercel, and optionally Supabase and GSC. The window is hidden: stub rAF with `addInitScript` and use JS-dispatched clicks. Never use it for the test suite. |
| **OWNER** | Accounts, billing, MFA, secrets custody, decisions, messages to Heidi, GL |

### 4.4 Test environments

| Env | What it is | Valid for | Not valid for |
|---|---|---|---|
| **L** (local) | Fresh clone at `$SHA` → `VITE_SUPABASE_URL=… VITE_SUPABASE_PUBLISHABLE_KEY=… npx vite build`, then `npx vite preview --port 4173 --strictPort`. Process env overrides `.env`. Don't use `--outDir`, because the per-route plugin hard-codes `dist`. | Everything in the browser: public pages, CMS, JSON-LD, performance timings of Supabase requests. Also form UI: vite preview has **no `/api`**, so no mail can ever be sent from L. | Vercel redirects/rewrites/headers, real 404 status, `/api/*`, CDN |
| **P** (preview) | CLI deploy from a fresh clone, protected. Access by bypass secret: cookie set once per context, never a global header (R7). | Platform tests: redirects, headers, 404, `/api/*`, the Vercel-built bundle | — |
| **Prod** | `https://www.heidisimelius.fi` | POST tests, apex redirect, crawler UAs | Writes, except `E2E-TESTI` rows by the test admin with `PA_PROD_TEST_WRITES` |
| **Direct** | REST, Storage, Auth or the Management API against a Supabase project | Data, RLS and auth probes | — |

### 4.5 Baselines and names

**Baselines:**

| Name | Code | DB | Where |
|---|---|---|---|
| **BL0** | Production today (`3807eb1`) | old | Prod |
| **BL1** | The final tested SHA | old, legacy key from `.env` | P (+ L, read-only) |
| **BL2** | Same SHA | new | P + L |
| **BL3** | Same SHA | new | Prod, after GL |

- **BL0 → BL1:** only intended code changes. Reviewed, not gated.
- **BL1 ≡ BL2:** only the DB changed. **Gate.**
- **BL2 ≡ BL3:** **gate.**
- **Differential rule:** a test that fails on BL2 but passes on BL1 is **migration-caused, so it's a gate**. A failure on both is pre-existing: fix it if it's on the fix list, otherwise it's a follow-up.

**Other names used in this plan:**
- SQL: **Q1** schema snapshot, **Q2** drift, **Q3** auth users, **Q4** checksums.
- **X1** export, **X2** import.

### 4.6 Fixed test conditions

These apply to every capture and diff:
- `timezoneId: 'Europe/Helsinki'`, `locale: 'fi-FI'`.
- The clock pinned with `page.clock.setFixedTime(T0)`, where T0 is fixed per run and stored in `state.json`.
- Plus one live-clock run that checks upcoming count = REST count of `performance_date >= now()`.

Why pin the clock: gigs pass at 2026-09-25T16:00Z, 2026-10-02T16:00Z and in November. Without a fixed clock, the counts change during the window and tests fail for no real reason.

---

## 5. Safety rails, halts and idempotency

### 5.1 The agent never does these (without the listed pre-authorisation)

- **R1 Production.** No Production env change except the pre-authorised §12 switch (`PA_PROD_ENV_SWITCH`). No `--prod` deploys, promote, alias, domain or project-setting changes. No rollback, except `PA_AUTO_ROLLBACK` triggers within 60 min after GL.
- **R2 Git.** Never push, force-push, push tags, or create branches or PRs. Commit locally on `main` only. Commits after the tested SHA must touch only `docs/**` / `*.md`, checked with `git diff --name-only`, or else the tests are re-run.
- **R3 Lovable.**
  - In the SQL editor: SELECT only, plus the §12 freeze and unfreeze statements (`PA_OLD_DB_FREEZE`).
  - Never type in the AI chat. Never click "Fix", "Try to fix" or any AI button.
  - Never toggle Jobs, Secrets or Settings. Never Pause or Remove Cloud. Never reconnect GitHub.
  - The only allowed action button is **Export project data** (`PA_LOVABLE_EXPORT`).
- **R4 Data.**
  - Scripts and test fixtures block every non-GET request to `yctdrwogilljanzxcgow` (except Auth token and logout calls, which nothing makes against the old project).
  - Writes to the new project are limited to: the schema, X2, the URL rewrite, and test rows or objects prefixed `E2E-TESTI-<runId>` recorded in a ledger.
  - Never delete the real press kit zip or the CV.
  - `import.mjs` refuses to run once `state.golive_at` is set.
  - Prod writes only with `ALLOW_PROD_WRITES=1` + `PA_PROD_TEST_WRITES`, and only for `@prod-safe` tests.
- **R5 Email.**
  - Real sends go only through the honeypot path, which always routes to `simeliusweb@gmail.com`.
  - Contract tests send only invalid payloads.
  - A pre-send guard runs `assessSpam()` on the exact payload and refuses unless the verdict is `spam`.
  - Nothing may reach `simelius.heidi@gmail.com`. That's the owner's C7.
- **R6 Tools.**
  - No `supabase` CLI, no `mcp__supabase__*`, no Supabase or Vercel plugin MCP. They're connected to another client's account.
  - Management API only with the inline owner PAT, after checking the org is `simeliusweb`.
  - Vercel only with the owner token plus `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`.
  - Never `vercel link`, never `vercel env pull` (it would overwrite `.env.local`), never `vercel curl` (it creates bypass secrets on its own).
- **R7 Secrets.**
  - Secrets live only in `~/.heidisimelius-migration/` (chmod 700/600), never in the repo, chat, logs, commit messages or screenshots.
  - Load them with `set -a; . file; set +a` inside the same Bash call, or `node --env-file`.
  - Never `cat` or `echo` them. No `curl -v`, no `--debug`.
  - The bypass secret goes only to the preview origin.
  - Before every commit, scan staged content for `sb_secret_`, `sbp_`, `eyJhbGciOi`, `xkeysib-`, the bypass secret value and the CMS password, and refuse on a hit.
- **R8 Accounts.** No billing or plan changes, org-member changes, project pause/delete, DNS, GitHub repo settings, or Brevo settings.
- **R9 People.** Every message to Heidi goes through the owner.

### 5.2 Halt policy

A **HALT** marks the step `halted`, skips everything that depends on it, keeps going with independent work, and is listed in the READY report.

**STOP-ALL** (end the run and report immediately) on:
- a secret in a diff or commit
- an unknown user on the new project (E24)
- any write attempted against the old ref (other than the freeze)
- a 5xx or data loss on production
- a Lovable dialog asking to confirm something destructive
- a 401 from any owner token

**Self-fix allowed:** script bugs, test bugs, and code on the fix list. A migration step that fails twice after one self-fix attempt → HALT.

### 5.3 Idempotency (proven in §9 by running every script twice)

| Script | What a re-run does |
|---|---|
| Export (X1) | Writes a new timestamped snapshot. GET only. |
| Import (X2) | Truncates and inserts in one transaction, before GL only. |
| Storage copy | Skips an object when the target eTag = md5 of the source, or the size matches for multipart objects. Upserts otherwise. Never deletes, except `--prune-extras`, which only removes ledger entries. |
| Rewrite | Self-limiting through `WHERE … like '%<old>%'`. |
| Users | Looks up by email first. |
| Auth config | PATCH, then a GET to verify. |
| Freeze/unfreeze | Checks the privileges first. |

Every script prints one machine-checkable summary line, `RESULT <id> ok|fail <json>`, and appends it to `run-log.md`.

---

## 6. Owner prep session (one sitting, about 60–75 min)

**P0 (agent, before you start):**
- Create `~/.heidisimelius-migration/` (700) and `~/.heidisimelius-migration/.env.migration` (600) from the template below.
- **Fill it in with a text editor. Never paste values into chat.**
- The owner's file actually lives in the repo root as **`.env.migration.local`** (easier to edit in VS Code). It's gitignored by `.env.*.local` and skipped by Vercel CLI uploads, and `$STATE/.env.migration` is a symlink to it. `~/Documents` is not iCloud-synced (checked 2026-09-23). Agent-generated secrets (`.env.generated`) stay in `$STATE`.
- The folder is deliberately outside `~/Documents`, which may be synced to iCloud.

```bash
# ---- owner fills ----
SUPABASE_PAT=              # P5f  sbp_…  (owner's account, 30-day expiry)
SUPABASE_ORG_SLUG=         # P5g
NEW_REF=                   # P5g
VERCEL_TOKEN=              # P6a  (scope simeliuswebs-projects, 30 days)
VERCEL_ORG_ID=             # P6b  team_…
VERCEL_PROJECT_ID=prj_3mg2MBtS9MvFk7xdffx2Hezirz6c
VERCEL_AUTOMATION_BYPASS_SECRET=   # P6c
CRON_SECRET=               # P6d  the Production value (for E1/E8 200-checks)
BREVO_API_KEY=             # optional (C5 log check); Brevo → SMTP & API → a key you can revoke later
ADMIN_SOURCE=env_local     # recreate CMS_ACCOUNT from .env.local with its current password
ADMIN_2_EMAIL=             # only if P8 names more admins
LOVABLE_PLAN=  LOVABLE_CREDITS=  LOVABLE_CLOUD_BILLED_FROM=   # P4
LOVABLE_EDITOR_CAN_REVOKE=  # P4: yes|no
# decisions (§6.2) and pre-authorisations (§6.3)
D1=  D3=eu-north-1  D4=keep  D6=all75  D7=4w/6w  D_SEC=yes  D_FIX=yes  D_LOCK=delete-bun  D_SUITE=keep
# (the file uses D_SEC/D_FIX/D_LOCK/D_SUITE: hyphens aren't valid in shell variable names; the plan text says D-SEC etc.)
PA_LOVABLE_EXPORT=yes  PA_OLD_DB_FREEZE=yes  PA_PROD_ENV_SWITCH=yes  PA_PREVIEW_ENV_SWITCH=yes
PA_AUTO_ROLLBACK=yes  PA_PROD_TEST_WRITES=yes  PA_SPAM_PATH_EMAIL=yes  PA_BREW_LIBPQ=yes
PREP_DONE_AT=
# ---- agent writes .env.generated (600): OLD_URL OLD_ANON NEW_URL NEW_PUB NEW_SECRET NEW_SECRET_ID
#      TEST_ADMIN_EMAIL TEST_ADMIN_PASSWORD TEST_ADMIN_ID RUN_ID T0
```

### 6.1 Checklist, in this order

1. **P1 Heidi (message from the owner):**
   > "Päivitämme sivuston taustajärjestelmää. Älä muokkaa mitään /admin-sivulla ennen kuin kerron, että se on valmis. Sivusto pysyy koko ajan näkyvissä. Kun kerron, että valmista on, kirjaudu uudelleen sisään."

   *(English: "We're updating the site's backend. Please don't edit anything on the /admin page until I tell you it's done. The site stays up the whole time. When I tell you it's done, please log in again.")*

   This starts a **soft freeze** now. The hard lock comes at §12.
2. **P2 Password manager:** create the entry "heidisimelius.fi – infra". It holds the Supabase logins and MFA, the DB password, keys, the CMS admin, **and** the logins for Vercel, GitHub `simeliusweb`, Lovable, Brevo and the domain registrar. (The red team found that custody had to cover more than Supabase.)
3. **P3 GitHub and Lovable, in this order:**
   - (a) lovable.dev → heidi-web-forge → Project settings → GitHub → **Disconnect**.
   - (b) github.com/settings/installations (as simeliusweb) → Lovable / gpt-engineer → **Uninstall**, or remove this repo from it.
   - (c) github.com/simeliusweb/heidisimelius/settings/branches → Add classic rule → pattern `main` → leave everything unchecked. That blocks force-push and deletion while direct pushes still work. Create.
4. **P4 Lovable (read-only):**
   - Settings → Plans & credits → fill in `LOVABLE_*`. **Does Cloud usage draw on the 5 daily credits or on a separate Cloud allowance?** If it could run out within about 6 weeks, top up or say so.
   - Cloud → SQL editor: run `select version(), current_user;` and
     `select has_table_privilege(current_user,'public.gigs','INSERT WITH GRANT OPTION') g, (select tableowner from pg_tables where schemaname='public' and tablename='gigs') o;`
     → set `LOVABLE_EDITOR_CAN_REVOKE=yes` if `g` is true or `o = current_user`.
   - Publish: is a Lovable-hosted URL or custom domain published? It shouldn't be (`heidi-web-forge.lovable.app` returned 404). If one is, unpublish it.
   - Emails: is a sender domain set up? None is expected.
5. **P5 Supabase:**
   - (a) Account → Security: MFA with **two** TOTP devices.
   - (b) If D1 = Free: create the project **before** inviting a second owner. The free 2-active-project quota counts every Owner/Admin of the org. Then org simeliusweb → Team → invite the developer as Owner.
   - (c) Billing per D1. Accept the DPA.
   - (d) New project `heidisimelius`:
     - region **eu-north-1** (choose it explicitly, not "Europe")
     - DB password generated in the password manager and kept there
     - **Enable Data API: on**
     - **"Automatically expose new tables": OFF**
     - **"Enable automatic RLS": OFF** (the migrations enable RLS themselves)
   - (e) Authentication → Sign In / Providers: turn off **Allow new users to sign up** and **anonymous sign-ins**, then Save. This is belt and braces; the agent enforces it again in 2B.1.
   - (f) Account → Access Tokens → "claude-migration-heidisimelius", 30-day expiry → `SUPABASE_PAT`.
   - (g) Project Settings → General → `NEW_REF`. Org slug → `SUPABASE_ORG_SLUG`.
6. **P6 Vercel (simeliusweb login):**
   - (a) Account Settings → Tokens → "claude-migration", scope `simeliuswebs-projects`, 30 days → `VERCEL_TOKEN`.
   - (b) Team Settings → General → Team ID → `VERCEL_ORG_ID`.
   - (c) Project → Settings → Deployment Protection → **Protection Bypass for Automation** → Add, with the note "migration-e2e" → `VERCEL_AUTOMATION_BYPASS_SECRET`.
   - (d) Project → Settings → Environment Variables → reveal `CRON_SECRET` (Production) → `CRON_SECRET`.
   - **Don't change any env vars.**
7. **P7 Browser logins.** Run:
   ```bash
   open -n -a "Google Chrome" --args --remote-debugging-port=9228 --user-data-dir="$HOME/Library/Application Support/claude-pw-profiles/heidisimelius"
   ```
   Log in to Lovable (account **sandels92@hotmail.com**, not the Gmail), Gmail as **simeliusweb@gmail.com**, and Vercel (simeliusweb, through GitHub). Optionally also Supabase and Google Search Console. Leave the window open.
8. **P8 Admins:**
   - Confirm that `.env.local`'s `CMS_ACCOUNT` is Heidi's (the real) admin.
   - List any other admins.
   - D4 = keep the passwords during the migration. Rotating is a follow-up, so Heidi's password doesn't change at go-live.
9. **P9 Decisions and pre-authorisations:** fill in §6.2 and §6.3.
10. **P10 Preflight (agent, about 5 min; stay at the keyboard until it's green):**
    - Supabase: the project's `organization_id` = `SUPABASE_ORG_SLUG`. The project is `ACTIVE_HEALTHY` in eu-north-1. (Verified 2026-09-23: project `heidisimeliusfi`, PG 17.6, Free plan, 0 users/tables/buckets.) `GET /v1/projects/$NEW_REF/config/auth` shows `disable_signup=true`.
    - Vercel: `GET /v9/projects/$VERCEL_PROJECT_ID` returns 200.
    - `vercel env ls --format json`: names and targets only. Record whether `VITE_SUPABASE_*` are **shared records** across targets, and whether `BREVO_API_KEY` and `CRON_SECRET` are in Preview.
    - Bypass: a GET on the latest preview with the header returns 200 (without it: 302 to the SSO page).
    - `gh api repos/simeliusweb/heidisimelius/branches/main --jq .protected` = `true`.
    - The last gpt-engineer commit is still 2025-10-15.
    - MCP browser: Lovable project page and Gmail inbox are logged in.
    - No empty required variables.
    - Every failure is fixed on the spot while the owner is still there.

### 6.2 Decisions (fill in `D*`)

| # | Decision | Recommendation |
|---|---|---|
| D1 | Supabase **Free** or **Pro** ($25/mo) | **Pro**: never pauses, 7 days of backups, Smart CDN purge on overwrite (a replaced CV shows up at once), and HIBP password checks. On Free, one missed keep-alive run can pause the project (see FX1). |
| D3 | Region | eu-north-1 |
| D4 | Admin passwords | **keep** now, rotate as a follow-up |
| D6 | Copy the 21 orphans | yes (all 75 files, about 20 MB) |
| D7 | Fallback window | Pause Lovable at week 4, Remove at week 6 or later. Credits must last until Remove, because storage is billed while paused. |
| D-SEC | CMS writes require the `app_metadata.cms_admin=true` claim, which only the service role can set | **yes**. It closes finding 1 at no extra test cost. Declining leaves the E24 user gate as the only control. |
| D-FIX | Fix list FX1–FX16 (Appendix D) is part of the flow | **yes** |
| D-LOCK | The stale `bun.lockb` (2025) next to `package-lock.json` | **delete-bun**. BL0→BL1 review catches any change in resolved versions. |
| D-SUITE | Keep the Playwright suite in the repo as the permanent regression suite | **keep** |
| — | Cutover day | Agreed with Heidi. It's your push (GL). |
| — | Vercel Hobby is for non-commercial use only | Owner to consider Pro. The site advertises lessons and bookings. Not a blocker for this migration. |

### 6.3 Pre-authorisations (`PA_*`)

| Flag | Allows the agent to |
|---|---|
| `PA_LOVABLE_EXPORT` | click "Export project data" once, and fetch the link from the email |
| `PA_OLD_DB_FREEZE` | run the §12 freeze (REVOKE) on Lovable, and the unfreeze on abort or rollback |
| `PA_PROD_ENV_SWITCH` | set the two Production `VITE_SUPABASE_*` vars at §12. This has no effect until your push. |
| `PA_PREVIEW_ENV_SWITCH` | move Preview and Development to the new values after GL |
| `PA_AUTO_ROLLBACK` | run Instant Rollback on hard triggers within 60 min after GL (§15) |
| `PA_PROD_TEST_WRITES` | POST tests on prod that create and delete only `E2E-TESTI` rows as the test admin |
| `PA_SPAM_PATH_EMAIL` | send honeypot-path test mails. They go only to simeliusweb@. |
| `PA_BREW_LIBPQ` | `brew install libpq` (for `pg_restore -l` of the Lovable export) |

### 6.4 What can't be done up front (it all happens at the end)

- **GL**, your push.
- The "done, log in again" message to Heidi.
- **C7**: Heidi confirms a real test mail arrived.
- Heidi's own first login and edit.
- Entering real ticket prices.
- Anything that has to wait for time to pass: the cron log, GSC, Pause/Remove, token expiry.

---

## 7. Step 1: re-validate the plan (AGENT, about 10 min)

This v2 *is* the audit. Step 1 in the run only checks for drift since 2026-09-23. Any difference is patched into this document (a docs-only commit) before continuing.

| ID | Check | Expected |
|---|---|---|
| 1.1 | `git status` clean, HEAD = origin/main (or docs-only ahead) | yes |
| 1.2 | Production bundle and status probes | as in §2 |
| 1.3 | Old REST counts + storage totals (anon) | 41/10/6/3, 75 objects / 41,874,215 B. A difference is a **content change**, which is expected if Heidi edited. Log it and continue: the final sync covers it. |
| 1.4 | Tooling | Node 22.x. `@playwright/test@1.63.0` Chromium is cached. `vercel` ≥ 54. `gh` auth. |
| 1.5 | P10 preflight still green | yes |

Log `STEP1 done`.

## 8. Step 2: implement

### 2A Record the source (AGENT-BR + AGENT; off the critical path, never gating)

| ID | Action | Success |
|---|---|---|
| 2A.1 | Lovable screenshots → `artifacts/2A/`: Overview, Secrets (names only), Jobs, Emails, Edge functions, Usage, Connectors, Security, Settings. Sensitive pages are saved with explicit filenames in the private dir. | files exist |
| 2A.2 | Lovable SQL editor: **Q1** (one query per key, so the grid doesn't truncate), **Q2**, **Q3**, **Q4** (Appendix A). Results are read from the DOM → `artifacts/2A/q*.json`. | parsed JSON. If the role is restricted, mark it `partial`. |
| 2A.3 | **Export project data** (`PA_LOVABLE_EXPORT`). The link email goes to the **Lovable account's inbox (`sandels92@hotmail.com`), not Gmail**, so download the file from Lovable's Cloud → Storage (`database_export_*` bucket) in the MCP browser instead. Save it to `exports/lovable-<date>.backup`. `pg_restore -l` → `artifacts/2A/export-toc.txt`. `pg_restore -f - --schema-only --schema=public --schema=storage` → `export-ddl.sql`. | TOC lists the 4 tables, and the source version is recorded |
| 2A.4 | Confirm, as anon, that the export's bucket and object are **not** listable or downloadable. Lovable saves the export into Cloud storage. | 4xx or `[]` |
| 2A.5 | Capture **BL0** (`capture.mjs --label BL0 --base https://www.heidisimelius.fi`), once the capture script exists (2D) | JSON written |

**Fallbacks:**
- Q1/Q2 unreadable → use `export-ddl.sql`.
- Q3 unreadable → the Cloud → Users UI.
- No export button → the X1 JSON plus the storage mirror are the archive.

Nothing in the data path depends on 2A.

### 2B Build the target (AGENT via the Management API: `POST /v1/projects/$NEW_REF/database/query` with the PAT)

| ID | Action | Success | Halt |
|---|---|---|---|
| 2B.0 | `GET /v1/projects/$NEW_REF` → `organization_id` = `SUPABASE_ORG_SLUG` (the owner copied it from the simeliusweb org page), name `heidisimeliusfi`, region eu-north-1. The PAT can't list organisations (`GET /v1/organizations` returns `[]`), so don't rely on that. | yes | **STOP-ALL** if not |
| 2B.1 | **Auth lockdown.** `PATCH /v1/projects/$NEW_REF/config/auth` with: `disable_signup:true, external_anonymous_users_enabled:false, external_email_enabled:true, mailer_autoconfirm:false, security_manual_linking_enabled:false, site_url:"https://www.heidisimelius.fi", uri_allow_list:"https://www.heidisimelius.fi/**,https://heidisimelius.fi/**,http://localhost:8080/**,http://localhost:4173/**", refresh_token_rotation_enabled:true, jwt_exp:3600, password_min_length:<min(12, len(current admin pw))>`, plus `password_hibp_enabled:true` if D1=Pro. Then GET to verify. | GET matches | STOP-ALL on mismatch |
| 2B.2 | **User gate #1:** `GET $NEW_URL/auth/v1/admin/users` (secret key) → 0 users | 0 | STOP-ALL |
| 2B.2k | **Keys:** `GET …/api-keys?reveal=true` → `NEW_PUB`. `POST …/api-keys` `{type:"secret",name:"migration_agent"}` → `NEW_SECRET`, `NEW_SECRET_ID`, written straight into `.env.generated` with `jq` and never echoed. If legacy keys are listed: `PUT …/api-keys/legacy?enabled=false`. | keys present | — |
| 2B.3 | **Schema, as two scripts** (Appendix A.2). **Script P:** `begin;` + the 6 public migrations + `20260923120000_add_gig_ticket_price_and_duration.sql` + `20260923120100_grant_data_api_roles.sql` + [D-SEC] `20260923120200_cms_admin_claim.sql` + the migration-history insert + `commit;`. **Script S:** `begin;` + the 4 storage migrations (+ [D-SEC] storage claim policies) + `commit;`. Files are joined with newlines. The 3 new migration files are committed in 2C. | exit 0 | One self-fix. If S fails with 42501: create buckets through `POST /storage/v1/bucket` (secret key, both headers) and policies through Storage → Policies (AGENT-BR). |
| 2B.4 | **Verify schema** (A.3): 4 tables with `rls t`, 2 policies each, `anon_sel t / anon_ins f / auth_upd t / svc_sel t`. 16 storage policies (or the D-SEC count). 4 public buckets. `notify pgrst,'reload schema'`. REST `GET /rest/v1/gigs?select=id&limit=1` with `NEW_PUB` → 200 `[]`. Anon POST → 401. | all true | HALT |
| 2B.5 | **Q1 diff** new vs `artifacts/2A/q1.json` (or `export-ddl.sql`) with the allow-list: `whoami`, `objects`, `extensions` (pg_graphql absent), `acl`/`default_acl` (explicit grants are narrower, which is expected), the 2 new columns + their CHECKs + comments, [D-SEC] policy names and quals. Anything else is drift, and gets added to Script P. | allow-listed only | HALT on unexplained drift |
| 2B.6 | **Users:** `POST $NEW_URL/auth/v1/admin/users` `{email:$CMS_ACCOUNT, password:$CMS_ACCOUNT_PASSWORD, email_confirm:true, app_metadata:{cms_admin:true}}`, reading from `.env.local` without printing. Same for `ADMIN_2_*`. The **test admin** `simeliusweb+e2e-<runId>@gmail.com` gets a random 24-char password, stored in `.env.generated`. Look up by email first. | created | — |
| 2B.7 | **User gate #2:** exactly {admins, test admin}, none `is_anonymous` | yes | STOP-ALL |
| 2B.8 | Security Advisor `GET /v1/projects/$NEW_REF/advisors/security` | 0 ERROR | HALT |

### 2C Code changes (AGENT, local commits on `main`, one logical change per commit)

| # | Files | Change |
|---|---|---|
| C-1 | `supabase/migrations/20260923120000_add_gig_ticket_price_and_duration.sql` | Put the migration back as a file (SQL in Appendix A.2), so the repo matches the new DB |
| C-2 | `supabase/migrations/20260923120100_grant_data_api_roles.sql` | Grants (A.2) |
| C-3 | `supabase/migrations/20260923120200_cms_admin_claim.sql` | [D-SEC] claim-gated write policies for tables and storage (A.2) |
| C-4 | `supabase/config.toml`, `supabase/functions/keep-db-alive/` | `project_id` → `$NEW_REF`; delete the function block and the folder |
| C-5 | `.vercelignore` (new), `.gitignore` | `.vercelignore`: `.env`, `.env.*`, `dist`, `docs`, `baseline`, `test-results`, `playwright-report`, `e2e/.auth`. `.gitignore` adds: `.vercel`, `baseline/`, `test-results/`, `playwright-report/`, `e2e/.auth/` |
| C-6 | `.env.example` | Remove `SUPABASE_FUNCTION_URL`; add `CRON_SECRET=` |
| C-7 | `bun.lockb` | [D-LOCK] delete |
| C-8 | Fix list FX1–FX16 | Appendix D, each with its regression test |
| C-9 | `package.json` | devDependencies `@playwright/test@1.63.0` and `vitest@3.2.7` (this vitest works with vite 5); scripts `test:unit`, `test:e2e`, `test:e2e:smoke` |
| C-10 | `CLAUDE.md` | Env list (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `BREVO_API_KEY`, `CRON_SECRET`). The backend is Supabase project `$NEW_REF` in the simeliusweb org, and Lovable is disconnected. Never use the machine's Supabase CLI/MCP; use the Management API with the owner PAT. Pointer to this plan's §0. |

**Not changed:**
- supabase-js (finding 7)
- `client.ts`, `index.html`, `vercel.json` redirects/headers, the per-route build
- The gig-ticket flag stays **false** until the follow-up after the horizon (§16)

**After each commit:** `npx tsc --noEmit -p tsconfig.app.json && npm run lint && npm run build && npm run test:unit`, then the R7 secret scan.

### 2D Scripts (AGENT, committed under `scripts/migration/`; they read secrets only from the private dir)

| Script | Does | Spec |
|---|---|---|
| `lib.mjs` | Loads the env files; `guardFetch()` blocks non-GET to the old ref (R4); `sbq()` runs Management API SQL; appends to `run-log`/`state` | — |
| `export.mjs` (X1) | GET the 4 tables (`order=id` / `page_name`, `Prefer: count=exact`) → `exports/<ts>/`, and assert `array.length = Content-Range total` | B.1 |
| `make-seed.mjs` + `import.mjs` (X2) | Build the seed (explicit column lists, random dollar tag, raw byte splice, key-set check, in-transaction count and zero-URL asserts, optional host rewrite) and apply it through `sbq` | B.2 |
| `compare-rest.mjs` | Old REST vs new REST, per row, sorted keys, timestamps compared as UTC µs, the 2 new columns dropped, `REWRITE=1` maps the old host to the new one; exit ≠ 0 on any difference. Also exits **3 = DRIFT** when the old DB changed since the snapshot. | B.3 |
| `copy-storage.mjs` | Copy 75 objects, then `--verify-only`, then `--report-extras` | B.4 |
| `rewrite-check.mjs` | Whole-row zero check (SQL) + ranged GET of the 54 URLs on the new host | B.5 |
| `probes.mjs` | E4/E12/E13/E14/E15/E24 security probes against a given project | B.6 |
| `capture.mjs` / `diff.mjs` | Baseline capture with HTTP, data and rendered layers, and the normalised diff | B.7 |
| `freeze-old.mjs` | Print the freeze/unfreeze SQL and verify the privileges over REST. The SQL itself is run through AGENT-BR. | A.5 |
| `status.mjs` | Next runnable steps and open halts, from `state.json` | — |

### 2E Test suite (AGENT; layout in Appendix C.0)

Write the specs for every ID in Appendix C. Each spec is tagged with its tier (`@gate`, `@regression`, `@known`), environment (`@L`, `@P`, `@prod`) and data class (`@read`, `@test-rows`, `@mutates-real`).

### 2F Data rehearsal (AGENT; can be repeated)

| ID | Action | Success |
|---|---|---|
| 2F.1 | X1 export | counts = Content-Range |
| 2F.2 | `copy-storage` then `--verify-only`, before X2, so the rewritten URLs resolve | 75 = 75 against the Q1/§2 totals (not against its own listing); sha256, type and `cache-control: max-age=3600` (ranged GET) equal; 0 extras |
| 2F.3 | X2 import with `REWRITE_OLD/NEW` set: import, rewrite and asserts in **one** transaction | exit 0, touched 18/6/2 rows |
| 2F.4 | `compare-rest REWRITE=1` | exit 0, exactly 62 replacements |
| 2F.5 | `rewrite-check` | 0 remaining, 54 × 200 |
| 2F.6 | Q4 on the new project → `artifacts/2F/q4-post-import.json`. Once, Q4 on Lovable equals the rewritten expectation. This proves REST saw everything. | equal |
| 2F.7 | `probes.mjs --project new` | all pass |

---

## 9. Steps 3–4: audit the changes, then fix the findings (AGENT + review subagents, 3–5)

| ID | Check |
|---|---|
| 3.1 | Code review of `origin/main..HEAD`: correctness, the fix list, scripts, and the suite |
| 3.2 | Security review: R7 scan of the whole range; nothing secret in `scripts/`; `guardFetch` covers every code path; `.vercelignore` is effective. Test: a fresh clone + `vercel deploy --prebuilt=false --yes` dry listing, or inspect the deployment's Source tab (AGENT-BR) for `.env*`. |
| 3.3 | Idempotency: run every script twice. The second run is a no-op (`RESULT … skipped`). |
| 3.4 | Guard tests: a fixture test proves a non-GET to the old ref throws, and that `@cms-write` refuses when target ref = old or prod ref = new. |
| 3.5 | Plan consistency: every step in this doc has a script or spec. |

Fix everything that's found, re-run tsc, lint, build and unit tests, then commit. Record the **tested SHA candidate**.

---

## 10. Step 5: E2E before cutover (AGENT)

| ID | Action |
|---|---|
| 5.1 | `git clone ~/…/heidisimelius "$STATE/build/$SHA"` (local path, so unpushed commits are included and ignored files aren't). Check `git status --porcelain --ignored` is empty and HEAD = `$SHA`. |
| 5.2 | **Deploy BL1** (old values from `.env`) and **BL2** (new values). Command below. Record URLs and bundle names `$H_BL1` and `$H_BL2`. Check: `bundle()` on BL2 shows only `$NEW_REF`, `sb_publishable_` present, no `eyJhbGciOi`. The build log's installer line matches D-LOCK. |
| 5.3 | L build at `$SHA` with the new values → `http://localhost:4173` |
| 5.4 | Capture BL1 and BL2 at `T0`. `diff BL1 BL2` → exit 0, after normalising ref, bundle hash, key type, `lastmod`, `x-vercel-*`, `date`/`age`, `etag`/`last-modified`, and ranks. |
| 5.5 | Run every `@gate` and `@regression` test in its environment. Order: read-only public tests first, then CMS writes (`workers: 1`, logged in once with `storageState`), then the B15 cleanup, then the X2 re-import (2F.1–2F.6), then read-only tests again. |
| 5.6 | Fixed test conditions from §4.6. Bypass via cookie on the preview origin only. |

```bash
# 5.2: $V = old or new values; run from the clean clone, never the working copy
set -a; . ~/.heidisimelius-migration/.env.migration; . ~/.heidisimelius-migration/.env.generated; set +a
vercel deploy "$STATE/build/$SHA" --yes --force \
  --build-env VITE_SUPABASE_URL="$URL" --build-env VITE_SUPABASE_PUBLISHABLE_KEY="$KEY" \
  --env VITE_SUPABASE_URL="$URL" --env VITE_SUPABASE_PUBLISHABLE_KEY="$KEY" \
  --env CRON_SECRET="$CRON_SECRET_TEST" --meta migrationSha=$SHA --meta purpose=bl2
# VERCEL_TOKEN/VERCEL_ORG_ID/VERCEL_PROJECT_ID come from the env; --force skips deployment reuse.
# CRON_SECRET_TEST is a random value generated per deploy, so the preview's keep-alive is never open.
```

**Exit criteria (all required):**
- every `@gate` passes
- `diff BL1 BL2` is empty
- every `@regression` passes, or fails identically on BL1 and isn't on the fix list (→ follow-up)
- the B15 cleanup is verified
- storage extras = 0
- the user gate lists only the admins and the test admin

## 11. Steps 6–7: fix and re-test (AGENT)

**The loop:** fix (a local commit) → tsc, lint, build, unit → new `$SHA` → redeploy BL1 and BL2 (5.1–5.3) → re-run the failed IDs **plus** every `@gate` and `@smoke` test → repeat.

**Stop conditions:**
- All exit criteria met → §12.
- The same test fails after 3 fix attempts → HALT that ID and continue. The READY report shows it. **GL is blocked** if it's a `@gate`.

## 12. Step 8: final sync, lock and READY report (AGENT; the end of the continuous flow)

**Preconditions:** §10 exit criteria met on the final `$SHA`, and `git diff $SHA HEAD` is docs-only.

| ID | Action | Success / abort |
|---|---|---|
| 8.1 | **Freeze the old DB** (`PA_OLD_DB_FREEZE`, AGENT-BR, SQL A.5). Revoke insert/update/delete/truncate from anon and authenticated, plus restrictive storage insert/update policies if the role allows. If `LOVABLE_EDITOR_CAN_REVOKE=no`: soft freeze only, and 8.8 drift checks are required. | Privileges false. Otherwise mark `soft-freeze` and continue. |
| 8.2 | Drift sentinel: X1 → hash `H_old0` | — |
| 8.3 | `copy-storage` then `--verify-only` (always re-copies the CV) and `--report-extras`. Prune extras from the test ledger. | 75 = 75, 0 extras |
| 8.4 | X2 with rewrite, then `compare-rest REWRITE=1`, then `rewrite-check`, then Q4 → `artifacts/8/q4-final.json` | all green; else **Abort A** |
| 8.5 | Delete the test admin? **No.** It's kept for the POST read-only tests and deleted in §14. User gate #3 = {admins, test admin}. | yes |
| 8.6 | Save the current production deployment `vercel inspect https://www.heidisimelius.fi --format json` → `D_OLD` (id, url) into `state.json`. This is the rollback target. | recorded |
| 8.7 | **Production env** (`PA_PROD_ENV_SWITCH`). For each `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`: if the record targets only production → `vercel env add NAME production --value … --force --no-sensitive --yes`. If it's **shared** across targets → split it first with `PATCH /v9/projects/$VERCEL_PROJECT_ID/env/<id>` `{"target":["preview","development"]}`, then add the production one. **Never `vercel env rm` a shared record.** Leave `SUPABASE_FUNCTION_URL` and `VITE_SUPABASE_PROJECT_ID` alone for now (§16). Verify with `vercel env ls production --format json`: new `updatedAt`, Preview unchanged. | yes; else **Abort A** |
| 8.8 | X1 again → equal to `H_old0` (no late writes) | equal; else re-run 8.3–8.4 |
| 8.9 | Write the **READY report** (below) | — |

**READY report** (written to `~/.heidisimelius-migration/READY.md`; a secret-free summary goes into this doc's §17 as a docs-only commit):
- the tested `$SHA`, `$H_BL2`, `D_OLD`
- the test matrix result per ID (pass / fail / known / halted)
- BL0→BL1 intended differences
- the fix-list status
- halts and blockers
- follow-ups (§16), each with a date
- a vault-sync list: names only, and where each value lives
- **the exact GL instruction and what the owner will see**

**State after §12:**
- The old DB is read-only.
- The new DB is final.
- Production still serves the Lovable build and is fully working for visitors.
- The CMS is frozen: any save shows an error.
- If GL slips by more than 24 h, see §15 "Abort A".

---

## 13. Go-live: GL (OWNER)

1. Read `READY.md`. Every `@gate` must be green.
2. `git push origin main`
3. Tell the agent "pushed". It watches the deployment on its own anyway.

## 14. After the push: POST verification and fix round (AGENT)

| ID | Action | Success / trigger |
|---|---|---|
| 14.1 | Wait for the production deployment to be READY. `vercel inspect www` → the new id, commit = `$SHA`. | — |
| 14.2 | **Bundle identity:** the www bundle name = `$H_BL2`; exactly one `$NEW_REF`; no old ref; no `eyJhbGciOi`. | **Auto-rollback trigger** on mismatch |
| 14.3 | POST suite on Prod (Appendix C, gate POST): A1–A3, A10, A14–A16, A24, A30, B1, B3 (test admin), B16, B20, D1–D3, D5, D8–D12, D14, E1, E8, E16–E20, F4, F7, F8, and `diff BL2 BL3`. | **Auto-rollback triggers:** A2 fails on any route; A1 finds a request to the old ref, or none to the new ref; any 5xx on a public route; E1 fails. Anything else: fix forward. |
| 14.4 | Heidi-facing smoke: the owner messages Heidi → she hard-reloads, logs in, makes one small edit and sees it live. **C7**: one real contact-form mail, and Heidi confirms. | owner confirms |
| 14.5 | `PA_PREVIEW_ENV_SWITCH`: Preview and Development → new values (split per 8.7). Update the local `.env`. | — |
| 14.6 | Delete the test admin; user gate #4 = admins only. Delete the `migration_agent` secret key (`DELETE …/api-keys/$NEW_SECRET_ID`). | — |
| 14.7 | **Fix round:** POST failures and anything learned. Local commits, re-tested on L/P. **No push until the horizon ends** (§15). The owner pushes them afterwards. | — |
| 14.8 | Final report: POST results, fixes waiting to be pushed, follow-ups, and the vault-sync list | — |

## 15. Abort and rollback (single procedure)

| Situation | Do |
|---|---|
| **Before 8.1** | Stop. Production is untouched. The new project can be thrown away (re-import, or the owner deletes it). Local commits stay unpushed. |
| **Abort A** (after 8.1, before GL) | (1) Set Production `VITE_*` back to the old values, if 8.7 ran. (2) **Unfreeze** the old DB: re-grant exactly the privileges the Q1 `acl` snapshot showed, and drop any `migration_freeze_*` policies. Check the privileges. (3) The owner tells Heidi the freeze is over. |
| **R-A** (after GL, auto-trigger or owner) | (1) `vercel rollback $D_OLD_ID --yes`; check the www bundle name = BL0's (`index-BxnMSrKf.js` unless it changed). (2) Production vars → old values. (3) Unfreeze the old DB. (4) The owner tells Heidi. **After a rollback, auto-assign is off:** the next real deploy needs `vercel promote` or Undo Rollback. The cron reverts to the old deployment and pings Lovable, so on Free the new project must be re-promoted within 7 days or pinged. |
| **R-B** (rollback refused) | Env vars → old values; the owner redeploys `D_OLD`'s commit without cache; unfreeze |
| **R-C** (Heidi already edited the new DB) | Fix forward by default. Roll back only if the site is broken: first run `compare-rest` of the new DB against `artifacts/8/q4-final` / the X1 snapshot to get the list of changed rows, then R-A, then replay those rows into the unfrozen old DB. |

**Rollback horizon:** no pushes to `main` for **48 h** after GL, and until Heidi's first real edit is confirmed. The one exception is R-B. A push makes the new-DB deployment the "previous" one and ends the Instant Rollback path.

## 16. Follow-ups (dated from GL)

| When | What | Who |
|---|---|---|
| Day 0 +1 h | Q4 on Lovable again = `q4-final` (catches stray writes if only a soft freeze was possible) | AGENT-BR |
| Day 1 | E7: no requests from www to the old ref (A1 on Prod); 0 old URLs in the DB; old DB still reachable (weekly `GET /rest/v1/gigs?limit=1` → 200) | AGENT |
| Day 1–5 | E10: cron log shows ≥ 1 successful daily run (FX1). E11: missed-run alert armed. Hobby keeps logs about 1 h, so check within the hour after 12:00 UTC or use the dashboard. | AGENT-BR |
| Day 2 (horizon ends) | Push the §14.7 fixes (owner). Then, as a separate owner-pushed commit, **switch on the gig ticket fields**: regenerate the `types.ts` hunk (`git show 6959434 -- src/integrations/supabase/types.ts` has exactly the two columns), set `GIG_TICKET_FIELDS_ENABLED = true`, run tsc/lint/build, then G1–G11. Delete `SUPABASE_FUNCTION_URL` and `VITE_SUPABASE_PROJECT_ID` from all targets. | AGENT prepares, OWNER pushes |
| Day 2+ | Heidi/owner enter real ticket prices and durations for the upcoming gigs, and fix the tour gigs' combined venue/locality data (Appendix D, K-DATA). The site must never show guessed prices. | OWNER |
| Week 1 | Backups: Pro, or a daily GitHub Action in a **private** repo running `pg_dump` **v17 client** `--schema=public` through the session pooler, plus a weekly storage mirror with a sha256 manifest. **E22 restore drill.** Auth users are recreated by hand from the vault (not dumped). | AGENT writes, OWNER creates the repo and secret |
| Week 1 & 4 | E23: usage and egress below 50% of the plan limits | AGENT |
| Day 14 | GSC: Coverage + Events clean (D7); Rich Results Test (D4); social debuggers (D6) | AGENT-BR |
| Day 28 | F3: CrUX/PSI field data | AGENT |
| Week 4 | Final Lovable export into the vault, `copy-storage --verify-only` (old ⊆ new), then **Pause Cloud** (owner) | OWNER |
| Week 6+ | **Remove Lovable Cloud** (owner). Cancel or downgrade the Lovable plan. Revoke the Vercel bypass secret. Let the PAT and Vercel token expire (or revoke them). Rotate the CMS passwords (D4). Delete `READY.md`/exports from the private dir after moving them to the vault. Update the Claude memory note. | OWNER + AGENT |

## 17. Out of scope for the migration (report as follow-ups)

These are the post-migration items. Appendix D lists the matching bugs.
- Rate limiting on `/api/send-email`: a Vercel Firewall rule plus a Brevo daily-cap alert.
- Security headers: `X-Content-Type-Options`, `frame-ancestors`/XFO (protects `/admin` from being framed), Referrer-Policy.
- Hashed-asset immutable caching.
- Remove the orphaned storage files, and make the CMS delete files it replaces.
- Restrict storage listing (public SELECT → authenticated).
- Self-service password reset (Brevo SMTP + a `/reset-password` route).
- The `/media` proxy: storage served from our own domain, which makes Event images indexable (today every one carries `x-robots-tag: none`) and makes `download` attributes work.
- GEO for crawlers that don't run JS: gigs and bio in the prebuilt HTML, `llms.txt`, Person/WebSite JSON-LD with `@id`, an `<h1>` on home.
- `og:image` in a 1200×630 crop, plus `og:site_name`/`og:locale`.
- `public/robots.txt` is dead code: vite-plugin-sitemap overwrites it.
- An SPF record for heidisimelius.fi.
- Make the GitHub repo private.
- Vercel Pro (commercial use).
- The remaining CMS validation and UX bugs (Appendix D, rows marked "follow-up").

**READY report summary:** *(filled in by §12)*

---

## Appendix A: SQL

### A.1 Source recording (Lovable SQL editor, read-only; run Q1 one key at a time if the grid truncates)

```sql
-- Q1: schema snapshot (the same query runs on the new project for the 2B.5 diff)
select jsonb_build_object(
 'whoami', jsonb_build_object('user',current_user,'version',version(),'tz',current_setting('TimeZone'),
            'collate',(select datcollate from pg_database where datname=current_database())),
 'columns', coalesce((select jsonb_agg(jsonb_build_object('t',table_name,'col',column_name,'pos',ordinal_position,'type',udt_name,'null',is_nullable,'default',column_default) order by table_name,column_name) from information_schema.columns where table_schema='public'),'[]'),
 'enums', coalesce((select jsonb_object_agg(t.typname,(select jsonb_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid=t.oid)) from pg_type t where t.typnamespace='public'::regnamespace and t.typtype='e'),'{}'),
 'constraints', coalesce((select jsonb_agg(jsonb_build_object('t',conrelid::regclass::text,'name',conname,'def',pg_get_constraintdef(oid)) order by conrelid::regclass::text,conname) from pg_constraint where connamespace='public'::regnamespace and contype <> 'n'),'[]'),
 'indexes', coalesce((select jsonb_agg(indexdef order by indexname) from pg_indexes where schemaname='public'),'[]'),
 'rls', coalesce((select jsonb_object_agg(relname,jsonb_build_object('on',relrowsecurity,'forced',relforcerowsecurity,'acl',relacl::text,'owner',pg_get_userbyid(relowner))) from pg_class where relnamespace='public'::regnamespace and relkind in ('r','p','v','m')),'{}'),
 'policies', coalesce((select jsonb_agg(jsonb_build_object('s',schemaname,'t',tablename,'name',policyname,'perm',permissive,'roles',roles,'cmd',cmd,'using',qual,'check',with_check) order by schemaname,tablename,policyname) from pg_policies where schemaname in ('public','storage')),'[]'),
 'functions', coalesce((select jsonb_agg(jsonb_build_object('name',p.proname,'def',pg_get_functiondef(p.oid))) from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind in ('f','p')),'[]'),
 'triggers', coalesce((select jsonb_agg(jsonb_build_object('t',c.oid::regclass::text,'name',t.tgname,'def',pg_get_triggerdef(t.oid))) from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal and c.relnamespace in ('public'::regnamespace,'auth'::regnamespace)),'[]'),
 'event_triggers', coalesce((select jsonb_agg(evtname||' '||evtevent order by evtname) from pg_event_trigger),'[]'),
 'default_acl', coalesce((select jsonb_agg(jsonb_build_object('role',defaclrole::regrole::text,'schema',defaclnamespace::regnamespace::text,'type',defaclobjtype,'acl',defaclacl::text)) from pg_default_acl),'[]'),
 'extensions', coalesce((select jsonb_agg(extname||' '||extversion order by extname) from pg_extension),'[]'),
 'publications', coalesce((select jsonb_agg(pubname||':'||schemaname||'.'||tablename) from pg_publication_tables),'[]'),
 'buckets', coalesce((select jsonb_agg(jsonb_build_object('id',id,'public',public,'size_limit',file_size_limit,'mime',allowed_mime_types) order by id) from storage.buckets),'[]'),
 'objects', coalesce((select jsonb_object_agg(bucket_id,jsonb_build_object('n',n,'bytes',b)) from (select bucket_id,count(*) n,sum((metadata->>'size')::bigint) b from storage.objects group by 1) o),'{}')
);

-- Q2: drift that types.ts can't show (each on its own; an error = that schema is absent)
select version, name from supabase_migrations.schema_migrations order by version;   -- more than 10 = drift
select jobid, jobname, schedule, active, left(command,200) from cron.job;           -- any row = drift (don't touch; R3)

-- Q3: auth users (no hashes)
select u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at is not null confirmed,
       u.raw_app_meta_data->>'provider' provider, u.is_anonymous, u.is_sso_user, u.banned_until, u.deleted_at,
       (select count(*) from auth.mfa_factors f where f.user_id=u.id) mfa
from auth.users u order by u.created_at;

-- Q4: data checksums; TimeZone- and collation-independent, and ignores the 2 new gig columns
with x as (
  select 'gigs' tbl, t.id::text k, to_jsonb(t) - 'ticket_price' - 'duration_minutes'
    || jsonb_build_object('created_at',       to_char(t.created_at       at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US'),
                          'performance_date', to_char(t.performance_date at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')) j
  from public.gigs t
  union all select 'videos', t.id::text, to_jsonb(t)
    || jsonb_build_object('created_at', to_char(t.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')) from public.videos t
  union all select 'photo_sets', t.id::text, to_jsonb(t)
    || jsonb_build_object('created_at', to_char(t.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')) from public.photo_sets t
  union all select 'page_content', t.page_name, to_jsonb(t)
    || jsonb_build_object('created_at', to_char(t.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US'),
                          'updated_at', to_char(t.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')) from public.page_content t
)
select tbl, count(*) n, md5(string_agg(j::text, E'\n' order by k collate "C")) md5 from x group by tbl order by tbl;
-- Expected value on the new DB after the rewrite: run on Lovable with string_agg(replace(j::text,'<OLD>','<NEW>'), …).
-- Diagnose a mismatch: select tbl, k, md5(j::text) from x order by tbl, k collate "C";
```

### A.2 New migration files and the history insert

```sql
-- 20260923120000_add_gig_ticket_price_and_duration.sql
-- Search Console flags every gig's Event structured data for missing offers.price /
-- priceCurrency and endDate. Both columns are optional.
ALTER TABLE public.gigs
  ADD COLUMN ticket_price numeric(8, 2) CHECK (ticket_price >= 0),
  ADD COLUMN duration_minutes smallint CHECK (duration_minutes > 0);
COMMENT ON COLUMN public.gigs.ticket_price IS 'Cheapest ticket in EUR (0 = free entry). Emitted as offers.price.';
COMMENT ON COLUMN public.gigs.duration_minutes IS 'Show length incl. intermission. Used for the Event endDate.';

-- 20260923120100_grant_data_api_roles.sql
-- Projects created after 2026-05-30 don't expose public tables to the Data API roles automatically.
grant usage on schema public to anon, authenticated, service_role;
grant select on public.gigs, public.videos, public.photo_sets, public.page_content to anon;
grant select, insert, update, delete on public.gigs, public.videos, public.photo_sets, public.page_content to authenticated, service_role;
notify pgrst, 'reload schema';

-- 20260923120200_cms_admin_claim.sql   [D-SEC]
-- Writes need app_metadata.cms_admin = true, which only the service role can set, so a
-- signed-up stranger can't write even if signups were ever re-enabled. Repeat for all 4 tables:
drop policy "Authenticated users can manage gigs" on public.gigs;
create policy "CMS admins manage gigs" on public.gigs for all to authenticated
  using ((select auth.jwt()->'app_metadata'->>'cms_admin') = 'true')
  with check ((select auth.jwt()->'app_metadata'->>'cms_admin') = 'true');
-- Storage: drop and recreate the 12 authenticated insert/update/delete policies from the 4 storage
-- migrations with "and (select auth.jwt()->'app_metadata'->>'cms_admin') = 'true'" added.
-- Keep the public SELECT policies: the CV upsert needs SELECT + INSERT + UPDATE.

-- Migration history (end of Script P), so any later CLI treats these as applied
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
insert into supabase_migrations.schema_migrations(version, name) values
 ('20251010104232','f6121ef5-b0f6-46dd-b599-187a45a8cae0'),('20251011061316','841c1b92-4512-4fa8-ba19-8e2f0eb6b1b9'),
 ('20251011064909','714329e9-23aa-4323-94a7-ca8b5e6a5480'),('20251013093859','26967c2f-9540-43bf-b9b3-aa18f733e6a4'),
 ('20251013151256','014ca8ac-f2ff-4e3e-8dcb-80136833f39f'),('20251013151748','0453cc45-c4d9-461b-b6af-9c06ae4093f3'),
 ('20251013161846','24b310e9-dda3-4965-8b56-449503fde728'),('20251013171304','50c8eb44-5192-4c5b-899b-1bb95b9324c8'),
 ('20251014072133','4a299cc6-9a1a-46e5-89a7-eb8fa2ce1f01'),('20251014102553','0165d490-1f36-49c7-989a-92c6903bfc0b'),
 ('20260923120000','add_gig_ticket_price_and_duration'),('20260923120100','grant_data_api_roles'),
 ('20260923120200','cms_admin_claim')
on conflict (version) do nothing;
```

**How the files split between the two scripts:**
- **Public** (Script P): `20251010104232`, `20251011061316`, `20251013093859`, `20251013151256`, `20251013151748`, `20251013171304`.
- **Storage** (Script S): `20251011064909`, `20251013161846`, `20251014072133`, `20251014102553`.

### A.3 Verify the schema (new project)

```sql
select c.relname, c.relrowsecurity rls, c.relforcerowsecurity forced, pg_get_userbyid(c.relowner) owner,
       (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname) policies,
       has_table_privilege('anon',c.oid,'SELECT') anon_sel, has_table_privilege('anon',c.oid,'INSERT') anon_ins,
       has_table_privilege('authenticated',c.oid,'UPDATE') auth_upd, has_table_privilege('service_role',c.oid,'SELECT') svc_sel
from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='r' order by 1;
-- expect 4 rows: rls t, forced f, policies 2, anon_sel t, anon_ins f, auth_upd t, svc_sel t
select count(*) from pg_policies where schemaname='storage' and tablename='objects';   -- 16
select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id; -- 4 rows, public t; limits = Q1 source
select column_name, data_type, numeric_precision, numeric_scale, is_nullable from information_schema.columns
 where table_schema='public' and table_name='gigs' and column_name in ('ticket_price','duration_minutes');
-- ticket_price numeric 8,2 YES; duration_minutes smallint YES
```

### A.4 Rewrite zero check (whole row)

```sql
select (select count(*) from public.gigs t where to_jsonb(t)::text like '%yctdrwogilljanzxcgow%')
     + (select count(*) from public.videos t where to_jsonb(t)::text like '%yctdrwogilljanzxcgow%')
     + (select count(*) from public.photo_sets t where to_jsonb(t)::text like '%yctdrwogilljanzxcgow%')
     + (select count(*) from public.page_content t where to_jsonb(t)::text like '%yctdrwogilljanzxcgow%') as remaining; -- 0
```

### A.5 Freeze and unfreeze the old DB (Lovable SQL editor, `PA_OLD_DB_FREEZE`)

```sql
-- FREEZE
revoke insert, update, delete, truncate on public.gigs, public.videos, public.photo_sets, public.page_content from anon, authenticated;
select t, has_table_privilege('authenticated',t,'INSERT') i, has_table_privilege('authenticated',t,'UPDATE') u,
       has_table_privilege('authenticated',t,'DELETE') d
from unnest(array['public.gigs','public.videos','public.photo_sets','public.page_content']) t;   -- all false
-- optional, if the role can create policies on storage.objects:
create policy migration_freeze_ins on storage.objects as restrictive for insert to authenticated with check (false);
create policy migration_freeze_upd on storage.objects as restrictive for update to authenticated using (false) with check (false);

-- UNFREEZE (Abort A / R-A): re-grant exactly what the Q1 rls.acl snapshot shows (usually the Supabase default:
-- grant all on <4 tables> to anon, authenticated), then:
drop policy if exists migration_freeze_ins on storage.objects;
drop policy if exists migration_freeze_upd on storage.objects;
-- re-run Q1 'rls' and diff the acl against artifacts/2A/q1.json
```

REVOKE gives a permission error (42501) that the CMS shows as an error toast. An RLS `USING(false)` would make UPDATE and DELETE silently change nothing, so it's the wrong tool here.

---

## Appendix B: script specs

**B.1 `export.mjs` (X1).**
- Uses `curl -fsS` semantics. It fails on any non-2xx, on an empty array where rows are expected, and when the length ≠ the `Content-Range` total.
- Files go to `exports/<ts>/<table>.json` plus headers.
- Prints the sha256 of each file (the drift sentinel).

**B.2 `make-seed.mjs` / `import.mjs` (X2).**
- **Validation:**
  - Every row's sorted key set must equal the expected list: gigs 16 keys, videos 8, photo_sets 9, page_content 4 (from `types.ts`).
  - A random dollar tag `$seed_<12hex>$`, checked to be absent from the data.
  - Raw bytes are spliced in. There's no `JSON.parse`/`stringify` round-trip.
- **Emitted SQL:**
  - `begin; set local statement_timeout='60s'; truncate …;`
  - Per table: `insert into public.<t> (<explicit export columns>) select <cols> from jsonb_populate_recordset(null::public.<t>, $tag$<raw>$tag$::jsonb);`
  - With `REWRITE_OLD/NEW`: the three UPDATEs:
    - `gigs.image_url`
    - `photo_sets.photos::text` + `press_kit_zip_url`
    - `page_content.content::text`
  - A `do $$ … $$` block that raises unless: the counts equal the export counts, the touched rows are 18/6/2, and A.4 = 0.
  - `commit;`
- `import.mjs` applies it through `sbq` (Management API, about 85 KB) and refuses to run when `state.golive_at` is set.
- **Fallback:** `pg_restore --data-only --schema=public --table=… --single-transaction --exit-on-error` from the Lovable export through the **session pooler** (the direct host is IPv6-only). Truncate first. Never use `psql -1` together with `begin/commit` in the file.

**B.3 `compare-rest.mjs`.**
- Fetches old and new REST in full.
- Keys rows by `id`/`page_name`, drops `ticket_price`/`duration_minutes`, and normalises ISO timestamps to UTC µs.
- With `REWRITE=1`, replaces string values starting with the old storage prefix with the new one, and asserts exactly 62 replacements.
- Deep-compares with sorted keys.
- Exit codes: 0 equal, 1 different (prints the ids), 3 **DRIFT**: the old export hash ≠ the last snapshot.

**B.4 `copy-storage.mjs`.**
- **Sources:**
  - The bucket ids are **hard-coded** (anon `GET /storage/v1/bucket` returns `[]`).
  - Lists with `POST /storage/v1/object/list/<b>` `{prefix,limit:100,offset,sortBy:{column:"name",order:"asc"}}`, recursing where `id===null`.
  - Sends `apikey` **and** `Authorization: Bearer` with the identical key.
  - Fails closed on any name that doesn't match `^[A-Za-z0-9._/-]+$`. Each path segment is `encodeURIComponent`-ed.
- **Download:**
  - Uses the old public URL.
  - Asserts the size. For single-part objects it asserts md5 = the listing `eTag`, because the CDN may serve a stale copy for up to 1 h, and retries up to 5 min.
- **Skip:** when the target eTag = md5 of the source.
- **Upload:** raw `fetch` `POST /storage/v1/object/<b>/<path>` with the secret key (both headers), `content-type: <metadata.mimetype>`, `cache-control: max-age=3600`, `x-upsert: true`. Use raw fetch because storage-js would turn `max-age=3600` into `max-age=max-age=3600`, and it defaults Buffers to `text/plain`.
- **`--verify-only`:** against the **§2/Q1 totals** (75 / 41,874,215 B / per bucket), not its own listing.
  - sha256 of the new public GET = the source
  - content-type equal
  - ranged-GET (`Range: bytes=0-0`) `cache-control: max-age=3600`
  - `access-control-allow-origin: *`
  - Never compares ETags between projects: the multipart ETags don't carry over.
- **`--report-extras`:** objects present in new but not in source. They must be 0 at 8.3, pruned from the test ledger.
- **Ignore:** any Lovable `database_export_*` bucket.

**B.5 `rewrite-check.mjs`.** Runs A.4 through `sbq` and a ranged GET of every unique storage URL found in the new REST data (54): 200, type = the source.

**B.6 `probes.mjs`.**
- **Auth:**
  - `GET /auth/v1/settings` = the expected lockdown.
  - `POST /auth/v1/signup` only after settings show `disable_signup:true`. The address is `e2e-probe+<runId>@example.invalid`, and if it's ever created, it's deleted.
  - `POST /auth/v1/otp {create_user:true}` → rejected.
- **Table matrix:** anon INSERT → 401/42501. Anon UPDATE/DELETE → 2xx `[]` **and** the row is unchanged on re-read.
- **Storage:** anon upload and CV upsert → 4xx. Anon delete → the object still returns 200 with the same md5.
- **User gate:** `GET /auth/v1/admin/users` = the expected emails, none anonymous.
- **Advisors:** security + performance. Allowed WARNs only: `public_bucket_allows_listing` ×4, `auth_leaked_password_protection` (Free), `auth_rls_initplan`, `multiple_permissive_policies`.

**B.7 `capture.mjs` / `diff.mjs`.**
- **HTTP layer (curl-style, `redirect: manual`):**
  - Covers every `routeMetadata` route, every sitemap URL, a bogus path, `/wp-admin` (Vercel firewall returns 403; record it, don't assert 404), `/bilebandi-heidi-`, `/keikat/`, `/bio/`, `//keikat`, `/KEIKAT`, the apex host, `http://`, `/admin`, `/login`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/404.html`, `/index.html`, `GET /api/send-email`.
  - Records status, location, x-robots-tag, cache-control, content-type, title, description, canonical, robots meta, og/twitter, JSON-LD, every `supabase.co` string, and the bundle name plus the hosts and key type inside it.
- **Data layer:** REST counts, `sb-project-ref`, per-table normalised md5, the URL-host tally, and a **ranged GET** (not HEAD) of every storage URL. HEAD always returns `no-cache` on Supabase storage.
- **Rendered layer (Playwright, T0 clock, Europe/Helsinki):**
  - the head after Helmet, the parsed JSON-LD
  - normalised `main` innerText (with every "Näytä lisää" expanded)
  - counts
  - `<img>` `currentSrc`/`naturalWidth`, iframe `src`
  - request hosts with old/new-ref counts
  - console errors
  - CDP `Network.responseReceived` timings for Supabase. Resource Timing phases read 0 because there's no `Timing-Allow-Origin`.
  - LCP element and time
- **`diff.mjs`:** normalises the ref, bundle hash, key type, `lastmod`, `x-vercel-*`, `date`/`age`/`etag`/`last-modified`, and ranks. Compares performance by threshold. Knows which layers each environment supports.
- **Exit codes:** 0 equal, 1 different, 3 drift.

---

## Appendix C: test matrix

### C.0 Layout and guards

```
playwright.config.ts   baseURL=$BASE_URL (required); timezoneId Europe/Helsinki; locale fi-FI;
                       projects: desktop-chromium, mobile = devices['Pixel 7'] (Chromium; iPhone presets need WebKit, not installed)
                       workers: 1 for @cms-write; no global extraHTTPHeaders
e2e/global-setup.ts    bypass cookie for the preview origin only; resolve targetRef (bundle + sb-project-ref) and prodRef;
                       EXPECTED_SUPABASE_REF / FORBIDDEN_SUPABASE_REF required (never derived from .env); log in test admin once → e2e/.auth
e2e/fixtures.ts        network recorder; console collector + allowlist (lightwidget/youtube/spotify);
                       write-firewall: route **/*.supabase.co/** aborts non-GET unless the test is @cms-write
                       (auth token/logout allowed); ledger of created rows/objects → $STATE/ledger-<runId>.json; T0 clock
e2e/{public,seo,contact,cms,infra,migration}/*.spec.ts ; api/_lib/*.test.ts (vitest)
```

**`@cms-write` guard:**
- Runs only if `targetRef === NEW_REF && prodRef !== NEW_REF`.
- After GL, it refuses unless `ALLOW_PROD_WRITES=1`, and even then only `@prod-safe` tests run.
- `@mutates-real` tests never run after GL.

**Mail guard:** R5.

**Data classes:**
- **R**: read-only or intercepted.
- **T**: only `E2E-TESTI` rows and objects, cleaned by ledger.
- **D**: touches real content. Preview only. Restored by the X2 re-import, never by reverting through the UI (the UI can't reproduce `updated_at` or old URLs).

**Tiers:**
- **G**: gate. A failure blocks GL.
- **R**: regression. It must pass, unless it fails identically on BL1 (pre-existing) → fix list, or else follow-up.
- **K**: known pre-existing bug. Expected to fail until its FX fix lands; then it becomes R.

**Environments:** L / P / Prod / Direct (§4.4).

### C.1 Public site

| ID | Test | Expected | Env | Tier | Data |
|---|---|---|---|---|---|
| A1 | Project-ref isolation | Every page load: ≥ 1 request to `<new>`, 0 to the old ref. REST responses carry `sb-project-ref=<new>`. The bundle has exactly 1 Supabase host. Proves the publishable key works. | L,P,Prod | G | R |
| A2 | Every route renders from the DB | 6 routes: 200, no error text, skeletons gone. Counts = BL1 at T0 (keikat: 3 upcoming cards / 7 JSON-LD events; home 3 cards; galleria 5 + press kit; videos 8+2). The live-clock run: upcoming = REST count ≥ now. | L,P,Prod | G | R |
| A3 | Images | Every `<img>` has `naturalWidth>0` and uses the new ref. Hero CSS backgrounds (computed `background-image`) → 200. | L,Prod | G | R |
| A4 | Keikat | Upcoming ascending, past descending. "Näytä lisää". Grouped multi-date gigs. Ticket/event links `_blank` = DB. | L | R | R |
| A5 | Home | Gig cards → `/keikat#<id>` scrolls to the card. YouTube/Spotify/Lightwidget iframes present (third-party: soft). | L | K→R (FX6) | R |
| A6 | Galleria | Masonry per project viewport; "Näytä lisää"; lightbox open/next/prev/Esc with `src` on the new ref; press kit 3 photos; zip 200 `application/zip`, sha256 = BL1 (fetched from Node) | L | G | R |
| A7 | Bio | Credits sorted, featured video, 3 bio images; CV link on the new ref, 200 `application/pdf`, md5 = BL1 | L | G | R |
| A8 | Laulunopetus | DB content; booking CTA `…employee_id=1449` (external 200 is soft); pricing visibility = BL1; contact scroll | L | R | R |
| A9 | Bilebandi | Hero, YouTube `1IYiuMruQic`, booking form, mailto, no footer | L | R | R |
| A10 | Desktop nav | 6 links, active state, `#contact-section`, logo → `/` | L,Prod | R | R |
| A11 | Mobile menu | Open/close, aria, navigate closes it, scroll unlocks | L | R | R |
| A12 | Footer | Nav + social links; hidden on bilebandi and admin | L | R | R |
| A13 | External links | 2xx/3xx; social hosts report-only (LinkedIn 999, IG/FB 403/429) | Direct | R | R |
| A14 | 404 | Bogus path → HTTP 404, branded page, `noindex, follow`, no canonical, quick links work | P,Prod | G | R |
| A15 | Redirects | apex → www 308 (Prod only); `/keikat/` → `/keikat`; `/bilebandi-heidi-` → slug; `/bio/`, `//keikat` → clean; `/admin` + `/login` 200 + `X-Robots-Tag: noindex` | P,Prod | R | R |
| A16 | Console | No uncaught errors or failed first-party requests (allowlist third parties) | L,P,Prod | G | R |
| A17 | Repeatable captures | With the same T0, BL1 and BL2 give identical upcoming/past splits, JSON-LD and dates | L,P | G | R |
| A18 | Rendered text snapshot | Normalised `main` innerText of every route (all expanded) = BL1. Catches escaping, `\n`, ä/ö mojibake, order and timezone differences. | L,P | G | R |
| A19 | Backend down | Block REST 4 ways (abort; 503 HTML; 401 invalid key; 200 `[]`): every route shows the Finnish error/empty state within 15 s; header, nav and footer work; no blank route; heroes don't spin forever | L | K→R (FX9, FX10) | R |
| A20 | SEO head doesn't depend on the DB | REST delayed 8 s or aborted: `/galleria`, `/bio`, `/laulunopetus` keep their title, canonical and `og:url` at 0.5 s and at the end; `/bio` keeps its Person JSON-LD | L | K→R (FX10) | R |
| A21 | Home → Keikat anchors | Every home fragment exists on `/keikat`, ids are unique, and the card is in view after clicking. Includes Home → Keikat → Back → click. | L | K→R (FX6) | R |
| A22 | Upcoming/past boundary and DST | Clock 1 min before/after `2026-09-25T16:00Z` moves that gig (home, keikat, JSON-LD agree). Nov 17:00Z and Sep 16:00Z both show "klo 19:00". | L | R | R |
| A23 | Viewer timezone | With `timezoneId` UTC and America/Los_Angeles, `/` and `/keikat` still show Helsinki times | L | K→R (FX8) | R |
| A24 | Stored sessions | (a) A seeded old `sb-yctdrwog…-auth-token` → public pages the same, 0 old-ref requests. (b) Signed in as the test admin, public pages are the same through the `authenticated` SELECT. (c) A garbage unexpired new token → record the behaviour. | L,Prod | G | R |
| A25 | Open tab loses its backend | Loaded page, then REST aborted + focus refetch → the loaded content stays | L | K→R (FX9) | R |
| A26 | Media URL format | Every media URL in the DB is `/images/…` or `^https://<new>\.supabase\.co/storage/v1/object/public/(images\|gigs-images\|photo_sets_images\|documents)/[A-Za-z0-9._/-]+$` | Direct | G | R |
| A27 | JSON shape contract | `content` is an object and `photos` is an array. Required keys per `src/types/content.ts`. Numeric width/height > 0, with natural aspect ±2%. | Direct+L | G | R |
| A28 | order_index ties | No ties within a video section or among non-press-kit sets. Rendered order = BL1 **by id**. | Direct+L | G | R |
| A29 | Download behaviour | "Lataa kuva", zip and CV: navigate vs download, `Content-Type` and `Content-Disposition` = BL1 | L | R | R |
| A30 | Head after SPA navigation | Through header links both ways: 1 canonical matching the path; JSON-LD only for the current page; no duplicate Lightwidget script | L,Prod | G | R |
| A31 | Paragraphs | `/bio` intro renders one `<p>` per DB block; `/laulunopetus` blocks = the `split("\n\n")` count | L | K→R (FX7) | R |
| A32 | REST output format | Timestamps (`+00:00`, precision), `content-profile`, and `Content-Range` behave the same on both projects | Direct | G | R |
| A33 | Storage egress per visit | Cold-cache bytes per route from new storage (desktop and mobile). Record it (input for D1). | L | R (record) | R |
| A34 | Bypass header scoped | The bypass header or cookie is on 0 requests to Supabase or third parties; no added CORS preflights | P | G | R |
| A35 | Hard-loaded deep link | `/keikat#<id>` loaded directly scrolls to the card once the data arrives | L | K→R (FX6) | R |
| A36 | YouTube ID parsing | `youtu.be/ID?si=`, `watch?v=ID&t=`, `m.youtube.com`, `shorts/ID`, `live/ID`, `feature=share&v=` | vitest | R (follow-up if failing) | R |

### C.2 CMS (all writes: preview/L on the NEW DB, test admin; after GL only `@prod-safe`)

**Rules that apply to every write test:**
- **Assert the database, not the toast.** Re-read over anon REST, or with a checksum.
- Never log out with Heidi's account: `signOut` is global.

| ID | Test | Expected | Env | Tier | Data |
|---|---|---|---|---|---|
| B1 | Auth guard | `/admin` without a session → `/login`; `/login` with a session → `/admin` | L,Prod | G | R |
| B2 | Login | Wrong password → error toast; correct → `/admin`, all 6 tabs load from the new ref | L | G | R |
| B3 | Logout | Toast → `/login`; `sb-<new>-auth-token` removed (test admin only) | L,Prod | G | R |
| B4 | Real admin account | Heidi's recreated account logs in on L (password from `.env.local`); read-only | L | G | R |
| B5 | Signup/anonymous blocked | Settings `disable_signup:true` first, then signup → `signup_disabled`; `{}` → rejected; OTP with `create_user` → rejected | Direct | G | R |
| B6 | Gig: create | Title `E2E-TESTI-<runId>`, 2 performances **tomorrow** (home shows only 3 cards, so no far-future dates), image upload, all optional fields filled. Grouped on `/keikat` and home; image on the new ref; in the JSON-LD. | L | G | T |
| B7 | Gig: edit/delete | Edit the title and replace the image → public page updates. Delete **both** performance rows → gone. | L | G | T |
| B8 | Videos | One per section; embeds render; reorder by **keyboard** (focus handle, Space, ArrowDown, Space); persists after reload; delete. Never touch `is_featured` here. | L | G | T (real ranks rewritten) |
| B9 | Photo set | Create with 2 uploads, reorder photos, reorder sets, edit, delete. Galleria reflects each step. Never create a press kit here. | L | G | T/D |
| B10 | Press kit zip | Replace the zip → new URL 200. Restored by X2 re-import. The real zip file is never deleted. | L | G | D |
| B11 | Bio `page_content` | Edit a text and an image → `/bio` updates (restored by X2) | L | G | D |
| B12 | CV upsert | Test PDF: same path, md5 changes; record `cache-control` and the stale window. Restored by the copy script (always re-copies the CV) **≥ 1 h before 8.3**, and the CV md5 is checked through the new public URL at 8.3. | L | G | D |
| B13 | Page images | Keikat hero (single) and bio hero (dual) replaced → pages update (restored by X2) | L | G | D |
| B14 | Laulunopetus | Toggle `pricingVisible` → prices gone from the page **and** the JSON-LD; edit the CTA (restored by X2) | L | G | D |
| B15 | Cleanup | Delete ledger objects by exact key (never by folder listing); sweep `E2E-TESTI-%` rows plus the recorded video ids (music videos have no title); re-run X2 + rewrite → Q4 = `q4-post-import`; `--report-extras` = 0 | Direct | G | — |
| B16 | Prod CMS smoke | Test admin on Prod opens every tab, **no writes**, logs out | Prod | G | R |
| B17 | Token refresh while editing | Fast-forward the clock 65 min, save → refresh 200 before the PATCH; the DB row changed | L | G | T |
| B18 | Refresh fails mid-edit | Corrupt the refresh token → error or redirect, row unchanged. Record whether the UI falsely shows "Onnistui!". | L | K→R (FX11) | T |
| B19 | Logout spreads | Logout in tab B redirects tab A within about 1 s; a second context is redirected at its next refresh | L | R | R |
| B20 | Stale tab across cutover | A `/keikat` tab opened before GL keeps using the old ref after GL. Documents why 8.1 is needed. | Prod | R (record) | R |
| B21 | Lovable write freeze holds | Q4 on Lovable at +1 h / +24 h / before Pause = `q4-final` | Direct | G (POST) | R |
| B22 | Silent writes and upsert rights | Anon PATCH/DELETE → 2xx `[]`, row unchanged; test admin upserts `bio` with identical content (no `updated_at`) → 2xx, md5 unchanged; the same as anon → rejected | Direct | G | T/R |
| B23 | Write paths show errors | `route.fulfill` 403 `42501` / 413 / 500 for every write and upload path → red toast, dialog stays open, no "Onnistui!" | L | K→R (FX11, FX12) | R |
| B24 | Edit a gig with NULL optional fields | Empty event page and organizer → edit only the title → saves | L | K→R (FX4) | T |
| B25 | Copy a gig | "Kopioi keikka": new row and `gig_group_id`, same `image_url`, date today 19:00, original unchanged; Teatteri copies as Teatteri | L | R | T |
| B26 | Performance groups | Editing the 2nd performance changes only that row; deleting one leaves 1 date | L | R | T |
| B27 | Gig validation | No performances; time field `2`→`02:00`, `25`→`23`; deselecting a day; minimum lengths; `www.x.fi` → "Anna kelvollinen URL."; no image → toast and no request | L | R | R |
| B28 | Gig timezone | Helsinki context: 19:00 winter → `17:00Z`, summer → `16:00Z`; `/keikat` + JSON-LD show 19:00 | L | G | T |
| B29 | Image file edge cases | `Kesä keikka ä ö.JPG` → `public/<uuid>.JPG` `image/jpeg`; HEIC → record (follow-up); no extension; 55 MB → "Virhe prosessissa" toast, no row; record the global upload limit | L | R | T |
| B30 | Upload ok, insert fails | Forced failure after upload → toast, no row, 1 orphan (ledger-deleted); gallery 2nd-of-3 upload fails → progress toast doesn't stick | L | R | T |
| B31 | Public page fresh in the same session | After a CMS edit, header "Keikat" (no reload) shows the new title | L | R | T |
| B32 | Featured video | Adding a new featured music video → exactly 1 featured | L | follow-up (record) | D |
| B33 | Video URLs and required fields | Muut videot title/description required; `youtu.be`, `watch?v=&t=`, `m.youtube.com` embed; `shorts/`, `feature=shared&v=` and `abc` → record (follow-up) | L | R/record | T |
| B34 | Order after delete and add | Per section, `order_index` 0..k-1 with no duplicates; real videos keep their BL1 ranks | L | R | T |
| B35 | Creating a press kit | The exact AddPhotoSetForm press-kit payload inserts (no 23502). UI variant on the preview only. | Direct/L | K→R (FX3) | D |
| B36 | Gallery validation gaps | Empty alts, zero photos, HEIC 1×1 → record | L | follow-up (record) | T |
| B37 | Duplicate order_index | Create T1+T2, delete T1, create T3 → record whether ranks collide | L | follow-up (record) | T |
| B38 | When photo edits are saved | Drag + cancel → DB unchanged; drag + Tallenna → saved; remove photo → gone from `/galleria` | L | R | T/D |
| B39 | Bio validation/transform | `youtu.be/ID` → saved as `/embed/ID`; Vimeo → Finnish error; empty year → error; intro < 10 → error | L | R | R |
| B40 | Credit delete with another field invalid | Record the double "Poistettu!" and no save | L | follow-up (record) | D |
| B41 | CV upload fails / owner NULL | Forced failure → toast, bio unchanged; normal path overwrites the copy-script object (owner NULL) → 200 | L | G | R/D |
| B42 | Home hero | Choose a file and alt → the home hero updates | L | K→R (FX5) | D |
| B43 | Dual uploader | Formats (GIF/HEIC rejected), double-click, reset → record; FX12 disables during upload | L | R | D |
| B44 | Concurrent edits | Two tabs, last save wins across the whole document → record (follow-up) | L | follow-up (record) | D |
| B45 | Laulunopetus hidden errors | Deleting the last tier while visible → record (follow-up) | L | follow-up (record) | D |
| B46 | Free-text price in the JSON-LD | `alk. 40 €` → record the JSON-LD price (follow-up) | L | follow-up (record) | D |

**Ticket fields.** These run **after the horizon** (§16), on Prod with `PA_PROD_TEST_WRITES` and the test admin recreated for the run. They're also pre-checked on L at §10 with the flag flipped **in the working tree only, never committed**.

| ID | Test | Expected |
|---|---|---|
| G1 | Fields show | Add/edit dialogs show "Lipun hinta alkaen (€)" and "Kesto (min)", both optional |
| G2 | Validation | `25e`, `-5`, `1,234` rejected; `0`/`abc` rejected for duration; `24,90` and `0` accepted |
| G3 | Round-trip | 2 performances, `24,90` + `150` → both rows 24.90/150; reopening shows `24,9` (or `24,90` if the fix is taken) and `150`; clearing → NULL |
| G4 | Existing gigs | Edit without touching the fields → saves, still NULL |
| G5 | JSON-LD | `offers.price 24.9`, `priceCurrency EUR`, `endDate = start + 150 min`; `0` → `isAccessibleForFree`; none → no price, `+2 h` |
| G6 | Google | Rich Results Test 0 errors; GSC Events → Validate fix; watch 2 weeks |
| G7 | Price overflow | `1000000` → Finnish error in the browser, or at least no partial insert (atomic) |
| G8 | Copy and group edit | A copy carries price and duration; editing one performance changes only that row |
| G9 | Offers without a ticket link | `offers.url` = `event_page_url`, else `/keikat`; `0,5` → 0.5 |
| G10 | Old gigs unchanged | JSON-LD for NULL gigs = BL3 |
| G11 | Stale tab | A tab loaded before the flag deploy saves without sending the fields; a price set elsewhere is kept |

### C.3 Contact forms and API (preview mail guard: R5)

| ID | Test | Expected | Env | Tier |
|---|---|---|---|---|
| C1 | Contact validation | Empty form / > 1000 characters → Finnish errors; no request (auto-fixture stub fails the test if `/api/send-email` is hit) | L | R |
| C2 | Booking validation | Name/phone/email/date/message rules show errors; no request | L | R |
| C3 | API contract | Missing fields → 400; bad `formType` → 400; GET → 405; OPTIONS → 200. Needs `BREVO_API_KEY` in Preview (the key is checked before validation). | P | R |
| C4 | Honeypot UI | Hidden, `tabIndex=-1`, aria-hidden wrapper; payload `website:""`, `elapsedMs>0` (intercepted) | L | R |
| C5 | Spam path | Pre-flight `assessSpam(payload)==='spam'`, then POST with the honeypot → 200; arrives in simeliusweb@ (Gmail AGENT-BR `in:anywhere E2E-TESTI-<runId>`) and/or Vercel logs; Brevo API negative check: nothing to Heidi | P | G |
| C6 | assessSpam unit | Pinned verdicts (C16) | vitest | R |
| C7 | Real delivery | One marked mail on Prod; Heidi confirms; Reply-To = the sender | Prod (owner) | G (POST) |
| C8 | Validation matrix | Every 400 path in `send-email.ts:50-110`; exact limits 100/255/2000 → 200 (honeypot only); PUT/DELETE/PATCH → 405 | P | R |
| C9 | Body formats | Invalid JSON → record 500 (follow-up: 400); `text/plain` → 400; urlencoded → record (follow-up: 415) | P | record |
| C10 | CORS | `Origin: evil.example` → no ACAO header; CORS keys in the JSON body → record | P,Prod | record |
| C11 | HTML escaping in mail | `<img onerror>`, `"><script>`, `&amp;`, `javascript:`, newlines → entities in "Show original", nothing remote loads | P (tech inbox) | R |
| C12 | Header injection and Reply-To | `\r\nBcc:` in the name → one message, no extra headers; booking Reply-To `"Name" <addr>` safe with `" , < ä`; extra to/cc/bcc keys ignored | P (tech inbox) | R |
| C13 | Brevo failure UX | Mocked 500 JSON → Finnish toast with a fallback address and the form kept; mocked 502 HTML → no SyntaxError text; `--env BREVO_API_KEY=invalid` → 500 in < 5 s, sanitised logs | L,P | K→R (FX13) |
| C14 | Double submit | Double-click + 2 s mock → one request, pending state | L | K→R (FX13) |
| C15 | Booking client rules | Two-space name, 2001-char message, 101-char name → blocked on the client in Finnish | L | K→R (FX13) |
| C16 | Pinned spam verdicts | **ham:** Finnish/Nordic names (Äijälä, Pääkkönen-Öhman, Sjöström-Åkerblom), mixed case, Cyrillic/CJK/Vietnamese, "Moi", `HÄÄKEIKKA KESÄKUUSSA`, emoji, 3 URLs, SEO pitch without timing. **suspect:** fast + 3-dot gmail, pasted order code. **spam:** fast + 3 URLs, fast + 4-dot gmail, the bot sample. | vitest | R |
| C17 | Honeypot/timer tampering | Honeypot as a number → record; `"   "` → not flagged; `elapsedMs` missing/string/negative/`1e12` → no fast signal | vitest | R |
| C18 | Autofill never fills the honeypot | Chrome autofill → `website:""` | L (+ manual for password managers) | R |
| C19 | Field size limits | 100 KB phone/location → record (follow-up); body > 4.5 MB → non-JSON 413 handled (C13b) | P | record |
| C20 | Rate limit | Follow-up (§17) | — | — |
| C21 | Mail authentication | On the C7 mail: DKIM pass `d=heidisimelius.fi`, DMARC pass, From `heidi@heidisimelius.fi`; SPF none is known | Prod (owner/AGENT-BR) | R (POST) |
| C22 | Preview never mails Heidi | The suite guard refuses any non-honeypot POST that could pass validation | suite | G |
| C23 | Helper module not a route | `GET /api/_lib/spamCheck` → 404 | P,Prod | R |

### C.4 SEO / GEO / accessibility

| ID | Test | Expected | Env | Tier |
|---|---|---|---|---|
| D1 | Static meta | Per route, BL1 ≡ BL2 ≡ BL3: title, description, canonical, og/twitter, robots; also checked against `metadata.ts` | P,Prod | G |
| D2 | Rendered head | 1 canonical, 1 description, no duplicate Helmet tags | L,P,Prod | G |
| D3 | JSON-LD | `/keikat` Events = BL1 at T0 (normalised ref); each `image` 200; Service and Person unchanged | L,P,Prod | G |
| D4 | Rich Results Test / validator | 0 errors, warnings no worse than BL0 | Prod (AGENT-BR, best effort) | follow-up |
| D5 | Sitemap and robots | 6 `<loc>` (`lastmod` ignored), each 200 with no redirect and self-canonical; robots = the **built** output (`dist/robots.txt`), not `public/robots.txt` | P,Prod | G |
| D6 | Social previews | Debuggers for `/` and `/laulunopetus` | Prod (best effort) | follow-up |
| D7 | GSC | URL Inspection live test for `/`, `/keikat`, `/galleria`; Coverage + Events for 2 weeks | Prod (AGENT-BR) | follow-up |
| D8 | Crawler UAs | 18 UAs (Googlebot desktop/mobile, bingbot, GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, PerplexityBot, CCBot, Applebot, meta-externalagent, facebookexternalhit, WhatsApp, LinkedInBot, Slackbot, Bytespider, python-requests, empty) × 6 routes + bogus: status and body sha256 = BL0 | Prod | G (POST) |
| D9 | JSON-LD lint | Block counts per route (`/` 0, `/bio` 1 Person, `/keikat` 1 array of N Events, `/galleria` 0, bilebandi 1 MusicGroup, `/laulunopetus` 1 Service, 404 0); required Event fields; no null or empty strings; https URLs; `offers.validFrom` = `created_at` | L,P,Prod | G |
| D10 | Timezone correctness | Helsinki context: 19:00 for all upcoming; JSON-LD `startDate` = REST; a UTC context gives byte-identical JSON-LD | L,Prod | G |
| D11 | Image header parity | Event images + heroes: GET 200, `content-type`, `x-robots-tag`, ACAO = BL1 | Direct | G |
| D12 | New host crawlable | `<new>.supabase.co/robots.txt` 404 or no Disallow on `/rest/`, `/storage/`; Googlebot UA gets 200 on REST and storage | Direct | G |
| D13 | Degraded backend | REST aborted: `/keikat` and `/` show the error state, title/canonical intact, JSON-LD absent or `[]` (never half-built). POST: a daily check that rendered Events = REST upcoming for 14 days. | L (+follow-up) | K→R (FX9, FX10) |
| D14 | Head hygiene in SPA navigation | `/`→`/keikat`→`/bio`→`/keikat`→bogus: D9 counts hold; 1 canonical (0 on 404); `og:url` = canonical | L | G |
| D15 | Accessibility of DB media | axe (`image-alt`, `html-has-lang`, `document-title`, `heading-order`, `link-name`, `frame-title`): no violations beyond BL1; every Supabase `<img>` alt = its DB value; no mojibake | L | R |

### C.5 Infrastructure and security

| ID | Test | Expected | Env | Tier |
|---|---|---|---|---|
| E1 | keep-db-alive | `Bearer $CRON_SECRET` → 200 "Pinged Supabase" against the target project; no header → 401 | P,Prod | G |
| E2 | Env scopes | Names and targets only; Production = new at §12; Preview = new after 14.5; the bundle is the proof | Direct | G |
| E3 | No old URLs | 0 old ref in the 4 tables (A.4 + REST); the 54 objects on the new host with the same size and type | Direct | G |
| E4 | RLS lockdown | anon INSERT → 401/42501; UPDATE/DELETE → 2xx `[]` with an unchanged re-read; storage anon upload/upsert → 4xx; anon delete → object unchanged | Direct | G |
| E5 | Auth config | `GET /v1/projects/$NEW_REF/config/auth` = 2B.1 | Direct | G |
| E6 | Storage headers | **Ranged GET** `cache-control: max-age=3600` on both projects (HEAD always says `no-cache`) | Direct | G |
| E7 | Old-project independence | No requests from www to the old ref; 0 old URLs; old DB still reachable during the fallback window | Prod | follow-up (day 1) |
| E8 | keep-alive auth matrix | No header / wrong bearer / `CRON_SECRET` unset → 401 (fail closed, FX1); correct → 200 | P,Prod | G |
| E9 | keep-alive failure paths | Wrong URL (`--env`) → 500; missing anon grant → 500 | P | R |
| E10 | Cron cadence | `vercel.json` `0 12 * * *` (FX1); ≥ 1 successful run in the log within 24 h | Prod | follow-up |
| E11 | Missed-run alert | healthchecks.io-style ping after success (`HEALTHCHECK_URL`), 1 d period, 1 d grace; a paused check alerts simeliusweb@ | Prod | follow-up |
| E12 | RLS matrix | 4 tables × anon/test-admin/secret × S/I/U/D/upsert; RLS on; policies as intended (D-SEC); a JWT from the old project → 401 | Direct | G |
| E13 | Storage matrix | 4 buckets × anon/test-admin × get/list/upload/upsert/delete/move/create-bucket | Direct | G |
| E14 | Auth settings | `/auth/v1/settings` = expected; OTP `create_user` rejected; `password_min_length` as set | Direct | G |
| E15 | Data API surface | `GET /rest/v1/` with the publishable key → 401; only `public` exposed; pg_graphql off; no unexpected RPCs | Direct | G |
| E16 | Secret leak scan | Every bundle chunk (P, Prod): 0 `sb_secret_`, 0 `xkeysib-`, 0 CRON value; every JWT decodes to `role: anon`; `.js.map` 404; `git log -p -S sb_secret_` = 0 | P,Prod,repo | G |
| E17 | Sensitive files not served | `/.env`, `/.env.local`, `/.env.example`, `/.git/config`, `/package.json`, `/vercel.json`, `/supabase/config.toml`, `/scripts/migration/lib.mjs` → 404; the deployment Source view has no `.env*` | P,Prod | G |
| E18 | Security headers baseline | Headers on `/`, `/admin`, `/login`, `/api/*` = BL1; any CSP includes the new host | P,Prod | G |
| E19 | Advisors | Security + performance: 0 ERROR; only the allow-listed WARNs (B.6) | Direct | G |
| E20 | Env vars per scope | VITE pair per scope; `CRON_SECRET` Prod (+Preview) and Sensitive; no `*SERVICE_ROLE*`/`sb_secret_`; no `VITE_` on any secret | Direct | G |
| E21 | Build install | BL2 and BL3 build logs: installer = npm (D-LOCK); supabase-js/Brevo versions = `package-lock.json` | P,Prod | G |
| E22 | Restore drill | Newest dump → scratch PG17 or a throwaway project; Q4 = live; storage manifest = `--verify-only`; record the duration | — | follow-up |
| E23 | Usage and egress | Day 7 and 30: < 50% of the plan limits projected | Prod | follow-up |
| E24 | User gate | `admin/users` = exactly the expected emails at 2B.2, 2B.7, 8.5 and 14.6 | Direct | G |

### C.6 Performance

| ID | Test | Expected | Env | Tier |
|---|---|---|---|---|
| F1 | Supabase latency | CDP timings (not Resource Timing) for REST and storage on `/` and `/galleria`: BL2 ≤ BL1 + 100 ms, measured from the same machine | L | R |
| F2 | Lighthouse | Prod BL0 vs Prod BL3, mobile, median of 3 on `/` and `/galleria`: LCP ≤ BL0 × 1.1; CLS unchanged. `npx lighthouse@13.5.0 … --chrome-flags="--headless=new"`. | Prod | R (POST) |
| F3 | Field data | PSI API (CrUX) day 28 | Prod | follow-up |
| F4 | Bundle budget | Brotli size of the main chunk ≤ BL1 × 1.05; 1 Supabase host; `sb_publishable_` on BL2/BL3 | P,Prod | G |
| F5 | LCP chain | 6 routes, Slow 4G + 4× CPU: same LCP element as BL1; warm ≤ BL1 × 1.1; cold (new-host MISS) recorded, ≤ BL1 × 1.3. Run cold **before** `--verify-only` warms the edge. | L | R |
| F6 | CLS with late data | 0 ms and 1500 ms REST delay: ≤ 0.1 and ≤ BL1 + 0.02; the 34 photo width/height numbers = natural size | L | R |
| F7 | Returning visitor | A persistent context primed on Prod before GL → after GL: new bundle, only the new ref, HTML `max-age=0, must-revalidate` | Prod | G (POST) |
| F8 | Stale host hints | No preconnect/dns-prefetch/preload/CSP naming a Supabase host other than the build's | P,Prod | G |

---

## Appendix D: bugs found by the audits

**FX = on the fix list** (D-FIX, fixed in §8 2C with the listed test). **FU = follow-up** (reported, not fixed in the flow).

| ID | Bug | Where | Impact | Plan |
|---|---|---|---|---|
| FX1 | Keep-alive fails open when `CRON_SECRET` is unset; the cron runs every 5 days (one missed run leaves a 6–10-day gap; 195 of 235 possible single misses exceed 7 days) | `api/keep-db-alive.ts:15-18`, `vercel.json:21-24` | Free project can pause | 401 when unset; don't return upstream error text; `0 12 * * *` (E8, E10) |
| FX2 | CLI deploys upload `.env`/`dist` | repo root | wrong-DB rehearsal, `.env` exposed in Source view | `.vercelignore` + `.gitignore` (E17) |
| FX3 | Press kit insert sends `order_index: null` into NOT NULL | `AddPhotoSetForm.tsx:280` | a deleted press kit can't be recreated; orphaned uploads | use the next index (B35) |
| FX4 | Gigs with NULL `event_page_url`/`organizer_*` fail zod on edit/copy (8 of 41 gigs) | `EditGigForm.tsx:60-75,103-109`, `AddGigForm.tsx:62-77,121-125` | those gigs can't be edited | accept null/"" → NULL (B24) |
| FX5 | Home hero uploader blocked by a hidden required `photographer_name` | `SingleImageUploader.tsx:37-39,176`, `ImageManager.tsx:210-216` | home hero can't be updated | make it optional when hidden (B42) |
| FX6 | Home card slug ≠ `/keikat` anchor id; duplicate ids for same-title groups; hard-loaded hash doesn't scroll | `HomePage.tsx:191-195`, `KeikatPage.tsx:252-256,321-325` | "Häikäisevän kirkas" and Ruuhkavuosi cards don't scroll | one shared slug util with a unique suffix (group id/date); scroll after data (A5, A21, A35) |
| FX7 | Bio intro split on a literal `\n` instead of a real newline | `BioPage.tsx:281` | paragraphs merged | split on real newlines (A31) |
| FX8 | Times formatted in the viewer's timezone | `HomePage.tsx:187-188`, `KeikatPage.tsx:112-113,121-124,389` | visitors abroad and Google's renderer see the wrong time | `Intl.DateTimeFormat('fi-FI',{timeZone:'Europe/Helsinki'})` (A23, D10) |
| FX9 | `error` checked before `data`: a failed refetch replaces good content; heroes spin forever when `page_images` fails | `HomePage.tsx:178`, `KeikatPage.tsx:234,303,373`, `GalleriaPage.tsx:234`, `BioPage.tsx:268`, `HeroImageAndText.tsx:70`, `useImagePreload.ts:7` | blank or stuck pages during backend hiccups | data-first rendering; hero fallback (A19, A25) |
| FX10 | PageMeta/StructuredData render only after the loading/error early returns | `GalleriaPage.tsx:201-268`, `BioPage.tsx:222-313`, `LaulunopetusPage.tsx:40-161` | canonical/title/Person JSON-LD lost while slow | render the head before the early returns (A20, D13) |
| FX11 | CMS updates/deletes never check the affected-row count | `EditGigForm.tsx:116-120`, `GigsManager.tsx:86-87`, `VideosManager.tsx:91-95`, `GalleryManager.tsx:85-89`, others | a policy or session problem looks like success (migration-relevant) | `.select()` + error on 0 rows (B18, B23) |
| FX12 | ImageManager swallows errors; no pending state | `ImageManager.tsx:49-188,215` | silent failures, double uploads | toast + disable (B23, B43) |
| FX13 | Contact/booking: no pending state (double send); English/raw errors; booking schema has no trim/max | `Footer.tsx:98-114,228`, `BilebandiPage.tsx:38-44,85-101,535` | duplicate mails, confusing errors | disable while sending, Finnish fallback with an email address, trim/max (C13–C15) |
| FX14 | [D-SEC] any authenticated user can write | migrations | a stranger with an account can edit the site | claim-gated policies (E12) |
| FX15 | [D-LOCK] stale `bun.lockb` | repo root | the installer may resolve other versions | delete (E21) |
| FX16 | Gig cards ignore `image_alt` | `EventGroup`, `UpcomingGigCard`, `PastGigCard` | alt text lost | use `image_alt` (D15) |
| K-DATA | The 5 tour gigs each list all 5 venues/cities and one Helsinki ticket URL | DB content | each Event claims 5 cities | Heidi/owner fix in the CMS after the freeze (§16) |

**Follow-ups (FU, reported in the READY report, not fixed in the flow):**

| ID | Bug | Where |
|---|---|---|
| FU1 | A new featured video doesn't unfeature the others | `VideoForm.tsx:80-84,189` vs `:110-117`; `VideosSection.tsx:32` |
| FU2 | Gallery: alt texts never validated; zero-photo sets allowed; unreadable images stored as 1×1 | `AddPhotoSetForm.tsx:42-44,148-151,313,401`; `EditPhotoSetForm.tsx:296-301` |
| FU3 | Duplicate `order_index` after a gallery delete followed by an add | `GalleryManager.tsx:84-89`, `AddPhotoSetForm.tsx:263-268` |
| FU4 | Whole-document upserts lose concurrent edits (last save wins) | `ImageManager.tsx:112-119`, `BioManager.tsx:326`, `LaulunopetusManager.tsx:314` |
| FU5 | Any file type is accepted for images (HEIC etc.) | `storage.ts`; `accept="image/*"` in `AddPhotoSetForm.tsx:401`, `BioManager.tsx:998` |
| FU6 | Video URLs aren't validated; `shorts/`, `live/`, `feature=share&v=` produce broken embeds | `VideoForm.tsx:143-170`, `VideosManager.tsx:258-263`, `VideosSection.tsx:22-27` |
| FU7 | Laulunopetus errors on hidden/array fields never show, so save/delete silently do nothing | `LaulunopetusManager.tsx:56-57,111-121,420` |
| FU8 | Deleting a Bio credit says "Poistettu!" even when validation blocks the save, and saves other unsaved edits | `BioManager.tsx:554-602` |
| FU9 | Press-kit "zip required when photos change" rule never fires | `EditPhotoSetForm.tsx:317,339` |
| FU10 | Free-text Laulunopetus price leaks into the Service JSON-LD (`"alk. 40"`) | `LaulunopetusPage.tsx:114`, `LaulunopetusManager.tsx:77` |
| FU11 | Ticket price: no upper bound for `numeric(8,2)`; edit shows `24,9` | `gigTicketFieldsSchema.ts:20,47` |
| FU12 | Gig type Select reads `defaultValue` at mount only (suspected mismatch on copy) | `AddGigForm.tsx:298-301`, `EditGigForm.tsx:253-256` |
| FU13 | Group gigs are edited and deleted one row at a time; switching admin tabs drops unsaved edits | `EditGigForm.tsx:116-119`, `GigsManager.tsx:86`, `AdminPage.tsx:60-77` |
| FU14 | `/api/send-email`: urlencoded bodies accepted (cross-site form posts); invalid JSON → 500; no length limits on phone/date/location/eventType; `includes("@")` email check; honeypot sent as a number skips the check; CORS headers put in the JSON body | `send-email.ts:6-10,63,86-106,319-351,364,408` |
| FU15 | No rate limiting on `/api/send-email` (spam still spends the Brevo quota) | `send-email.ts:317-432`, `vercel.json` |
| FU16 | Missing security headers (`X-Content-Type-Options`, `frame-ancestors`/XFO, Referrer-Policy); HSTS without `includeSubDomains` | `vercel.json` |
| FU17 | Hashed assets served `max-age=0, must-revalidate` | `vercel.json` |
| FU18 | `public/robots.txt` is overwritten by vite-plugin-sitemap at build time | `vite.config.ts` sitemap options |
| FU19 | `og:image` is a 1707×2560 portrait; no `og:site_name`/`og:locale`/image dimensions; 404 `og:url` points home | `index.html`, `metadata.ts` |
| FU20 | GEO: crawlers that don't run JS see no gigs, bio or JSON-LD; no `llms.txt`; home has no `<h1>`; Person/Event not linked by `@id` | prebuilt HTML, `HomePage.tsx` |
| FU21 | Event images carry `x-robots-tag: none` from Supabase storage | storage host; fix = `/media` proxy |
| FU22 | `download` attributes ignored cross-origin ("Lataa kuva", CV filename) | `GalleriaPage.tsx:348,360`, `BioPage.tsx:478` |
| FU23 | No ErrorBoundary: a malformed content JSON unmounts the whole app | `App.tsx`; e.g. `HeroImageAndText.tsx:81`, `LaulunopetusPage.tsx:217,224` |
| FU24 | `order(order_index)` without a tiebreaker | `HomePage.tsx:57`, `GalleriaPage.tsx:52,62` |
| FU25 | Form data is processed in a US function region (`iad1`) and the subject is logged | `send-email.ts:398`; Vercel function region |

---

## Appendix E: environment variables

| Var | Read by | When | Scopes | Change |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | `client.ts:5`, `keep-db-alive.ts:20` | build + runtime | Prod, Preview, Dev | new at §12 (Prod) and 14.5 (Preview/Dev) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `client.ts:6`, `keep-db-alive.ts:21` | build + runtime | same | `sb_publishable_…` |
| `VITE_SUPABASE_PROJECT_ID` | nothing | — | if present | delete after the horizon |
| `SUPABASE_FUNCTION_URL` | nothing (dead) | — | if present | delete after the horizon |
| `CRON_SECRET` | `keep-db-alive.ts:15` | runtime | Prod (+Preview) | unchanged; the preview gets a random one per deploy |
| `BREVO_API_KEY` | `send-email.ts:333` | runtime | Prod (+Preview for C3/C5) | unchanged |
| `HEALTHCHECK_URL` | keep-alive (follow-up E11) | runtime | Prod | new (follow-up) |
