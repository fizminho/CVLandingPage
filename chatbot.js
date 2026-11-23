const SESSION_ID = crypto.randomUUID();
const MAX_QUESTIONS = 5;
const SEND_COOLDOWN_MS = 5000;

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

--- END CV DATA ---`;
}

async function saveToDatabase(role, message) {
  try {
    await fetch("/api/log/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, role, message }),
      keepalive: true,
    });
  } catch (error) {
    console.warn("[chatbot] D1 logging failed:", error);
  }
}

const chatHistory = [];

function appendMessage(role, text) {
  const box = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = `chat-msg chat-msg--${role}`;
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

async function sendToGemini(messages) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: buildSystemPrompt(),
      messages,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Chat request failed: HTTP ${response.status}`);
  }
  if (typeof data.answer !== "string" || !data.answer.trim()) {
    throw new Error("Chat service returned an empty response");
  }
  return data.answer;
}

async function handleSend() {
  const input = document.getElementById("chat-input");
  const btn = document.getElementById("chat-send");
  const text = input.value.trim();

  if (input.disabled || isWaiting || !text) return;
  if (questionCount >= MAX_QUESTIONS) {
    lockInput(input, btn);
    return;
  }

  const now = Date.now();
  const elapsed = now - lastSentAt;
  if (elapsed < SEND_COOLDOWN_MS) {
    const wait = Math.ceil((SEND_COOLDOWN_MS - elapsed) / 1000);
    appendMessage("model", `Please wait ${wait} second${wait > 1 ? "s" : ""} before sending another message.`);
    return;
  }

  isWaiting = true;
  lastSentAt = now;
  questionCount++;
  input.disabled = true;
  btn.disabled = true;
  input.value = "";

  appendMessage("user", text);
  void saveToDatabase("user", text);
  chatHistory.push({ role: "user", parts: [{ text }] });

  appendMessage("model", "…");
  const thinking = document.querySelector(".chat-msg--model:last-child");

  try {
    const reply = await sendToGemini(chatHistory);
    chatHistory.push({ role: "model", parts: [{ text: reply }] });
    thinking.textContent = reply;
    void saveToDatabase("assistant", reply);
  } catch (error) {
    console.error("[chatbot] Request failed:", error);
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
  const msgs = document.querySelectorAll(".chat-msg--model");
  const last = msgs[msgs.length - 1];
  if (last && last.textContent.includes("limit")) return;
  appendMessage("model", "You've reached the 5-question limit for this session. Please refresh the page to start a new conversation.");
}

function initChat() {
  document.getElementById("chat-send").addEventListener("pointerup", (e) => {
    e.preventDefault();
    handleSend();
  });
  document.getElementById("chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
