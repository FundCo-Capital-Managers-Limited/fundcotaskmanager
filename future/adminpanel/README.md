# FundCo AI Admin Plane

This directory holds the administrative application plane:

- `frontend/` - the browser workspace used by admins and executives
- `backend/` - the API and real-time service behind that workspace

The admin plane is intentionally separate from the user plane because it carries a different authentication context, different permissions, and a small number of controlled bridge calls into the user backend.

For day-to-day work, start with:

- [frontend/README.md](frontend/README.md)
- [backend/README.md](backend/README.md)
- [backend/docs/API.md](backend/docs/API.md)
