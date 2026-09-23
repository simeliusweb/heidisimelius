# E2E suite (docs/supabase-migration-plan.md, Appendix C)

Every test title carries its Appendix C id and tags:

- tier: `@gate` `@regression` `@known` (asserts the fixed behaviour of an FX item) `@record` (observation only)
- env: `@L` (local `vite preview`) `@P` (Vercel preview) `@prod` `@direct` (Supabase / Vercel APIs, any BASE_URL)
- data: `@read` `@test-rows` (E2E-TESTI rows, ledgered) `@mutates-real` (real content on the NEW DB before GL; restored by the X2 re-import in B15)
- extra: `@cms-write` `@prod-safe` `@smoke` `@mobile` `@post` (prod after GL only) `@cleanup` (B15)

A test outside its environments skips itself. Secrets come from `~/.heidisimelius-migration` (never the repo).
`EXPECTED_SUPABASE_REF` / `FORBIDDEN_SUPABASE_REF` are required; global-setup refuses to run when the bundle
under test points anywhere else. `@cms-write` tests only run when the target is the new ref and production isn't
on it yet. Nothing may POST to `/api/send-email` unless the payload is invalid or honeypot spam (R5).

```bash
NEW=neqprqqhiifqemphpwhu OLD=yctdrwogilljanzxcgow

# L — local build of $SHA with the new values, served by `npx vite preview --port 4173 --strictPort`
BASE_URL=http://localhost:4173 EXPECTED_SUPABASE_REF=$NEW FORBIDDEN_SUPABASE_REF=$OLD \
  npx playwright test --grep-invert "@cms-write|@cleanup"            # read-only first
BASE_URL=http://localhost:4173 EXPECTED_SUPABASE_REF=$NEW FORBIDDEN_SUPABASE_REF=$OLD \
  npx playwright test e2e/cms --workers 1                              # CMS writes (test admin)
BASE_URL=http://localhost:4173 EXPECTED_SUPABASE_REF=$NEW FORBIDDEN_SUPABASE_REF=$OLD E2E_CLEANUP=1 \
  npx playwright test --grep @cleanup                                  # B15: ledger cleanup + X2 re-import + Q4

# P — CLI preview deploys (BL1 = old values, BL2 = new values); CRON_SECRET_TEST = the deploy's --env CRON_SECRET
BASE_URL=https://<bl2>.vercel.app EXPECTED_SUPABASE_REF=$NEW FORBIDDEN_SUPABASE_REF=$OLD CRON_SECRET_TEST=... \
  npx playwright test --grep "@P" --grep-invert "@cms-write"
#   optional: E8_UNSET_BASE_URL (preview without CRON_SECRET), E9_BASE_URL (preview with a wrong VITE_SUPABASE_URL)

# BL1 ≡ BL2 (A17/A18) and perf/header comparisons against a baseline
node scripts/migration/capture.mjs --label BL1 --base https://<bl1>.vercel.app
node scripts/migration/capture.mjs --label BL2 --base https://<bl2>.vercel.app
node scripts/migration/diff.mjs BL1 BL2                                # exit 0 equal / 1 different / 3 drift
DIFF_A=BL1 DIFF_B=BL2 BASE_URL=... npx playwright test e2e/migration/diff.spec.ts
BASELINE_DIR=~/.heidisimelius-migration/baselines/BL1 ...              # F1/F4/F5/E18 compare to it

# Prod before GL: F7-prime (returning-visitor profile); after GL: the POST suite
BASE_URL=https://www.heidisimelius.fi EXPECTED_SUPABASE_REF=$OLD FORBIDDEN_SUPABASE_REF=$NEW npx playwright test --grep F7-prime
BASE_URL=https://www.heidisimelius.fi EXPECTED_SUPABASE_REF=$NEW FORBIDDEN_SUPABASE_REF=$OLD \
  npx playwright test --grep "@prod" --grep-invert "@cms-write|@mutates-real|@pre-gl"

# Unit tests (C6/C16/C17 spam verdicts, A36 YouTube parsing, …)
npm run test:unit
```

`E2E_IGNORE_ENV=1` lets read-only tests run outside their environments (selector shake-out only).
