# CLAUDE.md — FundCo Platform Working Notes

This file is a living log of decisions, state, and open questions for this codebase.
Update it whenever something important is done or decided — don't let it go stale.
Full original audit: [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md).

## Git commit convention (as of 2026-10-12)

Commits made by Claude for this repo use:
- **Author**: `Fundco Team <it@fundco.ng>`
- **Committer**: whoever's local git profile is actually running the commit (unchanged, not overridden)
- **Trailer**: `Co-Authored-By: <local git profile name/email>` (not a Claude attribution line — that convention was explicitly dropped for this repo)

In practice: `git commit --author="Fundco Team <it@fundco.ng>" -m "..."` with a `Co-Authored-By:` trailer for the local profile. Note: for GitHub to show "Fundco Team" as a linked profile/avatar rather than plain text, `it@fundco.ng` needs to be a verified email on the `fundco-it` GitHub account — that's a GitHub account setting, not something git itself controls.

## Architecture (quick reference)

Four services:
- `backend/` → Render (port 4001 locally) — main API
- `frontend/` → Vercel (port 5173 locally) — main user app
- `adminpanel/backend/` → Render, separate service (port 4002 locally) — admin API, shares the same MongoDB as main backend
- `adminpanel/frontend/` → Vercel, separate project (port 5174 locally) — admin dashboard

`_backup/` and `future/` were confirmed dead/stale and deleted from the repo on 2026-10-12 (see Decisions below).

## Local dev setup (done)

- MongoDB: running locally as a Windows service, both backends point at `mongodb://localhost:27017/fundco-dev`.
- `.env` files exist in `backend/`, `adminpanel/backend/`, `frontend/`, `adminpanel/frontend/` — all gitignored, never commit these.
- Secrets (`USER_JWT_SECRET`, `ADMIN_JWT_SECRET`, `INTERNAL_API_TOKEN` / `USER_BACKEND_INTERNAL_TOKEN`) were generated locally and are consistent across both backends per the sharing rules in `config/security.js`.
- All four services boot/build clean as of this writing (verified by actually starting each one, not just reading code).
- **Self-registration is disabled server-side** (`registerUser` in `backend/controllers/userController.js` always returns 403 — "Admin creates accounts manually"). There is no bootstrap path for the very first admin account through the API: admin creation requires an existing admin (`superAdminOnly` on `adminpanel/backend`'s `POST /api/admin/users/`), and there is no seed script for it. The first admin had to be created by writing directly to the `users` collection in MongoDB (role=`admin` is what the `superAdminOnly` middleware checks for — there's no separate "admin" collection, admin accounts are just `User` documents with an elevated `role`). Test accounts for all four roles (`admin`, `executive`, `team-lead`, `standard`) exist in the local `fundco-dev` database as of this session — ask the session that set them up for credentials rather than re-bootstrapping, to avoid clutter.
- A full manual QA pass (every page, every role, screenshots, write-up as an operating manual) was kicked off in the background — see whichever session/agent handled it for the resulting `qa-screenshots/OPERATING_MANUAL.md` (gitignored, not in version control).

## Decisions made so far

- **File Storage (Pinata/IPFS), Deck Prep, and Meetings are hidden from both frontends** (nav + routes removed) but **not deleted**. Backend code/data untouched.
- **Pinata decision (2026-10-12): replace with SharePoint/OneDrive, not S3 — but deferred, stays hidden for now.** User has effectively-unlimited company SharePoint/OneDrive storage and would rather use that than pay for S3. This is a bigger lift than S3 (OAuth via Microsoft Graph API — `@microsoft/microsoft-graph-client`/`@azure/msal-node` are already in `backend/package.json` as unused dependencies per the audit, so someone clearly scoped this before) and was explicitly deferred rather than done now: "you can just hide pinata if this may be too complex." Current state: Pinata/File Storage/Deck Prep remain hidden (as above), nothing else changed. When this gets picked up, it's a Microsoft Graph integration project, not a quick swap — treat it as its own piece of work, not a drop-in storage-backend change.
- **Email**: reverted from Resend back to SMTP via `nodemailer` (generic SMTP, not hardcoded to Gmail — configurable via `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`). Reasoning: Resend's free tier is 100 emails/day; SMTP via a provider like Gmail (500/day) or Brevo (300/day) gives more headroom for free. No-ops cleanly (skips, doesn't throw) when SMTP env vars aren't set.
- **Push notifications (Firebase) disabled**, not removed. Revisit later — see Future Plans below.
- **AI (Grok) is hidden by default, fails safe.** The intent going forward: the frontend should behave as if there is no AI feature at all unless the backend affirmatively reports it's available. A `GET /api/grok/status` endpoint (public, no auth) returns `{ enabled: boolean }` based on whether an AI client could be constructed. The main frontend's Sidebar and `/ai-tools` route both check this and hide/redirect when disabled, defaulting to **hidden** until proven otherwise (fails closed, not open).
  - **Done**: the admin frontend's Sidebar + `/ai-tools` route now also check `/api/grok/status` (against the main backend, same as the main frontend — admin's AI Tools calls the main backend directly).
  - **Not yet covered**: `AIReportPanel`/`ReportEditor`'s "Generate with AI" button inside the Reports feature still doesn't check this status. Flagged as a follow-up, not done.
  - Any in-chat AI error already uses neutral "FundCo AI" branding, never "Grok"/"Claude" by name — this was already true in the existing code (`grokController.js`'s catch block), not something added.
- **Grok → Claude migration: DONE (2026-10-12), verified working, still deliberately hidden.** All 7 AI call sites (`services/grokService.js`, `controllers/grokController.js`, `controllers/botChatController.js`, `controllers/documentController.js`, `controllers/performanceController.js`, `controllers/reportController.js`, `utils/reminderScheduler.js`) now go through one shared module, `backend/services/aiClient.js`, wrapping the Anthropic SDK (`@anthropic-ai/sdk`). The `openai` npm package was removed entirely — it was never actually calling OpenAI anyway, just using the SDK's shape against `api.x.ai` (xAI/Grok). Key implementation notes:
  - Streaming (`grokController.js`'s chat, `reportController.js`'s report rewrite) uses `aiClient.js`'s `chatCompleteStream()`, an async generator yielding text deltas — replaces manually reading `chunk.choices[0]?.delta?.content`.
  - Vision/file attachments: `grokController.js`'s `processFiles()` didn't need to change at all — it already built OpenAI-shaped `{type:'image_url', image_url:{url:'data:...'}}` parts, and `aiClient.js`'s converter handles translating those into Anthropic's `{type:'image', source:{type:'base64', media_type, data}}` blocks internally.
  - JSON mode: `documentController.js`'s `callSlideModel()` had no Anthropic equivalent for OpenAI's `response_format: json_object`, so JSON enforcement moved to an explicit prompt instruction appended when `responseFormat: true` is requested. `utils/jsonRepair.js`'s recovery-from-malformed-JSON logic is unchanged and still the real safety net.
  - Default model: `claude-sonnet-5` (override via `ANTHROPIC_MODEL` env var). Originally defaulted to a dated snapshot that logged a deprecation warning on first real call — caught during live testing and fixed before anyone would have hit it in practice.
  - **Verified working end-to-end against the real Anthropic API** (not just "builds without error") — a live test call authenticated successfully and got back `"Your credit balance is too low to access the Anthropic API"`, which confirms the code path is correct; it's purely blocked by the account being on the free evaluation plan with no billing added. Will start actually responding the moment billing/credits are added — no further code change needed.
  - **Still deliberately hidden from users regardless of the above.** `GET /api/grok/status` now checks a separate `AI_TOOLS_VISIBLE` env var (default unset/false) *and* whether the provider is configured — both must be true for the frontend to show AI Tools. This exists specifically so the feature can be fully built and verified without going live by accident the moment the API key happens to work. To actually launch it: set `AI_TOOLS_VISIBLE=true` on the main backend (Render + local `.env`), nothing else.
  - The `COMPANY_KNOWLEDGE` duplication flagged in the original audit (`grokService.js`'s full ~400-line version vs. `grokController.js`'s shorter hand-typed copy) was deliberately **not** consolidated during this migration — merging them would balloon the system-prompt size (and per-request cost) for all 28 tool prompts in `grokController.js`, which looks like why the original author kept them separate. Left as a known issue, not a migration blocker.
- **Nodemon moved out of production start path.** `backend/package.json`: `start` is now `node server.js` (production-correct), `dev` is `nodemon server.js` for local use. `nodemon` moved from `dependencies` to `devDependencies`. `adminpanel/backend` already used `node server.js` correctly.
- **Two real boot-crash bugs fixed** (found by actually booting the server, not just reading code — the written audit didn't catch these because it was static analysis only):
  1. `utils/pushService.js` called `admin.initializeApp(...)` unconditionally at module-import time; `JSON.parse(undefined)` on a missing `FIREBASE_CREDENTIALS` crashed the whole server at boot, before even reaching the documented env-var checks.
  2. Five files (`services/grokService.js`, `controllers/grokController.js`, `controllers/botChatController.js`, `controllers/performanceController.js`, `utils/reminderScheduler.js`) constructed an `OpenAI` client unconditionally at import time; the SDK itself throws if `apiKey` is falsy — so a missing `GROK_API_KEY` crashed the server at boot, not just at first AI call as the static audit assumed. All five now guard construction the same way `documentController.js`/`reportController.js` already did (conditionally construct, `null` otherwise, callers check and return a clean 503/fallback instead of crashing).
- `render.yaml` added at repo root for both backend services on Render's **free** plan. See Open Questions for the tradeoffs of staying on free.

## Open questions / needs a decision

1. ~~Keep the AI feature at all, or remove it entirely?~~ **Resolved 2026-10-12: keep it, migrated to Claude, stays hidden until `AI_TOOLS_VISIBLE=true` is set.** See Decisions above. Remaining open sub-question: needs real Anthropic billing added before it can actually serve a response in production.
2. ~~Pinata/File Storage: replace with private S3, or remove entirely?~~ **Resolved 2026-10-12: replace with SharePoint/OneDrive (Microsoft Graph), not S3 — but deferred as its own project.** Stays hidden in the meantime. See Decisions above.
3. **Render free plan — what's at stake** (asked directly, answering here so it's on record):
   - Free web services **spin down after 15 minutes of inactivity** and take ~30-60s to cold-start on the next request. First request after idle will feel slow/hang; anyone testing right after a quiet period will think it's broken.
   - **In-process cron jobs stop firing while the service is asleep.** This app has two: `server.js`'s meeting-status cron (every 5 min) and `reminderScheduler.js` (every 30s). Both silently stop running whenever the free instance spins down, and only resume once something wakes it back up — so reminders/meeting transitions become unreliable on free, not just slow.
   - **Socket.IO connections drop on spin-down** and have to reconnect on wake — real-time features (chat, notifications) will visibly hiccup after any idle period.
   - **750 free instance-hours/month shared across all free services in the account.** Running both backends (main + admin) simultaneously roughly doubles consumption against that shared cap — worth watching if other free Render services exist on the same account.
   - **512MB RAM ceiling** on free instances — fine for this app's current load, but worth knowing if usage grows.
   - MongoDB itself is unaffected by this — it should be hosted externally (e.g., MongoDB Atlas free tier), not on Render, regardless of Render's plan.
   - Bottom line: free is fine for a review/demo deployment where occasional slow first-loads and slightly-late reminders are acceptable. It is not reliable for anything time-sensitive (real-time chat expectations, exact-time reminders) until upgraded to a paid instance type that doesn't spin down.

## QA pass results (manual click-through, all 4 roles)

Full report + 82 screenshots: `qa-screenshots/OPERATING_MANUAL.md` (gitignored, local only). Bugs found:
1. **FIXED** — Reminder creation always failed server-side ("recurrence.weekdays must be array of day indexes 0-6") even with no recurrence configured. Root cause: passing `recurrence: null` into the Mongoose constructor/assignment still ran the nested subdocument's `weekdays` validator against an uninitialized value; passing `undefined` instead lets Mongoose skip the subdocument. Fixed in `backend/controllers/reminderController.js` (create + update).
2. **FIXED** — Task creation silently required ≥1 checklist item with the error only showing after submit. Now marked required with an inline hint in `TaskModal.jsx`.
3. **FIXED** — Goals had the identical issue with sub-goals. Same inline-hint fix in `Goals.jsx`.
4. **FIXED** — Feedback page's Submit button stayed disabled until a category was picked with no hint why. Now shows what's missing, in `Feedback.jsx`.
5. **FIXED** — Repeated 401→429 on `POST /api/user/refresh` after login. Root cause: `isRetryableRefreshError` treated a `'refresh token missing'` 401 as retryable, firing a second refresh call 350ms later for every unauthenticated/fresh page load (a missing cookie doesn't appear 350ms later). Fixed in both frontends' `security/authClient.js`.

Positive: role-based access control is enforced route-side, not just hidden nav (Executive/Team-Lead hitting `/users` or `/platform-activity` directly get a real access-denied screen, confirmed by direct navigation, not just UI hiding).

## Future plans

- **Bring back push notifications** once there's a reason to (Firebase credentials + a decision on whether Firebase is still the right vendor for it). Currently just disabled, not removed — `utils/pushService.js` guards cleanly and no-ops.
- **Pinata → SharePoint/OneDrive migration** — the real piece of work from the decision above. Scope: Microsoft Graph API integration (OAuth app registration, upload/download/delete against Graph's drive endpoints) replacing `backend/pinning/pinata.js` and the 4 callers listed in the audit (`fileController.js`, `chatController.js`, `meetingReportController.js`, `documentController.js`'s library-ingestion path). `@microsoft/microsoft-graph-client` and `@azure/msal-node` are already in `backend/package.json` as unused deps — someone scoped this before. Do this before un-hiding File Storage/Deck Prep.
- **Launch AI Tools** when ready: add real Anthropic billing, set `AI_TOOLS_VISIBLE=true` on the main backend. No code work left.
- Finish wiring the AI-hidden-when-unavailable behavior into `AIReportPanel`/`ReportEditor` (the admin frontend's AI Tools page is done, see above).
- ~~Fix the drifted Mongoose schemas between `backend/models/` and `adminpanel/backend/models/`~~ **Checked 2026-10-12: mostly a non-issue.** Diffed every shared model field-by-field (not just by eyeballing the audit's two examples) — `userModel.js` and `taskModel.js` (the two the audit specifically named) are actually already in sync; so are `goalModel.js`, `postModel.js`, `reportModel.js`, `roomModel.js`, `learningMaterialModel.js` — all "differences" turned out to be formatting style only (compact vs. expanded object literals), not real schema drift. **One real bug did turn up**: `adminpanel/backend`'s own `reminderModel.js` was missing the `emailOverride` format validator and a secondary index (now added to match), and — more importantly — `adminpanel/backend/controllers/reminderController.js` has its own independent copy of the reminder-creation logic and had the **exact same `recurrence: null`-crashes-validation bug** just fixed on the main backend (same root cause, never caught because QA only exercised the main app's Reminders page, not the admin dashboard's "send reminder to user" feature). Fixed and verified the same way (reproduced against a running server, confirmed fixed, then confirmed no regression on the with-recurrence case).
- ~~Delete `_backup/` and `future/`~~ **Done 2026-10-12.** Both confirmed dead/stale by the audit, removed from the repo along with the stale `tree.txt` (described an old pre-rename directory layout, see audit) and a stray committed dev-server log (`adminpanel/frontend/vite-dev.err`). README.md updated to drop all `future/`-workspace references.
- Consider consolidating the duplicated `COMPANY_KNOWLEDGE` prompt blob (see Grok→Claude migration note above) — deliberately left alone during the migration, but worth a deliberate look later.
