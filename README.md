# Muhammad Hafiz | Personal CV Landing Page

A personal CV and portfolio landing page deployed to **Cloudflare Workers** with automatic Git-based builds. It includes a Gemini-powered CV chatbot, Cloudflare D1 audit logging, and client-side ATS-friendly PDF generation.

## Features

- CV and portfolio content driven by `config.js`
- Gemini chatbot with server-side API-key handling and model fallback
- Chat conversation and CV-download audit logs stored in Cloudflare D1
- ATS-friendly PDF generated in the browser
- Static assets served by Cloudflare Workers

## Stack

| Layer | Technology |
|---|---|
| Hosting | Cloudflare Workers Static Assets |
| Deployment | Cloudflare Workers Builds, connected directly to GitHub |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Chat API | Cloudflare Worker + Google Gemini |
| Database / audit logs | Cloudflare D1 |
| PDF | jsPDF (CDN) |

## Cloudflare setup

Connect this GitHub repository to **Workers Builds** in the Cloudflare dashboard and select production branch `main`.

Use these build settings:

| Setting | Value |
|---|---|
| Root directory | `/` |
| Build command | `npm run cf:build` |
| Deploy command | `npm run cf:deploy` |

Every push or merge to `main` triggers a Cloudflare build and deployment. GitHub Actions is not used for deployment.

### Worker secret

Set `GEMINI_API_KEY` as a **Worker secret**, not a build variable:

```bash
npx wrangler secret put GEMINI_API_KEY
```

Do this once for the Worker. The Gemini key is read only by `worker.js` and is never embedded in browser JavaScript.

### D1 database

The Worker uses the D1 database `cvlandingpage` through the `DB` binding. Its database ID and migration directory are configured in `wrangler.toml`.

The versioned SQL migration in `migrations/` creates:

- `chat_conversations`: one row per user or assistant message, grouped by browser session ID.
- `cv_downloads`: one row per generated CV download, with user-agent and referrer metadata.

The deployment command applies pending remote D1 migrations before deploying the Worker:

```bash
npm run cf:deploy
```

Do not manually recreate these tables. Add future schema changes as new numbered SQL migration files in `migrations/`.

### Local development

1. Install dependencies: `npm install`.
2. Create `.dev.vars` containing `GEMINI_API_KEY=...`.
3. Run `npx wrangler dev`.
4. For local D1 migrations, use `npx wrangler d1 migrations apply cvlandingpage --local`.

Never commit `.dev.vars` or real API keys.

## Editing the CV

All portfolio content lives in `config.js`. Update the relevant section and commit to `main`; Cloudflare Workers Builds handles deployment automatically.
