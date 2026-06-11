# FundCo AI Workspace

This directory contains the active multi-application platform used to operate FundCo AI today and to stage controlled follow-on work. It is the part of the repository that should be treated as the live engineering surface.

## Layout

- `frontend/` - user-facing React application
- `backend/` - user platform API, file handling, document tooling, AI services, reminders, and user real-time channels
- `adminpanel/frontend/` - admin React application
- `adminpanel/backend/` - admin API, oversight workflows, and admin real-time channels
- `landing/` - standalone marketing and access page

## Execution model

The system is split into two application planes:

1. User plane
   - browser client in `frontend/`
   - API and Socket.IO service in `backend/`
2. Admin plane
   - browser client in `adminpanel/frontend/`
   - API and Socket.IO service in `adminpanel/backend/`

The admin backend can also proxy selected calls into the user backend for shared operational services.

## Local run order

Bring the services up in this order when you need the full platform:

1. `backend/`
2. `adminpanel/backend/`
3. `frontend/`
4. `adminpanel/frontend/`
5. `landing/` if needed

## Documentation

- [frontend/README.md](frontend/README.md)
- [backend/README.md](backend/README.md)
- [backend/docs/API.md](backend/docs/API.md)
- [adminpanel/frontend/README.md](adminpanel/frontend/README.md)
- [adminpanel/backend/README.md](adminpanel/backend/README.md)
- [adminpanel/backend/docs/API.md](adminpanel/backend/docs/API.md)
- [landing/README.md](landing/README.md)

## Scope note

This workspace began as a V1 fork, but it is no longer just a branch point. It now contains the maintained runtime code paths. Treat the documentation here as the source of truth for current platform behavior.
