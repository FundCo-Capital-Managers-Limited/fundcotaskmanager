# FundCo AI User Backend

This service is the user-plane backend for FundCo AI Version 1. It owns user authentication, task and goal workflows, reminders, reports, document tooling, chat, meeting support, file handling, learning flows, notifications, AI tool orchestration, and the user Socket.IO namespace.

## Runtime profile

- Node.js service using Express 5
- MongoDB via Mongoose
- Socket.IO for user real-time channels
- Cron-based meeting state maintenance and reminder scheduling

## Local development

```bash
npm install
npm start
```

The service starts only after it can validate the required security configuration and connect to MongoDB.

## Test command

```bash
npm test
```

The backend test suite is controller and model focused. It is designed to validate the current business behavior without depending on a local Mongo test instance.

## Required configuration

At minimum, the service expects these values to resolve from the environment or mounted secret files:

- `PORT`
- `MONGO_URI`
- `USER_JWT_SECRET`
- `ADMIN_JWT_SECRET`
- `INTERNAL_API_TOKEN`
- `BASE_URL`
- `FRONTEND_URL`
- `PINATA_API_KEY`
- `PINATA_SECRET_API_KEY`
- `PINATA_JWT`

Additional optional configuration is supported for email, Zoom, AI providers, refresh token timing, Firebase, and origin control. The runtime environment loader in `config/runtimeEnv.js` is the authoritative source.

## Authentication model

The user backend uses a split-session model:

- short-lived bearer access token for API calls
- refresh token stored as an HTTP-only cookie

The backend also accepts internal calls from the admin plane through controlled internal-token paths.

## Real-time model

Socket clients are authenticated either by bearer token or refresh cookie. Authenticated users join the room `user:{userId}`. Presence updates, reminders, notifications, and task-related events are emitted through those rooms.

## Important operational notes

- Request and response shapes are mostly consistent, but not perfectly uniform across legacy modules. The API reference documents the current observed contract.
- File uploads are enabled for chat, bot, and post surfaces, with shared upload limits applied server-side.
- Meeting status is advanced by a scheduled job every five minutes.
- Reminder scheduling is started after the HTTP server is listening.

## Documents

- [docs/API.md](docs/API.md) - user backend API reference
