# FundCo AI Admin Frontend

This package is the current Version 1 admin-facing workspace for FundCo AI. It provides the operational surface used by super admins, executives, team leads, and other privileged roles to manage users, tasks, goals, reminders, learning, projects, reports, and oversight workflows.

## Technology

- React
- Vite
- Axios for API transport
- Socket.IO client for real-time channels

## Local development

```bash
npm install
npm run dev
```

The frontend expects the admin backend to be running. If `VITE_ADMIN_API_URL` is not set, the client falls back to `http://localhost:4002`.

## Build and lint

```bash
npm run lint
npm run build
```

## Responsibilities

This frontend owns:

- admin authentication state and refresh handling
- user, team, and assignment management surfaces
- oversight views for goals, reports, reminders, learning, and projects
- access to shared operational tools exposed through the admin backend