# FundCo AI Admin Backend

This service is the current Version 1 admin-plane backend for FundCo AI. It provides admin authentication, user and team management, oversight workflows, reminders, learning, reports, projects, social oversight, revenue-linked project control, and shared-service coordination with the user backend.

## Runtime profile

- Runtime: Node.js
- Framework: Express
- Database: MongoDB via Mongoose
- Real-time transport: Socket.IO

## Local development

```bash
npm install
npm start
```

## Validation commands

```bash
node --check server.js
```

## Required environment

The admin backend expects at least:

- `ADMIN_PORT`
- `MONGO_URI`
- `ADMIN_JWT_SECRET`
- `INTERNAL_API_TOKEN`
- `USER_BACKEND_INTERNAL_TOKEN`
- `ADMIN_FRONTEND_URL`

## Auth model

- Access tokens are sent in `Authorization: Bearer <token>`.
- Session refresh is handled through the admin refresh cookie and admin auth endpoints.
- Socket clients can authenticate with an access token or a valid refresh cookie.

## API reference

See [docs/API.md](docs/API.md) for the current mounted route surface.