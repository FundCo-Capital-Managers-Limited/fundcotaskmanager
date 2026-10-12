# FundCo Platform — Codebase Audit Report

**Date:** 2026-10-12 (original audit); addendum added same engagement, post-remediation
**Scope:** Full repository audit — `backend/`, `frontend/`, `adminpanel/` (backend + frontend), `_backup/`, `future/`, root config and docs.
**Purpose:** Pre-deployment review ahead of migrating to Render (backend services) + Vercel (frontend services), switching the AI provider from Grok/xAI to Claude/Anthropic, and removing/replacing the Pinata/IPFS file-storage layer.

> **Note on the addendum (Section 6):** Sections 1–5 below are the original static-code audit — read-only review of the repository, no app was ever run. Section 6 is a **separate, later pass**: after the fixes from Sections 1–5 were implemented, all four services were actually started locally and clicked through end-to-end (every page, every user role, real interactions) using a seeded set of test accounts. Everything in Section 6 was found live, at runtime, by using the app — not by reading code — and did not appear anywhere in the original static audit. Treat Section 6 as newly discovered, not as something the original audit missed through carelessness; some of it (e.g. the boot-crash bugs) is the kind of defect that is invisible to static review and only surfaces when the server actually starts.

---

## 1. Architecture: what's actually live

The repository contains **four services that matter** for deployment, plus two directories that are confirmed dead weight.

| Path | Status | Deploy target | Notes |
|---|---|---|---|
| `backend/` | **LIVE** | Render | Main API — tasks, chat, meetings, AI tools, reports, etc. |
| `frontend/` | **LIVE** | Vercel | Main user-facing app |
| `adminpanel/backend/` | **LIVE** | Render (separate service) | Admin API, shares the same MongoDB as main backend, talks to it over HTTP via a shared internal-token header |
| `adminpanel/frontend/` | **LIVE** | Vercel (separate project) | Admin dashboard |
| `_backup/` | **DEAD** | — | Old snapshot of adminpanel/backend/frontend, ~5.0MB, zero references anywhere in the repo (confirmed via grep across all `.json/.js/.yaml/.yml`). Root `README.md` itself calls archive directories "recovery material only." Safe to delete. |
| `future/` | **DEAD / STALE** | — | ~5.6MB. Its own `future/README.md` claims it is "the live engineering surface," but a direct code diff shows the opposite: `future/backend/server.js` is strictly **behind** root `backend/server.js` (fewer mounted routers, fewer models, simpler presence logic). It is a stale fork that fell out of sync. |

**Important caution:** `future/` contains near-duplicate copies of the Grok integration and the Pinata file-storage code. A repo-wide find/replace for either migration could accidentally edit `future/` instead of (or in addition to) the real code with zero effect. **Exclude `future/` and `_backup/` from all migration work**, and ideally delete both before starting.

**A real bug independent of the two stated goals:** `adminpanel/backend` and `backend` maintain **independent, hand-written Mongoose schemas pointed at the same MongoDB collections**, and they have already drifted — e.g. `userModel.js` has an `executive` role in main but not in admin's copy; `taskModel.js` has extra fields (`assignedBy`, `adminComments`) in main that admin's copy lacks. Two services silently assuming different shapes for the same documents is a live data-integrity risk, worth fixing regardless of the other work.

---

## 2. File storage: Pinata/IPFS — confirmed architectural problem

There is no S3, no private cloud storage, no local persistent disk anywhere in this codebase. **Every single "save a file" feature pins to public IPFS via Pinata.** For a corporate product this is a real problem, not a style preference:

- **No real deletion.** IPFS content persists and can propagate across the network even after the DB record is deleted and the file is "unpinned" — there is no guarantee a file is ever actually gone.
- **No access control at the storage layer.** Anyone who obtains a `cid` can fetch the file directly from `gateway.pinata.cloud`. Access control exists only in the application layer (who gets told the `cid`), not in storage itself.
- **A public-network dependency for proprietary business data.** Meeting reports, chat attachments, and internal PDFs flow through a public IPFS pinning service instead of a private bucket (S3, GCS, Azure Blob). This is very hard to justify once there's a real client or compliance conversation about where company data lives.

### Where it's wired in

**Core client:** `backend/pinning/pinata.js` — `uploadFileToIPFS()`, posts to Pinata's `pinFileToIPFS` endpoint using `PINATA_JWT`, with retry/backoff logic.

**Four callers, in increasing order of coupling:**
1. **`backend/controllers/meetingReportController.js`** — one optional attachment field on the `MeetingReport` model. Light coupling.
2. **`backend/controllers/chatController.js`** — chat messages carry an optional `cid` for attachments, fed by `express-fileupload` temp files (`server.js:161-170`, 1GB/file limit, 5 files, `useTempFiles: true`). Moderate coupling; also a disk-fill risk on Render's ephemeral storage if temp files aren't being cleaned up after use (not confirmed either way — flagged for a follow-up check on `chatController.js` lines ~590-630).
3. **`backend/controllers/fileController.js`** + **`folderController.js`** — the full "Files/Folders" cloud-drive feature: upload, 2GB per-user quota, folder association, task association, soft-delete/trash, share links, tagging, starring. 13 exported handlers, own routes, own two models (`fileModel.js`, `folderModel.js`). This is the deepest, most deliberately-built-out dependency on Pinata.
4. **`backend/controllers/documentController.js`** (Deck Prep) — re-downloads PDFs *from* IPFS by `cid` when a document is created from the Files library. However, there is a **separate direct-upload path** (`uploadPdfDocument`) that accepts a raw file buffer and extracts text without ever touching Pinata — this path can be kept even if Pinata is removed entirely.

**Also required to fully remove it:**
- `config/security.js` currently asserts `PINATA_API_KEY`, `PINATA_SECRET_API_KEY`, `PINATA_JWT` must all be set at boot, or the server refuses to start. This must be updated, or the server will crash even after the feature is deleted. (Side note: only `PINATA_JWT` is actually used by code; the other two asserted vars appear to be dead requirements already.)
- Frontend: `frontend/src/pages/FileStorage.jsx` (1589 lines) + its route in `App.jsx` + its sidebar entry in `Sidebar.jsx:103` is an isolated, easy delete. But file-attachment **UI** is cross-cutting — it also lives inside `AiTools.jsx` (chat attachments), `TeamChat.jsx`, `SocialFeed.jsx` (post media), `DeckPrep.jsx` (PDF upload — this IS the feature, don't remove), `TemplateSelector.jsx`, and `DocumentUpload.jsx`. These need individual decisions, not a blanket deletion.

### Recommendation

Two real options, not "remove and hope":

- **Option A — Replace, don't just remove.** Swap Pinata for a private S3 bucket (or Render/Vercel-compatible equivalent). Same implementation effort as ripping it out, but you end up with a storage layer a real company can actually run and defend. Recommended if any file-persistence feature should survive at all.
- **Option B — True removal.** Delete the Files/Folders feature and its chat/meeting-report attachment hooks entirely. Keep Deck Prep's direct-PDF-upload-for-AI-extraction path, since it never persists the file — it's "ingest," not "storage," and removing it would break Deck Prep's core function.

---

## 3. AI provider migration: Grok (xAI) → Claude (Anthropic)

### Frontend — minimal change

All AI calls are proxied through the backend; **no Grok/xAI API key is ever exposed client-side.** The only frontend change needed:
- `frontend/src/pages/DocumentConverter.jsx:333` — user-visible string: *"...convert this PDF to full text using Grok AI..."*
- The six `/api/grok/...` network calls in `AiTools.jsx` and `AIReportPanel.jsx` can keep their URL paths as-is if the backend keeps the same route names while swapping the provider internally underneath — purely a backend concern in that case.

### Backend — six independent call sites, no shared client

Each of the following files builds its **own** `OpenAI`-compatible client pointed at `https://api.x.ai/v1`, hardcoding `model: 'grok-4'`. There is no shared abstraction, so migration touches every file individually unless a shared client is introduced first (recommended):

1. `backend/services/grokService.js` — `grokQuery`, `queryCompanyDocs`, non-streaming.
2. `backend/controllers/grokController.js` — the main AI Tools chat feature (`/api/grok/chat`), **streaming**, handles file/image attachments.
3. `backend/controllers/botChatController.js` — "FundCo TM Bot," non-streaming.
4. `backend/controllers/documentController.js` — Deck Prep's slide-generation AI calls, uses OpenAI JSON mode, has the best existing fallback/error-handling of all six.
5. `backend/controllers/performanceController.js` — AI performance-summary generation.
6. `backend/controllers/reportController.js` — AI report polishing, **streaming**, has grounding/fact-check validation before accepting AI output.

### Things that don't map 1:1 — require rewriting, not find-replace

- **Streaming shape.** OpenAI's stream emits `delta.content` chunks; Anthropic's Messages API streams `content_block_delta` events with `delta.text`. The consumption loops in `grokController.js` and `reportController.js` must be rewritten, not just re-pointed.
- **Vision/file attachments.** `grokController.js`'s `processFiles()` builds OpenAI's `image_url` content-block format. Anthropic uses a different `image` / `source` block shape — this function needs a real rewrite.
- **JSON mode.** `documentController.js` relies on OpenAI's `response_format: { type: 'json_object' }`. Anthropic has no equivalent; JSON enforcement must move to prompt instructions. The existing `utils/jsonRepair.js` fallback (recovers from malformed LLM JSON) is good defensive code and should be kept regardless — Claude can also emit imperfect JSON without strict JSON mode.
- **Duplicated prompt content.** The large `COMPANY_KNOWLEDGE` prompt blob is defined once in full in `grokService.js` (~400 lines) and **redefined as a separate, shorter, hand-written copy** in `grokController.js` — these two copies already diverge. Worth consolidating into one shared module while doing this rewrite anyway.

### Recommendation

Build one shared `services/aiClient.js` wrapping the Anthropic SDK, and point all six call sites at it, rather than patching each file independently in place. This also fixes the prompt-duplication issue above in the same pass.

---

## 4. Deployment readiness

### Backend (`backend/` and `adminpanel/backend/`) — Render

**Blocking gaps (nothing currently exists):**
- No `render.yaml`, no `Procfile`, no `.env.example` anywhere in the repo.
- `package.json` start script is `nodemon server.js` — must become `node server.js` for production. `nodemon` is a dev file-watcher; running it in a managed container adds no value and is non-standard.
- No `engines.node` field to pin a Node version for Render's build image.

**Already correct, no action needed:**
- `PORT` is read strictly from `process.env.PORT` and the process exits if it's missing — correct fail-fast behavior.
- Binds to `0.0.0.0` — correct for Render.
- A usable health-check endpoint exists at `GET /`, returning JSON with `success: true`.

**Other gaps:**
- No `SIGTERM`/`SIGINT` graceful-shutdown handler. This matters here specifically because of (a) SSE streaming responses to `/api/grok/chat` and (b) a fire-and-forget `setTimeout`-based background job for Deck Prep generation with no watchdog — a Render redeploy mid-generation leaves a document stuck in `"processing"` status forever, with nothing to flag it as failed.
- `config/security.js` throws at boot if ~10 env vars are missing (good fail-fast design) but `README.md` documents only 7 of them. Expect a confusing crash loop on first Render deploy until the full list below is set.
- Two services share one secret under **two different env var names**: main backend checks `INTERNAL_API_TOKEN`; adminpanel backend sends it as `USER_BACKEND_INTERNAL_TOKEN`. Both must be set to the *same value* in two different Render services — easy to misconfigure.
- No rate limiting on any AI endpoint (`/api/grok/chat`, bot chat, Deck Prep, AI report generation) — worth adding before paying per-token for Claude usage.
- `routes/adminRoutes.js` imports a model file that doesn't exist (`models/adminModel.js`). It isn't currently mounted in `server.js`, so it's dead code rather than a live crash — but it's a landmine if anyone wires it up later.

**Full required env var list (compiled from `config/security.js` + code grep, since no `.env.example` exists):**

*Hard-required at boot (server won't start without these):*
`PORT`, `MONGO_URI`, `USER_JWT_SECRET`, `ADMIN_JWT_SECRET`, `INTERNAL_API_TOKEN` (these three secrets must all be mutually distinct), `PINATA_API_KEY`, `PINATA_SECRET_API_KEY`, `PINATA_JWT` (only relevant if Pinata is kept), `BASE_URL`, `FRONTEND_URL`. A legacy `JWT_SECRET` var must **not** be set — the server throws if it finds one.

*Required for specific features (fail at call-time, not boot-time):*
`GROK_API_KEY` (→ will become the Anthropic equivalent), `ADMIN_FRONTEND_URL`, `ALLOWED_ORIGINS` (optional CORS additions), `NODE_ENV`, `FILE_GATEWAY_URL`/`PINATA_GATEWAY_URL`, `PINATA_UPLOAD_TIMEOUT_MS`, SMTP credentials for `nodemailer` (meeting-report email), Zoom API credentials (meetings feature), Firebase service-account credentials if push notifications are kept.

*adminpanel/backend specific:* `ADMIN_PORT`, `MONGO_URI` (same DB), `ADMIN_JWT_SECRET`, `INTERNAL_API_TOKEN`, `USER_BACKEND_INTERNAL_TOKEN`, `ADMIN_FRONTEND_URL`.

### Frontend (`frontend/` and `adminpanel/frontend/`) — Vercel

- **`vercel.json` on both frontends has `"git": { "deploymentEnabled": false }`** — push-to-deploy is currently turned off for both projects. Must be flipped to `true` or deploys will need to be triggered manually/via CLI indefinitely.
- No `buildCommand`/`outputDirectory`/`framework` explicitly set in either `vercel.json` — Vercel's Vite auto-detection should work, but nothing overrides it if auto-detection ever fails.
- **Inconsistent env var naming for the backend API URL**: `VITE_API_URL` (dominant, ~48 references), `VITE_API_BASE_URL` (only `UrlShortener.jsx`), `VITE_USER_API_URL` (only `Dashboard.jsx`). All three must be set in Vercel's dashboard, or the pages using the less-common names will silently fail.
- Several files fall back to hardcoded `http://localhost:4000` / `http://127.0.0.1:4001` if the env var is missing — this means a missing/misnamed Vercel env var won't error loudly, it will silently try to call localhost from the deployed site.
- No `.env.example` anywhere in `frontend/`.
- No top-level error boundary around `<Routes>` in `App.jsx` — any uncaught render error produces a blank white screen with no fallback UI.
- `index.html`'s CSP `connect-src` directive allows `https: http: ws: wss:` — effectively any origin for fetch/XHR/websocket, which neutralizes CSP's main anti-exfiltration protection (though `script-src 'self'` still blocks arbitrary script injection). Worth tightening once the real backend domain is known.
- Cache-busting is done via `<meta http-equiv>` tags in `index.html`, which modern browsers and CDNs (including Vercel's edge cache) largely ignore. If "always serve fresh `index.html`" is actually needed, it should be a real HTTP header set via `vercel.json`'s `headers` config, not a meta tag.

---

## 5. Other findings worth knowing (not part of the original ask)

- ~206 raw `console.*` calls across the backend, no structured logger (winston/pino), no log levels. A few stray `console.log` calls leak data into the browser console on the frontend too (`Meeting.jsx`).
- Several very large, hard-to-maintain files on both frontends and in parts of the backend: `TeamChat.jsx` (2549 lines), `DeckPrep.jsx` (2026), `FileStorage.jsx` (1589), `Training.jsx` (1487), `AiTools.jsx` (1362), plus large backend/adminpanel controllers like `projectController.js` (1328) and `taskController.js` (965).
- Duplicate socket.io connection setup copy-pasted across 5 different frontend files instead of one shared provider/hook.
- 3 of the backend's `utils/*.test.js` files are **silently not run** — they live outside the directory Jest's `testMatch` glob checks, so `npm test` has been quietly under-reporting coverage with no error.
- Zero test coverage anywhere on AI integration code or file-storage code — exactly the two areas about to be rewritten/removed have no regression safety net. Manual QA will be required either way.
- 15+ unused heavy dependencies in `frontend/package.json` (Firebase, Azure MSAL, Microsoft Graph client, react-three-fiber/drei, dnd-kit ×3, react-dnd ×2) — safe to prune, reduces install/build time.
- Three stray `.txt` files at `frontend/` root (`FileStorage.txt`, `Reminders.txt`, `newColor.txt`) are old raw code drafts, not developer notes — dead weight sitting in git, safe to delete. (`intent.txt` is a genuine prose product spec and is useful context — it shows the originally intended scope, several items never implemented: a payment system, gamification, AI behavior settings.)

---

## 6. ADDENDUM — New findings from live testing (post-remediation)

**Everything in this section was discovered after Sections 1–7, during two later rounds of work: (a) actually booting all four services locally, and (b) a full hands-on QA pass (Playwright-driven, all 4 user roles, every reachable page, real interactions) once the app was running.** None of this was in the original static audit — it could not have been, since static review of source code cannot surface a crash that only happens when the process actually starts, or a validation bug that only fires when a real request hits a real server.

### 8.1 — Found while first getting the app to boot (not in original audit)

Two boot-time crash bugs were found **only by actually starting the server**, not by reading the code — both are landmines that unconditional module-level code construction creates, and both are now fixed:

1. `backend/utils/pushService.js` called `admin.initializeApp(...)` (Firebase) unconditionally at module-import time. `JSON.parse(undefined)` on a missing `FIREBASE_CREDENTIALS` crashed the entire server at boot, before even reaching the documented environment-variable checks in `config/security.js`. The original audit flagged Firebase as "likely dead/unused" but did not catch that it was also an unconditional import-time crash risk.
2. Five files — `services/grokService.js`, `controllers/grokController.js`, `controllers/botChatController.js`, `controllers/performanceController.js`, `utils/reminderScheduler.js` — each constructed an `OpenAI` client unconditionally at import time. The `openai` SDK itself throws if `apiKey` is falsy, so a missing `GROK_API_KEY` crashed the server at boot, not merely at first AI-call time as the original audit's static analysis assumed (it correctly noted 3 of 6 call sites lacked a "guard," but running the app revealed the failure mode was worse than a graceful runtime error — it was a hard crash before the server could even start).

Both are now fixed (conditional construction, matching the pattern the two already-safe files used) and verified by actually rebooting the server afterward.

### 8.2 — Found during the full QA click-through pass (not in original audit)

A Playwright-driven pass logged into the app as four seeded test accounts (one per role: `admin`, `executive`, `team-lead`, `standard`) and interacted with every reachable page in both the main app and the admin dashboard — creating tasks, goals, chat messages, social posts, feedback, and reminders, not just loading pages. Full detail and 82 screenshots: `qa-screenshots/OPERATING_MANUAL.md` (kept local, not committed to version control). Findings:

1. **Reminder creation is completely broken for end users.** Submitting a new reminder always fails backend validation with `recurrence.weekdays must be array of day indexes 0-6` — even when no recurrence/repeat option is selected at all. This is a full feature outage for the `standard` role, not a cosmetic bug, and was not visible in the static audit because it requires an actual POST request against the running validation logic to trigger.
2. **Task creation silently requires at least one checklist item.** The UI never marks this as required; the user only learns about it from an error banner that appears after they attempt to submit.
3. **Goal creation has the identical pattern** with sub-goals — "Add at least one sub-goal" is only shown post-submission, not indicated as a requirement beforehand.
4. **The Feedback page's Submit button stays silently disabled** until a category is selected from its dropdown, with no inline hint explaining why — a user can type a full message and have no idea why nothing happens when they click Submit.
5. **Every login triggers a 401 followed by a 429 (rate-limited)** on `POST /api/user/refresh` within the first few seconds. The app recovers and continues working, but this retry pattern is noisy and risky — worth tightening so a legitimate user session isn't ever at risk of hitting that rate limit under normal use.

**One positive confirmation worth recording:** role-based access control was verified to be enforced **server-side**, not just by hiding navigation links. Logging in as `executive` or `team-lead` and navigating directly to `/users` or `/platform-activity` by URL produced a real "Super Admin only" access-denied response from the server — not merely a hidden nav item that the route would have rendered anyway. This matters because the original audit could only confirm route definitions existed with `superAdminOnly` middleware attached in the source; it could not confirm the middleware actually fired correctly end-to-end without running the app.

No 500 errors, crashes, or broken layouts were found anywhere else across the ~38 distinct pages visited in this pass.

---

## 7. Overall assessment

The Pinata-as-primary-storage decision and the complete absence of any Render/Vercel deployment scaffolding (no `render.yaml`, no `.env.example` on either side, `nodemon` left as the production start command, Vercel auto-deploy explicitly disabled on both frontends) together suggest this codebase was built and tested locally but never actually taken through a real production deployment — it was left at "works on my machine," not shipped.

That said, the code itself is not uniformly weak. There's real defensive engineering in specific places — Deck Prep's AI-failure fallback/retry logic, the report-generation grounding/fact-check validation, the fail-fast environment-variable assertions at boot. The quality is inconsistent rather than absent, which is consistent with a developer who understands some parts well and cut corners or moved fast on others — most visibly the storage architecture and anything related to actually shipping.

---

## 8. Suggested order of work

1. **Render/Vercel deployment scaffolding** — nothing else matters until this exists: `render.yaml`/start scripts/`engines.node` for both backend services, `.env.example` for both, flip Vercel auto-deploy on, consolidate the API-URL env var naming on the frontend. *(Status: done — `render.yaml` added, start scripts fixed, both boot-crash bugs in Section 6.1 fixed as part of getting this far.)*
2. **Pinata/IPFS decision and implementation** — choose Option A (replace with private S3) or Option B (true removal), then execute per the file list in Section 2. *(Status: hidden from both frontends, not yet replaced or removed at the backend level — decision still open.)*
3. **Grok → Claude migration** — build the shared `services/aiClient.js`, migrate the six call sites, rewrite streaming/vision/JSON-mode handling, update the one frontend string. *(Status: intentionally paused — AI is hidden by default via `/api/grok/status` until a decision is made on whether to keep the AI feature at all; see CLAUDE.md.)*
4. **Fix the reminder-creation bug (Section 6.2, #1)** — this is a full feature outage discovered during QA, not a nitpick; recommend treating it with the same priority as the deployment blockers above rather than filing it under general cleanup.
5. **Everything else in Section 5 and the remaining Section 6.2 findings** (checklist/sub-goal UX, feedback button affordance, the refresh-token retry noise) is cleanup that can happen opportunistically, not a blocker to deployment.
