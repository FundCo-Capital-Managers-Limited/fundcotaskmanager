# FundCo AI User Backend API Reference

This document describes the user-plane API as it exists in the current codebase. It is written against the mounted routes in `server.js` and the route definitions under `routes/`.

## Service overview

- Base URL: `http://<host>:<port>`
- Primary mount prefix: `/api`
- Real-time endpoint: `/socket.io`

## Authentication

Most routes require a bearer token in `Authorization: Bearer <token>`.

Session refresh is handled separately through:

- `POST /api/user/refresh`
- an HTTP-only refresh cookie set by the backend

Socket clients can authenticate with either:

- `handshake.auth.token`, or
- a valid refresh cookie

## Response conventions

There is no single envelope used by every legacy module.

Observed patterns:

- most current controllers return `{ success, ... }`
- some older modules return module-specific payloads directly
- internal bridge endpoints usually return a success flag and a short message

Consumers should parse responses by endpoint contract, not by assumption.

## Internal endpoints

These endpoints are not for the browser client:

- `POST /api/emit`
- `POST /api/reminders/internal/task-sync`
- `POST /api/reminders/internal/task-delete`
- `POST /api/notifications/internal`

They require an internal token and are used for cross-service coordination.

## Socket events

Server-side emitted events include:

- `newTask`
- `updateTask`
- `deleteTask`
- `taskReviewed`
- `newReminder`
- `reminderUpdated`
- `reminderDeleted`
- `notification:new`
- `presence:update`

## Route inventory

### Session and profile

Base path: `/api/user`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/register` | no | Disabled self-registration endpoint; returns a controlled rejection |
| POST | `/login` | no | User login |
| POST | `/refresh` | refresh cookie | Rotate refresh session and return a new access token |
| POST | `/logout` | refresh cookie | Revoke the current refresh session |
| GET | `/me` | yes | Get the current user profile |
| PUT | `/profile` | yes | Update profile details |
| PUT | `/password` | yes | Change password |
| PUT | `/push-token` | yes | Update push notification token |

### Tasks

Base path: `/api/tasks`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/gp` | yes | List tasks owned by the current user |
| POST | `/gp` | yes | Create a task |
| GET | `/:id/gp` | yes | Get a single task |
| PUT | `/:id/gp` | yes | Update a task |
| DELETE | `/:id/gp` | yes | Delete a task |
| POST | `/:id/submit` | yes | Submit a completed task for review |
| POST | `/:id/appeal` | yes | Appeal an admin-created task decision |

### Goals

Base path: `/api/goals`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | yes | List goals owned by the current user |
| POST | `/` | yes | Create a goal |
| GET | `/:id` | yes | Get a goal |
| PUT | `/:id` | yes | Update a goal |
| DELETE | `/:id` | yes | Delete a goal |

### Reminders

Base path: `/api/reminders`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/internal/task-sync` | internal | Sync task reminder state from a trusted caller |
| POST | `/internal/task-delete` | internal | Delete task reminder state from a trusted caller |
| POST | `/admin-sync/task-sync` | yes | Admin-approved reminder sync bridge |
| POST | `/admin-sync/task-delete` | yes | Admin-approved reminder delete bridge |
| POST | `/` | yes | Create a reminder |
| GET | `/` | yes | List reminders |
| PUT | `/:id` | yes | Update a reminder |
| DELETE | `/:id` | yes | Delete a reminder |
| PUT | `/:id/snooze` | yes | Snooze a reminder |
| PUT | `/:id/dismiss` | yes | Dismiss a reminder |
| PUT | `/preferences` | yes | Update reminder preferences |

### Notifications

Base path: `/api/notifications`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/internal` | internal | Create a notification from a trusted caller |
| POST | `/admin-sync/task` | yes | Mirror task notifications from admin flows |
| GET | `/` | yes | List notifications for the current user |
| PATCH | `/read-all` | yes | Mark all notifications as read |
| PATCH | `/context-read` | yes | Mark notifications read by business context |
| PATCH | `/:id/read` | yes | Mark a single notification as read |

### Performance

Base path: `/api/performance`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/leaderboard` | yes | Performance leaderboard |
| GET | `/me` | yes | Current user performance snapshot |
| GET | `/user/:userId/details` | yes | Detailed user performance view |
| GET | `/user/:userId/ai-note` | yes | Generated AI analysis note for a user |
| POST | `/award` | yes | Award bonus or recognition data |

### Projects

Base path: `/api/projects`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | yes | List visible projects |
| GET | `/:id` | yes | Get a project by id |

### Team chat

Base path: `/api/chats`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/init` | yes | Initial chat bootstrap payload |
| GET | `/users` | yes | List available users for chat |
| POST | `/individual` | yes | Create or resolve an individual chat |
| GET | `/groups` | yes | List group chats |
| POST | `/groups` | yes | Create a group chat |
| PUT | `/groups/:groupId/members` | yes | Add members to a group |
| GET | `/unread-counts` | yes | Per-chat unread counters |
| GET | `/user-chat-map` | yes | Chat mapping by user |
| POST | `/:chatId/read` | yes | Mark a chat as read |
| GET | `/:chatId/messages` | yes | List chat messages |
| POST | `/:chatId/messages` | yes | Send a message |
| GET | `/:chatId/pinned` | yes | List pinned messages |
| PUT | `/messages/:messageId` | yes | Edit a message |
| DELETE | `/messages/:messageId` | yes | Delete a message |
| POST | `/messages/:messageId/delete` | yes | Legacy delete alias |
| POST | `/messages/:messageId/pin` | yes | Pin a message |
| DELETE | `/messages/:messageId/pin` | yes | Unpin a message |
| POST | `/messages/:messageId/forward` | yes | Forward a message |
| POST | `/upload` | yes | Upload a chat file |
| GET | `/timestamps` | yes | Chat timestamp metadata |
| GET | `/unread-total` | yes | Aggregate unread count |

### AI chat and AI history

Base path: `/api/bot`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/chat` | yes | Send a message to the primary AI assistant |
| GET | `/chat/history` | yes | List AI chat history |
| DELETE | `/chat` | yes | Clear AI chat history |

Base path: `/api/grok`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/chat` | yes | Send a message to the Grok-backed tool surface |
| GET | `/history` | yes | List Grok conversations |
| GET | `/history/:chatId` | yes | Retrieve a single Grok conversation |
| PUT | `/history/:chatId` | yes | Update stored conversation metadata |
| DELETE | `/history/:chatId` | yes | Delete a conversation |
| DELETE | `/history/tool/:toolId` | yes | Clear history for a specific tool |

### Documents and deck preparation

Base path: `/api/documents`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/upload-pdf` | yes | Upload a PDF source document |
| POST | `/` | yes | Create a document record |
| GET | `/history` | yes | List document history |
| GET | `/:id` | yes | Fetch a document |
| DELETE | `/:id` | yes | Delete a document |
| POST | `/pdf-to-text` | yes | Deterministic PDF-to-text extraction |
| POST | `/raw-extract` | yes | Legacy extraction alias |
| POST | `/extract` | yes | Extract text from a document |
| POST | `/quick-convert` | yes | Convert source content into working output |
| POST | `/generate-ppt` | yes | Generate presentation data |
| POST | `/regenerate-slide` | yes | Rebuild an individual slide |
| POST | `/save-ppt` | yes | Persist PPT JSON state |
| POST | `/save-text` | yes | Persist extracted or edited full text |

### File storage

Base path: `/api/files`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/share/:token` | no | Read a shared file through a public token |
| GET | `/storage` | yes | Storage usage summary |
| POST | `/upload` | yes | Upload one or more files |
| GET | `/` | yes | List files |
| POST | `/move` | yes | Move files between folders |
| DELETE | `/trash/clear` | yes | Permanently clear trash |
| GET | `/folders` | yes | List folders |
| POST | `/folders` | yes | Create a folder |
| GET | `/folders/stats` | yes | Folder statistics |
| PATCH | `/folders/:id` | yes | Rename a folder |
| DELETE | `/folders/:id` | yes | Delete a folder |
| PATCH | `/:id/soft-delete` | yes | Move a file to trash |
| PATCH | `/:id/restore` | yes | Restore a trashed file |
| PATCH | `/:id/star` | yes | Toggle starred state |
| PATCH | `/:id/rename` | yes | Rename a file |
| PATCH | `/:id/tags` | yes | Update file tags |
| PATCH | `/:id/task` | yes | Associate a file to a task |
| POST | `/:id/share` | yes | Create or update a share token |
| DELETE | `/:id` | yes | Permanently delete a file |

### Meetings and rooms

Base path: `/api/meetings`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/` | yes | Create a meeting |
| GET | `/` | yes | List meetings |
| PUT | `/:id` | yes | Update a meeting |
| DELETE | `/:id` | yes | Delete a meeting |
| GET | `/:meetingId/transcript` | yes | Get meeting transcript |
| GET | `/:meetingId/recordings` | yes | Get meeting recordings |
| POST | `/signature` | yes | Generate meeting signature data |
| GET | `/users` | yes | List users eligible for meeting workflows |

Base path: `/api/rooms`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/` | yes | Create a room |
| GET | `/` | yes | List rooms for the current user |
| GET | `/active` | yes | List active rooms |
| GET | `/:roomId` | yes | Get a room |
| PUT | `/:roomId` | yes | Update room details |
| DELETE | `/:roomId/end` | yes | End a room |
| DELETE | `/:roomId/kick/:userId` | yes | Remove a participant |
| POST | `/:roomId/invite` | yes | Invite a participant |
| POST | `/:roomId/chat` | yes | Send a room chat message |
| GET | `/:roomId/chat` | yes | Get room chat history |

### Learning

Base path: `/api/learning`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/courses` | yes | List courses |
| GET | `/courses/:id` | yes | Get full course detail |
| GET | `/progress` | yes | Get all course progress for the current user |
| GET | `/progress/:courseId` | yes | Get progress for one course |
| POST | `/progress` | yes | Legacy progress update alias |
| POST | `/module-progress` | yes | Update module progress |
| GET | `/stats` | yes | Learning statistics |
| POST | `/enroll` | yes | Enroll in a course |
| GET | `/exam/:courseId` | yes | Get exam questions |
| POST | `/exam/submit` | yes | Submit exam answers |
| POST | `/ai-query` | yes | AI-assisted learning query |
| GET | `/quiz/:moduleId` | yes | Generate module quiz |

### Reports

Base path: `/api/reports`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/` | yes | Create a manual report |
| POST | `/ai-generate` | yes | Generate report content with AI |
| POST | `/ai-save` | yes | Save AI-generated report content |
| GET | `/` | yes | List the current user's reports |
| GET | `/:id` | yes | Get a report |
| PUT | `/:id` | yes | Update a report |
| POST | `/:id/submit` | yes | Submit a report for review |
| DELETE | `/:id` | yes | Delete a report |

### Social feed

Base path: `/api/posts`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/` | yes | Create a post |
| GET | `/` | yes | List posts |
| GET | `/:id` | yes | Get a post |
| PUT | `/:id` | yes | Update a post |
| DELETE | `/:id` | yes | Delete a post |
| PUT | `/:id/react` | yes | React to a post |
| POST | `/:id/comments` | yes | Add a comment |
| DELETE | `/:id/comments/:commentId` | yes | Delete a comment |
| PUT | `/:id/bookmark` | yes | Toggle bookmark |
| POST | `/upload` | yes | Upload post media |

### Feedback

Base path: `/api/feedback`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/submit` | yes | Submit feedback |

### URL shortener

Base path: `/api/urls`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/shorten` | yes | Create a short link |
| GET | `/list` | yes | List short links for the current user |
| DELETE | `/:id` | yes | Delete a short link |

Download path:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/download/:shortCode` | no | Resolve and redirect through the short code |
