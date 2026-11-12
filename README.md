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
| Dashboard | `bookmarks-get-all`, `bookmarks-ai-organize`, `bookmarks-apply-organize` | `X-Admin-Session`, a session for app `bookmarks` from the shared magic-link login (it does not work in the cv admin, and a cv admin session does not work here) |

All SQL values are passed as query parameters, and CORS allows only `https://jarllindquist.com` (and `http://localhost:4200` for development).

## Setup

1. **n8n credential.** In n8n, create a credential of type *Header Auth* named `Bookmark extension token`, with the name `X-Bookmark-Token` and a long random value as the value.
2. **Workflow.** Import `n8n/bookmark-sync-workflow.json` (or update the existing workflow), and pick that credential in the four extension webhooks.
3. **Extension.** Load `extensions/` as an unpacked extension, open its options and paste the same value. The options page tests it against n8n. Tick "Den här datorn synkar med n8n" on **one** computer only: Chrome sync (the Google account) already spreads the bookmarks to the others, and Chrome ids differ per computer, so two syncing computers would mix them up in the database.
4. **Dashboard.** Open `jarllindquist.com/bookmarks` and log in with Telegram (the same magic link as the cv admin). The session is shared with the admin, since both are on the same domain.

The token is never stored in the code or in git.

## Deployment

Nobody needs to log in to the server:

- **CI** (`.github/workflows/ci.yml`) runs on every push and PR. It builds the dashboard, syntax-checks the extension, and fails if the n8n workflow has a webhook without auth or `{{ }}` inside an SQL query.
- **Deploy** (`.github/workflows/deploy.yml`) runs when CI is green on `main`, or by hand. It builds `dashboard/Dockerfile`, pushes `passwordnotsafe/bookmark-dashboard` to Docker Hub, copies `docker-compose.prod.yml` to `/home/repos/my-bookmark-sync` on the server and starts it. Traefik routes `jarllindquist.com/bookmarks` to the container.
- The server and Docker Hub secrets come from Vault, the same as for the other projects; the repo only holds `VAULT_ROLE_ID` and `VAULT_SECRET_ID`.

The n8n workflow is not deployed by this; it is updated in n8n.
