const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];
const RETRIES_PER_MODEL = 3;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_HISTORY_ITEMS = 10;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const apiRoutes = {
      "/api/chat": () => handleChat(request, env, url),
      "/api/log/chat": () => handleChatLog(request, env, url),
      "/api/log/download": () => handleDownloadLog(request, env, url),
    };

    if (apiRoutes[url.pathname]) {
      const originError = validateOrigin(request, url);
      if (originError) return originError;
      return apiRoutes[url.pathname]();
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleChat(request, env, url) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  }
  if (!env.GEMINI_API_KEY) {
    return json({ error: "Chat service is not configured" }, 503);
  }

  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const { messages, systemInstruction } = parsed.data || {};

  if (
    !Array.isArray(messages) ||
    messages.length < 1 ||
    messages.length > MAX_HISTORY_ITEMS ||
    !messages.every(
      (item) =>
        item &&
        ["user", "model"].includes(item.role) &&
        Array.isArray(item.parts) &&
        item.parts.length > 0 &&
        item.parts.every(
          (part) => typeof part.text === "string" && part.text.length <= 4000
        )
    ) ||
    typeof systemInstruction !== "string" ||
    systemInstruction.length > 24000
  ) {
    return json({ error: "Invalid chat payload" }, 400);
  }

  try {
    const answer = await generateAnswer(env.GEMINI_API_KEY, systemInstruction, messages);
    return json({ answer });
  } catch (error) {
    console.error("[chat] Gemini fallback exhausted", error);
    return json({ error: "The assistant is temporarily unavailable" }, 502);
  }
}

async function handleChatLog(request, env, url) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  }
  const parsed = await readJson(request, 16 * 1024);
  if (parsed.error) return parsed.error;
  const { sessionId, role, message } = parsed.data || {};

  if (
    typeof sessionId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(sessionId) ||
    !["user", "assistant"].includes(role) ||
    typeof message !== "string" ||
    !message.trim() ||
    message.length > 12000
  ) {
    return json({ error: "Invalid chat log payload" }, 400);
  }
  if (!env.DB) return json({ error: "Database is not configured" }, 503);

  try {
    await env.DB.prepare(
      "INSERT INTO chat_conversations (id, session_id, role, message) VALUES (?, ?, ?, ?)"
    ).bind(crypto.randomUUID(), sessionId, role, message.trim()).run();
    return json({ ok: true }, 201);
  } catch (error) {
    console.error("[d1] Chat log insert failed", error);
    return json({ error: "Unable to save chat log" }, 500);
  }
}

async function handleDownloadLog(request, env, url) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  }
  const parsed = await readJson(request, 8 * 1024);
  if (parsed.error) return parsed.error;
  const { userAgent, referrer } = parsed.data || {};

  if (
    (userAgent != null && (typeof userAgent !== "string" || userAgent.length > 1024)) ||
    (referrer != null && (typeof referrer !== "string" || referrer.length > 2048))
  ) {
    return json({ error: "Invalid download log payload" }, 400);
  }
  if (!env.DB) return json({ error: "Database is not configured" }, 503);

  try {
    await env.DB.prepare(
      "INSERT INTO cv_downloads (id, user_agent, referrer) VALUES (?, ?, ?)"
    ).bind(
      crypto.randomUUID(),
      userAgent || null,
      referrer || "direct"
    ).run();
    return json({ ok: true }, 201);
  } catch (error) {
    console.error("[d1] CV download log insert failed", error);
    return json({ error: "Unable to save download log" }, 500);
  }
}

function validateOrigin(request, url) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ error: "Forbidden" }, 403);
  return null;
}

async function readJson(request, maxBytes = MAX_BODY_BYTES) {
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > maxBytes) {
    return { error: json({ error: "Request too large" }, 413) };
  }
  let raw;
  try {
    raw = await request.text();
  } catch {
    return { error: json({ error: "Unable to read request body" }, 400) };
  }
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return { error: json({ error: "Request too large" }, 413) };
  }
  try {
    return { data: JSON.parse(raw) };
  } catch {
    return { error: json({ error: "Invalid JSON body" }, 400) };
  }
}

async function generateAnswer(apiKey, systemInstruction, messages) {
  let lastError;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < RETRIES_PER_MODEL; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemInstruction }] },
              contents: messages,
            }),
          }
        );

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new Error(`${model} returned HTTP ${response.status}: ${detail.slice(0, 500)}`);
        }

        const data = await response.json();
        const answer = data?.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("")
          .trim();
        if (!answer) throw new Error(`${model} returned an empty response`);
        return answer;
      } catch (error) {
        lastError = error;
        console.error(`[chat] ${model} attempt ${attempt + 1} failed`, error);
        if (attempt < RETRIES_PER_MODEL - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
        }
      }
    }
  }
  throw lastError || new Error("All Gemini models exhausted");
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}
