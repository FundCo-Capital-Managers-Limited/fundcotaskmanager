# CLAUDE.md — FundCo Platform Working Notes

This file is a living log of decisions, state, and open questions for this codebase.
Update it whenever something important is done or decided — don't let it go stale.
Full original audit: [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md).

## Architecture (quick reference)

Four services:
- `backend/` → Render (port 4001 locally) — main API
- `frontend/` → Vercel (port 5173 locally) — main user app
- `adminpanel/backend/` → Render, separate service (port 4002 locally) — admin API, shares the same MongoDB as main backend
- `adminpanel/frontend/` → Vercel, separate project (port 5174 locally) — admin dashboard

`_backup/` and `future/` are dead/stale — not deployed, excluded from all work.

## Local dev setup (done)

- MongoDB: running locally as a Windows service, both backends point at `mongodb://localhost:27017/fundco-dev`.
- `.env` files exist in `backend/`, `adminpanel/backend/`, `frontend/`, `adminpanel/frontend/` — all gitignored, never commit these.
- Secrets (`USER_JWT_SECRET`, `ADMIN_JWT_SECRET`, `INTERNAL_API_TOKEN` / `USER_BACKEND_INTERNAL_TOKEN`) were generated locally and are consistent across both backends per the sharing rules in `config/security.js`.
- All four services boot/build clean as of this writing (verified by actually starting each one, not just reading code).

## Decisions made so far

- **File Storage (Pinata/IPFS), Deck Prep, and Meetings are hidden from both frontends** (nav + routes removed) but **not deleted**. Backend code/data untouched. This was a deliberate choice to avoid being forced into the Pinata replace-vs-remove decision under deploy pressure. Pinata is a disqualifying architecture choice for a corporate product (no real deletion, no storage-layer access control, public IPFS dependency for business data) — see audit §2. Final call on replace (private S3) vs. true removal is still open.
- **Email**: reverted from Resend back to SMTP via `nodemailer` (generic SMTP, not hardcoded to Gmail — configurable via `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`). Reasoning: Resend's free tier is 100 emails/day; SMTP via a provider like Gmail (500/day) or Brevo (300/day) gives more headroom for free. No-ops cleanly (skips, doesn't throw) when SMTP env vars aren't set.
- **Push notifications (Firebase) disabled**, not removed. Revisit later — see Future Plans below.
- **AI (Grok) is hidden by default, fails safe.** The intent going forward: the frontend should behave as if there is no AI feature at all unless the backend affirmatively reports it's available. A `GET /api/grok/status` endpoint (public, no auth) returns `{ enabled: boolean }` based on whether an AI client could be constructed. The main frontend's Sidebar and `/ai-tools` route both check this and hide/redirect when disabled, defaulting to **hidden** until proven otherwise (fails closed, not open).
  - **Not yet covered**: `AIReportPanel`/`ReportEditor`'s "Generate with AI" button inside the Reports feature, and the admin frontend's own AI Tools page, don't check this status yet. Flagged as a follow-up, not done.
  - Any in-chat AI error already uses neutral "FundCo AI" branding, never "Grok"/"Claude" by name — this was already true in the existing code (`grokController.js`'s catch block), not something added.
- **Is OpenAI actually being called/billed anywhere?** No. The `openai` npm package is only used as a generic HTTP client shape — every instance of it is pointed at `baseURL: 'https://api.x.ai/v1'` (xAI/Grok, which happens to expose an OpenAI-compatible API). There is no real OpenAI/ChatGPT API usage or billing anywhere in this codebase. The `openai` package dependency will go away entirely once/if the Grok→Claude migration happens (it gets replaced by the Anthropic SDK). Nothing to remove right now beyond that eventual swap.
- **Grok→Claude code migration is NOT done yet, intentionally paused.** Reasoning: the user is on Anthropic's free evaluation plan (no billing added) and is still undecided whether to keep the AI feature at all ("thinking of removing the whole AI thing but let's see"). Doing the full 6-file provider rewrite now would be wasted work if AI gets removed. Decision needed before this proceeds — see Open Questions.
- **Nodemon moved out of production start path.** `backend/package.json`: `start` is now `node server.js` (production-correct), `dev` is `nodemon server.js` for local use. `nodemon` moved from `dependencies` to `devDependencies`. `adminpanel/backend` already used `node server.js` correctly.
- **Two real boot-crash bugs fixed** (found by actually booting the server, not just reading code — the written audit didn't catch these because it was static analysis only):
  1. `utils/pushService.js` called `admin.initializeApp(...)` unconditionally at module-import time; `JSON.parse(undefined)` on a missing `FIREBASE_CREDENTIALS` crashed the whole server at boot, before even reaching the documented env-var checks.
  2. Five files (`services/grokService.js`, `controllers/grokController.js`, `controllers/botChatController.js`, `controllers/performanceController.js`, `utils/reminderScheduler.js`) constructed an `OpenAI` client unconditionally at import time; the SDK itself throws if `apiKey` is falsy — so a missing `GROK_API_KEY` crashed the server at boot, not just at first AI call as the static audit assumed. All five now guard construction the same way `documentController.js`/`reportController.js` already did (conditionally construct, `null` otherwise, callers check and return a clean 503/fallback instead of crashing).
- `render.yaml` added at repo root for both backend services on Render's **free** plan. See Open Questions for the tradeoffs of staying on free.

## Open questions / needs a decision

1. **Keep the AI feature at all, or remove it entirely?** User is undecided. If removed: delete the Grok call sites, the `/ai-tools` page, `AIReportPanel`, and all six backend files listed in the audit's migration section, rather than migrating them to Claude. If kept: need a real (non-evaluation) Anthropic API key with billing enabled before the Grok→Claude migration can be verified end-to-end.
2. **Pinata/File Storage**: replace with private S3, or remove the feature entirely? Still open (audit §2, Options A/B).
3. **Render free plan — what's at stake** (asked directly, answering here so it's on record):
   - Free web services **spin down after 15 minutes of inactivity** and take ~30-60s to cold-start on the next request. First request after idle will feel slow/hang; anyone testing right after a quiet period will think it's broken.
   - **In-process cron jobs stop firing while the service is asleep.** This app has two: `server.js`'s meeting-status cron (every 5 min) and `reminderScheduler.js` (every 30s). Both silently stop running whenever the free instance spins down, and only resume once something wakes it back up — so reminders/meeting transitions become unreliable on free, not just slow.
   - **Socket.IO connections drop on spin-down** and have to reconnect on wake — real-time features (chat, notifications) will visibly hiccup after any idle period.
   - **750 free instance-hours/month shared across all free services in the account.** Running both backends (main + admin) simultaneously roughly doubles consumption against that shared cap — worth watching if other free Render services exist on the same account.
   - **512MB RAM ceiling** on free instances — fine for this app's current load, but worth knowing if usage grows.
   - MongoDB itself is unaffected by this — it should be hosted externally (e.g., MongoDB Atlas free tier), not on Render, regardless of Render's plan.
   - Bottom line: free is fine for a review/demo deployment where occasional slow first-loads and slightly-late reminders are acceptable. It is not reliable for anything time-sensitive (real-time chat expectations, exact-time reminders) until upgraded to a paid instance type that doesn't spin down.

## Future plans

- **Bring back push notifications** once there's a reason to (Firebase credentials + a decision on whether Firebase is still the right vendor for it). Currently just disabled, not removed — `utils/pushService.js` guards cleanly and no-ops.
- Finish wiring the AI-hidden-when-unavailable behavior into `AIReportPanel`/`ReportEditor` and the admin frontend's AI Tools page (currently only the main frontend's Sidebar + `/ai-tools` route check `/api/grok/status`).
- Resolve the two open decisions above (AI keep/remove, Pinata replace/remove) before doing any further deep work in those areas — don't want to migrate code that then gets deleted.
- Fix the drifted Mongoose schemas between `backend/models/` and `adminpanel/backend/models/` (same MongoDB collections, independently hand-maintained schemas that have already diverged — e.g. `userModel.js`'s `executive` role, `taskModel.js`'s `assignedBy`/`adminComments` fields exist in one copy, not the other). Found during the audit, not yet fixed.
- Delete `_backup/` and `future/` once confirmed nobody needs them as reference (both are confirmed dead/stale, see audit).
