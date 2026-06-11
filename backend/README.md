# FundCo AI User Backend

This service is the current Version 1 user-plane backend for FundCo AI. It provides authentication, task and goal workflows, meetings, reminders, AI tooling endpoints, file and document services, chat, learning, projects, reports, and real-time updates for the user workspace.

## Runtime profile

- Runtime: Node.js
- Framework: Express
- Database: MongoDB via Mongoose
- Real-time transport: Socket.IO
- File handling: `express-fileupload`

## Local development

```bash
npm install
npm start
```

## Validation commands

```bash
npm test -- --runInBand
node --check server.js
```

## Required environment

The exact runtime is driven by the current security and session helpers, but the service expects at least:

- `PORT`
- `MONGO_URI`
- `USER_JWT_SECRET`
- `ADMIN_JWT_SECRET`
- `INTERNAL_API_TOKEN`
- `FRONTEND_URL`
- `ADMIN_FRONTEND_URL`

Additional integrations such as email, file storage, Microsoft Graph, OpenAI, and document tooling require their own service credentials when those features are enabled.

## Auth model

- Access tokens are sent in `Authorization: Bearer <token>`.
- Session refresh is handled through a refresh cookie and `/api/user/refresh`.
- Socket clients can authenticate with an access token or a valid refresh cookie.

## API reference

See [docs/API.md](docs/API.md) for the current mounted route surface.