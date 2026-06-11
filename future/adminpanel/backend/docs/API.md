# FundCo AI Admin Backend API Reference

This document describes the admin-plane API as it exists in the current codebase. It is based on `server.js` and the mounted route definitions under `routes/`.

## Service overview

- Base URL: `http://<host>:<admin-port>`
- Primary mount prefix: `/api/admin`
- Real-time endpoint: `/socket.io`

## Authentication and authorization

Admin routes are protected by admin-plane authentication and role checks.

Observed access layers:

- `authMiddleware` - validates the admin session
- `adminOnly` - restricts a route to admin-capable accounts
- `superAdminOnly` - restricts a route to super admins
- `teamFilter` - constrains visibility to the caller's effective team scope

## Response conventions

Like the user backend, the admin API is not perfectly uniform. Most routes return a success flag with a payload, but consumers should follow the contract of the specific module they are calling.

## Internal bridge endpoints

These endpoints are intended for trusted service-to-service use:

- `POST /api/admin/notifications/internal`
- `/api/admin/shared/*` proxy family

## Socket rooms

Authenticated admin sockets join:

- `admin:{adminId}`
- `user:{adminId}`

That dual join pattern exists so the admin plane can receive both admin-specific and mirrored user-scoped events where required by the current platform design.

## Route inventory

### Admin authentication

Base path: `/api/admin/auth`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/login` | no | Admin login |
| POST | `/refresh` | refresh cookie | Rotate the admin session |
| POST | `/logout` | refresh cookie | Revoke the current admin refresh session |
| GET | `/me` | yes | Get the current admin identity |
| PUT | `/password` | yes | Change the current admin password |

### Users

Base path: `/api/admin/users`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | yes | List users visible to the admin, subject to team filtering |
| GET | `/:id` | yes | Get a single user |
| GET | `/:id/logs` | yes | Get user activity logs |
| POST | `/` | super admin | Create a user |
| PUT | `/:id` | super admin | Update a user |
| PUT | `/:id/reset-password` | super admin | Reset a user password |
| DELETE | `/:id` | super admin | Delete a user |

### Team management

Base path: `/api/admin/team`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | yes | Get the admin's managed team |
| PUT | `/` | yes | Update team metadata or ownership details |
| POST | `/member` | yes | Add a team member |
| DELETE | `/member/:userId` | yes | Remove a team member |
| GET | `/available-users` | yes | List candidate users for team assignment |

### Tasks

Base path: `/api/admin/tasks`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | yes | List tasks in scope |
| GET | `/stats` | yes | Task summary metrics |
| GET | `/:id` | yes | Get a task |
| POST | `/` | yes | Create a task for a user |
| PUT | `/:id` | yes | Update a task |
| DELETE | `/:id` | yes | Delete a task |
| POST | `/:id/review` | yes | Review a task submission |
| POST | `/:id/comment` | yes | Add an admin comment to a task |
| POST | `/bulk` | yes | Run a bulk task action |

### Goals

Base path: `/api/admin/goals`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | yes | List goals in scope |
| GET | `/stats` | yes | Goal summary metrics |
| GET | `/:id` | yes | Get a goal |
| POST | `/` | yes | Create a goal for a user |
| PUT | `/:id` | yes | Update a goal |
| DELETE | `/:id` | yes | Delete a goal |
| POST | `/:id/comment` | yes | Add a goal comment |

### Reports

Base path: `/api/admin/reports`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | yes | List reports in scope |
| GET | `/stats` | yes | Report summary metrics |
| GET | `/:id` | yes | Get a report |
| POST | `/:id/review` | yes | Review a submitted report |
| POST | `/:id/note` | yes | Add an internal note to a report |

### Performance

Base path: `/api/admin/performance`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/leaderboard` | yes | Team or company leaderboard |
| GET | `/analytics` | yes | Dashboard analytics |
| GET | `/user/:userId/details` | yes | Detailed user performance view |
| POST | `/award` | yes | Award a bonus or recognition entry |

### Projects

Base path: `/api/admin/projects`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | yes | List projects |
| GET | `/:id` | yes | Get a project |
| POST | `/` | yes | Create a project |
| PUT | `/:id` | yes | Update a project |
| DELETE | `/:id` | yes | Delete a project |
| PUT | `/:id/members` | yes | Update project members |
| POST | `/:id/task` | yes | Attach a task to a project |
| DELETE | `/:id/task/:taskId` | yes | Remove a task from a project |

### Social moderation

Base path: `/api/admin/social`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | yes | List posts in scope |
| POST | `/announcement` | yes | Publish an announcement |
| DELETE | `/:id` | yes | Delete a post |
| DELETE | `/:postId/comments/:commentId` | yes | Delete a comment |

### Reminders

Base path: `/api/admin/reminders`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | yes | List reminders in scope |
| POST | `/` | yes | Create a reminder for a user |
| DELETE | `/:id` | yes | Delete a reminder |

### Learning administration

Base path: `/api/admin/learning`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/courses` | yes | List courses |
| GET | `/courses/:id` | yes | Get course detail |
| POST | `/courses` | super admin | Create a course |
| PUT | `/courses/:id` | super admin | Update a course |
| DELETE | `/courses/:id` | super admin | Delete a course |
| GET | `/progress` | yes | Get learning progress in scope |
| GET | `/stats` | yes | Training metrics |
| POST | `/enroll` | yes | Enroll a user in training |

### Meetings

Base path: `/api/admin/meetings`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | yes | List meeting rooms in scope |
| GET | `/:roomId` | yes | Get a room |
| POST | `/:roomId/end` | yes | End a room |

### Notifications

Base path: `/api/admin/notifications`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/internal` | internal | Create an admin notification from a trusted caller |

### Shared proxy

Base path: `/api/admin/shared`

This route family is a pass-through to the user backend. It is protected by admin authentication on the admin side and by `USER_BACKEND_INTERNAL_TOKEN` when forwarded to the user service. Treat it as an integration surface rather than a public product API.
