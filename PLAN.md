# Landing Page Architecture & Deployment

## Overview

A personal CV and portfolio site. The frontend is static HTML/CSS/JavaScript, while a Cloudflare Worker securely proxies Gemini requests and writes audit logs to Cloudflare D1.

## Architecture

- **Frontend:** Vanilla HTML, CSS and JavaScript served as Cloudflare Worker Static Assets.
- **Chat API:** `POST /api/chat` handled by `worker.js`.
- **AI:** Google Gemini API. The API key is stored as a Cloudflare Worker secret and never shipped to the browser.
- **Database:** Cloudflare D1 for chat conversations and CV download audit logs.
- **PDF:** jsPDF in the browser.
- **Deployment:** Cloudflare Workers Builds connected directly to GitHub branch `main`.

## D1 schema

Migration files are versioned under `migrations/`.

- `chat_conversations`: `id`, `session_id`, `role`, `message`, `created_at`.
- `cv_downloads`: `id`, `user_agent`, `referrer`, `downloaded_at`.

The Worker accesses D1 through binding `DB`. The frontend never connects directly to D1 and has no database credentials.

## Deployment

Cloudflare Workers Builds settings:

- Root directory: `/`
- Build command: `npm run cf:build`
- Deploy command: `npm run cf:deploy`

The deploy script applies pending remote D1 migrations first, then deploys the Worker. A commit or merge to `main` triggers the Cloudflare build and deployment.

## Worker API safeguards

- Only `POST` is accepted for API endpoints.
- Requests with a mismatched browser Origin are rejected.
- JSON body sizes and field lengths are bounded.
- Chat roles, session IDs and payloads are validated.
- Gemini model fallback and retries run server-side.
- API failures return generic client-facing errors; provider details remain in Worker logs.
- D1 is never exposed directly to the browser.

## Project files

- `index.html`: page layout and section rendering
- `style.css`: responsive styling
- `config.js`: CV and portfolio content
- `chatbot.js`: chat UI and Worker API calls
- `worker.js`: Gemini proxy, D1 logging endpoints and static asset Worker entry point
- `cv-download.js`: ATS PDF generation and download audit logging
- `wrangler.toml`: Worker, D1 binding and static asset configuration
- `migrations/`: versioned D1 SQL migrations
