import test from "node:test";
import assert from "node:assert/strict";
import { __test } from "../worker.js";

test("rejects requests without an Origin header", () => {
  const request = new Request("https://cv.example/api/chat", { method: "POST" });
  assert.equal(__test.validateOrigin(request).status, 403);
});

test("rejects cross-origin requests", () => {
  const request = new Request("https://cv.example/api/chat", {
    method: "POST",
    headers: { Origin: "https://attacker.example" },
  });
  assert.equal(__test.validateOrigin(request).status, 403);
});

test("accepts the exact same origin", () => {
  const request = new Request("https://cv.example/api/chat", {
    method: "POST",
    headers: { Origin: "https://cv.example" },
  });
  assert.equal(__test.validateOrigin(request), null);
});

test("rejects declared oversized JSON bodies", async () => {
  const request = new Request("https://cv.example/api/chat", {
    method: "POST",
    headers: { "Content-Length": "100", "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  });
  const result = await __test.readJson(request, 10);
  assert.equal(result.error.status, 413);
});

test("rejects oversized streamed JSON when Content-Length is absent", async () => {
  const request = new Request("https://cv.example/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: "x".repeat(100) }),
  });
  const result = await __test.readJson(request, 10);
  assert.equal(result.error.status, 413);
});

test("rejects malformed JSON", async () => {
  const request = new Request("https://cv.example/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{invalid",
  });
  const result = await __test.readJson(request);
  assert.equal(result.error.status, 400);
});

test("applies CSP and browser security headers", () => {
  const response = __test.applySecurityHeaders(
    new Response("ok"),
    "https://cv.example/"
  );
  assert.match(response.headers.get("Content-Security-Policy"), /frame-ancestors 'none'/);
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.equal(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(response.headers.get("Strict-Transport-Security"), /max-age=31536000/);
});

test("does not send HSTS on non-HTTPS local development", () => {
  const response = __test.applySecurityHeaders(new Response("ok"), "http://localhost:8787/");
  assert.equal(response.headers.get("Strict-Transport-Security"), null);
});

test("rate limiting fails closed when its secret is missing", async () => {
  const request = new Request("https://cv.example/api/chat", {
    method: "POST",
    headers: { Origin: "https://cv.example" },
  });
  const result = await __test.rateLimit({ DB: {}, RATE_LIMIT_SECRET: "" }, request, "test", 5, 60);
  assert.equal(result.allowed, false);
  assert.equal(result.response.status, 503);
});
