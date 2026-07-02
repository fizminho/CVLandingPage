# Muhammad Hafiz — Personal Landing Page

A personal CV & portfolio landing page deployed on GitHub Pages. Features an AI chatbot powered by Google Gemini and conversation/download audit logging via Supabase.

---

## Features

- **CV & Portfolio** — Showcases work experience, skills, education and projects
- **AI Chatbot** — Powered by Google Gemini, scoped strictly to CV-related questions
- **Download CV** — Generates an ATS-friendly PDF on the fly, no pre-built file needed
- **Audit Logging** — Every chat message and CV download is logged to Supabase
- **Template-driven** — All content lives in `config.js`, edit once and it reflects everywhere
- **Zero build step** — Pure HTML/CSS/JS, works natively on GitHub Pages

---

## Project Structure

```
├── index.html        # Main page — renders all sections dynamically
├── style.css         # All styles
├── config.js         # ★ Edit this to update all content
├── chatbot.js        # Gemini AI chatbot + Supabase chat logging
├── cv-download.js    # ATS-friendly PDF generation + download audit
├── cv.md             # Source CV reference (not used at runtime)
└── PLAN.md           # Implementation plan & architecture notes
```

---

## Setup

### 1. Supabase

Create a free project at [supabase.com](https://supabase.com), then run the following in the **SQL Editor**:

```sql
-- Chat conversations table
create table chat_conversations (
  id uuid default gen_random_uuid() primary key,
  session_id text not null,
  role text not null,
  message text not null,
  created_at timestamptz default now()
);

-- CV download audit table
create table cv_downloads (
  id uuid default gen_random_uuid() primary key,
  downloaded_at timestamptz default now(),
  user_agent text,
  referrer text
);

-- RLS: allow anonymous inserts only
alter table chat_conversations enable row level security;
create policy "anon insert" on chat_conversations for insert to anon with check (true);

alter table cv_downloads enable row level security;
create policy "anon insert" on cv_downloads for insert to anon with check (true);
```

### 2. Gemini API Key

Get a free API key from [aistudio.google.com](https://aistudio.google.com).

### 3. Configure Keys via GitHub Secrets

Keys are injected at deploy time by GitHub Actions — they are never stored in the repository.

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret name | Value |
|-------------|-------|
| `GEMINI_API_KEY` | Your key from Google AI Studio |
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Your Supabase public anon key |

The workflow in `.github/workflows/deploy.yml` will automatically inject these into `chatbot.js` on every push to `main`.

---

## Deploy to GitHub Pages

1. Push all files to a GitHub repository
2. Go to **Settings → Pages**
3. Set **Source** → `GitHub Actions`
4. Add the 3 repository secrets (see Setup step 3)
5. Push to `main` — the Actions workflow will inject secrets and deploy automatically
6. Your site will be live at `https://<username>.github.io/<repo-name>/`

---

## Editing Content

All content is controlled from `config.js`. You can edit it directly on GitHub — changes reflect on the live site immediately after saving.

| Task | What to edit |
|------|-------------|
| Update personal info | `CONFIG.name`, `CONFIG.tagline`, `CONFIG.contact` |
| Update work experience | `CONFIG.experience[]` |
| Add / edit a project | `CONFIG.projects[]` |
| Update skills | `CONFIG.skills[]` |
| Update education | `CONFIG.education[]` |
| Reorder page sections | `CONFIG.sections[]` |
| Add a brand new section | Add key to `CONFIG` + add renderer to `RENDERERS` in `index.html` |
| Change chatbot behaviour | Edit system prompt in `chatbot.js` → `buildSystemPrompt()` |
| Change styling | `style.css` |

### Adding a New Section Example

**Step 1** — Add data to `config.js`:
```js
certifications: [
  { name: "AWS Cloud Practitioner", year: "2024" }
]
```

**Step 2** — Add it to the sections order in `config.js`:
```js
sections: ["about", "erp", "experience", "projects", "skills", "education", "certifications", "contact"]
```

**Step 3** — Add a renderer in `index.html` inside the `RENDERERS` object:
```js
certifications() {
  const items = CONFIG.certifications.map(c =>
    `<div class="skill-item">${c.name}<small>${c.year}</small></div>`
  ).join("");
  return `<section id="certifications">
    <div class="section-title">Certifications</div>
    <div class="skills-grid">${items}</div>
  </section>`;
},
```

No redeployment needed — just save and push.

---

## AI Chatbot

The chatbot uses Google Gemini and is hard-scoped to only answer questions about the CV. It will politely decline anything unrelated.

**Model fallback chain** (retries 3× per model before moving to the next):
```
gemini-2.5-flash → gemini-2.5-flash-lite → gemini-2.0-flash → gemini-2.0-flash-lite
```

If all models fail, the chatbot displays a friendly error message.

---

## CV Download

Clicking **Download CV** generates a PDF on the fly from `config.js` data using [jsPDF](https://github.com/parallax/jsPDF).

**ATS-friendly format:**
- Single column, plain text only
- ALL CAPS section headings
- Standard Helvetica font, 11pt body
- No images, tables, or text boxes
- Section order: Contact → Summary → Experience → Skills → Education → Projects

Every download is logged to the `cv_downloads` table in Supabase with timestamp, browser info and referrer.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Hosting | GitHub Pages |
| Frontend | Vanilla HTML / CSS / JS |
| AI | Google Gemini API |
| Database | Supabase (PostgreSQL) |
| PDF | jsPDF (CDN) |
