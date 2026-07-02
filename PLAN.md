# Landing Page Implementation Plan

## Overview
A personal CV & portfolio landing page for Muhammad Hafiz Bin Zulkiflee Amin, deployed on GitHub Pages with an AI chatbot powered by Google Gemini and conversation storage via Supabase.

---

## Constraints & Requirements

| # | Requirement | Approach |
|---|-------------|----------|
| 1 | Deployed to GitHub Pages | Static site — pure HTML/CSS/JS, no build step required |
| 2 | Fully compatible with GitHub Pages | No server-side code; all logic runs client-side |
| 3 | CV & Projects showcase | Content driven from a single `config.js` data file |
| 4 | Easily editable without redeployment | All content lives in `config.js` — edit once, reflects everywhere |
| 5 | AI Chatbot (Gemini) scoped to CV only | System prompt restricts Gemini to CV context only |
| 6 | Store conversations to Supabase | Supabase JS SDK called directly from browser |
| 7 | Download CV as ATS-friendly PDF | Client-side PDF generation via `jsPDF`, audit logged to Supabase |

---

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Hosting | GitHub Pages | Free, static, no CI/CD needed |
| Frontend | Vanilla HTML + CSS + JS | Zero build tooling, maximum compatibility |
| AI | Google Gemini API (multi-model with fallback) | Free tier, REST API callable from browser |
| Database | Supabase (PostgreSQL) | Free tier, REST API callable from browser |
| PDF Generation | jsPDF (CDN) | Client-side, no server needed, ATS-friendly plain text output |

---

## Project Structure

```
LandingPage/
├── index.html          # Main entry point
├── style.css           # All styles
├── config.js           # ★ EDIT THIS FILE to update content
├── chatbot.js          # Gemini chatbot logic + Supabase storage
├── cv-download.js      # PDF generation + download audit logging
├── cv.md               # Source CV (reference only)
└── PLAN.md             # This file
```

---

## File Responsibilities

### `config.js` — The Single Source of Truth
All personal content is defined here. To update the site, only this file needs to be edited.

```js
// Example structure
const CONFIG = {
  name: "Muhammad Hafiz Bin Zulkiflee Amin",
  tagline: "Software Engineer",
  about: "...",
  contact: { email: "...", phone: "...", linkedin: "..." },
  experience: [ { title, company, period, points[] } ],
  skills: [ { name, since } ],
  education: [ { degree, institution, grade, period } ],
  projects: [ { title, description, tech[], link } ],  // add freely
  sections: ["about","experience","skills","education","projects","contact"] // control order
}
```

Adding a new section = add an entry to `CONFIG` + a renderer in `index.html`. No redeployment logic changes needed.

### `index.html`
- Reads `CONFIG` and dynamically renders all sections
- Renders a floating chatbot widget (toggle open/close)
- Loads `config.js` and `chatbot.js` as `<script>` tags

### `style.css`
- Clean, responsive single-page layout
- Mobile-friendly

### `chatbot.js`
- Calls Gemini API with a strict system prompt built from `CONFIG` data
- System prompt instructs Gemini: *"You are a personal assistant for Hafiz. Answer ONLY questions related to his CV, skills, experience, and projects. Politely decline anything else."*
- Uses a model priority list with retry-then-fallback strategy (see Gemini Setup)
- Saves each conversation turn `{ session_id, role, message, timestamp }` to Supabase

### `cv-download.js`
- Triggered by a "Download CV" button on the page
- Generates a PDF from `CONFIG` data using `jsPDF` (loaded via CDN)
- PDF is formatted as plain structured text — ATS-friendly (no tables, no columns, no images)
- After generating, logs a download audit record to Supabase `cv_downloads` table
- Filename: `Muhammad-Hafiz-CV.pdf`

---

## Supabase Setup

### Table: `chat_conversations`
```sql
create table chat_conversations (
  id uuid default gen_random_uuid() primary key,
  session_id text not null,
  role text not null,          -- 'user' or 'assistant'
  message text not null,
  created_at timestamptz default now()
);
```

### Table: `cv_downloads` (audit log)
```sql
create table cv_downloads (
  id uuid default gen_random_uuid() primary key,
  downloaded_at timestamptz default now(),
  user_agent text,             -- browser/device info
  referrer text                -- where the visitor came from
);
```

### RLS Policies (both tables)
```sql
-- Allow anonymous inserts only, no reads
alter table chat_conversations enable row level security;
create policy "anon insert only" on chat_conversations
  for insert to anon with check (true);

alter table cv_downloads enable row level security;
create policy "anon insert only" on cv_downloads
  for insert to anon with check (true);
```

### Keys needed (stored in `chatbot.js` / `cv-download.js`)
- `SUPABASE_URL` — from Supabase project settings
- `SUPABASE_ANON_KEY` — public anon key (safe for browser)

---

## ATS-Friendly PDF Format Rules

ATS (Applicant Tracking System) scanners parse plain text. The generated PDF must follow these rules:

| Rule | Implementation |
|------|---------------|
| Single column layout | jsPDF writes line by line, left to right |
| No images or icons | Text only |
| No tables or text boxes | Sections separated by blank lines and dividers (`---`) |
| Standard fonts | Helvetica (built into jsPDF) |
| Clear section headings | ALL CAPS headings (e.g. `WORK EXPERIENCE`) |
| Readable font size | 11pt body, 13pt name, 10pt metadata |
| Standard section order | Contact → Summary → Experience → Skills → Education |
| No headers/footers | Clean page margins only |
| Machine-readable date formats | e.g. `Dec 2019 - Present` |

---

## Gemini Setup

### Keys needed (stored in `chatbot.js`)
- `GEMINI_API_KEY` — from Google AI Studio

### Model Priority List
```js
const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
]
```

### Retry & Fallback Strategy
- Each model is tried up to **3 times** before moving to the next
- Total attempts before giving up: `3 retries × 4 models = 12 attempts`
- A short delay (exponential backoff) is applied between retries on the same model
- If all models are exhausted, the chatbot shows a user-friendly error message

```
Attempt flow:
  gemini-2.5-flash      → try 1 → try 2 → try 3 → FAIL
  gemini-2.5-flash-lite → try 1 → try 2 → try 3 → FAIL
  gemini-2.0-flash      → try 1 → try 2 → try 3 → FAIL
  gemini-2.0-flash-lite → try 1 → try 2 → try 3 → FAIL
  → Show error: "Sorry, I'm unavailable right now. Please try again later."
```

### Scoping Strategy
The chatbot is scoped by injecting the full CV content as a system prompt:
```
You are a personal assistant for Muhammad Hafiz. 
You ONLY answer questions about his CV, skills, work experience, education, and projects.
If asked anything outside this scope, politely say you can only discuss Hafiz's professional profile.

CV Data:
[full CONFIG data serialized here at runtime]
```

---

## GitHub Pages Deployment Steps

1. Push all files to a GitHub repository (e.g. `username/landing-page`)
2. Go to **Settings → Pages → Source → Deploy from branch → `main` / `root`**
3. Site will be live at `https://username.github.io/landing-page/`

> No build step. No GitHub Actions needed. Just push and it's live.

---

## How to Edit Content (Post-Deployment)

| Task | What to edit |
|------|-------------|
| Update job experience | `config.js` → `experience[]` |
| Add a new project | `config.js` → `projects[]` |
| Add a new section | `config.js` → add new key + add renderer in `index.html` |
| Change chatbot behavior | `chatbot.js` → modify system prompt string |
| Change styling | `style.css` |

---

## Security Notes

- Gemini API key and Supabase anon key will be visible in client-side JS — this is acceptable for a personal portfolio
- Supabase Row Level Security (RLS) should be enabled on `chat_conversations` to allow insert-only from anonymous users
- Gemini free tier has rate limits; the scoped system prompt minimises unnecessary token usage

---

## Implementation Order

1. `config.js` — populate with CV data
2. `index.html` — layout + dynamic section rendering + Download CV button
3. `style.css` — styling
4. `chatbot.js` — Gemini integration + Supabase storage
5. `cv-download.js` — jsPDF generation + audit logging
6. Supabase table creation (`chat_conversations` + `cv_downloads`)
7. GitHub Pages deployment
