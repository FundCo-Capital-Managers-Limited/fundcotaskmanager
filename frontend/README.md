# FundCo AI User Frontend

This package is the current Version 1 user-facing workspace for FundCo AI. It covers the day-to-day operating surface used by standard users: tasks, goals, meetings, reminders, team chat, learning, reports, projects, AI tools, performance views, and file access.

## Technology

- React
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
- team chat, meeting, social, and project surfaces
- AI tool orchestration from the user side
- report drafting and submission
- learning and performance views