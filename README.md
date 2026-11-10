# My bookmark sync

Syncs Chrome bookmarks to PostgreSQL through n8n, with an Angular dashboard that shows the folder tree and lets a local AI model suggest folders. Nothing moves until a suggestion is approved.

- `extensions/` – the Chrome extension (Manifest V3). It sends every new or deleted bookmark to n8n and polls once a minute for changes made in the dashboard.
- `dashboard/` – the Angular dashboard, meant to run at `jarllindquist.com/bookmarks`.
- `n8n/bookmark-sync-workflow.json` – the n8n workflow behind all webhooks.

## Security

Every webhook needs a credential:

| Caller | Webhooks | How it is checked |
|---|---|---|
| Extension | `bookmarks-event`, `bookmarks-full-sync`, `bookmarks-get-updates`, `bookmarks-update-id` | n8n Header Auth: `X-Bookmark-Token` |
| Dashboard | `bookmarks-get-all`, `bookmarks-ai-organize`, `bookmarks-apply-organize` | `X-Admin-Session`, the same admin session as the cv admin on jarllindquist.com |

All SQL values are passed as query parameters, and CORS allows only `https://jarllindquist.com` (and `http://localhost:4200` for development).

## Setup

1. **n8n credential.** In n8n, create a credential of type *Header Auth* named `Bookmark extension token`, with the name `X-Bookmark-Token` and a long random value as the value.
2. **Workflow.** Import `n8n/bookmark-sync-workflow.json` (or update the existing workflow), and pick that credential in the four extension webhooks.
3. **Extension.** Load `extensions/` as an unpacked extension, open its options and paste the same value. The options page tests it against n8n.
4. **Dashboard.** Log in through `jarllindquist.com/admin` first. The dashboard reads the session from `localStorage` on the same domain; without it, it shows a link to the login.

The token is never stored in the code or in git.
