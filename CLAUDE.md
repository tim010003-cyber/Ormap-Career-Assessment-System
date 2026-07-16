# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Ormap 原味藍圖 (Ormap Career Assessment System)** — a career-assessment SaaS for career counsellors and their students. It runs entirely as **static HTML pages on Firebase Hosting**, backed by **Firebase Auth (Google sign-in)** and **Firestore**. There is no build step, no bundler, no `package.json`, no framework — each page is a standalone `.html` file with an inline `<script type="module">` that imports the Firebase SDK from the gstatic CDN and a handful of shared local modules.

The two assessment instruments are **TWA** (工作價值觀 / work values) and **HTI** (何倫特質 / Holland-type traits). Content for these instruments is data-driven from JSON files under `data/`, which are themselves synced from Excel master files.

All UI text, comments, and product docs are in **Traditional Chinese** — match this when editing.

## Tech stack

Cloud-native, serverless, **no build step**. Everything runs on Google Cloud Platform via Firebase.

**Frontend**
- Plain **HTML + vanilla JavaScript (ES modules)** — one self-contained `.html` per page, inline `<script type="module">`. No framework, no bundler, no `package.json`, no transpile.
- **Tailwind CSS** via CDN (`cdn.tailwindcss.com`) with a per-page inline `tailwind.config`. Brand: `primary` `#0d9488` (teal), `secondary` `#0f172a`.
- **Lucide** icons via `unpkg.com/lucide@1.8.0`.

**Backend / cloud (GCP)**
- **Firebase Authentication** — Google sign-in (`GoogleAuthProvider` + `signInWithPopup`).
- **Cloud Firestore** — the app's database (NoSQL document store). Access control is entirely in `firestore.rules`; there is no server-side app tier.
- **Firebase Hosting** — serves the repo root statically (`firebase.json` → `"public": "."`). Deploy target / GCP project: **`careervalue-ormap`** (`.firebaserc`).
- **Firebase JS SDK 10.8.1**, imported per-page from the gstatic CDN (`firebase-app` / `firebase-auth` / `firebase-firestore`). Keep this version consistent across pages.
- ~~Google Apps Script (GAS) transactional email~~ — **removed entirely on 2026-07-16** (backend `gas_mailer.gs` decommissioned by the PO). All invites now go through copy-link flows; there is no email sending anywhere in the app. Do not re-introduce `gas-mailer.js` / `callGasMailer`.

**Data tooling**
- **Python 3** scripts (`sync_*.py`) using **`openpyxl`** to sync Excel masters (`data/*.xlsx`) → runtime JSON (`data/*.json`). Only stdlib + `openpyxl`; no `requirements.txt` (install with `pip install openpyxl`).

**Source & deployment**
- **GitHub**: [`tim010003-cyber/Ormap-Career-Assessment-System`](https://github.com/tim010003-cyber/Ormap-Career-Assessment-System) — `origin`, default branch `main`.
- **Auto-deploy (CI/CD)**: `.github/workflows/firebase-hosting-merge.yml` runs `FirebaseExtended/action-hosting-deploy` on every push to `main`, deploying **Hosting** to the `live` channel of GCP project `careervalue-ormap`. Requires the GitHub secret `FIREBASE_SERVICE_ACCOUNT_CAREERVALUE_ORMAP` (a GCP service-account JSON key with the Firebase Hosting Admin role) — see setup steps below.
- **Note — Firestore rules are NOT auto-deployed.** The workflow only pushes Hosting. After changing `firestore.rules`, still run `firebase deploy --only firestore:rules` manually.
- **Manual deploy** (still available): `firebase deploy --only hosting` / `firebase deploy --only firestore:rules`.

**One-time setup of the deploy credential** (must be done once by a project owner; handles a private key, so do it yourself — not via the assistant):
- Easiest: run `firebase init hosting:github` in the repo. It creates the service account, stores the `FIREBASE_SERVICE_ACCOUNT_CAREERVALUE_ORMAP` secret in GitHub, and (offer to skip overwriting the existing workflow above).
- Manual alternative: in Google Cloud Console create a service account with **Firebase Hosting Admin** (+ *Cloud Run Viewer*) on project `careervalue-ormap`, generate a JSON key, then in GitHub → repo → Settings → Secrets and variables → Actions add a secret named `FIREBASE_SERVICE_ACCOUNT_CAREERVALUE_ORMAP` with the full JSON as its value.

## Commands

There is no test/lint/build toolchain. The workflow is edit → sync data (if needed) → deploy.

```bash
# Deploy the site (Firebase Hosting serves the repo root as-is)
firebase deploy --only hosting

# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Sync xlsx master data → JSON (see data/SYNC_GUIDE.md for full details)
python sync_landing_sheet.py       # 04_Landing_Page文案 sheet → data/twa-landing.json
python sync_indicators_sheet.py    # 02_環境指標清單 sheet   → data/twa-matrix.json
python sync_indicators_sheet.py --dry-run   # preview changes without writing

# Local preview
firebase serve      # or any static file server; open index.html
```

Firebase project: `careervalue-ormap` (see `.firebaserc`). The Firebase web config in `firebase-init.js` is public by design (client-side keys); real access control lives in `firestore.rules`.

## Architecture

### Shared modules (the "single source of truth" layer)

Phase 9 extracted cross-page logic into small ES modules at the repo root (originally four; `gas-mailer.js` was deleted 2026-07-16 along with the whole email feature). **Always import from these rather than re-implementing** — duplicating Firebase init or auth logic across pages is exactly the anti-pattern this layer removed. Pages in `tools/` must use `../` paths.

- **`firebase-init.js`** — the only place Firebase is initialized. Exports `auth` and `db`. Other SDK verbs (`onAuthStateChanged`, `getDoc`, `setDoc`, …) are still imported per-page directly from the gstatic CDN; this module only owns connection init.
- **`auth-utils.js`** — role checks against the `counselors/{uid}` Firestore doc: `isCounselor(db, uid)`, `isSuperAdmin(db, uid)`, and `migratePendingCounselor(db, uid, email)`. All fail **safe** (return `false` on any error). Callers pass in the already-initialized `db`.
- **`config.js`** — small site-wide constants (currently just `CONFIG_COUNSELOR_NAME`, a display-name fallback; has no consumers since the GAS removal but is kept as the designated home for future constants). Put new global constants here, never secrets.

### Pages (each is a self-contained app)

| File | Role |
|---|---|
| `index.html` | Landing + Google login. On auth, redirects to `dashboard.html`. |
| `dashboard.html` | Signed-in user's personal hub. |
| `tools/twa.html` | TWA work-values assessment (Gated-lite staged reveal UX — see `data/TWA_ASSESSMENT_HANDOVER.md`). |
| `tools/hti.html` | HTI Holland-trait assessment. |
| `report.html` | Student's career-awareness report (reads assessment results + `data/twa-matrix.json`). |
| `timeline.html` | TWA growth-trajectory view over time. |
| `whiteboard.html` | Counsellor's live session console (see mirror mode below). |
| `counselors.html` | Counsellor CRM — manage students. |
| `admin.html` | Counsellor back-office; the entry where an invited counsellor first logs in and their `pending` doc is migrated. |

### Data model (Firestore collections)

Enforced by `firestore.rules` — read that file before changing any read/write path.

- **`counselors/{uid}`** — the authorization backbone. `isActive`, `isSuperAdmin`, `isDeleted` flags drive every role check. Invited counsellors first exist as a **pending doc keyed by email** (email with `.#$/[]` → `_`); on first login `migratePendingCounselor` copies it to a `{uid}`-keyed doc and deletes the pending one (background, non-blocking — retries next login if the delete fails).
- **`assessments/{docId}`** — completed assessment results. `create` is open (anonymous students submit); read requires auth; a counsellor can update `assignedCounselorUid`; owner or Super Admin can delete.
- **`user_progress/{uid}_...`** — assessment autosave drafts (doc IDs are prefixed with the owner uid).
- **`counselor_notes/{docId}`** — counsellor-only notes.
- **`whiteboard_sessions/{sessionId}`** (+ subcollections) and **`whiteboard_active/{uid}`** — live counselling sessions.

### Whiteboard mirror mode (the key real-time concept)

`whiteboard.html` shows the counsellor a live mirror of what the student sees. Mechanism: an **`<iframe>` loads the same `tools/twa.html` / `tools/hti.html` in "mirror mode"**, and that iframe independently subscribes (`onSnapshot`) to `whiteboard_sessions/{sid}.liveData` in Firestore. The parent whiteboard sets the iframe `src` once; after that the tool page syncs itself. In the tool pages this is gated by a `_isMirrorMode` / `body.mirror-mode` flag that disables student-only interactions (e.g. the catalog observer). When touching TWA/HTI interaction code, check it still behaves under mirror mode.

### Data-driven content pipeline

`data/*.json` is the runtime content for the instruments (landing copy, need matrix, indicators, HTI activities/reports). These JSON files are **generated from Excel masters** (`data/*.xlsx`) via the two `sync_*.py` scripts. Some JSON fields are intentionally *not* covered by sync and are hand-edited — editing the xlsx and re-running sync will overwrite them. **Read `data/SYNC_GUIDE.md` before editing any `data/*.json` or the sync scripts**, and be aware of its "一次性事項" (one-off manual fixes) that a naive re-sync would clobber. Pages defend against missing/broken JSON with inline fallback constants (e.g. `LANDING_FALLBACK`), so a bad sync degrades rather than white-screens.

## Conventions & gotchas

- **`.gitattributes` marks `*.html` as `binary`** — git won't show line diffs for HTML pages. Review HTML changes by reading the file, not by trusting `git diff`.
- Every shared module starts with a long header comment documenting its exports, usage, design decisions, and the PRD phase it maps to. Preserve this style when adding modules.
- Styling is **Tailwind via CDN** (`cdn.tailwindcss.com`) with a per-page inline `tailwind.config`. Brand colors: `primary` = `#0d9488` (teal), `secondary` = `#0f172a`. Icons: `lucide`.
- Firebase SDK is pinned to **10.8.1** from gstatic across all pages — keep versions consistent when adding imports.
- `.tmp.driveupload/` is OneDrive sync cruft; ignore it (already excluded from hosting in `firebase.json`).
- Known outstanding debt noted in handover docs: a hardcoded `SUPER_ADMIN_UID` legacy path and unfinished counsellor stats. (The `assessment_done` mail-routing debt is obsolete — the GAS email feature was removed entirely on 2026-07-16.)
