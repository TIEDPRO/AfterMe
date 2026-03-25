# After Me — Product Specification

**Document status:** Canonical reference (supersedes all prior PRDs and implementation plans)
**Version:** 1.0.1 (build 4)
**Last updated:** March 2026
**Platforms:** iOS and Android (React Native / Expo)

---

## 1. Product Overview

**After Me** is a secure, local-first digital vault application for end-of-life planning. All documents are encrypted on-device using AES-256-GCM before they can leave the device. The app uses a zero-knowledge architecture — After Me Ltd has no ability to access, view, or decrypt user data.

The core value proposition is the **Family Kit**: a user creates an encrypted package of their vault while alive, paired with a printed QR Key Card, and gives it to a trusted person. After the user's death, the recipient scans the QR code to unlock all documents instantly — no passwords, no accounts, no waiting for probate.

### Target Market

Adults aged 35–65 in the UK who want complete control over sensitive documents while ensuring family access after death. The product is positioned against cloud-based competitors (GoodTrust, Everplans) on the basis of local-first encryption, zero vendor lock-in, and an open file format.

### Platforms

| Platform | Status | Framework |
|----------|--------|-----------|
| iOS (iPhone) | Shipped | React Native / Expo SDK |
| Android | Shipped | React Native / Expo SDK |
| iPad | Not yet built | Planned for v1.2 |
| Web | Marketing site only | Static HTML (Vercel) |

---

## 2. Architecture Summary

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native (Expo SDK) |
| Language | TypeScript + Swift (native modules) |
| Local DB | expo-sqlite (metadata, some columns encrypted) |
| File storage | expo-file-system (encrypted blobs in `vault/` directory) |
| Encryption | react-native-quick-crypto (AES-256-GCM) |
| Key storage | expo-secure-store (Keychain on iOS, Keystore on Android) |
| Biometrics | expo-local-authentication (Face ID / fingerprint / passcode) |
| Document scanning | react-native-document-scanner-plugin (VisionKit / MLKit) |
| In-app purchases | Custom Expo module wrapping StoreKit 2 (iOS) / Play Billing (Android) |
| Cloud backup | iCloud Documents (iOS native module) / Google Drive appData (Android) |
| Key cloud backup | iCloud Keychain via keychain-sync (iOS) / Google Drive appData (Android) |

### Security Architecture

```
User biometric authentication
    ↓
Vault key (256-bit) — stored in expo-secure-store with biometric protection
    ↓
AES-256-GCM encryption/decryption of document files
    ↓
Encrypted blobs stored on local filesystem (vault/ directory)
    ↓
SQLite metadata — sensitive columns (name, notes) encrypted; structural columns (category, dates, format) plaintext for queries
```

Key principles:
- Zero-knowledge: After Me Ltd cannot access any user data
- Local-first: core functionality works entirely offline
- Key never leaves device: cached in memory while app is active, cleared on background
- Open format: `.afterme` file format is publicly documented with an open-source decoder

---

## 3. Current Feature Set

### 3.1 Authentication and Security

| Feature | Detail |
|---------|--------|
| Biometric unlock | Face ID (iOS), fingerprint (Android), with device passcode fallback |
| Vault key | 256-bit AES key generated on first launch, stored in Secure Store |
| Biometric toggle | Users can disable biometric lock in Settings |
| Key caching | In-memory cache cleared when app enters background state |
| Key cloud backup | Synced to iCloud Keychain (iOS) or Google Drive appData (Android) for device migration |
| Key rotation recovery | Interrupted rotation detected and recovered on next launch |
| Key restore | Can restore vault key from cloud backup on a new device |

**Implementation files:** `src/core/auth/KeyManager.ts`, `src/services/KeychainBackupService.ts`

### 3.2 Document Management

| Feature | Detail |
|---------|--------|
| Categories | 8 predefined: Identity, Legal, Property, Finance, Insurance, Medical, Digital, Personal |
| Import methods | Document scanner (camera), file picker, image picker |
| Supported formats | JPEG, PNG, PDF |
| Size limit | 50 MB per document |
| Storage cap | 5 GB personal / 25 GB family (family cap defined but Family Plan not yet launched) |
| Metadata | Name, category, document date, expiry date, provider/issuer |
| Date input | Native date picker (spinner on iOS, calendar on Android) |
| Viewer | Inline decryption and display of PDFs and images |
| Search | Filter by category, sort by newest/oldest/name |
| Document integrity | Validation check detects corrupted vault files; accessible from Settings |

Each category has suggested document templates (e.g. Identity: Passport, Driver's Licence, Birth Certificate, National ID, Citizenship Certificate) and a target of 3 key documents to drive completeness scoring.

**Implementation files:** `src/models/DocumentCategory.ts`, `src/models/Document.ts`, `src/services/DocumentService.ts`, `src/db/DocumentRepository.ts`, `src/features/documents/`

### 3.3 Vault Dashboard

| Feature | Detail |
|---------|--------|
| Category progress rings | Visual indicators showing documents collected vs. target per category |
| Document count | Total documents and per-category counts |
| Expiry tracking | "Expiring soon" count (90-day window) surfaced on dashboard |
| Safety net prompt | Persistent banner if no Family Kit or cloud backup has been set up |
| Category tap-to-filter | Tapping a category navigates to Document Library filtered to that category |
| Family Kit prompt | Conditional prompt to create a kit after documents are added |

**Implementation files:** `src/features/dashboard/VaultDashboardScreen.tsx`

### 3.4 Family Kit

| Feature | Detail |
|---------|--------|
| Export format | `.afterme` file (ZIP containing: `key.enc`, `vault.enc`, README, manifest) |
| QR Key Card | Access key encoded as QR code for printing or sharing |
| Printable PDF | Instructions + QR card, printer-friendly layout |
| Creation wizard | Guided flow: intro → owner/contact details → generate → validate → QR → distribute |
| Kit history | Version counter, freshness score, stale warnings, distribution log |
| Kit versioning | Each generation produces a new matched QR + .afterme file |
| Premium gate | Kit creation requires Premium subscription |

**Survivor import flow:**
1. Recipient taps "I Have a Legacy Kit" on welcome screen
2. Scans QR code with camera (or enters key manually)
3. Picks the `.afterme` file
4. App decrypts and imports all documents into a local vault
5. Vault is accessible with biometric authentication

**Implementation files:** `src/services/FamilyKitExportService.ts`, `src/services/FamilyKitService.ts`, `src/features/familykit/`, `src/features/survivor/SurvivorImportScreen.tsx`

### 3.5 Cloud Backup

| Feature | Detail |
|---------|--------|
| iOS target | iCloud Documents (via native icloud-backup module) |
| Android target | Google Drive appData folder (via GoogleDriveService) |
| Cost to After Me | None — users use their own cloud storage quota |
| Availability | **Free for all tiers** (not paywalled) |
| Auto-backup toggle | Configurable in Settings |
| Manual backup/restore | Available in Settings with confirmation dialogs |
| Encryption | Vault is encrypted on-device before upload; cloud provider cannot read it |

**Implementation files:** `src/services/CloudBackupService.ts`, `src/services/GoogleDriveService.ts`, `src/services/BackupService.ts`

### 3.6 Personal Recovery Kit

| Feature | Detail |
|---------|--------|
| Purpose | Self-restore for device loss (separate from Family Kit) |
| Contents | Encrypted `.afterme` file + QR Recovery Card |
| Storage | User stores the file on USB drive / external storage; prints the QR card |
| Restore flow | Same as survivor import but with "Restore My Vault" mode |

**Implementation files:** `src/services/PersonalRecoveryKitService.ts`, `src/features/recovery/PersonalRecoveryWizard.tsx`

### 3.7 Onboarding

| Step | Screen | Detail |
|------|--------|--------|
| 1 | Welcome | Three paths: "Plan my legacy" / "I have a Legacy Kit" / "Restore my vault" |
| 2-5 | Narrative | 4 screens explaining the app concept; includes decorative QR moment |
| 6 | How It Works | Family access paths explained (platform-aware: iCloud/Google Drive) |
| 7 | Legal Disclaimer | Mandatory acceptance before proceeding |
| 8 | Biometric Setup | Guided Face ID / fingerprint enrollment |
| 9 | Safety Net | Three choices: enable cloud backup, create kit, or defer (with persistent reminders) |

Onboarding completion is tracked in AsyncStorage. The `hasCompletedOnboarding` flag depends solely on the storage flag (not on whether vault keys exist), ensuring fresh installs with leftover Keychain data still show the welcome flow.

**Implementation files:** `src/features/welcome/WelcomeScreen.tsx`, `src/features/onboarding/`, `src/services/OnboardingStorage.ts`, `src/context/AppContext.tsx`

### 3.8 Premium / Subscription

| Tier | Price | Product ID | Type |
|------|-------|-----------|------|
| Lifetime | £79.99 | `com.afterme.app.premium.lifetime` | Non-consumable |
| Annual | £34.99/yr | `com.afterme.app.premium.annual` | Auto-renewable |
| Free | £0 | — | 5 documents, cloud backup included |

**Paywall triggers:**
- Adding a document beyond the 5-document free limit
- Creating a Family Kit
- Tapping "Upgrade" in Settings

**Premium unlocks:**
- Unlimited documents
- Family Kit creation and unlimited updates
- All future features (lifetime only)
- Priority support

**Not paywalled (available to all tiers):**
- Cloud backup (iCloud / Google Drive)
- Personal Recovery Kit
- Document viewing and export
- All 8 categories

**Implementation files:** `src/constants/products.ts`, `src/context/PurchaseContext.tsx`, `src/services/PurchaseService.ts`, `src/features/paywall/PaywallScreen.tsx`

### 3.9 Settings

| Section | Features |
|---------|----------|
| Security | Biometric lock toggle |
| Subscription | Plan status, upgrade, restore purchases |
| Backup | Auto-backup toggle, manual backup, restore with confirmation |
| Vault | Document integrity check, corrupted document IDs |
| Family Kit | Create kit shortcut, kit history |
| Help & FAQ | Expandable sections with platform-specific answers |
| Developer (dev builds) | Seed test data, reset vault, Phase 1 verification |

**Implementation files:** `src/features/settings/SettingsScreen.tsx`, `src/features/settings/sections/`

---

## 4. Known Gaps

| Gap | Detail | Severity |
|-----|--------|----------|
| Multi-vault not wired | `VaultManager` and `VaultSwitcherScreen` exist with UI for creating/switching vaults, but `EncryptedStorageService` always reads from the fixed `vault/` directory and does not switch based on active vault ID. SQLite is also not vault-scoped. | Medium — UI misleads if exposed; currently the vault switcher is accessible but non-functional for storage isolation |
| Analytics local-only | `AnalyticsService.ts` collects events to AsyncStorage but has no network layer. Comment says "can be extended to send to a backend in the future." | Low — no impact on users |
| Voice/video messages | PRD describes v2 personal messages with voice/video recording. Not built; no feature flag in React Native codebase. Text-only personal messages work via the Personal category. | Low — planned for v2.0 |
| iPad layouts | `supportsTablet: true` in app.json but no iPad-specific adaptive layouts built. App runs on iPad in compatibility mode. | Low — deferred per pricing strategy doc |
| App Store / Play Store launch | Builds exist and have passed UAT. Not yet publicly listed on either store. | Blocker for user acquisition |

---

## 5. Website (myafterme.co.uk)

| Page | Purpose |
|------|---------|
| `index.html` | Landing page: hero, features, pricing, Mailchimp waitlist form |
| `how-it-works.html` | 3 access paths explained, family walkthrough, comparison table |
| `support.html` | 23 FAQ items with FAQPage JSON-LD structured data |
| `privacy.html` | Privacy policy (GDPR UK compliant) |
| `terms.html` | Terms of service |
| `format-spec.html` | Open `.afterme` format specification |
| `blog/` (6 pages) | Listing page + 5 SEO-optimised seed articles |

**Infrastructure:**
- Hosted on Vercel (`vercel.json` with clean URLs, security headers, cache policies)
- Shared CSS extracted to `styles.css` with immutable cache headers
- Full SEO: OG/Twitter meta, JSON-LD schemas (Organization, SoftwareApplication, Article, FAQPage), sitemap.xml, robots.txt, hreflang tags, manifest.json
- Mailchimp JSONP integration for waitlist email capture
- Favicon, apple-touch-icon, and branded OG image (1200x630)

---

## 6. Discrepancy Log

This section documents where older planning documents differ from the current shipped product. The product specification above is authoritative; these older documents should be treated as historical context only.

| Document | Claim | Current Reality | Resolution |
|----------|-------|-----------------|------------|
| Root PRD (`/product_requirements_document.md`) | Lifetime price $49.99 | £79.99 | Pricing strategy doc and App Store Connect use £79.99 |
| Root PRD | iPad + landscape support in v1 | iPhone only (portrait locked) | Deferred to v1.2 per pricing strategy |
| Root PRD | 7-day trial → read-only | 5-document free tier, no time-based trial | Changed per pricing strategy doc |
| Root PRD | No annual subscription | Annual at £34.99/yr | Added per pricing strategy doc |
| .trae PRD | Family Plan at $149.99 | No Family Plan launched | Deferred per pricing strategy: "Do not launch a Family plan" at launch |
| .trae PRD | 10-document free tier | 5-document free tier | Changed to drive faster conversion |
| .trae PRD | Voice/video "Coming Soon" in UI | Not shown in UI, not built | Deferred to v2.0; no feature flag in RN codebase |
| Implementation plan | Swift / SwiftUI / CryptoKit / SwiftData | React Native / Expo / TypeScript | Complete platform pivot during development |
| Implementation plan | CloudKit for backup | iCloud Documents (iOS) + Google Drive (Android) | Platform-neutral approach |
| Technical architecture | Android "Secondary/Future" | Android fully built and tested | Shipped alongside iOS |
| Pricing strategy | Cloud backup listed as premium benefit | Free for all tiers | Intentional decision — users pay for their own storage, not After Me |
| Pricing strategy | "Encrypted iCloud backup" wording | "Encrypted cloud backup" (platform-neutral) | Updated March 2026 for Android parity |
| .trae PRD | `com.afterme.lifetime.personal` product ID | `com.afterme.app.premium.lifetime` | Different ID scheme in actual App Store Connect |

---

*This document is the canonical reference for After Me's current state. Update it as features ship. For future plans, see `docs/release_roadmap.md`.*
