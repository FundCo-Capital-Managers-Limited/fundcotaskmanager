# FundCo AI Admin Backend API Reference

This document describes the current Version 1 admin-plane API as mounted in `server.js`.

## Service overview

- Base URL: `http://<host>:<admin-port>`
- Primary mount prefix: `/api/admin`
- Real-time endpoint: `/socket.io`

## Authentication and authorization

Admin routes are protected by admin-plane authentication and role checks.

Observed access layers include:

- admin auth middleware
- elevated-role checks for super-admin-only flows
- team-scoped filtering where a caller should not see data outside assigned coverage

## Response conventions

Most routes return `{ success, ... }` payloads, but some modules still return older resource-oriented payloads. Consumers should follow the contract of the specific route family they call.

## Route groups

| Mount | Responsibility |
| --- | --- |
| `/api/admin/auth` | login, refresh, logout, current admin session, and password/session flows |
| `/api/admin/users` | user listing, creation, updates, password resets, deletion, and activity lookups |
| `/api/admin/team` | team ownership, team membership, and available-user selection flows |
| `/api/admin/tasks` | admin task oversight, assignment, review, and task statistics |
| `/api/admin/goals` | goal oversight, comments, and goal statistics |
| `/api/admin/reports` | report review, approval, notes, and report statistics |
| `/api/admin/performance` | performance analytics, leaderboard views, and award actions |
| `/api/admin/projects` | standard project oversight workflows |
| `/api/admin/revenue-projects` | revenue-linked project control, phase management, and gated assignment flows |
| `/api/admin/social` | admin social-feed oversight |
| `/api/admin/reminders` | reminder creation, oversight, and reminder administration |
| `/api/admin/learning` | course, enrollment, progress, and training management |
| `/api/admin/meetings` | meeting-room oversight and operational controls |
| `/api/admin/notifications` | internal or admin-facing notification flows |
| `/api/admin/shared` | trusted proxy calls into shared user-backend services |

## Internal bridge endpoints

These endpoints are intended for trusted service-to-service use:

- `/api/admin/shared/*`

Their exact downstream behavior depends on the admin shared-proxy implementation and the configured internal token exchange.

## Socket rooms

Authenticated admin sockets join:

- `admin:{adminId}`
- `user:{adminId}`

That dual join pattern is used by the current platform so the admin plane can receive both admin-specific events and mirrored user-scoped events when needed by oversight flows.