# After Me — UAT Test Scripts · Android

**Document version:** 4.0  
**App version:** 2.1.0 (versionCode 12)  
**Platform:** Android emulator (Pixel 8, API 34) · physical Android device  
**Build command:** `npx expo run:android`  
**Date:** March 2026

> Scripts cover every user-facing flow on Android for v2.1.0. Steps marked **[EMU]** are emulator-specific notes.  
> For the iOS equivalent see `UAT_TEST_SCRIPTS_iOS.md`.  
> New in v4.0: ReadinessChecklistCard (UAT-10), timing-layer How It Works copy, lifetime trust paywall line, updated survivor welcome, founders link in Help.

---

## Table of contents

| # | Suite | Screens covered |
|---|-------|-----------------|
| UAT-01 | Cold start & loading | `AppNavigator` init |
| UAT-02 | Welcome screen — visual hierarchy & new tagline | `WelcomeScreen` |
| UAT-03 | Plan my legacy — linear onboarding | Screens 1–4, How It Works, Legal |
| UAT-04 | How It Works — timing layer copy | `OnboardingHowItWorksScreen` |
| UAT-05 | Biometric setup (Screen 5) | `OnboardingScreen5` |
| UAT-06 | Safety net — kit path + Documents landing | `OnboardingScreen6` |
| UAT-07 | Safety net — cloud backup path | `OnboardingScreen6` |
| UAT-08 | Safety net — defer | `OnboardingScreen6` |
| UAT-09 | Vault dashboard — progress ring free tier | `VaultDashboardScreen` |
| UAT-10 | Vault dashboard — Readiness Checklist Card | `VaultDashboardScreen`, `ReadinessChecklistCard` |
| UAT-11 | Dashboard safety net banner — two actions | `VaultDashboardScreen` |
| UAT-12 | Dashboard — kit freshness & expiry banners | `VaultDashboardScreen` |
| UAT-13 | Documents — add, view, rename, delete | `DocumentLibraryScreen`, modals |
| UAT-14 | Documents — free tier limit & paywall | `PaywallScreen` |
| UAT-15 | Paywall — lifetime trust line | `PaywallScreen` |
| UAT-16 | Family Kit tab — premium gate inside wizard | `FamilyKitTab`, `KitCreationWizard` |
| UAT-17 | Family Kit creation wizard — full flow incl. handoff checklist | `KitCreationWizard` |
| UAT-18 | Kit history — readiness card compact variant | `KitHistoryScreen`, `ReadinessChecklistCard` |
| UAT-19 | Survivor import — welcome copy & "Open Family Vault" | `SurvivorImportScreen` mode `kit` |
| UAT-20 | Survivor import — "Restore My Vault" | `SurvivorImportScreen` mode `restore` |
| UAT-21 | Settings — security | `SecuritySection` |
| UAT-22 | Settings — Google Drive backup | `BackupSection` |
| UAT-23 | Settings — Family Kit section | `FamilyKitSection` |
| UAT-24 | Settings — subscription & paywall | `SubscriptionSection`, `PaywallScreen` |
| UAT-25 | Settings — vault & recovery | `VaultSection`, `PersonalRecoveryWizard` |
| UAT-26 | Settings — help & founders link | `HelpScreen` |
| UAT-27 | Back navigation — full onboarding chain + system back | All onboarding screens |
| UAT-28 | Dashboard → Documents category navigation | `VaultDashboardScreen` → `DocumentLibraryScreen` |
| UAT-29 | Post-onboarding kit auto-prompt | `VaultDashboardScreen` → `KitCreationWizard` |
| UAT-30 | Vault integrity check | `VaultSection` |
| UAT-31 | Accessibility — TalkBack | All primary screens |
| UAT-32 | Developer reset & re-onboarding | Dev reset button |
| UAT-33 | Require-cycle regression | Metro bundle log |

---

## Test environment

### Prerequisites
- Pixel 8 emulator (API 34) booted **or** physical Android device with sideloaded / Play build
- Google account signed in to the device (required for Google Drive backup and Play purchases)
- Google Play Services installed and up to date
- Clean app state for each suite: Settings → Developer → Reset **or** delete and reinstall
- Metro bundler log visible in terminal (no `Require cycle:` WARN lines expected)
- Google Play Sandbox account configured for purchase tests

### Notation
- **PASS / FAIL** — record per step
- **→** means "tap" or "navigate to"
- **[EMU]** — emulator-specific note

---

## UAT-01 · Cold Start & Loading

**Precondition:** App not yet installed or fully reset.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 1.1 | Install and launch app | Loading spinner appears on dark background | |
| 1.2 | Wait 2–3 seconds | Loading disappears; WelcomeScreen renders | |
| 1.3 | [EMU] Check Metro log | `Build Succeeded` line, no `Require cycle:` WARN lines | |
| 1.4 | Force-kill and relaunch | App lands on WelcomeScreen again (onboarding not complete) | |

---

## UAT-02 · Welcome Screen — Visual Hierarchy & New Tagline

**Precondition:** Fresh install or reset.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 2.1 | View WelcomeScreen | Single amber CTA dominates: **"Start My Legacy Vault"** at 64px height | |
| 2.2 | Read tagline below the app title | **"Encrypted vault on your device — when the time comes, your plan can reach the right people without your passwords."** visible in muted white | |
| 2.3 | Look below the CTA | Small muted label "Already have a vault?" visible | |
| 2.4 | Look below label | Two small text links: **"Open Family Vault"** and **"Restore My Vault"** side-by-side, muted opacity | |
| 2.5 | Confirm no bordered/filled secondary buttons | No background-coloured button other than amber CTA | |
| 2.6 | Tap "Start My Legacy Vault" | Navigates to Onboarding Screen 1 | |
| 2.7 | Return to Welcome; tap "Open Family Vault" | Opens SurvivorImportScreen in kit mode | |
| 2.8 | Return to Welcome; tap "Restore My Vault" | Opens SurvivorImportScreen in restore mode | |

---

## UAT-03 · Plan My Legacy — Linear Onboarding

**Precondition:** On WelcomeScreen.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 3.1 | Tap "Start My Legacy Vault" → Screen 1 | Progress dot 1 of 8 active; value proposition copy | |
| 3.2 | Tap Continue → Screen 2 | How the vault works; dot 2 active | |
| 3.3 | Tap Continue → Screen 3 | Document categories overview; dot 3 active | |
| 3.4 | Tap Continue → Screen 4 | Privacy & security promise; dot 4 active | |
| 3.5 | Tap Continue → How It Works | Full "How It Works" overview screen loads | |
| 3.6 | Tap Continue → Legal Disclaimer | Legal text with acknowledge/scroll | |
| 3.7 | Tap Continue → Screen 5 | Biometric screen loads | |
| 3.8 | Tap Back from Screen 5 | Returns to Legal Disclaimer | |
| 3.9 | Tap Back from Legal | Returns to How It Works | |
| 3.10 | Tap Back from How It Works | Returns to Screen 4 | |
| 3.11 | Tap Back from Screen 4 | Returns to Screen 3 | |

---

## UAT-04 · How It Works — Timing Layer Copy

**Precondition:** This screen only appears during the initial onboarding flow — there is no re-entry path once onboarding is complete. To reach it: uninstall and reinstall the app (or use the dev Reset button on a development build), tap **"Start My Legacy Vault"** on the Welcome screen, and proceed through onboarding screens 1–4. How It Works is **step 5 of 8** (fifth progress dot active).

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 4.1 | View the How It Works screen | Eyebrow reads "Before you set up"; headline reads "How your family will access this" | |
| 4.2 | Read the introductory subhead | Text reads: **"After Me is built around a simple idea: your loved ones should be able to access what you leave them — without needing your phone, your password, or your account."** | |
| 4.3 | Locate the timing-layer subhead below | Text reads: **"Think of this as the timing layer: your will and accounts matter for authority; After Me helps with the moment your documents need to reach someone — without your phone or logins."** | |
| 4.4 | Confirm timing-layer styling | Subhead is in a lighter muted colour (rgba ~52% opacity), slightly smaller than the introductory subhead above it | |
| 4.5 | Read the three access path cards | Three cards displayed in sequence: **Family Kit** (amber border, "Recommended" badge), **Google Drive Backup** ("For your own recovery" badge), **No preparation** (danger/red border) | |
| 4.6 | Verify Family Kit card content | Shows QR Card + Vault File = Vault Opens equation row; note reads "Both pieces are needed — neither works alone" | |
| 4.7 | Verify Google Drive Backup card warning | Red warning box reads: "This does not give your family access. Accessing another person's cloud account after death is a complex legal process that can take weeks." | |
| 4.8 | Verify No Preparation card | States vault is permanently inaccessible to everyone if no Family Kit or backup exists | |
| 4.9 | Read bottom note | Amber note reads: "You'll set up your Family Kit right after finishing this setup. It takes about two minutes." | |
| 4.10 | Tap **I understand — continue** | Proceeds to Legal Disclaimer | |

---

## UAT-05 · Biometric Setup (Screen 5)

**Precondition:** On Screen 5. Fingerprint or face unlock enrolled (or PIN as fallback). If no biometric enrolled, screen skips prompt automatically.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 5.1 | View Screen 5 | Explanation of biometric protection; Continue button | |
| 5.2 | Read body copy | Mentions fingerprint or face unlock (not Face ID / Touch ID) | |
| 5.3 | Tap Continue | Android biometric prompt appears (or PIN fallback) | |
| 5.4 | Authenticate successfully | Proceeds to Screen 6 | |
| 5.5 | Re-enter from reset with no biometric enrolled | Screen skips prompt automatically; proceeds to Screen 6 without crash | |

---

## UAT-06 · Safety Net — Kit Path + Documents Landing

**Precondition:** On Screen 6.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 6.1 | View Screen 6 | Two cards + defer link visible | |
| 6.2 | Read kit card title | Shows **"I'll create a Family Kit"** | |
| 6.3 | Read kit card body | "Your family's only way in. Set up after you've added your first document." | |
| 6.4 | Tap kit card | Processing indicator; brief pause | |
| 6.5 | Onboarding completes | App navigates to **Documents tab** (not Dashboard) | |
| 6.6 | Confirm tab selected | Documents tab is the active/selected tab | |
| 6.7 | Navigate to Dashboard | Safety net banner visible; Readiness Checklist Card visible | |
| 6.8 | Navigate back to Documents | Add one document | |
| 6.9 | Navigate to Dashboard | Readiness checklist documents row turns green; Kit auto-prompt may trigger | |

---

## UAT-07 · Safety Net — Cloud Backup Path

**Precondition:** On Screen 6.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 7.1 | Read cloud backup card label | "For you only" badge visible | |
| 7.2 | Read cloud backup card body | "If YOU lose this device. Does not give your family access to the vault." | |
| 7.3 | Tap cloud backup card | Google Sign-In may appear; cloud backup enabled; onboarding completes | |
| 7.4 | App navigates to | **Dashboard tab** (not Documents) | |
| 7.5 | Check safety net banner on Dashboard | Banner absent if backup enabled (hasSafetyNet = true) | |
| 7.6 | View Readiness Checklist Card | Cloud backup row shows green tick | |

---

## UAT-08 · Safety Net — Defer

**Precondition:** On Screen 6.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 8.1 | Look for defer link below the two cards | Text link visible at bottom of screen | |
| 8.2 | Read defer link text | Shows **"Set this up later"** | |
| 8.3 | Tap "Set this up later" | Onboarding completes; navigates to Dashboard | |
| 8.4 | View Dashboard | Safety net banner present with title "No safety net yet" | |
| 8.5 | View Readiness Checklist Card | All rows in pending state (grey/empty) | |

---

## UAT-09 · Vault Dashboard — Progress Ring (Free Tier)

**Precondition:** Onboarding complete; non-premium account; Dashboard visible.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 9.1 | View overall progress ring | Shows **"0 of 5 · free plan"** below ring | |
| 9.2 | Add 1 document via Documents tab | Return to Dashboard | |
| 9.3 | View ring after 1 doc | Shows "1 of 5 · free plan"; ring fills 20% | |
| 9.4 | Add 4 more docs (total 5) | Ring shows "5 of 5"; text shows "Vault complete!" | |
| 9.5 | Upgrade to premium (Play sandbox) | Ring target changes to 24; "5 of 24 key documents" | |
| 9.6 | View percent text | Shows "20% complete" for premium with 5 docs | |

---

## UAT-10 · Vault Dashboard — Readiness Checklist Card

**Precondition:** Onboarding complete; Dashboard visible. Use various states.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 10.1 | View Dashboard after fresh onboarding (no docs, no kit) | **ReadinessChecklistCard** visible below progress ring | |
| 10.2 | Read card title | Shows **"Your readiness checklist"** | |
| 10.3 | Read card subtitle | "Local checks only — everything stays on your device." | |
| 10.4 | View row 1 | "At least one document in your vault" — grey/unchecked state | |
| 10.5 | View row 2 | "Family Kit generated" — grey/unchecked state | |
| 10.6 | View row 3 | "Personal recovery kit created" — grey/unchecked state | |
| 10.7 | View row 4 | "Cloud backup enabled" — grey/unchecked state (optional) | |
| 10.8 | Add 1 document; return to Dashboard | Row 1 turns green with checkmark | |
| 10.9 | Pull to refresh | Checklist refreshes; state re-evaluated | |
| 10.10 | Generate a Family Kit | Row 2 turns green | |
| 10.11 | Create a Personal Recovery Kit (via Settings) | Row 3 turns green | |
| 10.12 | Enable Google Drive backup | Row 4 turns green | |
| 10.13 | All 3 core rows green (docs + family kit + recovery kit) | Card shows completed core state | |
| 10.14 | Tap "Create a Kit" shortcut (if visible on card) | Opens KitCreationWizard | |

---

## UAT-11 · Dashboard Safety Net Banner — Two Actions

**Precondition:** Onboarding complete; hasSafetyNet = false. Dashboard visible.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 11.1 | View safety net banner | Amber background card; title "No safety net yet" | |
| 11.2 | Read subtitle | "Protect your vault — choose one or both options below" | |
| 11.3 | View action buttons | Two side-by-side buttons: **"📦 Family Kit"** and **"☁️ Cloud Backup"** | |
| 11.4 | Confirm banner is NOT a single touchable | Tapping banner background does nothing; only buttons respond | |
| 11.5 | Tap "📦 Family Kit" | Opens KitCreationWizard (or PaywallScreen if not premium) | |
| 11.6 | Dismiss wizard; view banner | Banner still present (kit not yet generated) | |
| 11.7 | Tap "☁️ Cloud Backup" | Google Sign-In sheet appears OR "Cloud Unavailable" alert | |
| 11.8 | Sign in to Google if prompted | Sign in completes; backup enabled | |
| 11.9 | Check success alert text | "Your vault will now back up automatically to Google Drive. Sign in to Google if prompted." | |
| 11.10 | Check loading state during enable | Button shows "⏳ Enabling…" and is disabled | |

---

## UAT-12 · Dashboard — Kit Freshness & Expiry Banners

**Precondition:** Dashboard with existing kit (> 90 days old) and at least one expiring document.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 12.1 | View stale kit banner | Orange border card: "Kit Needs Update" or "Kit Action Required" | |
| 12.2 | Tap stale kit banner | Opens KitCreationWizard | |
| 12.3 | View expiry banner | Clock icon, "Keep It Current" title, count of expiring docs | |
| 12.4 | Tap expiry banner | Navigates to Documents tab | |
| 12.5 | Pull to refresh | Both banners refresh; refreshKitStatus re-runs | |

---

## UAT-13 · Documents — Add, View, Rename, Delete

**Precondition:** Onboarding complete; Documents tab selected.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 13.1 | View Documents library | Empty state or existing documents grid/list | |
| 13.2 | Tap "+" or Add button | AddDocumentModal opens | |
| 13.3 | Scan or choose a document | Document added; library updates | |
| 13.4 | Tap document | DocumentViewerModal opens; full document visible | |
| 13.5 | In viewer, tap edit/rename | Title editable; save persists | |
| 13.6 | Long-press a document | Custom Android bottom sheet (ActionSheet modal) appears — not native iOS action sheet | |
| 13.7 | Tap delete | Confirmation alert; document removed from library | |
| 13.8 | Navigate to Dashboard | totalDocuments decremented; Readiness row 1 re-evaluated | |

---

## UAT-14 · Documents — Free Tier Limit & Paywall

**Precondition:** Non-premium account; 5 documents already added.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 14.1 | Attempt to add a 6th document | PaywallScreen opens with trigger `document_limit` | |
| 14.2 | Dismiss paywall | Returns to Documents library; 6th document not added | |
| 14.3 | View Documents library | "0 remaining" indicator visible | |
| 14.4 | Upgrade (Play sandbox purchase) | PaywallScreen completes; Documents library accessible | |
| 14.5 | Add 6th document | Succeeds (no paywall) | |

---

## UAT-15 · Paywall — Lifetime Trust Line

**Precondition:** On PaywallScreen (any trigger).

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 15.1 | Open PaywallScreen | Annual and Lifetime product options visible | |
| 15.2 | View Lifetime option | Trust line present: **"Serious planning deserves a product you pay for once — with no renewal for your family to manage later."** | |
| 15.3 | Confirm styling | Trust line is italic, smaller text, muted secondary colour | |
| 15.4 | Annual option | No equivalent trust line below annual pricing | |
| 15.5 | View legal footer (annual) | Google Play cancel instructions shown | |

---

## UAT-16 · Family Kit Tab — Premium Gate Inside Wizard

**Precondition:** Non-premium account. Navigate to Family Kit tab.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 16.1 | View Family Kit tab | KitHistoryScreen visible; "Create a Kit" button present | |
| 16.2 | Tap "Create a Kit" | **PaywallScreen opens** (trigger: family_kit) | |
| 16.3 | Confirm FamilyKitTab itself has no paywall | The tab opens directly; wizard handles the gate | |
| 16.4 | Dismiss PaywallScreen | Returns to Kit History; wizard did not open | |
| 16.5 | Upgrade (Play sandbox); tap "Create a Kit" again | Wizard opens (no paywall) | |
| 16.6 | Confirm wizard opens at Step 1 (Intro) | Introduction screen visible | |

---

## UAT-17 · Family Kit Creation Wizard — Full Flow (incl. Handoff Checklist)

**Precondition:** Premium account; at least 1 document added.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 17.1 | Open wizard (any entry point) | Step 1 of 5: Introduction screen | |
| 17.2 | Confirm step indicator | Shows "Step 1 of 5" | |
| 17.3 | Tap Continue | Step 2 of 5: Owner name + emergency contact fields | |
| 17.4 | Enter owner name; enter emergency contact (optional) | Fields accept input | |
| 17.5 | Tap Generate | Step 3 of 5: Progress bar animates; "Generating kit…" | |
| 17.6 | Wait for generation | Step 4 of 5: Validating kit message | |
| 17.7 | Validation passes | Step 5 of 5: QR code + Key Card visible | |
| 17.8 | View QR code | QR rendered at 220px; quiet zone present | |
| 17.9 | Tap Continue to Distribute | Distribute step with share/print options | |
| 17.10 | Tap Share | Android share sheet appears with kit file | |
| 17.11 | Tap "Done — Next Steps" from Distribute | **Handoff Checklist step opens** | |
| 17.12 | View handoff checklist | 4 items: file sent/stored, person knows, QR stored separately, executor aware | |
| 17.13 | Tap "Done" with unchecked items | Warning: "Some items unchecked. Are you sure?" with "Go Back" / "Close Anyway" | |
| 17.14 | Tap "Go Back" | Returns to checklist | |
| 17.15 | Check all 4 items | Done button label changes to "Done — Kit is Ready" | |
| 17.16 | Tap "Done — Kit is Ready" | Wizard dismisses; no warning | |
| 17.17 | Return to Dashboard | Readiness Checklist Card row 2 (Family Kit) now green | |

---

## UAT-18 · Kit History — Readiness Card Compact Variant

**Precondition:** Family Kit tab open; at least one kit generated.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 18.1 | View Family Kit tab (KitHistoryScreen) | Kit history list visible | |
| 18.2 | Scroll to top or look for readiness section | **ReadinessChecklistCard** in compact variant visible | |
| 18.3 | Read compact card title | Shows **"Readiness"** (shorter label) | |
| 18.4 | View compact row states | Same green/grey states as full card on Dashboard | |
| 18.5 | Confirm no subtitle in compact mode | "Local checks only…" subtitle absent | |
| 18.6 | Tap "Create a Kit" shortcut if visible | Opens KitCreationWizard | |

---

## UAT-19 · Survivor Import — Welcome Copy & "Open Family Vault"

**Precondition:** Have a valid Family Kit QR code from another device.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 19.1 | On WelcomeScreen tap "Open Family Vault" | SurvivorImportScreen welcome step opens (mode = kit) | |
| 19.2 | Read welcome headline | Empathetic tone; references the person who prepared the vault | |
| 19.3 | Read welcome body copy | Includes: **"We understand this may be a difficult time. Someone who cared about you left an encrypted Family Kit so you can open what they prepared without their phone or passwords."** | |
| 19.4 | Read 3-step overview | Step 1: "Scan the QR code from the printed Family Kit card"; Step 2: "Choose the encrypted .afterme vault file — from email, USB, or cloud storage"; Step 3: "We import and decrypt the vault here; you'll protect it with this device's biometrics" | |
| 19.5 | Tap "I'm Ready to Begin" | QR scanner opens; camera permission requested if needed | |
| 19.6 | Scan a valid Family Kit QR code | **findFile step opens** (not file picker directly) | |
| 19.7 | View findFile step | "✅ QR code received" badge; "Now let's find the file" heading | |
| 19.8 | View 4 scenario cards | Email / Cloud / USB / Solicitor — each with "What to do:" instruction | |
| 19.9 | Read cloud scenario card label | Shows **"It's in Google Drive"** | |
| 19.10 | Read cloud scenario card instructions | Mentions file picker, Google Drive provider | |
| 19.11 | Read USB scenario card | Mentions "Files app / Samsung My Files" and USB-C adapter | |
| 19.12 | View "Not sure?" amber panel | Contact vault creator / solicitor guidance | |
| 19.13 | Tap "Select .afterme File" | Android file picker opens | |
| 19.14 | Navigate in file picker | Google Drive / Downloads / Internal Storage options; .afterme file selectable | |
| 19.15 | Tap help button ("Need help finding the file?") | Help modal slides up | |
| 19.16 | Read help modal intro | "the file picker will open" (not "iOS Files app") | |
| 19.17 | Read help modal step 1 | "Tap the menu icon or storage provider on the left" | |
| 19.18 | Read help modal step 2 | "Check Google Drive, Downloads, or Internal Storage" | |
| 19.19 | Select a valid .afterme file | Importing step: spinner + "Decrypting and importing documents…" | |
| 19.20 | Import completes | vaultIntro step: "Vault Imported Successfully" with document count | |
| 19.21 | Read biometric line in vaultIntro | "Your fingerprint or face unlock protects access to the vault each time you open the app." | |
| 19.22 | Tap "Open the Vault" | Main app opens with imported documents | |
| 19.23 | Verify "Scan a different QR code" link | Returns to QR scanner; access key cleared | |

---

## UAT-20 · Survivor Import — "Restore My Vault"

**Precondition:** Google account signed in; vault backup exists in Google Drive appDataFolder.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 20.1 | On WelcomeScreen tap "Restore My Vault" | SurvivorImportScreen opens (mode = restore) | |
| 20.2 | Follow restore prompts | Google Sign-In may appear; Drive backup located; decryption begins | |
| 20.3 | Restore completes | Main app opens with restored documents | |
| 20.4 | Verify document count | Matches original vault count | |

---

## UAT-21 · Settings — Security

**Precondition:** Onboarding complete; in Settings.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 21.1 | View Security section | Biometric Lock toggle; hint text shown below | |
| 21.2 | Read hint text (toggle ON) | "Fingerprint or face unlock required to access your vault" | |
| 21.3 | Read hint text (toggle OFF) | "Biometric lock is disabled — vault access uses device PIN or password only" | |
| 21.4 | Toggle biometric off | Android biometric prompt; toggle updates; hint changes | |
| 21.5 | Toggle biometric back on | Prompt; toggle updates | |
| 21.6 | Tap "Rotate Vault Key" | Confirmation dialog; rotation in progress | |
| 21.7 | Rotation completes | Success message; no data loss | |

---

## UAT-22 · Settings — Google Drive Backup

**Precondition:** In Settings. Google account signed in on device; Play Services available.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 22.1 | View Backup section | Cloud Auto Backup toggle; provider label shows **"Google Drive"** | |
| 22.2 | [EMU] Toggle Auto Backup on | Google Sign-In sheet may appear OR backup enables directly | |
| 22.3 | [Device] Toggle on | Google Drive backup enabled; "Last Backup" date updates | |
| 22.4 | Tap "Backup Now" | Progress indicator; success or error feedback | |
| 22.5 | View "Last Backup" | Date/time of last successful backup shown | |
| 22.6 | Test with Google Play Services unavailable | Not-available hint mentions "Google Play Services required" | |

---

## UAT-23 · Settings — Family Kit Section

**Precondition:** In Settings. Non-premium account.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 23.1 | View Family Kit section | "Create Family Kit" and "Kit History & Distribution" buttons | |
| 23.2 | Tap "Create Family Kit" | Wizard opens (or PaywallScreen if not premium) | |
| 23.3 | Non-premium: wizard shows PaywallScreen | Gate is inside wizard | |
| 23.4 | Tap "Kit History & Distribution" | KitHistoryScreen modal opens | |
| 23.5 | Close history | Returns to Settings | |

---

## UAT-24 · Settings — Subscription & Paywall

**Precondition:** In Settings. Google Play Sandbox account configured; Play Store signed in.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 24.1 | View Subscription section | Current status (free / annual / lifetime) | |
| 24.2 | Tap "Upgrade" | PaywallScreen opens (trigger: settings) | |
| 24.3 | View paywall | Annual and Lifetime options; lifetime trust line present | |
| 24.4 | Complete Play sandbox purchase (Lifetime) | isPremium = true; PaywallScreen dismisses | |
| 24.5 | View Subscription section again | Shows "Lifetime" status | |
| 24.6 | Tap "Restore Purchases" | Restore prompt mentions Google account | |
| 24.7 | Restore completes | Status updates correctly | |

---

## UAT-25 · Settings — Vault & Recovery

**Precondition:** In Settings. Vault initialised with documents.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 25.1 | View Vault section | Vault size; key storage label; vault switcher button | |
| 25.2 | Read key storage label | Shows **"Android Keystore"** | |
| 25.3 | Tap "Switch Vault" | VaultSwitcherScreen opens | |
| 25.4 | Return to Settings | Vault section reflects current vault | |
| 25.5 | Tap "Personal Recovery Wizard" | PersonalRecoveryWizard modal opens | |
| 25.6 | View distribute step hint text | ".afterme file — save to Google Drive, share via Nearby Share, or USB drive" | |
| 25.7 | Complete or dismiss wizard | Returns to Settings; Readiness Card row 3 updates | |
| 25.8 | Tap "Check Integrity" | Integrity check runs; results shown | |

---

## UAT-26 · Settings — Help & Founders Link

**Precondition:** In Settings.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 26.1 | Tap "Help" or Help section | HelpScreen modal opens | |
| 26.2 | Locate FAQ about Family Kit vs Categories | Answer reads: "A Family Kit is for your loved ones. It packages an encrypted snapshot of your whole vault… Categories organise your vault in the app; the kit is one vault snapshot…" | |
| 26.3 | Confirm requirement note in answer | "You need at least one document before you can generate a kit." visible | |
| 26.4 | Locate **"For founders (website)"** link | Link button visible in Help screen | |
| 26.5 | Tap "For founders (website)" | Opens `https://myafterme.co.uk/founders` in browser | |
| 26.6 | Read cloud backup FAQ answer | Mentions **Google Drive** (not iCloud) | |
| 26.7 | Read "lose phone" FAQ answer | Mentions Google Drive for key recovery | |
| 26.8 | Dismiss | Returns to Settings | |

---

## UAT-27 · Back Navigation — Full Onboarding Chain + System Back

**Precondition:** Fresh install. On WelcomeScreen.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 27.1 | Proceed to Screen 6 | Reach safety net screen | |
| 27.2 | Tap Back | Returns to Screen 5 (biometric) | |
| 27.3 | Tap Back | Returns to Legal Disclaimer | |
| 27.4 | Tap Back | Returns to How It Works | |
| 27.5 | Tap Back | Returns to Screen 4 | |
| 27.6 | Tap Back | Returns to Screen 3 | |
| 27.7 | Tap Back | Returns to Screen 2 | |
| 27.8 | Tap Back | Returns to Screen 1 | |
| 27.9 | Tap Back | Returns to WelcomeScreen | |
| 27.10 | Android system back gesture from WelcomeScreen | App does not crash or close unexpectedly | |

---

## UAT-28 · Dashboard → Documents Category Navigation

**Precondition:** Dashboard visible with at least some documents.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 28.1 | Tap any category card on Dashboard | Documents tab opens; filtered to that category | |
| 28.2 | Navigate back to Dashboard | Category filter clears | |
| 28.3 | Tap "View All Documents" button | Documents tab opens; no filter applied | |
| 28.4 | Return to Dashboard | All category rings unchanged | |

---

## UAT-29 · Post-Onboarding Kit Auto-Prompt

**Precondition:** Complete onboarding via kit path. Add at least 1 document. Navigate to Dashboard.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 29.1 | After adding 1 doc, navigate to Dashboard | KitCreationWizard auto-opens | |
| 29.2 | Dismiss wizard | Dashboard visible; prompt does not re-open | |
| 29.3 | Navigate away and return | Wizard does NOT re-open | |

---

## UAT-30 · Vault Integrity Check

**Precondition:** In Settings → Vault section.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 30.1 | Tap "Check Integrity" | Loading state; progress shown | |
| 30.2 | Check completes (clean vault) | "All documents verified" message | |
| 30.3 | Check completes (corrupt file found) | Corrupted document IDs listed; user can take action | |

---

## UAT-31 · Accessibility — TalkBack

**Precondition:** TalkBack enabled: Settings → Accessibility → TalkBack.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 31.1 | WelcomeScreen — focus primary CTA | TalkBack reads "Start My Legacy Vault, button" | |
| 31.2 | WelcomeScreen — focus tagline | Tagline read aloud; not skipped | |
| 31.3 | WelcomeScreen — focus survivor links | "Open Family Vault, button" and "Restore My Vault, button" | |
| 31.4 | Screen 6 — kit card | "I'll create a Family Kit. Your family's only way in… button" | |
| 31.5 | Screen 6 — defer link | "Set this up later, button" | |
| 31.6 | Dashboard — Readiness Checklist Card title | "Your readiness checklist" read aloud | |
| 31.7 | Dashboard — Readiness row (unchecked) | Row label read; state communicated | |
| 31.8 | Dashboard — Readiness row (checked) | Checkmark state communicated | |
| 31.9 | Dashboard safety net banner — kit button | "Create a Family Kit, button, Opens the Family Kit creation wizard" | |
| 31.10 | Dashboard safety net banner — backup button | "Enable cloud backup, button…" | |
| 31.11 | Category card | "[Category name], [count] of [target] documents, Opens this category" | |
| 31.12 | Progress ring | "[N]% complete" | |
| 31.13 | Help screen — founders link | "Open For founders page on the website, link" | |
| 31.14 | Biometric toggle | "Biometric Lock, switch, [on/off]" | |

---

## UAT-32 · Developer Reset & Re-Onboarding

**Precondition:** Debug build (Android emulator). Onboarding already completed.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 32.1 | Tap "Reset" developer button | Confirmation or immediate reset | |
| 32.2 | App returns to | WelcomeScreen | |
| 32.3 | Complete full onboarding again | Reaches main app cleanly | |
| 32.4 | Verify vault is empty | Dashboard shows 0 documents; Readiness Card all grey | |

---

## UAT-33 · Require-Cycle Regression

**Precondition:** Fresh build output visible in terminal.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 33.1 | Run `npx expo run:android` from a clean Metro | Build succeeds | |
| 33.2 | Check Metro bundle log for WARN lines | **Zero** `Require cycle:` warnings | |
| 33.3 | Confirm modules | No cycle between EncryptedStorageService ↔ KeyManager ↔ DocumentRepository | |
| 33.4 | Launch app; test vault unlock | Fingerprint / face unlock prompt; vault key loads; documents accessible | |
| 33.5 | Test key rotation | Rotation completes; Readiness checklist unaffected | |

---

## Android Regression Checklist — v2.1.0

| Check | Screen | PASS/FAIL |
|-------|--------|-----------|
| App cold starts without crash | All | |
| Welcome tagline present ("when the time comes…") | WelcomeScreen | |
| Welcome screen hierarchy correct (amber primary, text links secondary) | WelcomeScreen | |
| How It Works shows timing-layer subhead | OnboardingHowItWorksScreen | |
| Onboarding completes via all three Screen 6 choices | OnboardingScreen6 | |
| Kit-path landing on Documents tab | AppNavigator | |
| Readiness Checklist Card visible on Dashboard | VaultDashboardScreen | |
| Readiness card row 1 turns green after adding doc | ReadinessChecklistCard | |
| Readiness card row 2 turns green after generating kit | ReadinessChecklistCard | |
| Readiness card row 3 turns green after creating recovery kit | ReadinessChecklistCard | |
| Compact Readiness Card visible in KitHistoryScreen | KitHistoryScreen | |
| Safety net banner shows two buttons | VaultDashboardScreen | |
| Cloud Backup success alert mentions "Sign in to Google if prompted" | VaultDashboardScreen | |
| Lifetime trust line present on PaywallScreen | PaywallScreen | |
| Premium gate works for non-premium kit creation | KitCreationWizard | |
| KitCreationWizard shows Step X of 5 (handoff is Step 5) | KitCreationWizard | |
| Handoff checklist warns on unchecked items | KitCreationWizard | |
| Survivor welcome body copy includes empathetic text | SurvivorImportScreen | |
| Survivor 3-step list uses updated copy | SurvivorImportScreen | |
| findFile cloud card shows "Google Drive" (not iCloud Drive) | SurvivorImportScreen | |
| findFile USB card mentions "Samsung My Files" | SurvivorImportScreen | |
| vaultIntro shows "fingerprint or face unlock" | SurvivorImportScreen | |
| Help modal shows "file picker" and "Google Drive / Downloads" | SurvivorImportScreen |  |
| "For founders (website)" link opens myafterme.co.uk/founders | HelpScreen | |
| Help FAQ covers Family Kit vs Categories distinction | HelpScreen | |
| Help FAQ cloud backup answer mentions Google Drive | HelpScreen | |
| Security biometric hint shows "Fingerprint or face unlock" | SecuritySection | |
| Security disabled hint shows "PIN or password" | SecuritySection | |
| Recovery wizard distribute hint shows "Nearby Share / Google Drive" | PersonalRecoveryWizard | |
| Key storage label shows "Android Keystore" | VaultSection | |
| Long-press shows custom Android bottom sheet (not native action sheet) | DocumentLibraryScreen | |
| Free users cannot add more than 5 documents | DocumentLibraryScreen | |
| Android system back from WelcomeScreen does not crash | WelcomeScreen | |
| Require cycles absent from Metro log | Metro bundle | |
| Key rotation completes without data corruption | SecuritySection | |

---

*After Me UAT Test Scripts — Android · v4.0 · March 2026*
