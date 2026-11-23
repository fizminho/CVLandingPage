import test from "node:test";
import assert from "node:assert/strict";
import { __test } from "../worker.js";

test("rejects non-POST mutation requests", () => {
  const req = new Request("https://cv.example/api/chat", { method: "GET" });
  assert.equal(__test.validateMutation(req).status, 405);
});

test("rejects missing and cross-origin Origin headers", () => {
  const missing = new Request("https://cv.example/api/chat", { method: "POST", headers: { "Content-Type": "application/json" } });
  const cross = new Request("https://cv.example/api/chat", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.example" } });
  assert.equal(__test.validateMutation(missing).status, 403);
  assert.equal(__test.validateMutation(cross).status, 403);
});

test("accepts exact same-origin JSON mutation", () => {
  const req = new Request("https://cv.example/api/chat", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://cv.example" } });
  assert.equal(__test.validateMutation(req), null);
});

test("rejects wrong content type", () => {
  const req = new Request("https://cv.example/api/chat", { method: "POST", headers: { Origin: "https://cv.example", "Content-Type": "text/plain" } });
  assert.equal(__test.validateMutation(req).status, 415);
});

test("rejects declared and streamed oversized bodies", async () => {
  const declared = new Request("https://cv.example/api/chat", { method: "POST", headers: { "Content-Length": "100", "Content-Type": "application/json" } });
  const streamed = new Request("https://cv.example/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "x".repeat(100) }) });
  assert.equal((await __test.readJson(declared, 10)).error.status, 413);
  assert.equal((await __test.readJson(streamed, 10)).error.status, 413);
});

test("rejects malformed JSON", async () => {
  const req = new Request("https://cv.example/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad" });
  assert.equal((await __test.readJson(req, 100)).error.status, 400);
});

test("adds browser security headers and no HSTS on HTTP", () => {
  const https = __test.secure(new Response("ok"), "https://cv.example/");
  assert.match(https.headers.get("Content-Security-Policy"), /frame-ancestors 'none'/);
  assert.equal(https.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(https.headers.get("X-Frame-Options"), "DENY");
  assert.match(https.headers.get("Strict-Transport-Security"), /max-age=31536000/);
  const http = __test.secure(new Response("ok"), "http://localhost:8787/");
  assert.equal(http.headers.get("Strict-Transport-Security"), null);
});

test("fails closed when rate-limit secret is absent", async () => {
  const req = new Request("https://cv.example/api/chat", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://cv.example" } });
  const result = await __test.rateLimit({ DB: {}, RATE_LIMIT_SECRET: "" }, req, "test", 5, 60);
  assert.equal(result.allowed, false);
  assert.equal(result.response.status, 503);
});

import { readFile } from "node:fs/promises";

test("frontend has no inline script or event-handler attributes", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const scriptTags = html.match(/<script\b[^>]*>/gi) || [];
  assert.ok(scriptTags.every(tag => /\bsrc\s*=/.test(tag)));
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
});

test("browser chatbot does not construct prompts or submit assistant history", async () => {
  const source = await readFile(new URL("../chatbot.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /buildSystemPrompt|systemInstruction|chatHistory|role:\s*["']model["']/);
  assert.ok(source.includes('postJson("/api/chat", { message })'));
});

test("profile rendering avoids unsafe HTML sinks", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /innerHTML|insertAdjacentHTML|document\.write/);
  assert.match(source, /textContent/);
});

test("fails closed when the rate-limit secret is too short", async () => {
  const req = new Request("https://cv.example/api/chat", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://cv.example" } });
  const result = await __test.rateLimit({ DB: {}, RATE_LIMIT_SECRET: "weak-secret" }, req, "test", 5, 60);
  assert.equal(result.allowed, false);
  assert.equal(result.response.status, 503);
});

test("server-side CV context is valid JSON and contains only public profile fields", async () => {
  const raw = await readFile(new URL("../cv-chat-context.json", import.meta.url), "utf8");
  const profile = JSON.parse(raw);
  assert.equal(profile.name, "Muhammad Hafiz Bin Zulkiflee Amin");
  assert.ok(Array.isArray(profile.experience));
  assert.ok(Array.isArray(profile.projects));
  assert.equal("apiKey" in profile, false);
  assert.equal("email" in profile, false);
});
