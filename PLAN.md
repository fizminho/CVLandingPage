# Landing Page Architecture & Deployment

## Overview

A personal CV and portfolio site for Muhammad Hafiz Bin Zulkiflee Amin. The frontend is static HTML/CSS/JavaScript, while a Cloudflare Worker securely proxies Gemini requests. Supabase remains the external PostgreSQL audit-log service.

## Architecture

- **Frontend:** Vanilla HTML, CSS and JavaScript served as Cloudflare Worker Static Assets.
- **Chat API:** `POST /api/chat` handled by `worker.js`.
- **AI:** Google Gemini API. The API key is stored as a Cloudflare Worker secret and never shipped to the browser.
- **Database:** Supabase PostgreSQL REST API for chat and CV download audit logs.
- **PDF:** jsPDF in the browser.
- **Deployment:** Cloudflare Workers Builds connected directly to GitHub branch `main`.

## Deployment

Cloudflare Workers Builds settings:

- Root directory: `/`
- Build command: `npm run cf:build`
- Deploy command: `npm run cf:deploy`

A commit or merge to `main` triggers the Cloudflare build and deployment. The former GitHub Pages deployment workflow is removed to avoid competing deployment targets.

## Environment configuration

Build environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

These are public Supabase client settings. `scripts/inject-env.mjs` injects them into `chatbot.js` at build time.

Worker secret:

- `GEMINI_API_KEY`

Set with `npx wrangler secret put GEMINI_API_KEY` or through Cloudflare Worker settings. It is accessed only by the Worker.

## Chat API safeguards

- Only `POST /api/chat` is accepted.
- Requests with a mismatched browser Origin are rejected.
- Request body and history lengths are bounded.
- Message roles and text payloads are validated.
- Gemini model fallback and retries run server-side.
- API failures return a generic client-facing error; provider details remain in Worker logs.

## Supabase schema

The application uses the existing Supabase tables:

- `chat_conversations`
- `cv_downloads`

There is currently no D1 database or versioned migration directory. No migration command is run during deployment because the database is hosted externally on Supabase and the schema is already provisioned. A future Supabase migration pipeline should be added only when schema changes are introduced and the Supabase project credentials/ref are available.

## Project files

- `index.html`: page layout and section rendering
- `style.css`: responsive styling
- `config.js`: CV and portfolio content
- `chatbot.js`: chat UI, API calls and Supabase chat logging
- `worker.js`: Gemini proxy and static asset Worker entry point
- `cv-download.js`: ATS PDF generation and download audit logging
- `wrangler.toml`: Cloudflare Worker and static asset configuration
- `scripts/inject-env.mjs`: injects public Supabase build configuration
