# FundCo AI Admin Frontend

This package is the administrative workspace for FundCo AI Version 1. It is the control surface used by admins, executives, and super admins to manage users, tasks, goals, performance, projects, reports, reminders, training, social activity, and team chat from an oversight perspective.

## Technology

- React 19
- Vite
- Axios
- Socket.IO client

## Local development

```bash
npm install
npm run dev
```

The admin frontend expects the admin backend to be running. If no explicit admin API URL is provided, the client resolves to the current browser origin in production-like environments and `http://127.0.0.1:4002` locally.

## Build and lint

```bash
npm run lint
npm run build
```

## Responsibilities

This frontend owns:

- admin session and refresh handling
- oversight dashboards and operational drill-downs
- user administration
- task and goal review flows
- project and team management views
- reminder, report, and training administration
- admin-side team chat and file operations

Business rules are still enforced server-side. The client should be treated as a workflow surface, not a trust boundary.

## Configuration

The frontend reads its API base from runtime configuration when available.

- `VITE_ADMIN_API_URL` - optional explicit admin API origin

## Related documents

- [../backend/README.md](../backend/README.md)
- [../backend/docs/API.md](../backend/docs/API.md)
