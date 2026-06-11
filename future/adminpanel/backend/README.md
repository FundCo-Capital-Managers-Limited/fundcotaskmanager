# FundCo AI Admin Backend

This service is the admin-plane backend for FundCo AI Version 1. It handles admin authentication, user administration, team oversight, task and goal review workflows, project administration, performance views, reporting review, reminder oversight, social moderation, training administration, and controlled proxy calls into the user backend.

## Runtime profile

- Node.js service using Express 5
- MongoDB via Mongoose
- Socket.IO for admin real-time channels

## Local development

```bash
npm install
npm start
```

The service validates its required security configuration before startup.

## Current testing state

This package does not yet define a maintained automated test entry point in `package.json`. The absence is deliberate in this document because accuracy matters more than presentation. When you are planning CI or release gates, account for that gap explicitly rather than assuming parity with the user backend.

## Required configuration

At minimum, the service expects:

- `ADMIN_PORT`
- `MONGO_URI`
- `ADMIN_JWT_SECRET`
- `INTERNAL_API_TOKEN`
- `USER_BACKEND_INTERNAL_TOKEN`
- `ADMIN_FRONTEND_URL`

Optional values for origin control and user-backend targeting are loaded through `config/runtimeEnv.js`.

## Authentication model

The admin backend uses a dedicated admin token and refresh-cookie flow. It does not accept the user-plane token as an admin credential. Admin sockets can authenticate through either:

- bearer token, or
- a valid admin refresh cookie

## Shared-service bridge

The route family mounted at `/api/admin/shared` is a controlled proxy into the user backend. It exists for administrative workflows that still rely on user-plane services without duplicating that logic in the admin codebase.

## Documents

- [docs/API.md](docs/API.md) - admin backend API reference
