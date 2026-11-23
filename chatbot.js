const MAX_QUESTIONS = 5;
const SEND_COOLDOWN_MS = 5000;
let questionCount = 0;
let lastSentAt = 0;
let isWaiting = false;

function appendMessage(role, text) {
  const box = document.getElementById("chat-messages");
  const node = document.createElement("div");
  node.className = `chat-msg chat-msg--${role}`;
  node.textContent = String(text);
  box.appendChild(node);
  box.scrollTop = box.scrollHeight;
  return node;
}

async function postJson(path, body) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

async function initialiseSession() {
  try { await postJson("/api/session", {}); }
  catch { appendMessage("model", "Chat is temporarily unavailable. Please refresh and try again later."); }
}

async function handleSend() {
  const input = document.getElementById("chat-input");
  const button = document.getElementById("chat-send");
  const message = input.value.trim();
  if (!message || isWaiting || input.disabled) return;
  if (questionCount >= MAX_QUESTIONS) { lockInput(input, button); return; }
  const elapsed = Date.now() - lastSentAt;
  if (elapsed < SEND_COOLDOWN_MS) {
    const seconds = Math.ceil((SEND_COOLDOWN_MS - elapsed) / 1000);
    appendMessage("model", `Please wait ${seconds} second${seconds === 1 ? "" : "s"} before sending another message.`);
    return;
  }
  isWaiting = true;
  lastSentAt = Date.now();
  input.disabled = true;
  button.disabled = true;
  input.value = "";
  appendMessage("user", message);
  const pending = appendMessage("model", "…");
  try {
    const data = await postJson("/api/chat", { message });
    questionCount++;
    pending.textContent = data.answer;
  } catch (error) {
    pending.textContent = "Sorry, I'm unavailable right now. Please try again later.";
    if (/five-question|limit has been reached/i.test(error.message)) questionCount = MAX_QUESTIONS;
    console.warn("[chatbot] Chat request failed");
  } finally {
    isWaiting = false;
    if (questionCount >= MAX_QUESTIONS) lockInput(input, button);
    else {
      input.disabled = false;
      button.disabled = false;
      input.placeholder = `Ask a question… (${MAX_QUESTIONS - questionCount} left)`;
    }
  }
}

function lockInput(input, button) {
  input.disabled = true;
  button.disabled = true;
  input.placeholder = "Question limit reached. Refresh to start over.";
}

function initChat() {
  const input = document.getElementById("chat-input");
  const button = document.getElementById("chat-send");
  const widget = document.getElementById("chat-widget");
  const label = document.getElementById("chat-label");
  button.addEventListener("click", handleSend);
  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleSend(); }
  });
  label.addEventListener("click", () => {
    widget.classList.add("chat-widget--open");
    label.classList.add("chat-label--hidden");
    input.focus();
  });
  document.getElementById("chat-close").addEventListener("click", () => {
    widget.classList.remove("chat-widget--open");
    label.classList.remove("chat-label--hidden");
  });
  void initialiseSession();
}
initChat();
