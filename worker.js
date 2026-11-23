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

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
      }

      const origin = request.headers.get("Origin");
      if (origin && origin !== url.origin) {
        return json({ error: "Forbidden" }, 403);
      }

      const declaredLength = Number(request.headers.get("Content-Length") || 0);
      if (declaredLength > MAX_BODY_BYTES) {
        return json({ error: "Request too large" }, 413);
      }

      if (!env.GEMINI_API_KEY) {
        return json({ error: "Chat service is not configured" }, 503);
      }

      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }

      const { messages, systemInstruction } = payload || {};
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

    return env.ASSETS.fetch(request);
  },
};

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
