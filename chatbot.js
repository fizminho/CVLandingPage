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

SKILLS:
${c.skills.map((s) => `${s.name} (since ${s.since})`).join(", ")}

EDUCATION:
${c.education.map((e) => `${e.degree}, ${e.institution}, ${e.grade} (${e.period})`).join("\n")}

PROJECTS:
${c.projects.map((p) => `${p.title}: ${p.description} [Tech: ${p.tech.join(", ")}]`).join("\n")}

ERP EXPERIENCE:
${c.erpExperience.map((e) => `${e.system} — ${e.duration}`).join("\n")}
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
  if (!text) return;

  input.value = "";
  btn.disabled = true;
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
    btn.disabled = false;
    input.focus();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("chat-send").addEventListener("click", handleSend);
  document.getElementById("chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
  const widget = document.getElementById("chat-widget");
  const label = document.getElementById("chat-label");

  function openChat() {
    widget.classList.add("chat-widget--open");
    label.classList.add("chat-label--hidden");
  }
  function closeChat() {
    widget.classList.remove("chat-widget--open");
    label.classList.remove("chat-label--hidden");
  }

  document.getElementById("chat-toggle").addEventListener("click", () => {
    widget.classList.contains("chat-widget--open") ? closeChat() : openChat();
  });
  label.addEventListener("click", openChat);
  document.getElementById("chat-close").addEventListener("click", closeChat);

  // Auto pop-up after 2.5s so visitors notice the chatbot
  setTimeout(openChat, 2500);
});
