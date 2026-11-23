const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

const SESSION_COOKIE = "__Host-cv_session";
const SESSION_TTL_SECONDS = 24 * 60 * 60;
const MAX_BODY_BYTES = 48 * 1024;
const MAX_HISTORY_ITEMS = 10;
const MAX_QUESTION_LENGTH = 4000;
const MAX_SYSTEM_PROMPT_LENGTH = 16000;
const MAX_CHAT_QUESTIONS = 5;
const RATE_LIMIT_SECRET_REQUIRED = true;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response;

    if (url.pathname.startsWith("/api/")) {
      const routes = {
        "/api/session": () => handleSession(request, env),
        "/api/chat": () => handleChat(request, env),
        "/api/log/chat": () => handleChatLog(request, env),
        "/api/log/download": () => handleDownloadLog(request, env),
      };
      const handler = routes[url.pathname];
      response = handler
        ? await handler()
        : json({ error: "Not found" }, 404);
    } else {
      response = await env.ASSETS.fetch(request);
    }

    return applySecurityHeaders(response, request.url);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(cleanupExpiredData(env));
  },
};

async function handleSession(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const originError = validateOrigin(request);
  if (originError) return originError;
  const body = await readJson(request, 1024);
  if (body.error) return body.error;
  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data) || Object.keys(body.data).length !== 0) {
    return json({ error: "Invalid request body" }, 400);
  }
  if (!databaseReady(env)) return json({ error: "Service is not configured" }, 503);

  const existing = await getSession(request, env);
  if (existing) return json({ ok: true });

  const limited = await rateLimit(env, request, "session", 10, 60 * 60);
  if (!limited.allowed) return limited.response;

  const token = randomToken();
  const tokenHash = await sha256(token);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;

  try {
    await env.DB.prepare(
      "INSERT INTO anonymous_sessions (token_hash, expires_at, chat_count) VALUES (?, ?, 0)"
    ).bind(tokenHash, expiresAt).run();

    return json({ ok: true }, 201, {
      "Set-Cookie": `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`,
    });
  } catch {
    return json({ error: "Unable to create session" }, 503);
  }
}

async function handleChat(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const originError = validateOrigin(request);
  if (originError) return originError;
  if (!databaseReady(env) || !env.GEMINI_API_KEY || !env.RATE_LIMIT_SECRET) {
    return json({ error: "Chat service is not configured" }, 503);
  }

  const session = await getSession(request, env);
  if (!session) return json({ error: "Session expired. Refresh the page and try again." }, 401);

  const body = await readJson(request, MAX_BODY_BYTES);
  if (body.error) return body.error;
  const { messages, systemInstruction } = body.data || {};

  if (
    !Array.isArray(messages) ||
    messages.length < 1 ||
    messages.length > MAX_HISTORY_ITEMS ||
    !messages.every((item) =>
      item &&
      ["user", "model"].includes(item.role) &&
      Array.isArray(item.parts) &&
      item.parts.length > 0 &&
      item.parts.length <= 1 &&
      item.parts.every((part) =>
        part &&
        typeof part.text === "string" &&
        part.text.length > 0 &&
        part.text.length <= MAX_QUESTION_LENGTH
      )
    ) ||
    typeof systemInstruction !== "string" ||
    systemInstruction.length < 1 ||
    systemInstruction.length > MAX_SYSTEM_PROMPT_LENGTH
  ) {
    return json({ error: "Invalid chat payload" }, 400);
  }

  const ipLimit = await rateLimit(env, request, "chat-ip", 10, 10 * 60);
  if (!ipLimit.allowed) return ipLimit.response;
  const dailyLimit = await rateLimit(env, request, "chat-daily", 50, 24 * 60 * 60);
  if (!dailyLimit.allowed) return dailyLimit.response;

  try {
    const question = await env.DB.prepare(
      "UPDATE anonymous_sessions SET chat_count = chat_count + 1 WHERE token_hash = ? AND expires_at > ? AND chat_count < ? RETURNING chat_count"
    ).bind(session.tokenHash, Math.floor(Date.now() / 1000), MAX_CHAT_QUESTIONS).first();

    if (!question) {
      return json({ error: "The 5-question session limit has been reached. Refresh the page to start a new session." }, 429);
    }

    const answer = await generateAnswer(env.GEMINI_API_KEY, systemInstruction, messages);
    return json({ answer, remaining: MAX_CHAT_QUESTIONS - question.chat_count });
  } catch (error) {
    if (error?.name === "AbortError" || error?.name === "TimeoutError") {
      return json({ error: "The assistant took too long to respond. Please try again." }, 504);
    }
    console.error("[chat] Provider request failed");
    return json({ error: "The assistant is temporarily unavailable" }, 502);
  }
}

async function handleChatLog(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const originError = validateOrigin(request);
  if (originError) return originError;
  if (!databaseReady(env)) return json({ error: "Database is not configured" }, 503);

  const session = await getSession(request, env);
  if (!session) return json({ error: "Session expired" }, 401);

  const limited = await rateLimit(env, request, "chat-log", 20, 10 * 60);
  if (!limited.allowed) return limited.response;

  const body = await readJson(request, 16 * 1024);
  if (body.error) return body.error;
  const { role, message } = body.data || {};

  if (
    !["user", "assistant"].includes(role) ||
    typeof message !== "string" ||
    !message.trim() ||
    message.length > 12000
  ) {
    return json({ error: "Invalid chat log payload" }, 400);
  }

  try {
    await env.DB.prepare(
      "INSERT INTO chat_conversations (id, session_id, role, message) VALUES (?, ?, ?, ?)"
    ).bind(crypto.randomUUID(), session.tokenHash, role, message.trim()).run();
    return json({ ok: true }, 201);
  } catch {
    console.error("[d1] Chat log insert failed");
    return json({ error: "Unable to save chat log" }, 503);
  }
}

async function handleDownloadLog(request, env) {
  const methodError = requirePost(request);
  if (methodError) return methodError;
  const originError = validateOrigin(request);
  if (originError) return originError;
  if (!databaseReady(env)) return json({ error: "Database is not configured" }, 503);

  const session = await getSession(request, env);
  if (!session) return json({ error: "Session expired" }, 401);

  const limited = await rateLimit(env, request, "download-log", 5, 60 * 60);
  if (!limited.allowed) return limited.response;

  const userAgent = cleanHeader(request.headers.get("User-Agent"), 512);
  const referrer = cleanHeader(request.headers.get("Referer"), 1024) || "direct";

  try {
    await env.DB.prepare(
      "INSERT INTO cv_downloads (id, user_agent, referrer) VALUES (?, ?, ?)"
    ).bind(crypto.randomUUID(), userAgent, referrer).run();
    return json({ ok: true }, 201);
  } catch {
    console.error("[d1] CV download log insert failed");
    return json({ error: "Unable to save download log" }, 503);
  }
}

function requirePost(request) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  }
  const contentType = request.headers.get("Content-Type") || "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    return json({ error: "Content-Type must be application/json" }, 415);
  }
  return null;
}

function validateOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return json({ error: "Origin header required" }, 403);
  try {
    if (new URL(origin).origin !== new URL(request.url).origin) {
      return json({ error: "Forbidden" }, 403);
    }
  } catch {
    return json({ error: "Forbidden" }, 403);
  }
  return null;
}

async function readJson(request, maxBytes = MAX_BODY_BYTES) {
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { error: json({ error: "Request too large" }, 413) };
  }
  if (!request.body) return { error: json({ error: "Request body required" }, 400) };

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { error: json({ error: "Request too large" }, 413) };
      }
      chunks.push(value);
    }
  } catch {
    return { error: json({ error: "Unable to read request body" }, 400) };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { data: JSON.parse(raw) };
  } catch {
    return { error: json({ error: "Invalid JSON body" }, 400) };
  }
}

async function getSession(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([A-Za-z0-9_-]{40,64})(?:;|$)`));
  if (!match || !env.DB) return null;

  const tokenHash = await sha256(match[1]);
  try {
    const session = await env.DB.prepare(
      "SELECT token_hash, expires_at, chat_count FROM anonymous_sessions WHERE token_hash = ? AND expires_at > ?"
    ).bind(tokenHash, Math.floor(Date.now() / 1000)).first();
    return session || null;
  } catch {
    return null;
  }
}

async function rateLimit(env, request, scope, limit, windowSeconds) {
  if (!env.DB || !env.RATE_LIMIT_SECRET) {
    if (RATE_LIMIT_SECRET_REQUIRED) {
      return { allowed: false, response: json({ error: "Rate limiting is not configured" }, 503) };
    }
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const subjectHash = await hmacSha256(env.RATE_LIMIT_SECRET, `${scope}:${ip}`);
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const expiresAt = windowStart + windowSeconds + 60;

  try {
    const row = await env.DB.prepare(
      `INSERT INTO security_rate_limits (scope, subject_hash, window_start, hit_count, expires_at)
       VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(scope, subject_hash, window_start)
       DO UPDATE SET hit_count = hit_count + 1, expires_at = excluded.expires_at
       WHERE security_rate_limits.hit_count < ?
       RETURNING hit_count`
    ).bind(scope, subjectHash, windowStart, expiresAt, limit).first();

    return row
      ? { allowed: true }
      : { allowed: false, response: json({ error: "Too many requests. Please try again later." }, 429, { "Retry-After": String(windowStart + windowSeconds - now) }) };
  } catch {
    return { allowed: false, response: json({ error: "Rate limiting is temporarily unavailable" }, 503) };
  }
}

async function generateAnswer(apiKey, systemInstruction, messages) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), 25000);

  try {
    for (const model of MODELS) {
      let response;
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemInstruction }] },
              contents: messages,
              generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
            }),
            signal: controller.signal,
          }
        );
      } catch (error) {
        if (controller.signal.aborted) throw error;
        continue;
      }

      if (response.status === 429 || response.status >= 500) continue;
      if (!response.ok) throw new Error("Provider rejected the request");

      const data = await response.json();
      const answer = data?.candidates?.[0]?.content?.parts
        ?.map((part) => typeof part.text === "string" ? part.text : "")
        .join("")
        .trim();

      if (!answer || answer.length > 16000) throw new Error("Provider returned an invalid response");
      return answer;
    }
    throw new Error("No available model");
  } finally {
    clearTimeout(timeout);
  }
}

async function cleanupExpiredData(env) {
  if (!env.DB) return;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM anonymous_sessions WHERE expires_at <= ?").bind(Math.floor(Date.now() / 1000)),
    env.DB.prepare("DELETE FROM security_rate_limits WHERE expires_at <= ?").bind(Math.floor(Date.now() / 1000)),
    env.DB.prepare("DELETE FROM chat_conversations WHERE datetime(created_at) < datetime('now', '-30 days')"),
    env.DB.prepare("DELETE FROM cv_downloads WHERE datetime(downloaded_at) < datetime('now', '-180 days')"),
  ]);
}

function databaseReady(env) {
  return Boolean(env.DB);
}

function cleanHeader(value, maxLength) {
  if (!value) return null;
  return value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, maxLength) || null;
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(new Uint8Array(digest));
}

async function hmacSha256(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toHex(new Uint8Array(signature));
}

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function applySecurityHeaders(response, requestUrl) {
  const headers = new Headers(response.headers);
  const isHttps = new URL(requestUrl).protocol === "https:";

  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com; upgrade-insecure-requests"
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");
  if (isHttps) headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (new URL(requestUrl).pathname.startsWith("/api/")) headers.set("Cache-Control", "no-store");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
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

export const __test = { validateOrigin, readJson, applySecurityHeaders, rateLimit };
