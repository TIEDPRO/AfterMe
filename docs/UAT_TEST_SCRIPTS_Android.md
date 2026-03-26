# After Me — UAT Test Scripts · Android

**Document version:** 3.1  
**App version:** 1.0.1 (build 4) — post-UI-rework + full Android parity  
**Platform:** Android emulator (Pixel 8, API 34) · physical Android device  
**Build command:** `npx expo run:android`  
**Date:** March 2026

> Scripts cover every user-facing flow on Android. Steps marked **[EMU]** are emulator-specific notes.  
> For the iOS equivalent see `UAT_TEST_SCRIPTS_iOS.md`.

---

## Table of contents

| # | Suite | Screens covered |
|---|-------|-----------------|
| UAT-01 | Cold start & loading | `AppNavigator` init |
| UAT-02 | Welcome screen — visual hierarchy | `WelcomeScreen` |
| UAT-03 | Plan my legacy — linear onboarding | Screens 1–4, How It Works, Legal |
| UAT-04 | Biometric setup (Screen 5) | `OnboardingScreen5` |
| UAT-05 | Safety net — kit path + Documents landing | `OnboardingScreen6` |
| UAT-06 | Safety net — cloud backup path | `OnboardingScreen6` |
| UAT-07 | Safety net — defer | `OnboardingScreen6` |
| UAT-08 | Vault dashboard — progress ring free tier | `VaultDashboardScreen` |
| UAT-09 | Dashboard safety net banner — two actions | `VaultDashboardScreen` |
| UAT-10 | Dashboard — kit freshness & expiry banners | `VaultDashboardScreen` |
| UAT-11 | Documents — add, view, rename, delete | `DocumentLibraryScreen`, modals |
| UAT-12 | Documents — free tier limit & paywall | `PaywallScreen` |
| UAT-13 | Family Kit tab — premium gate inside wizard | `FamilyKitTab`, `KitCreationWizard` |
| UAT-14 | Family Kit creation wizard — full flow incl. handoff checklist | `KitCreationWizard` |
| UAT-15 | Kit history & freshness | `KitHistoryScreen` |
| UAT-16 | Survivor import — "Open Family Vault" | `SurvivorImportScreen` mode `kit` |
| UAT-17 | Survivor import — "Restore My Vault" | `SurvivorImportScreen` mode `restore` |
| UAT-18 | Settings — security | `SecuritySection` |
| UAT-19 | Settings — Google Drive backup | `BackupSection` |
| UAT-20 | Settings — Family Kit section | `FamilyKitSection` |
| UAT-21 | Settings — subscription & paywall | `SubscriptionSection`, `PaywallScreen` |
| UAT-22 | Settings — vault & recovery | `VaultSection`, `PersonalRecoveryWizard` |
| UAT-23 | Settings — help | `HelpScreen` |
| UAT-24 | Back navigation — full onboarding chain | All onboarding screens |
| UAT-25 | Dashboard → Documents category navigation | `VaultDashboardScreen` → `DocumentLibraryScreen` |
| UAT-26 | Post-onboarding kit auto-prompt | `VaultDashboardScreen` → `KitCreationWizard` |
| UAT-27 | Vault integrity check | `VaultSection` |
| UAT-28 | Accessibility — TalkBack | All primary screens |
| UAT-29 | Developer reset & re-onboarding | Dev reset button |
| UAT-30 | Require-cycle regression | Metro bundle log |

---

## Test environment

### Prerequisites
- Pixel 8 emulator (API 34) booted **or** physical Android device with sideloaded / Play Internal build
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

## UAT-02 · Welcome Screen — Visual Hierarchy

**Precondition:** Fresh install or reset.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 2.1 | View WelcomeScreen | Single amber CTA dominates: **"Start My Legacy Vault"** at 64px height | |
| 2.2 | Look below the CTA | Small muted label "Already have a vault?" visible | |
| 2.3 | Look below label | Two small text links: **"Open Family Vault"** and **"Restore My Vault"** side-by-side, muted opacity | |
| 2.4 | Confirm no bordered/filled secondary buttons | No background-coloured button other than amber CTA | |
| 2.5 | Tap "Start My Legacy Vault" | Navigates to Onboarding Screen 1 | |
| 2.6 | Return to Welcome; tap "Open Family Vault" | Opens SurvivorImportScreen in kit mode | |
| 2.7 | Return to Welcome; tap "Restore My Vault" | Opens SurvivorImportScreen in restore mode | |

---

## UAT-03 · Plan My Legacy — Linear Onboarding

**Precondition:** On WelcomeScreen.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 3.1 | Tap "Start My Legacy Vault" → Screen 1 | Progress dot 1 of 8 active; value proposition copy | |
| 3.2 | Tap Continue → Screen 2 | How the vault works; dot 2 active | |
| 3.3 | Tap Continue → Screen 3 | Document categories overview; dot 3 active | |
| 3.4 | Tap Continue → Screen 4 | Privacy & security promise; dot 4 active | |
| 3.5 | Tap Continue → How It Works | Full "How It Works" overview screen | |
| 3.6 | Tap Continue → Legal Disclaimer | Legal text, user must scroll or acknowledge | |
| 3.7 | Tap Continue → Screen 5 | Biometric screen loads | |
| 3.8 | Tap Back from Screen 5 | Returns to Legal Disclaimer | |
| 3.9 | Tap Back from Legal | Returns to How It Works | |
| 3.10 | Tap Back from How It Works | Returns to Screen 4 | |
| 3.11 | Tap Back from Screen 4 | Returns to Screen 3 | |

---

## UAT-04 · Biometric Setup (Screen 5)

**Precondition:** On Screen 5. Fingerprint or face unlock enrolled (or PIN as fallback). If no biometric enrolled, screen skips the prompt automatically.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 4.1 | View Screen 5 | Explanation of biometric protection; Continue button | |
| 4.2 | Read body copy | Mentions fingerprint or face unlock (not Face ID / Touch ID) | |
| 4.3 | Tap Continue | Android biometric prompt appears (or PIN fallback) | |
| 4.4 | Authenticate successfully | Proceeds to Screen 6 | |
| 4.5 | Re-enter from reset with no biometric enrolled | Screen skips prompt automatically; proceeds to Screen 6 without crash | |

---

## UAT-05 · Safety Net — Kit Path + Documents Landing

**Precondition:** On Screen 6.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 5.1 | View Screen 6 | Two cards + defer link visible | |
| 5.2 | Read kit card title | Shows **"I'll create a Family Kit"** (not "Create a Family Kit") | |
| 5.3 | Read kit card body | Shows "Your family's only way in. Set up after you've added your first document." | |
| 5.4 | Tap kit card | Processing indicator; brief pause | |
| 5.5 | Onboarding completes | App navigates to **Documents tab** (not Dashboard) | |
| 5.6 | Confirm tab selected | Documents tab is the active/selected tab | |
| 5.7 | Navigate to Dashboard | Safety net banner visible (hasSafetyNet = false until kit generated) | |
| 5.8 | Navigate back to Documents | Add one document | |
| 5.9 | Navigate to Dashboard | Kit auto-open wizard may trigger (showFamilyKitCreationImmediately) | |

---

## UAT-06 · Safety Net — Cloud Backup Path

**Precondition:** On Screen 6.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 6.1 | Read cloud backup card label | "For you only" badge visible | |
| 6.2 | Read cloud backup card body | "If YOU lose this device. Does not give your family access to the vault." | |
| 6.3 | Tap cloud backup card | Google Sign-In may appear; cloud backup enabled; onboarding completes | |
| 6.4 | App navigates to | **Dashboard tab** (not Documents) | |
| 6.5 | Check safety net banner on Dashboard | Banner should not appear if backup was enabled (hasSafetyNet = true) | |

---

## UAT-07 · Safety Net — Defer

**Precondition:** On Screen 6.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 7.1 | Look for defer link below the two cards | Text link visible at bottom of screen | |
| 7.2 | Read defer link text | Shows **"Set this up later"** (not "Living dangerously — remind me later") | |
| 7.3 | Tap "Set this up later" | Onboarding completes; navigates to Dashboard | |
| 7.4 | View Dashboard | Safety net banner present with title "No safety net yet" | |

---

## UAT-08 · Vault Dashboard — Progress Ring (Free Tier)

**Precondition:** Onboarding complete; non-premium account; Dashboard visible.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 8.1 | View overall progress ring | Shows **"0 of 5 · free plan"** below ring (not "0 of 24") | |
| 8.2 | Add 1 document via Documents tab | Return to Dashboard | |
| 8.3 | View ring after 1 doc | Shows "1 of 5 · free plan"; ring fills 20% | |
| 8.4 | Add 4 more docs (total 5) | Ring shows "5 of 5"; text shows "Vault complete!" | |
| 8.5 | Upgrade to premium (Play sandbox) | Ring target changes to 24; text shows "5 of 24 key documents" | |
| 8.6 | View percent text | Shows "20% complete" for premium with 5 docs | |

---

## UAT-09 · Dashboard Safety Net Banner — Two Actions

**Precondition:** Onboarding complete; hasSafetyNet = false. Dashboard visible.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 9.1 | View safety net banner | Amber background card; title "No safety net yet" | |
| 9.2 | Read subtitle | "Protect your vault — choose one or both options below" | |
| 9.3 | View action buttons | Two side-by-side buttons: **"📦 Family Kit"** and **"☁️ Cloud Backup"** | |
| 9.4 | Confirm banner is NOT a single touchable | Tapping banner background does nothing; only buttons respond | |
| 9.5 | Tap "📦 Family Kit" | Opens KitCreationWizard (or PaywallScreen if not premium) | |
| 9.6 | Dismiss wizard; view banner | Banner still present (kit not yet generated) | |
| 9.7 | Tap "☁️ Cloud Backup" | Google Sign-In sheet may appear; OR "Cloud Unavailable" alert with Google Play Services guidance | |
| 9.8 | Sign in to Google if prompted | Sign in completes; backup enabled | |
| 9.9 | Check success alert text | "Your vault will now back up automatically to Google Drive. Sign in to Google if prompted." | |
| 9.10 | Check loading state during enable | Button shows "⏳ Enabling…" and is disabled while in progress | |
| 9.11 | If backup enables: refresh Dashboard | Banner may disappear if hasSafetyNet now true | |

---

## UAT-10 · Dashboard — Kit Freshness & Expiry Banners

**Precondition:** Dashboard with existing kit (generated > 90 days ago) and at least one expiring document.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 10.1 | View stale kit banner | Orange border card: "Kit Needs Update" or "Kit Action Required" | |
| 10.2 | Tap stale kit banner | Opens KitCreationWizard | |
| 10.3 | View expiry banner | Clock icon, "Keep It Current" title, count of expiring docs | |
| 10.4 | Tap expiry banner | Navigates to Documents tab | |
| 10.5 | Pull to refresh | Both banners refresh; refreshKitStatus re-runs | |

---

## UAT-11 · Documents — Add, View, Rename, Delete

**Precondition:** Onboarding complete; Documents tab selected.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 11.1 | View Documents library | Empty state or existing documents grid/list | |
| 11.2 | Tap "+" or Add button | AddDocumentModal opens | |
| 11.3 | Scan or choose a document | Document added; library updates | |
| 11.4 | Tap document | DocumentViewerModal opens; full document visible | |
| 11.5 | In viewer, tap edit/rename | Title editable; save persists | |
| 11.6 | Long-press a document | Custom Android bottom sheet (ActionSheet modal) appears | |
| 11.7 | Tap delete | Confirmation alert; document removed from library | |
| 11.8 | Navigate to Dashboard | totalDocuments count reflects deletion | |

---

## UAT-12 · Documents — Free Tier Limit & Paywall

**Precondition:** Non-premium account; 5 documents already added.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 12.1 | Attempt to add a 6th document | PaywallScreen opens with trigger `document_limit` | |
| 12.2 | Dismiss paywall | Returns to Documents library; 6th document not added | |
| 12.3 | View Documents library | "0 remaining" indicator visible | |
| 12.4 | Upgrade (Play sandbox purchase) | PaywallScreen completes; Documents library accessible | |
| 12.5 | Add 6th document | Succeeds (no paywall) | |

---

## UAT-13 · Family Kit Tab — Premium Gate Inside Wizard

**Precondition:** Non-premium account. Navigate to Family Kit tab.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 13.1 | View Family Kit tab | KitHistoryScreen visible; "Create a Kit" button present | |
| 13.2 | Tap "Create a Kit" | **PaywallScreen opens** (trigger: family_kit) — gate is inside wizard | |
| 13.3 | Confirm FamilyKitTab does NOT show PaywallScreen directly | The tab itself has no paywall logic — wizard handles it | |
| 13.4 | Dismiss PaywallScreen | Returns to Kit History; wizard did not open | |
| 13.5 | Upgrade (Play sandbox); tap "Create a Kit" again | Wizard opens (no paywall this time) | |
| 13.6 | Confirm wizard opens at Step 1 (Intro) | Introduction screen visible | |

---

## UAT-14 · Family Kit Creation Wizard — Full Flow (incl. Handoff Checklist)

**Precondition:** Premium account; at least 1 document added.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 14.1 | Open wizard (any entry point) | Step 1 of 5: Introduction screen with Family Kit overview | |
| 14.2 | Confirm step indicator | Shows "Step 1 of 5" | |
| 14.3 | Tap Continue | Step 2 of 5: Owner name + emergency contact text fields | |
| 14.4 | Enter owner name; enter emergency contact (optional) | Fields accept input | |
| 14.5 | Tap Generate | Step 3 of 5: Progress bar animates; "Generating kit…" message | |
| 14.6 | Wait for generation | Step 4 of 5: Validating kit message | |
| 14.7 | Validation passes | Step 5 of 5 (QR + Key Card): QR code displayed; Key Card section visible | |
| 14.8 | View QR code | QR rendered at 220px; quiet zone present | |
| 14.9 | Tap Continue to Distribute | Distribute step: Share/print options (NOT final dismiss yet) | |
| 14.10 | Tap Share | Android share sheet appears with kit file | |
| 14.11 | Tap "Done — Next Steps" or Continue from Distribute | **Handoff Checklist step opens** | |
| 14.12 | View handoff checklist | 4 checklist items visible (file sent/stored, person knows, QR stored separately, executor aware) | |
| 14.13 | Tap "Done" with unchecked items | Warning prompt appears: "Some items unchecked. Are you sure?" with "Go Back" and "Close Anyway" | |
| 14.14 | Tap "Go Back" | Returns to checklist | |
| 14.15 | Check all 4 items | Done button label changes to "Done — Kit is Ready" | |
| 14.16 | Tap "Done — Kit is Ready" | Wizard dismisses cleanly; no warning | |
| 14.17 | Check Kit tab | New kit entry visible in history | |

---

## UAT-15 · Kit History & Freshness

**Precondition:** At least one kit generated.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 15.1 | View Family Kit tab | Most recent kit entry with date and freshness indicator | |
| 15.2 | View freshness badge | Fresh (green) / Stale (orange) / Critical (red) based on age | |
| 15.3 | View distribution log | Recipients or "not yet shared" indicator | |
| 15.4 | Scroll through history | Previous kit versions listed oldest-first | |

---

## UAT-16 · Survivor Import — "Open Family Vault"

**Precondition:** Have a valid Family Kit QR code or access key from another device.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 16.1 | On WelcomeScreen tap "Open Family Vault" | SurvivorImportScreen welcome step opens (mode = kit) | |
| 16.2 | Read welcome screen | Empathetic copy; 3-step overview; "I'm Ready to Begin" button | |
| 16.3 | Tap "I'm Ready to Begin" | QR scanner opens; camera permission requested if needed | |
| 16.4 | Scan a valid Family Kit QR code | **findFile step opens** (not file picker directly) | |
| 16.5 | View findFile step | "✅ QR code received" badge visible; "Now let's find the file" heading | |
| 16.6 | View 4 scenario cards | Email / Cloud / USB / Solicitor — each with a "What to do:" instruction | |
| 16.7 | Read cloud scenario card label | Shows "It's in Google Drive" | |
| 16.8 | Read cloud scenario card instructions | Mentions file picker, Google Drive provider | |
| 16.9 | Read USB scenario card | Mentions "Files app / Samsung My Files" and "USB-C adapter" | |
| 16.10 | View "Not sure?" amber panel | Contact vault creator / solicitor guidance visible | |
| 16.11 | Tap "Select .afterme File" | Android file picker opens | |
| 16.12 | Navigate in file picker | Google Drive / Downloads / Internal Storage options visible; .afterme file selectable | |
| 16.13 | Tap help button ("Need help finding the file?") | Help modal slides up | |
| 16.14 | Read help modal intro | "the file picker will open" (not "iOS Files app") | |
| 16.15 | Read help modal step 1 | "Tap the menu icon or storage provider on the left" | |
| 16.16 | Read help modal step 2 | "Check Google Drive, Downloads, or Internal Storage" | |
| 16.17 | Read help note | "Download or Save to device" tip for emailed files | |
| 16.18 | Select a valid .afterme file | Importing step: spinner + "Decrypting and importing documents…" | |
| 16.19 | Import completes | vaultIntro step: "Vault Imported Successfully" with document count | |
| 16.20 | Read biometric line in vaultIntro | "Your fingerprint or face unlock protects access to the vault each time you open the app." | |
| 16.21 | Tap "Open the Vault" | refreshInit called; main app opens with imported documents | |
| 16.22 | Verify "Scan a different QR code" link on findFile step | Returns to QR scanner; access key cleared | |

---

## UAT-17 · Survivor Import — "Restore My Vault"

**Precondition:** Google account signed in; vault backup exists in Google Drive appDataFolder.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 17.1 | On WelcomeScreen tap "Restore My Vault" | SurvivorImportScreen opens (mode = restore) | |
| 17.2 | Follow restore prompts | Google Sign-In may appear; Drive backup located; decryption begins | |
| 17.3 | Restore completes | refreshInit; main app opens with restored documents | |
| 17.4 | Verify document count | Matches original vault document count | |

---

## UAT-18 · Settings — Security

**Precondition:** Onboarding complete; in Settings.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 18.1 | View Security section | Biometric Lock toggle; hint text shown below toggle | |
| 18.2 | Read hint text (toggle ON) | "Fingerprint or face unlock required to access your vault" | |
| 18.3 | Read hint text (toggle OFF) | "Biometric lock is disabled — vault access uses device PIN or password only" | |
| 18.4 | Toggle biometric off | Android biometric prompt appears; toggle updates; hint changes | |
| 18.5 | Toggle biometric back on | Prompt appears; toggle updates | |
| 18.6 | Tap "Rotate Vault Key" | Confirmation dialog; rotation in progress | |
| 18.7 | Rotation completes | Success message; no data loss | |

---

## UAT-19 · Settings — Google Drive Backup

**Precondition:** In Settings. Google account signed in on device; Play Services available.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 19.1 | View Backup section | Cloud Auto Backup toggle; provider label shows "Google Drive" | |
| 19.2 | [EMU] Toggle Auto Backup on | Google Sign-In sheet may appear OR backup enables directly | |
| 19.3 | [Device] Toggle on | Google Drive backup enabled; toggle shows ON; "Last Backup" date updates | |
| 19.4 | Tap "Backup Now" | Progress indicator; success or error feedback | |
| 19.5 | View "Last Backup" | Date/time of last successful backup shown | |
| 19.6 | Test with Google Play Services unavailable | Not-available hint mentions "Google Play Services required" | |

---

## UAT-20 · Settings — Family Kit Section

**Precondition:** In Settings. Non-premium account.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 20.1 | View Family Kit section in Settings | "Create Family Kit" and "Kit History & Distribution" buttons | |
| 20.2 | Tap "Create Family Kit" | Wizard opens (or PaywallScreen if not premium) | |
| 20.3 | Non-premium: wizard shows PaywallScreen | PaywallScreen appears — gate is inside wizard | |
| 20.4 | Tap "Kit History & Distribution" | KitHistoryScreen modal opens | |
| 20.5 | Close history | Returns to Settings | |

---

## UAT-21 · Settings — Subscription & Paywall

**Precondition:** In Settings. Google Play Sandbox account configured; Play Store signed in.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 21.1 | View Subscription section | Current status (free / premium tier / lifetime) | |
| 21.2 | Tap "Upgrade" | PaywallScreen opens (trigger: settings) | |
| 21.3 | View paywall product options | Annual and Lifetime options with pricing | |
| 21.4 | View legal footer (annual) | Google Play cancel instructions shown | |
| 21.5 | Complete Play sandbox purchase | isPremium = true; PaywallScreen dismisses | |
| 21.6 | View Subscription section again | Shows premium status and product name | |
| 21.7 | Tap "Restore Purchases" | Restore prompt mentions Google account | |
| 21.8 | Restore completes | Status updates correctly | |

---

## UAT-22 · Settings — Vault & Recovery

**Precondition:** In Settings. Vault initialised with documents.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 22.1 | View Vault section | Vault size in bytes; vault switcher button | |
| 22.2 | Read key storage label | Shows "Android Keystore" | |
| 22.3 | Tap "Switch Vault" | VaultSwitcherScreen opens | |
| 22.4 | Return to Settings | Vault section reflects current vault | |
| 22.5 | Tap "Personal Recovery Wizard" | PersonalRecoveryWizard modal opens | |
| 22.6 | View distribute step hint text | ".afterme file — save to Google Drive, share via Nearby Share, or USB drive" | |
| 22.7 | Complete or dismiss recovery wizard | Returns to Settings | |
| 22.8 | Tap "Check Integrity" | Integrity check runs; any corrupted IDs listed | |

---

## UAT-23 · Settings — Help

**Precondition:** In Settings.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 23.1 | Tap "Help" or Help section | HelpScreen modal opens | |
| 23.2 | Read cloud backup FAQ answer | Mentions Google Drive (not iCloud) | |
| 23.3 | Read "lose phone" FAQ answer | Mentions Google Drive for key recovery | |
| 23.4 | Dismiss | Returns to Settings | |

---

## UAT-24 · Back Navigation — Full Onboarding Chain

**Precondition:** Fresh install. On WelcomeScreen.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 24.1 | Proceed to Screen 6 | Reach safety net screen | |
| 24.2 | Tap Back | Returns to Screen 5 (biometric) | |
| 24.3 | Tap Back | Returns to Legal Disclaimer | |
| 24.4 | Tap Back | Returns to How It Works | |
| 24.5 | Tap Back | Returns to Screen 4 | |
| 24.6 | Tap Back | Returns to Screen 3 | |
| 24.7 | Tap Back | Returns to Screen 2 | |
| 24.8 | Tap Back | Returns to Screen 1 | |
| 24.9 | Tap Back | Returns to WelcomeScreen | |
| 24.10 | Test Android system back gesture | Does not exit app unexpectedly from WelcomeScreen | |

---

## UAT-25 · Dashboard → Documents Category Navigation

**Precondition:** Dashboard visible with at least some documents.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 25.1 | Tap any category card on Dashboard | Documents tab opens; filtered to that category | |
| 25.2 | Navigate back to Dashboard | Category filter clears | |
| 25.3 | Tap "View All Documents" button | Documents tab opens; no filter applied | |
| 25.4 | Return to Dashboard | All category rings unchanged | |

---

## UAT-26 · Post-Onboarding Kit Auto-Prompt

**Precondition:** Complete onboarding via kit path. Add at least 1 document. Navigate to Dashboard.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 26.1 | After adding 1 doc, navigate to Dashboard | KitCreationWizard auto-opens (showFamilyKitCreationImmediately) | |
| 26.2 | Dismiss wizard | Dashboard visible; prompt does not re-open | |
| 26.3 | Navigate away and return | Wizard does NOT re-open (dismissFamilyKitCreationPrompt called) | |

---

## UAT-27 · Vault Integrity Check

**Precondition:** In Settings → Vault section.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 27.1 | Tap "Check Integrity" | Loading state; progress shown | |
| 27.2 | Check completes (clean vault) | "All documents verified" message or similar | |
| 27.3 | Check completes (corrupt file found) | Corrupted document IDs listed; user can take action | |

---

## UAT-28 · Accessibility — TalkBack

**Precondition:** TalkBack enabled: Settings → Accessibility → TalkBack.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 28.1 | WelcomeScreen — focus primary CTA | TalkBack reads "Start My Legacy Vault, button" | |
| 28.2 | WelcomeScreen — focus survivor links | Reads "Open Family Vault, button" and "Restore My Vault, button" | |
| 28.3 | Screen 6 — kit card | Reads "I'll create a Family Kit. Your family's only way in. Set up after adding your first document. button" | |
| 28.4 | Screen 6 — defer link | Reads "Set this up later, button" | |
| 28.5 | Dashboard safety net banner — kit button | Reads "Create a Family Kit, button, Opens the Family Kit creation wizard" | |
| 28.6 | Dashboard safety net banner — backup button (idle) | Reads "Enable cloud backup, button, Enables automatic cloud backup of your vault" | |
| 28.7 | Dashboard safety net banner — backup button (loading) | Reads "Enabling cloud backup…, button" (disabled state) | |
| 28.8 | Category card | Reads "[Category name], [count] of [target] documents, Opens this category in the document library" | |
| 28.9 | Progress ring | Reads "[N]% complete" | |
| 28.10 | Biometric toggle in Security section | TalkBack reads "Biometric Lock, switch, [on/off]" | |

---

## UAT-29 · Developer Reset & Re-Onboarding

**Precondition:** Debug build (Android emulator). Onboarding already completed.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 29.1 | Tap "Reset" developer button (top-right corner) | Confirmation or immediate reset | |
| 29.2 | App returns to | WelcomeScreen | |
| 29.3 | Complete full onboarding again | Reaches main app cleanly | |
| 29.4 | Verify vault is empty after reset | Dashboard shows 0 documents | |

---

## UAT-30 · Require-Cycle Regression

**Precondition:** Fresh build output visible in terminal (Metro log).

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 30.1 | Run `npx expo run:android` from a clean Metro | Build succeeds | |
| 30.2 | Check Metro bundle log for WARN lines | **Zero** `Require cycle:` warnings | |
| 30.3 | Confirm modules | No cycle between EncryptedStorageService ↔ KeyManager ↔ DocumentRepository | |
| 30.4 | Launch app; test vault unlock | Fingerprint / face unlock prompt appears; vault key loads; documents accessible | |
| 30.5 | Test key rotation (Settings → Security → Rotate Vault Key) | Rotation completes without error | |

---

## Android Regression Checklist

| Check | Screen | PASS/FAIL |
|-------|--------|-----------|
| App cold starts without crash | All | |
| Welcome screen hierarchy correct (amber primary, text links secondary) | WelcomeScreen | |
| Onboarding completes via all three Screen 6 choices | OnboardingScreen6 | |
| Kit-path landing on Documents tab | AppNavigator | |
| Safety net banner shows two buttons | VaultDashboardScreen | |
| Cloud Backup button shows loading state + Google Drive success alert | VaultDashboardScreen | |
| Cloud Backup success alert mentions "Sign in to Google if prompted" | VaultDashboardScreen | |
| Progress ring uses 5-doc target for free users | VaultDashboardScreen | |
| Premium gate works for non-premium kit creation | KitCreationWizard | |
| KitCreationWizard shows Step X of 5 (handoff is Step 5) | KitCreationWizard | |
| Handoff checklist warns on unchecked items | KitCreationWizard | |
| Survivor findFile step appears after QR scan | SurvivorImportScreen | |
| findFile cloud card shows "Google Drive" | SurvivorImportScreen | |
| findFile USB card mentions "Samsung My Files" | SurvivorImportScreen | |
| vaultIntro shows "fingerprint or face unlock" | SurvivorImportScreen | |
| Help modal mentions "file picker" and "Google Drive / Downloads" | SurvivorImportScreen | |
| Security biometric hint shows "Fingerprint or face unlock" | SecuritySection | |
| Security disabled hint shows "PIN or password" | SecuritySection | |
| Recovery wizard distribute hint shows "Nearby Share / Google Drive" | PersonalRecoveryWizard | |
| Key storage label shows "Android Keystore" | VaultSection | |
| Help FAQ cloud backup answer mentions Google Drive | HelpScreen | |
| Long-press shows custom Android bottom sheet (not native action sheet) | DocumentLibraryScreen | |
| Free users cannot add more than 5 documents | DocumentLibraryScreen | |
| Require cycles absent from Metro log | Metro bundle | |
| Key rotation completes without data corruption | SecuritySection | |

---

*After Me UAT Test Scripts — Android · v3.1 · March 2026*
