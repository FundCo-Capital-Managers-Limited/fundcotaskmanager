# FundCo AI Landing

This folder contains the standalone landing experience used to route people into the user and admin workspaces.

## Runtime model

The landing page is static. There is no build step and no backend dependency.

- open `index.html` directly, or
- serve the directory from any static host

## Link targets

The current default entry targets are defined in `app.js`:

- user workspace: `https://www.fundcoai.com`
- admin workspace: `https://admin.fundcoai.com`

Local overrides can be supplied through query parameters:

- `?user=<url>`
- `?admin=<url>`

## Maintenance note

This page is intentionally self-contained. If the platform URLs or positioning change, update the static assets here rather than coupling the page to one of the application builds.
