# Muhammad Hafiz — Personal Landing Page

A personal CV and portfolio landing page deployed to **Cloudflare Workers** with automatic Git-based builds. It includes a Gemini-powered CV chatbot, Supabase audit logging, and client-side ATS-friendly PDF generation.

## Features

- CV and portfolio content driven by `config.js`
- Gemini chatbot with server-side API-key handling and model fallback
- Supabase conversation and CV-download audit logging
- ATS-friendly PDF generated in the browser
- Static assets served by Cloudflare Workers

## Stack

| Layer | Technology |
|---|---|
| Hosting | Cloudflare Workers Static Assets |
| Deployment | Cloudflare Workers Builds, connected directly to GitHub |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Chat API | Cloudflare Worker + Google Gemini |
| Database / audit logs | Supabase PostgreSQL REST API |
| PDF | jsPDF (CDN) |

## Cloudflare setup

Connect this GitHub repository to **Workers Builds** in the Cloudflare dashboard and select the production branch `main`.

Use these build settings:

| Setting | Value |
|---|---|
| Root directory | `/` |
| Build command | `npm run cf:build` |
| Deploy command | `npm run cf:deploy` |

Every push or merge to `main` will then trigger a Cloudflare build and deployment. This repository does not need a GitHub Actions deployment workflow.

### Build environment variables

Add these under the Cloudflare build environment variables for the production environment:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase public anon/publishable key |

The build script injects these public Supabase settings into `chatbot.js`. The anon key is intended for browser use; keep Supabase Row Level Security enabled and restrict the policies to the required inserts.

### Worker secret

Set `GEMINI_API_KEY` as a **Worker secret**, not a build variable and not a repository secret:

```bash
npx wrangler secret put GEMINI_API_KEY
```

Run this once after the first Worker deployment, or add it through the Worker settings in the Cloudflare dashboard. The Gemini key is only read by `worker.js` and is no longer embedded in browser JavaScript.

## Database

The application currently uses an existing Supabase PostgreSQL project and the tables `chat_conversations` and `cv_downloads`. There is no D1 database and no migration directory in this repository, so there are currently no database migrations for the deployment command to run. Schema changes remain managed in Supabase until a versioned Supabase migration workflow is introduced.

Required tables and insert-only RLS policies are documented in the original project setup and must already exist in the Supabase project.

## Local development

The site is plain HTML/CSS/JavaScript. To test the Worker locally:

1. Install dependencies with `npm install`.
2. Create a local `.dev.vars` file containing `GEMINI_API_KEY`.
3. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your shell.
4. Run `npm run cf:build`.
5. Run `npx wrangler dev`.

Do not commit `.dev.vars` or real API keys.

## Editing the CV

All portfolio content lives in `config.js`. Update the relevant section and commit to `main`; Cloudflare Workers Builds handles the deployment automatically.
