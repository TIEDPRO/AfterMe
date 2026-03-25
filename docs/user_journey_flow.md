# After Me — user journey & routes (implementation map)

This document reflects **current app navigation** in `after-me-mobile` so you can rework flows with a single source of truth. View diagrams in [GitHub](https://github.com), [Mermaid Live Editor](https://mermaid.live), or a VS Code Mermaid extension.

---

## 1. Cold start → first meaningful screen

```mermaid
flowchart TD
  A[App launch] --> B{AppContext init done?}
  B -->|no| L[Loading screen]
  B -->|yes| C{hasCompletedOnboarding?}
  C -->|no| D{showSurvivorFlow?}
  D -->|yes| S[SurvivorImportScreen]
  D -->|no| E{onboardingStep}
  E -->|welcome| W[WelcomeScreen]
  E -->|onboarding1–6, howItWorks, legalDisclaimer| O[OnboardingScreen N]
  C -->|yes| M[Main app: Tab navigator]
```

---

## 2. Welcome — three entry paths

From **Welcome**, the user picks one branch (each can use **Back** where noted).

```mermaid
flowchart LR
  W[WelcomeScreen]
  W -->|Plan my legacy| P[Onboarding 1]
  W -->|I have a Family Kit| K[SurvivorImport mode kit]
  W -->|Restore my vault| R[SurvivorImport mode restore]
  K -->|Back| W
  R -->|Back| W
  K -->|import success| I[refreshInit → may land in main app]
  R -->|import success| I
```

**Note:** `SurvivorImportScreen` uses the same internal steps for both modes; `mode` is passed for context (implementation detail).

---

## 3. “Plan my legacy” — linear onboarding (with Back)

Order is fixed in `AppNavigator`. **Back** on each step (except welcome) returns to the previous step.

```mermaid
flowchart LR
  O1[1 Values] --> O2[2 Trusted contacts]
  O2 --> O3[3 Documents]
  O3 --> O4[4 Categories]
  O4 --> HI[How it works]
  HI --> LD[Legal disclaimer]
  LD --> O5[5 Biometrics]
  O5 --> O6[6 Safety net]
```

| Step key            | Screen        | Typical purpose                          |
| ------------------- | ------------- | ---------------------------------------- |
| `welcome`           | Welcome       | Choose path                              |
| `onboarding1`       | Onboarding 1  | Values / motivation                      |
| `onboarding2`       | Onboarding 2  | Trusted contacts                         |
| `onboarding3`       | Onboarding 3  | Documents intro                          |
| `onboarding4`       | Onboarding 4  | Category selection                       |
| `howItWorks`        | How it works  | Product explanation                      |
| `legalDisclaimer`   | Legal         | Disclaimer acceptance                    |
| `onboarding5`       | Onboarding 5  | Biometric lock                           |
| `onboarding6`       | Onboarding 6  | Safety net (cloud backup / kit / defer)  |

After **Onboarding 6** completes, `hasCompletedOnboarding` is set and the user enters the **main tab navigator**.

---

## 4. Onboarding 6 — safety net outcomes

```mermaid
flowchart TD
  S6[Onboarding 6] --> A[Enable cloud backup]
  S6 --> B[Create Family Kit now]
  S6 --> C[I'll set this up later]
  A --> D[Mark onboarding complete → Main app]
  B --> D
  B --> E[Flag: show kit wizard soon when docs exist]
  C --> D
```

---

## 5. Survivor / import flow (internal steps)

```mermaid
flowchart TD
  SW[Sub-flow welcome copy] --> SC[Scan QR]
  SC --> ME[Manual key entry]
  SC --> SF[Select backup file]
  ME --> SF
  SF --> IM[Importing]
  IM --> VI[Vault intro]
  VI --> DONE[onImportComplete → refreshInit]
```

Users can navigate between scan / manual / file paths per screen actions (see `SurvivorImportScreen`).

---

## 6. Main app — bottom tabs

```mermaid
flowchart TB
  subgraph Tabs[Bottom tabs]
    V[Vault dashboard]
    D[Documents]
    F[Family Kit]
    ST[Settings]
  end
  M[Main stack] --> Tabs
```

**Navigation note:** The root stack only hosts **Main** (tabs). From **Vault**, “Review documents” / category taps switch to the **Documents** tab via `navigate('Documents')`, with an optional **category filter** set in app context first. First tab in the navigator is **Vault** (Dashboard).

---

## 7. Overlays & modals (cross-cutting)

These sit **on top of** tabs or onboarding; they are not separate stack routes unless noted.

| Entry area        | Overlay / route              | Trigger examples                                      |
| ----------------- | ---------------------------- | ----------------------------------------------------- |
| Vault             | `KitCreationWizard` modal    | Safety-net banner, stale-kit banner, post-onboarding “create kit now” when `totalDocuments > 0` |
| Vault             | Switch to **Documents** tab  | “Review documents” / category chip; may set `categoryFilter` in context |
| Documents         | `AddDocumentModal`           | Add document                                          |
| Documents         | `PaywallScreen`              | Document limit reached                                |
| Documents         | `DocumentViewerModal`        | Open document                                         |
| Documents         | Rename modal                 | Rename document                                       |
| Family Kit tab    | `PaywallScreen`              | Non-premium taps primary action (`family_kit`)        |
| Family Kit tab    | `KitCreationWizard`          | Premium: create kit                                   |
| Settings          | `KitCreationWizard`          | Create / refresh kit actions                        |
| Settings          | Kit history modal → wizard   | Open existing kit, refresh                            |
| Settings          | `PaywallScreen`              | Upgrade / family kit / settings triggers              |
| Settings          | `PersonalRecoveryWizard`     | Personal recovery                                     |
| Settings          | Vault switcher modal         | Switch vault                                          |
| Settings          | Help modal                   | Help                                                  |
| Settings          | Phase 1 screen (`__DEV__`)   | Developer entry                                       |

**Product note:** `KitCreationWizard` does not check premium internally; the **Family Kit tab** gates premium before opening the wizard. Vault and Settings can open the wizard without that same gate — worth aligning when you rework monetisation.

---

## 8. Family Kit creation wizard (sub-steps)

```mermaid
flowchart LR
  I[intro] --> DT[details]
  DT --> G[generating]
  G --> V[validating]
  V --> C[complete]
  C --> DS[distribute]
```

Back navigation exists between some steps (e.g. details → intro).

---

## 9. Route / state summary (for rework checklists)

- **Global gates:** `isInitialized`, `hasCompletedOnboarding`, `showSurvivorFlow`, `onboardingStep`.
- **Planning path:** Single linear chain + welcome + survivor branches.
- **Post-onboarding hub:** Four tabs (Vault switches to Documents when needed) + multiple modals.
- **Paywalls:** `document_limit`, `family_kit`, `settings` (and related upgrade copy) — see `PaywallScreen` usage sites.
- **Deep links:** Not covered here; add a section when deep linking is implemented.

---

## Source of truth (code)

| Area              | Primary file |
| ----------------- | ------------ |
| Root flow & steps | `after-me-mobile/src/navigation/AppNavigator.tsx` |
| Welcome choices   | `after-me-mobile/src/features/welcome/WelcomeScreen.tsx` |
| Safety net        | `after-me-mobile/src/features/onboarding/OnboardingScreen6.tsx` |
| Survivor import   | `after-me-mobile/src/features/survivor/SurvivorImportScreen.tsx` |
| Vault / kit entry | `after-me-mobile/src/features/dashboard/VaultDashboardScreen.tsx` |
| Documents         | `after-me-mobile/src/features/documents/DocumentLibraryScreen.tsx` |
| Family Kit tab    | `after-me-mobile/src/features/familykit/FamilyKitTab.tsx` |
| Settings          | `after-me-mobile/src/features/settings/SettingsScreen.tsx` |
| App flags         | `after-me-mobile/src/context/AppContext.tsx` |

When you change flows, update this doc in the same PR so the map stays accurate.
