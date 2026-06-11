# FundCo AI User Frontend

This package is the user-facing workspace for FundCo AI Version 1. It covers the day-to-day operating surface used by standard users: tasks, goals, meetings, reminders, team chat, document tools, AI tools, learning, reports, projects, performance views, and file access.

## Technology

- React 19
- Vite
- Axios for API transport
- Socket.IO client for real-time channels
- Jest and Testing Library for component and session-path tests

## Local development

```bash
npm install
npm run dev
```

The frontend expects the user backend to be running. If `VITE_API_URL` is not set, the client falls back to `http://localhost:4001`.

## Build, lint, and test

```bash
npm run lint
npm test -- --runInBand
npm run build
```

## Responsibilities

This frontend owns:

- user authentication state and refresh handling
- task, goal, and reminder interaction flows
- team chat, file upload, meeting, and social surfaces
- AI tool orchestration from the user side
- report drafting and submission
- learning and progress views

It does not contain the source of truth for permission decisions. Authorization and final workflow validation remain backend responsibilities.

## Configuration

The frontend is intentionally light on required environment variables.

- `VITE_API_URL` - optional explicit base URL for the user backend

When unset, the runtime uses the local default described above.

## Testing notes

The current test suite focuses on the business paths most likely to regress quietly:

- task modal validation and payload normalization
- task item completion and submission behavior
- user auth session storage and refresh handling
- admin auth client behavior as consumed from the shared workspace
- theme persistence

The suite is not an exhaustive page-level browser test harness. It is meant to catch behavioral drift in the core client flows that have historically broken under fast iteration.

## Related documents

- [../backend/README.md](../backend/README.md)
- [../backend/docs/API.md](../backend/docs/API.md)
