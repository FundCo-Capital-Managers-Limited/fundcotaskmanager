# Future Landing

This folder contains the rebuilt future-facing landing experience for FundCo AI.

Files:

- `index.html` - main future landing page
- `platforms.html` - platform directory page
- `styles.css` - shared styling for both pages
- `app.js` - theme handling and platform link configuration

## Platform links

By default, the landing uses:

- User workspace: `https://www.fundcoai.com`
- Admin workspace: `https://admin.fundcoai.com`
- Finance platform: `https://finance.fundcoai.com`

These can be overridden with query parameters:

- `?user=...`
- `?admin=...`
- `?finance=...`

Example:

`platforms.html?user=http://127.0.0.1:5173&admin=http://127.0.0.1:5174&finance=http://127.0.0.1:5175`

The same query parameters are preserved when navigating between the landing page and the platform directory.
