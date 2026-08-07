# Laulunopetus-sivu → Tampereen laulukoulu

**Status:** ✅ Implemented and verified locally on 2026-08-07. Not yet deployed.
**Date:** 2026-08-07

> Heidi's answers (7.8.2026) resolved the open questions in §5 — see §8 for what was
> actually built and how it differs from the original proposal.

---

## 1. Background — what Heidi asked for

> * laulunopesivulta täytyisi saada piiloon yksityisesti olevat hinnat, jotka on eri kuin laulukoulun hinnat
> * en haluaisi kuitenkaan poistaa tekstejä vaan piilottaa osa teksteistä ja muokata ylintä tekstiä siten, että Heidi on opena Tampereen laulukoululla. Oon siis pääasiassa siirtymässä pääasiassa opettamaan Tampereen laulukoululle

She is moving to teach primarily at [Tampereen laulukoulu](https://www.tampereenlaulukoulu.fi/opettajat).

She also mentioned (voice message) that **a good number of customers have come to her via this website** — so the existing funnel is proven and should be preserved, not dismantled.

---

## 2. The core problem: price conflict

| | heidisimelius.fi (current) | [Tampereen laulukoulu](https://www.tampereenlaulukoulu.fi/hinnasto) |
|---|---|---|
| Kokeilutunti 45 min | **40 €** | **65 €** |
| Yksittäinen tunti 45 min | **60 €** | **65 €** |
| 5 × 45 min sarjakortti | **280 €** | **310 €** |
| Yksittäinen tunti 60 min | — | 85 € |
| Lukukausi 17 × 45 min | — | 900 € |
| 10 × 45 min sarjakortti | — | 580 € |

Her own page undercuts her new employer by **~40 % on the trial lesson**. Two problems:

1. **Internally awkward** — she is publicly advertising cheaper lessons than the school she now teaches at.
2. **Funnel killer** — a lead books expecting 40 €, gets quoted 65 €, and bounces. A wrong price converts worse than no price.

**→ The private prices have to come off the page.**

---

## 3. Recommendation

### 3.1 Pricing — hide, don't delete

- Add a `pricingVisible` boolean to `LaulunopetusContent`, exposed as a toggle in the CMS.
- Data stays in `page_content`; she can flip it back on if she ever resumes private teaching.
- Precedent already exists in the codebase: `ctaVisible` on `BioContent` (`src/types/content.ts:41`).

### 3.2 Don't leave a price vacuum

In place of the hidden tier block, render one small line:

> *Opetan Tampereen laulukoululla. Hinnasto ja ajanvaraus: [tampereenlaulukoulu.fi/hinnasto](https://www.tampereenlaulukoulu.fi/hinnasto)*

Rationale: this is neither a price-free page nor a hard bounce to another site. It answers "what does this cost" honestly and **pre-qualifies the lead before they write to her** — better than having them contact her, hear 65 €, and disappear.

Make this text + link editable in the CMS.

### 3.3 ⚠️ Structured data must be fixed too — do not miss this

`src/pages/LaulunopetusPage.tsx:99-107` builds JSON-LD `Service.offers` directly from `content.pricingTiers`:

```ts
offers: content.pricingTiers.map((tier) => ({
  "@type": "Offer",
  price: tier.price.replace("€", "").replace(",", ".").trim(),
  ...
}))
```

If we only hide the visual block, **Google will keep serving 40 € in search results.** The `offers` array must be omitted from the schema whenever `pricingVisible` is false.

### 3.4 Keep the contact funnel — route it to the laulukoulu address

Heidi implied removing the booking functionality from her own page. **Recommendation: don't.** Replacing a converting funnel with a name on someone else's teacher grid (which offers only a phone number and an email link) is a downgrade — especially given she's confirmed the site brings in customers.

Instead: keep the page and the form, and route submissions from `/laulunopetus` to **heidi@tampereenlaulukoulu.fi**.

Implementation notes:

- The laulunopetus CTA buttons call `scrollToFooter()` and use the **shared site-wide `Footer` form** (`src/components/Footer.tsx`), not a page-specific one.
- `api/send-email.ts:12` has a single hardcoded `RECIPIENT_EMAIL = "simelius.heidi@gmail.com"` for the whole site — it cannot simply be swapped.
- Add a `laulunopetus` `formType` (the API already branches on `formType` for the Hot Stuff form) that routes to the laulukoulu address.
- **Send to both addresses during the transition** — work inbox primary, gmail secondary. Brevo's `to` accepts an array. Costs nothing and guarantees no lead is lost while the new inbox isn't yet part of her daily routine.

### 3.5 Text edits (her actual ask)

Current values are in Supabase `page_content` where `page_name = 'laulunopetus'`.

| Field | Current | Change |
|---|---|---|
| `tagline` | "Laulunopettaja Tampereen keskustassa" | → "Laulunopettaja Tampereen laulukoululla" |
| `introBodyParagraphs` ¶1 | "Tarjoan yksilöllistä pop/jazz-laulunopetusta Tampereen keskustassa rautatieaseman tuntumassa…" | Rewrite to place her at Tampereen laulukoulu |
| `backgroundParagraphs` ¶1 | "…sijaistanut mm. Pirkanmaan musiikkiopistossa, **Tampereen laulukoululla** sekä Tampereenseudun työväenopistossa." | Stale — she now teaches there. Update to present tense. |

### 3.6 Per-section visibility toggles in the CMS

Her wording — *"en haluaisi poistaa tekstejä vaan piilottaa"* — is literally asking for hide/show, not delete. Give her toggles for pricing, testimonials, and the background section so she can manage this herself without a developer.

---

## 4. SEO impact

Low risk, slightly positive.

- The page ranks on "laulunopetus Tampere" and converts; keeping it live is the whole point.
- Removing price tiers does not harm the ranking.
- Adding genuine "Tampereen laulukoulu" mentions and an outbound link to their hinnasto is a relevance signal, not a penalty.
- The **only** real SEO risk is §3.3 — stale 40 € pricing left in the JSON-LD.

---

## 5. Open questions for Heidi

*(Suomeksi, valmiina kopioitavaksi)*

1. **Sähköpostiosoite:** Onko `heidi@tampereenlaulukoulu.fi` oikea osoite, johon laulunopetussivun yhteydenottolomakkeen viestit ohjataan? Haluatko että ne menevät samalla myös omaan gmailiisi ainakin siirtymävaiheen ajan?

2. **Onko laulukoulu ok tämän kanssa?** Laulukoululla on oma ajanvarausjärjestelmä (asioi.fi). Jos yhteydenotot tulevat sinun sivusi lomakkeen kautta, ne ohittavat heidän varausjärjestelmänsä. Kannattaa varmistaa heiltä, ettei tämä ole ongelma — ei näytä siltä että kiertäisit heidän systeeminsä.

3. **Hinnat — kumpi tapa?**
   - **a)** Piilotetaan hinnat kokonaan ja tilalle rivi: *"Opetan Tampereen laulukoululla. Hinnasto ja ajanvaraus: tampereenlaulukoulu.fi/hinnasto"* **(suositus)**
   - **b)** Piilotetaan hinnat kokonaan, ei mitään tilalle.
   - **c)** Näytetään laulukoulun hinnat sivulla sellaisenaan (huono idea: pitää päivittää käsin joka kerta kun laulukoulu muuttaa hintojaan).

4. **"Piilottaa osa teksteistä" — mitkä tekstit hintojen lisäksi?** Mainitsit vain hinnat erikseen. Oma tulkintani on että hinnat ovat se varsinainen asia ja muu teksti voi jäädä — mutta kerro jos jotain muuta pitää piilottaa.

5. **Suositukset (testimonials):** Nykyiset suositukset viittaavat yksityisiin laulutunteihin ja "5x laulutuntipaketteihin". Pidetäänkö ne? (Oma näkemys: kyllä — ne ovat aitoja ja vakuuttavia, eikä paketin nimi ole ongelma.)

---

## 6. Implementation order (once answers are in)

1. CMS toggles + text edits + `pricingVisible` + replacement price line
2. JSON-LD `offers` fix (ships with step 1 — do not separate)
3. Email routing (`laulunopetus` formType → laulukoulu address) as a separate reviewable change

---

## 8. What was actually built (2026-08-07)

### Heidi's answers

| Question | Answer |
|---|---|
| Contact routing | *"On ok et muhun otetaan yhteyttä mut varaus tapahtuu laulukoulun kautta"* |
| First text block | *"Tarjoan yksilöllistä laulunopetusta Tampereen laulukoululla Hämeenpuistossa."* |
| Yellow CTA button | *"Varaa tunti Tampereen laulukoulun sivuilta"* + link there |
| Prices | *"Just hinnat piiloon"* |
| Other texts | *"Pitää vähän muuttaa muitakin tekstejä. Just kun opetus on eri paikassa myös"* |

### Deviations from the original proposal

- **§3.4 email routing was NOT implemented.** Heidi confirmed it is fine for people to
  contact her directly; only *booking* moves to the laulukoulu. So `api/send-email.ts`
  and `Footer.tsx` were left untouched and the form still goes to her gmail.
- **The location is Hämeenpuisto, not the railway station.** The old copy said
  "Tampereen keskustassa rautatieaseman tuntumassa" — the laulukoulu is in Hämeenpuisto.
- **Two CTAs now do different jobs:** the first (yellow) button links out to the
  laulukoulu for *booking*; the final button still scrolls to the contact form, which
  preserves the funnel that has been bringing in customers.

### Behaviour

- `pricingVisible: false` — the three private tiers (40 € / 60 € / 280 €) are hidden but
  **still stored** in `page_content`. Toggling "Näytä hinnasto sivulla" in the CMS brings
  them back, and the JSON-LD `offers` come back with them.
- A "Laulukoulu-osio" block renders where the pricing used to be, with editable title,
  text, and an add/remove list of links (hinnasto + ajanvaraus by default).
- CTA buttons take an optional URL. With a URL they open in a new tab (`target="_blank"`,
  `rel="noopener noreferrer"`); left empty they scroll to the contact form.

### Verified locally (Playwright, desktop 1440×900 + mobile 390×844)

- No 40 € / 60 € / 280 € anywhere in the rendered page **or** the JSON-LD.
- Toggling pricing on → prices and `offers` both return; off → both disappear.
- CMS save round-trip preserves every new field (no silent data loss).
- Final CTA still scrolls to the contact form; footer form intact.
- No horizontal overflow on mobile; links stack vertically. No console errors.
- `tsc --noEmit` clean, `npm run lint` 0 errors, `npm run build` succeeds.

### Not done / follow-ups

- **Not deployed** — changes are local + live Supabase content only.
- A backup of the pre-change `laulunopetus` content JSON is at
  `docs/laulunopetus-content-backup-2026-08-07.json`.

---

## 9. Follow-up fixes done in the same session

### 9.1 Duplicate `<meta name="description">` (site-wide)

`index.html` shipped a static description tag and `PageMeta` (react-helmet-async)
appended a second, so **every page carried two** and crawlers generally take the first —
meaning the per-page descriptions likely never applied.

Fix: added `data-rh="true"` to the static tag in `index.html`. react-helmet-async treats
any `meta[data-rh]` as its own and replaces it rather than appending
(`updateTags`, `react-helmet-async/lib/index.js:496`). The static content stays as the
site-wide fallback for crawlers that don't run JS.

Because Helmet removes tags it owns when a page renders none, `App.tsx` now renders a
default `<Helmet>` from `siteDefaultMeta` so routes without `PageMeta` (login, admin, 404)
still get a description. Page-level `PageMeta` overrides it by tag name.

Verified: every route (`/`, `/bio`, `/keikat`, `/galleria`, `/laulunopetus`,
`/bilebandi-…`, unknown route) has **exactly one** description with the correct per-page
content, in both dev and the production build.

> Still generic site-wide: `og:description` and `twitter:description` are static in
> `index.html` and are not set per page. Fixing that means adding them to `PageMeta`
> **and** marking the static og/twitter tags with `data-rh`, otherwise they duplicate the
> same way. Not done — separate task.

### 9.2 Branded 404 page

`NotFound.tsx` was still the default Vite scaffold (light grey, English, blue links).
Rebuilt on the site's design language: page gradient, Playfair `404` in gold, a Santorini
script line ("Hups, nyt meni ohi nuotin"), Finnish copy, a primary "Palaa etusivulle"
button and quick links to the main sections so a lost visitor still lands somewhere useful.

- Carries `noindex, follow`. Verified the tag **does not leak** to real pages on
  client-side navigation away from the 404.
- Keeps the existing `console.error` route logging.
- Santorini's flourishes overflow their line box, so the script line needs more vertical
  spacing than the measured box height implies — hence the explicit `mt-10 mb-4
  leading-loose`.
- Checked desktop 1440×900 and mobile 390×844; no horizontal overflow, links wrap cleanly.

### 9.3 `.env` untracked

`.env` was tracked and not in `.gitignore`. Ran `git rm --cached .env` (file kept on disk)
and added `.env` / `.env.*` to `.gitignore`, plus a committed `.env.example` template.

**The CMS password was never committed** — it existed only in the working tree. Git
history contains only `VITE_SUPABASE_*`, which are public by design (they ship in the
client bundle; RLS is what protects the data), so no history rewrite or key rotation is
needed. The staged deletion is not yet committed.

---

## 7. Files that will change

| File | Change |
|---|---|
| `src/types/content.ts` | Add `pricingVisible`, section visibility flags, laulukoulu link fields to `LaulunopetusContent` |
| `src/pages/LaulunopetusPage.tsx` | Conditional pricing block; conditional JSON-LD `offers`; laulukoulu link block; `laulunopetus` formType wiring |
| `src/components/admin/LaulunopetusManager.tsx` | Visibility toggles + new fields in the CMS form/zod schema |
| `src/components/Footer.tsx` | Pass a route-aware `formType` so `/laulunopetus` submissions are tagged |
| `api/send-email.ts` | `laulunopetus` formType branch → `heidi@tampereenlaulukoulu.fi` (+ gmail during transition) |
| Supabase `page_content` | Updated `laulunopetus` content JSON (via CMS at `/admin`) |
