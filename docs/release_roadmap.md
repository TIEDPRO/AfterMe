# After Me — Release Roadmap

**Document status:** Working roadmap — update as priorities shift
**Last updated:** March 2026
**Current version:** 1.0.1 (build 4)

---

## Version Timeline

```
v1.0.1 (Current)  ──►  v1.1 (Launch)  ──►  v1.2 (Polish)  ──►  v2.0 (Expansion)  ──►  Future
     Now              2-4 weeks          After 500 users        ~6 months post-launch
```

---

## v1.0.1 — Current Release (March 2026)

**Status:** Built, UAT tested, not yet publicly listed on stores.

See `docs/product_specification.md` for the full feature set. Key highlights:
- iOS and Android apps with full feature parity
- AES-256-GCM encryption, biometric authentication
- 8 document categories, scanner, viewer
- Family Kit with QR Key Card and printable PDF
- Cloud backup (iCloud / Google Drive) free for all tiers
- Personal Recovery Kit
- Lifetime (£79.99) and Annual (£34.99/yr) subscriptions
- Marketing website with blog, SEO, and Mailchimp waitlist

---

## v1.1 — Stability and Store Launch

**Target:** 2-4 weeks from now
**Goal:** Public launch on App Store and Google Play. Fix remaining architectural gaps.

### Scope

| Task | Priority | Effort | Detail |
|------|----------|--------|--------|
| App Store submission | Critical | 1 week | Screenshots, preview video, privacy nutrition label, App Review (budget 2 weeks for iteration on sensitive content: biometrics + death docs) |
| Google Play submission | Critical | 3 days | Store listing, content rating questionnaire, AAB upload |
| Wire multi-vault storage | High | 3-5 days | Connect `EncryptedStorageService` and SQLite to `VaultManager.getActiveVaultId()` so vault switching actually isolates document storage. Currently UI exists but storage is not scoped per vault. |
| Analytics backend | Medium | 2-3 days | Extend `AnalyticsService.ts` to send privacy-safe, anonymised events to a lightweight backend (e.g. Sentry performance or PostHog self-hosted). No document content in telemetry. |
| Final UAT pass | High | 2-3 days | Full regression test on both platforms after multi-vault wiring. Rerun all UAT scripts from `docs/UAT_TEST_SCRIPTS.md` and `docs/UAT_TEST_SCRIPTS_ANDROID.md`. |
| Mailchimp audience setup | Medium | 1 day | Verify Mailchimp form is capturing signups; set up welcome email automation for waitlist subscribers. |

### Dependencies

- Apple Developer account and App Store Connect already configured
- Google Play Console already configured
- Sentry DSN already in codebase (currently optional)

### Success Metrics

- Both stores approved and live
- 0 critical bugs in first 7 days
- Waitlist-to-download conversion > 30%

### Exit Criteria

- Apps publicly available on both stores
- Multi-vault storage isolation verified by automated tests
- Analytics events flowing to backend

---

## v1.2 — iPad and Polish

**Target:** After first 500 users (~3 months post-launch)
**Goal:** Expand to iPad, improve retention features, accessibility.

### Scope

| Task | Priority | Effort | Detail |
|------|----------|--------|--------|
| iPad adaptive layouts | High | 2 weeks | Responsive layouts for iPad screen sizes. Split-view support for document library (list + viewer side by side). Landscape orientation. |
| Keep It Current notifications | Medium | 3-4 days | Push notifications for document expiry (90-day and 14-day warnings). Currently expiry is tracked but only surfaced when user opens the app. |
| Large vault performance | Medium | 3-4 days | Profile and optimise document library rendering for vaults with 50+ documents. Virtualised list, lazy thumbnail loading, SQLite query optimisation. |
| Accessibility audit | Medium | 3-4 days | Dynamic Type support verification, VoiceOver labels for all interactive elements, minimum 44pt tap targets for the 45-65 demographic, colour contrast ratios. |
| Onboarding refinements | Low | 2 days | Based on analytics data: identify and fix any drop-off points in the 9-step onboarding flow. |

### Dependencies

- v1.1 launched and stable
- Analytics data from v1.1 to inform onboarding refinements
- At least 500 users to validate iPad demand (per pricing strategy doc)

### Success Metrics

- iPad App Store rating >= 4.5
- Document expiry notification open rate > 20%
- No accessibility-related 1-star reviews

### Pricing Review Trigger (from pricing strategy doc)

At the 6-month mark after launch, review:
1. Annual-to-lifetime conversion rate — if above 60%, test £89.99 lifetime
2. Trial-to-paid conversion rate — if below 15%, revisit the 5-document limit or paywall UX
3. Annual churn rate — if above 20%, consider whether a higher annual price self-selects more committed users
4. A/B test £79.99 vs £89.99 lifetime for 60 days

---

## v2.0 — Personal Messages and Family Plan

**Target:** ~6 months post-launch
**Goal:** Major feature expansion — voice/video messages and multi-user Family Plan.

### Scope

| Task | Priority | Effort | Detail |
|------|----------|--------|--------|
| Voice messages | High | 2-3 weeks | Audio recording pipeline with compression. Messages addressed to specific people (e.g. "To my daughter"). Capped at 3-5 minutes per message. Encrypted and stored in vault alongside documents. Included in Family Kit export. |
| Video messages | High | 2-3 weeks | Video recording with compression. Same addressing model as voice. Combined voice+video cap: 500 MB per vault for kit export. Feature-flagged for gradual rollout. |
| Family Plan subscription | High | 2 weeks | New product: `com.afterme.app.premium.family` at £149.99 lifetime. Unlocks up to 5 vaults (vs 1 for Personal). Requires multi-vault storage isolation from v1.1 to be solid. |
| Upgrade path: Personal → Family | High | 1 week | In-app upgrade flow. Credit existing lifetime purchase amount toward Family Plan price. Suggested upgrade price: £54.99 (per pricing strategy doc). |
| Multi-vault navigation | Medium | 1 week | Polish vault switcher UI. Per-vault backup, per-vault Family Kit, per-vault document counts. |
| Family Plan marketing | Medium | 1 week | Update website pricing cards, App Store description, and in-app copy. Add "Family plan" pricing card to `index.html`. |

### Dependencies

- v1.1 multi-vault storage isolation must be solid
- v1.2 performance work needed for vaults with media (voice/video files are larger than scanned documents)
- App Store Connect: register new Family product ID
- Google Play Console: register matching product

### Success Metrics

- Family Plan uptake: 10% of premium users within 3 months
- Voice/video messages used by > 25% of premium users
- Average vault size increases (indicating deeper engagement)

---

## Future / Under Evaluation

These items are not scheduled. They will be evaluated based on user feedback, market demand, and business priorities after v2.0.

| Item | Rationale | Rough Effort |
|------|-----------|-------------|
| **Solicitor partnership programme** | Estate planning solicitors as a distribution channel. Provide bulk licences or referral codes. Create solicitor-specific documentation. | 4-6 weeks (business development + technical integration) |
| **Web-based vault viewer** | Read-only web app for survivors who don't have a phone or prefer a desktop. Parse `.afterme` files in-browser using WebCrypto API. | 3-4 weeks |
| **Apple Watch companion** | Surface vault status, emergency contact info, and QR Key Card on wrist. Useful for quick access. | 2-3 weeks |
| **Document annotation / notes** | Allow users to add text notes to documents (e.g. "solicitor's phone number" on a will scan). | 1-2 weeks |
| **Shared vault editing** | Real-time collaboration on a vault (e.g. spouses managing a shared vault). Requires conflict resolution and real-time sync architecture. | 6-8 weeks |
| **Android Wear companion** | Same as Apple Watch but for Wear OS. | 2-3 weeks |
| **Automated document classification** | ML-powered automatic categorisation of scanned documents. | 3-4 weeks |
| **Multi-language support** | Localisation for Welsh, Scottish Gaelic, and other UK languages; later European languages. | 2-4 weeks per language |

---

## Decision Log

Decisions that shaped this roadmap, with rationale:

| Decision | Rationale | Date |
|----------|-----------|------|
| No Family Plan at launch | Doubles support surface, complicates vault architecture, splits marketing message. Revisit after 500 users. (Pricing strategy doc) | March 2026 |
| Cloud backup free for all tiers | Users pay for their own iCloud/Google Drive storage; no marginal cost to After Me. Backup is a safety feature, not a luxury. Free backup improves retention and trust. | March 2026 |
| iPad deferred to v1.2 | Core use case (scanning, sharing) is phone-first. iPad adds 3-4 weeks of adaptive layout work. Target demographic is overwhelmingly iPhone-dominant. (.trae PRD) | March 2026 |
| Voice/video deferred to v2.0 | Recording pipeline, compression, encryption, and playback are complex. Text messages in the Personal category cover the basic use case for v1. (.trae PRD) | March 2026 |
| £79.99 lifetime, £34.99 annual | Anchored against competitors (GoodTrust $149/yr, Farewill £90). Break-even in 2.3 years drives lifetime conversion. Do not change before real conversion data. (Pricing strategy doc) | March 2026 |
| 5-document free tier (not 10) | Faster conversion funnel. 5 meaningful documents (will, passport, insurance, bank, personal message) provide real utility while creating natural upgrade pressure. | March 2026 |
| React Native / Expo (not Swift) | Cross-platform from day one. Single codebase for iOS and Android. Faster development velocity. | 2025 |

---

*This roadmap is a living document. Update it as releases ship and priorities change. For the current product state, see `docs/product_specification.md`.*
