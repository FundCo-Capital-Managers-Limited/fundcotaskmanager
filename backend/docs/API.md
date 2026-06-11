# FundCo AI User Backend API Reference

This document describes the current Version 1 user-plane API as mounted in `server.js`.

## Service overview

- Base URL: `http://<host>:<port>`
- Primary mount prefix: `/api`
- Real-time endpoint: `/socket.io`

## Authentication

Most routes require a bearer token in `Authorization: Bearer <token>`.

Session refresh is handled through:

- `POST /api/user/refresh`
- an HTTP-only refresh cookie set by the backend

Socket clients can authenticate with either:

- `handshake.auth.token`
- a bearer token in the handshake headers
- a valid refresh cookie

## Response conventions

The API is not fully uniform. Current modules return a mixture of:

- `{ success, ... }` envelopes
- direct resource payloads from older handlers
- internal bridge responses with a short success message

Consumers should parse responses by route contract, not by a global envelope assumption.

## Route groups

| Mount | Responsibility |
| --- | --- |
| `/api/user` | login, refresh, logout, profile, and session-oriented user actions |
| `/api/tasks` | task creation, updates, completion, submission, approvals, and task views |
| `/api/files` | file upload, file metadata, folders, and storage-related actions |
| `/api/chats` | direct chat, group chat, message history, reactions, attachments, and chat presence |
| `/api/bot` | organization AI chat history and assistant endpoints |
| `/api/urls` | shortened links and redirect metadata |
| `/download` | shortened-link resolution |
| `/api/posts` | social feed, announcements, reactions, comments, bookmarks, and media upload |
| `/api/reminders` | reminder creation, updates, notifications, and lifecycle management |
| `/api/goals` | personal goals, team goals, progress tracking, and status updates |
| `/api/performance` | scores, leaderboards, bonus flows, and analytics payloads |
| `/api/projects` | standard project workflows |
| `/api/revenue-projects` | revenue-linked project workflows and gated task progression |
| `/api/grok` | AI utility endpoints and prompt-driven workflows |
| `/api/meetings` | meeting creation, participant flows, and meeting lifecycle actions |
| `/api/meeting-reports` | meeting report creation, upload, review, and distribution |
| `/api/learning` | learning content, progress, course workflows, and assessment endpoints |
| `/api/documents` | document extraction, conversion, deck preparation, and document history |
| `/api/reports` | report drafting, saving, submission, and report history |
| `/api/feedback` | user feedback capture and review payloads |
| `/api/rooms` | video room creation, signaling support, room chat, and participant actions |
| `/api/notifications` | notification reads, lists, counts, and notification updates |
| `/api/link-preview` | metadata extraction for shared links |
| `/api/platform-activity` | platform-wide activity reporting for management surfaces |
| `/api/emit` | internal service-to-service socket emission bridge |

## Internal endpoints

These endpoints are not intended for the browser client:

- `POST /api/emit`

It requires:

- `x-internal-token`
- an event name allowed by the backend security configuration
- a permitted room name such as `user:<id>` or `admin:<id>`

## Socket events

Current socket usage includes:

- presence updates
- chat room joins and typing events
- reminder notifications
- goal update broadcasts
- direct room signaling support

The exact event names are defined in the server and socket helpers rather than through a separate schema registry.