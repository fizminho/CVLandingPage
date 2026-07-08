const GEMINI_API_KEY = "__GEMINI_API_KEY__";
const SUPABASE_URL = "__SUPABASE_URL__";
const SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__";

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

const RETRIES_PER_MODEL = 3;
const SESSION_ID = crypto.randomUUID();
const MAX_QUESTIONS = 5;
const SEND_COOLDOWN_MS = 5000; // 5s delay between messages

let questionCount = 0;
let lastSentAt = 0;
let isWaiting = false;

function buildSystemPrompt() {
  const c = CONFIG;
  return `You are a personal assistant for ${c.name}.
You ONLY answer questions about his CV, skills, work experience, education, and projects.
If asked anything outside this scope, politely say you can only discuss ${c.name.split(" ")[1]}'s professional profile.

--- CV DATA ---
Name: ${c.name}
Location: ${c.location}
Email: ${c.contact.email}
Phone: ${c.contact.phone}
LinkedIn: ${c.contact.linkedin}

SUMMARY:
${c.about}

WORK EXPERIENCE:
${c.experience.map((e) => `${e.title} at ${e.company} (${e.period})\n${e.points.map((p) => `- ${p}`).join("\n")}\nSkills: ${e.skills.join(", ")}`).join("\n\n")}

PREFERRED POSITIONS:
${c.preferredposition}

SKILLS:
${c.skills.map((s) => `${s.name} (since ${s.since})`).join(", ")}

PREVIOUS/OTHER SKILLS:
${c.previousskills.map((s) => `${s.name} (since ${s.since})`).join(", ")}

LANGUAGES:
${c.languages.map((l) => `${l.name}: ${l.proficiency}`).join("\n")}

EDUCATION:
${c.education.map((e) => `${e.degree}, ${e.institution}, ${e.grade} (${e.period})\nActivities: ${e.activities.join("; ")}`).join("\n")}

PROJECTS:
${c.projects.map((p) => `${p.title}: ${p.description} [Tech: ${p.tech.join(", ")}]`).join("\n")}

COMPETENCIES:
${c.competencies.map((comp) => comp.name).join(", ")}

ERP EXPERIENCE:
${c.erpExperience.map((e) => `${e.system} — ${e.duration}`).join("\n")}

REFERENCES:
${c.references.map((r) => `${r.name} — ${r.company} (${r.phone})`).join("\n")}
--- END CV DATA ---`;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callGemini(model, messages) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt() }] },
        contents: messages,
      }),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function sendToGemini(messages) {
  for (const model of MODELS) {
    for (let attempt = 0; attempt < RETRIES_PER_MODEL; attempt++) {
      try {
        return await callGemini(model, messages);
      } catch {
        if (attempt < RETRIES_PER_MODEL - 1) await sleep(1000 * 2 ** attempt);
      }
    }
  }
  throw new Error("All models exhausted");
}

async function saveToSupabase(role, message) {
  await fetch(`${SUPABASE_URL}/rest/v1/chat_conversations`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ session_id: SESSION_ID, role, message }),
  });
}

// --- UI ---
const chatHistory = []; // { role: "user"|"model", parts: [{text}] }

function appendMessage(role, text) {
  const box = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = `chat-msg chat-msg--${role}`;
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

async function handleSend() {
  const input = document.getElementById("chat-input");
  const btn = document.getElementById("chat-send");
  const text = input.value.trim();

  // Block all entry points — disabled input, waiting for reply, or empty text
  if (input.disabled || isWaiting || !text) return;

  // Hard block: limit reached
  if (questionCount >= MAX_QUESTIONS) {
    lockInput(input, btn);
    return;
  }

  // Cooldown check
  const now = Date.now();
  const elapsed = now - lastSentAt;
  if (elapsed < SEND_COOLDOWN_MS) {
    const wait = Math.ceil((SEND_COOLDOWN_MS - elapsed) / 1000);
    appendMessage("model", `Please wait ${wait} second${wait > 1 ? "s" : ""} before sending another message.`);
    return;
  }

  // Lock while waiting for reply
  isWaiting = true;
  lastSentAt = now;
  questionCount++;
  input.disabled = true;
  btn.disabled = true;
  input.value = "";

  appendMessage("user", text);
  saveToSupabase("user", text);
  chatHistory.push({ role: "user", parts: [{ text }] });

  appendMessage("model", "…");
  const thinking = document.querySelector(".chat-msg--model:last-child");

  try {
    const reply = await sendToGemini(chatHistory);
    chatHistory.push({ role: "model", parts: [{ text: reply }] });
    thinking.textContent = reply;
    saveToSupabase("assistant", reply);
  } catch {
    thinking.textContent = "Sorry, I'm unavailable right now. Please try again later.";
  } finally {
    isWaiting = false;
    if (questionCount >= MAX_QUESTIONS) {
      lockInput(input, btn);
    } else {
      input.disabled = false;
      btn.disabled = false;
      input.placeholder = `Ask a question… (${MAX_QUESTIONS - questionCount} left)`;
    }
  }
}

function lockInput(input, btn) {
  input.disabled = true;
  btn.disabled = true;
  input.placeholder = "Question limit reached. Refresh to start over.";
  // Only show the message once
  const msgs = document.querySelectorAll(".chat-msg--model");
  const last = msgs[msgs.length - 1];
  if (last && last.textContent.includes("limit")) return;
  appendMessage("model", "You've reached the 5-question limit for this session. Please refresh the page to start a new conversation.");
}

function initChat() {
  document.getElementById("chat-send").addEventListener("pointerup", (e) => { e.preventDefault(); handleSend(); });
  document.getElementById("chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
  const widget = document.getElementById("chat-widget");
  const label = document.getElementById("chat-label");

  function openChat(fromUser) {
    widget.classList.add("chat-widget--open");
    label.classList.add("chat-label--hidden");
    if (fromUser) document.getElementById("chat-input").focus();
  }
  function closeChat() {
    widget.classList.remove("chat-widget--open");
    label.classList.remove("chat-label--hidden");
  }

  label.addEventListener("pointerup", (e) => { e.preventDefault(); openChat(true); });
  document.getElementById("chat-close").addEventListener("pointerup", (e) => { e.preventDefault(); closeChat(); });
}
initChat();
