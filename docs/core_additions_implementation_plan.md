# After Me — Core-Safe Additions: File Map & Implementation Plan

This document maps **marketing and UX additions** that strengthen After Me’s existing positioning (encrypted local vault, Family Kit / `.afterme`, recovery, lifetime pricing) **without** changing core cryptography, vault format, or adding server-side “message delivery to contacts.”

**Related context:** `docs/afterme_implementation_brief.docx` (full competitive brief); this plan implements only the **scoped subset** agreed for TITADE Ltd / After Me.

---

## 1. Scope

### In scope (core-safe)

| ID | Initiative | Nature |
|----|------------|--------|
| **A** | **Timing / “delivery layer” framing** | Copy: site hero, subheads, optional visual; app onboarding copy; Mailchimp sequences (configured in Mailchimp UI). |
| **B** | **Founder / business continuity** | New static landing page + nav/footer links; optional in-app “prompts” as static content only (no B2B admin). |
| **C** | **SEO content moat** | New/updated articles under `web/blog/`; `sitemap.xml`; internal links. |
| **D** | **Lifetime as trust signal** | Copy on web + paywall/settings; optional small UI badge for lifetime purchasers (cosmetic). **IAP already exists** (`PREMIUM_LIFETIME`). |
| **E** | **Thin “readiness” checklist** | In-app checklist (export/Family Kit/recovery sanity checks)—**no** email “preview to contacts.” |
| **F** | **Thin recipient / survivor UX** | Copy and step clarity in existing survivor import flow—**no** new hosted “memory space” product. |
| **G** | **Per-contact story (marketing only)** | Website/copy explaining organisation (categories, who should get the kit)—**not** different encrypted payloads per recipient (not supported today). |

### Explicitly out of scope

- Server-mediated “test email” to contacts, travel check-in mode, full Alcazar-style recipient platform, per-recipient document graphs in the vault (would require product/schema work).

---

## 2. File & asset checklist (by initiative)

Use this as a **developer checklist** when implementing. Paths are relative to the repo root.

### A — Timing / delivery-layer framing

| Task | Primary files / locations |
|------|---------------------------|
| Homepage hero & subhead | `web/index.html` (e.g. `.hero-headline`, `.hero-sub`; ~lines 618–619 area) |
| Optional “four tools” visual/table | `web/index.html` (new section + styles in `<style>` block or `web/styles.css`) |
| How it works alignment | `web/how-it-works.html` (intro sections) |
| App onboarding copy | `after-me-mobile/src/features/onboarding/OnboardingScreen1.tsx` … `OnboardingScreen6.tsx`, `OnboardingHowItWorksScreen.tsx`, `LegalDisclaimerScreen.tsx` |
| First-run welcome | `after-me-mobile/src/features/welcome/WelcomeScreen.tsx` |
| Help / FAQ alignment | `after-me-mobile/src/features/help/HelpScreen.tsx` |
| Post-download narrative | **Mailchimp** (automations for waitlist/signup — not in repo; URL configured in `web/index.html` → `MAILCHIMP_URL`) |

### B — Founder / business continuity landing

| Task | Primary files / locations |
|------|---------------------------|
| New page | `web/founders.html` (new; mirror structure/SEO pattern from `web/how-it-works.html`) |
| Sitemap | `web/sitemap.xml` (add URL + `lastmod`) |
| Global nav / footer | Every page with the shared nav/footer pattern, including at minimum: `web/index.html`, `web/how-it-works.html`, `web/support.html`, `web/privacy.html`, `web/terms.html`, `web/format-spec.html`, `web/blog/index.html`, `web/blog/*.html` |
| Optional: deep link from app | `after-me-mobile/src/features/help/HelpScreen.tsx` or `HelpSection.tsx` → `Linking.openURL('https://myafterme.co.uk/founders')` |
| “Template” as static content | Either a section on `web/founders.html` **or** a new static section in Help (same files as above) — **no** new vault schema |

### C — SEO content moat

| Task | Primary files / locations |
|------|---------------------------|
| New articles | `web/blog/<slug>.html` (follow existing article layout) |
| Blog index listing | `web/blog/index.html` (add cards/links for new posts) |
| Sitemap | `web/sitemap.xml` |
| Internal links | From `web/index.html`, relevant blog posts, `web/how-it-works.html` |
| Analytics / UTM | Document UTM convention in deployment docs; `docs/vercel_deployment_guide.md` if needed |

### D — Lifetime trust signal

| Task | Primary files / locations |
|------|---------------------------|
| Product IDs & copy constants | `after-me-mobile/src/constants/products.ts` (`PREMIUM_FEATURES_LIFETIME`, display strings) |
| Paywall | `after-me-mobile/src/features/paywall/PaywallScreen.tsx` |
| Subscription settings | `after-me-mobile/src/features/settings/sections/SubscriptionSection.tsx`, `after-me-mobile/src/features/settings/SettingsScreen.tsx` |
| Purchase logic | `after-me-mobile/src/context/PurchaseContext.tsx`, `after-me-mobile/src/services/PurchaseService.ts` (only if behaviour change—usually **not** needed for copy) |
| Website pricing story | `web/index.html` (schema `offers` in JSON-LD, body copy), `web/support.html` if FAQ mentions pricing |
| Optional “Lifetime” badge | `SubscriptionSection.tsx` or profile row in `SettingsScreen.tsx` — **UI only** |

### E — Thin readiness checklist (no server preview)

| Task | Primary files / locations |
|------|---------------------------|
| New UI component | e.g. `after-me-mobile/src/features/dashboard/ReadinessChecklistCard.tsx` (new) **or** section inside `VaultDashboardScreen.tsx` |
| Family Kit entry | `after-me-mobile/src/features/familykit/FamilyKitTab.tsx`, `KitCreationWizard.tsx` (link or banner to checklist) |
| Strings / analytics | `after-me-mobile/src/services/AnalyticsService.ts` (optional events for completed checklist items) |

### F — Thin survivor / recipient UX

| Task | Primary files / locations |
|------|---------------------------|
| Survivor flow copy & steps | `after-me-mobile/src/features/survivor/SurvivorImportScreen.tsx` |
| Supporting web context | `web/support.html` (bereavement/support copy), optionally `web/how-it-works.html` |

### G — Per-contact story (marketing only)

| Task | Primary files / locations |
|------|---------------------------|
| Positioning copy | `web/how-it-works.html`, `web/index.html`, relevant `web/blog/*.html` |
| App: clarify “whole vault in kit” | `after-me-mobile/src/features/familykit/KitCreationWizard.tsx`, `HelpScreen.tsx` — **copy only** |

---

## 3. Implementation plan (phased)

### Phase 0 — Foundations (week 1)

**Goal:** Highest leverage, lowest risk; no app store submission strictly required for pure web.

| Step | Actions | Verify |
|------|---------|--------|
| 0.1 | Draft final copy for **A** (hero, subhead, “four tools” short table) in `web/index.html` | Stakeholder read-through |
| 0.2 | Update **Mailchimp** welcome / nurture emails to match framing (**A**) | Send test emails |
| 0.3 | Align **D** paywall + `products.ts` strings with trust-forward lifetime language | Read on device + web |
| 0.4 | **G** — add/adjust 1–2 paragraphs on site clarifying vault vs legal will + “who receives the kit” | Legal/comms optional review |

**Exit criteria:** Live or staged site reflects new framing; Mailchimp aligned; no regression in build (`npx tsc --noEmit` in `after-me-mobile`).

---

### Phase 1 — Website expansion (week 1–2)

| Step | Actions | Verify |
|------|---------|--------|
| 1.1 | Create `web/founders.html` (**B**); match SEO/meta/nav/footer pattern | Lighthouse / manual SEO spot check |
| 1.2 | Add `founders` URL to `web/sitemap.xml`; link from nav/footer on all main templates | Crawl or click-through every template |
| 1.3 | Begin **C**: publish first 1–2 long-form articles; update `web/blog/index.html` + sitemap | URLs return 200 on production |

---

### Phase 2 — App copy & trust (week 2–3)

| Step | Actions | Verify |
|------|---------|--------|
| 2.1 | Apply **A** across onboarding screens listed in §2 | Full onboarding run-through |
| 2.2 | **D** optional Lifetime badge / label in settings for `isLifetime` | Test with sandbox purchase or mock |
| 2.3 | **F** pass on `SurvivorImportScreen.tsx` — clearer steps, calmer copy | QA survivor path |
| 2.4 | **G** kit wizard + help copy tweaks | Family Kit dry run |

---

### Phase 3 — Readiness checklist (week 3–4)

| Step | Actions | Verify |
|------|---------|--------|
| 3.1 | Define 3–5 checklist items (e.g. documents added, Family Kit generated once, recovery path understood, backup optional) — all **local** checks | Product sign-off |
| 3.2 | Implement **E** UI; wire optional analytics | Device test; no new permissions |
| 3.3 | Link from dashboard or Family Kit tab | UX review |

---

### Phase 4 — SEO cadence (ongoing)

| Step | Actions | Verify |
|------|---------|--------|
| 4.1 | Editorial calendar: 1 long-form piece / week for initial quarter (**C**) | Traffic/rankings per analytics |
| 4.2 | Internal linking pass between blog ↔ product pages | Search Console (when available) |

---

## 4. Success metrics (lightweight)

| Area | Metric |
|------|--------|
| **A** | Homepage primary CTA conversion; onboarding completion rate; qualitative drop in “is this a will?” confusion |
| **B** | Sessions to `/founders`; optional Mailchimp segment for founder landing |
| **C** | Organic sessions; rankings for target clusters; signups with UTM `content` |
| **D** | Lifetime share of premium purchases; annual→lifetime upgrade rate |
| **E** | % premium users completing checklist; correlation with retention (later) |
| **F** | Survivor flow completion; support tickets about “can’t open kit” |

---

## 5. Engineering notes

- **Web:** Static HTML on Vercel (`web/vercel.json`); new pages = new files + sitemap + repeated nav/footer (until you introduce includes or a generator).
- **Mobile:** TypeScript/React Native; run `npx tsc --noEmit` and tests touching changed modules.
- **IAP:** Lifetime product already defined in `constants/products.ts` — do **not** rename product IDs without App Store / Play Console coordination.

---

## 6. Quick reference — must-touch files for a full web rollout of B

When adding `founders.html`, update navigation/footer consistently on:

`web/index.html`, `web/how-it-works.html`, `web/support.html`, `web/privacy.html`, `web/terms.html`, `web/format-spec.html`, `web/blog/index.html`, `web/blog/*.html` (each article template with footer).

---

*Document version: 1.0 · March 2026 · Aligns with core-safe scope; excludes travel mode, server preview sends, and per-recipient vault graphs.*
