const BASE_URL = (process.env.SMOKE_BASE_URL || "https://binalah.com").replace(/\/$/, "");
const failures = [];

function check(condition, message) {
  if (condition) console.log(`PASS  ${message}`);
  else { console.error(`FAIL  ${message}`); failures.push(message); }
}

async function request(path, options = {}) {
  return fetch(new URL(path, BASE_URL), {
    ...options,
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
}

console.log(`Production security smoke test: ${BASE_URL}`);

try {
  const home = await request("/");
  check(home.status === 200, `Homepage responds with HTTP 200 (got ${home.status})`);
  const headers = home.headers;
  const expectedHeaders = [
    ["content-security-policy", "Content-Security-Policy"],
    ["x-content-type-options", "X-Content-Type-Options"],
    ["x-frame-options", "X-Frame-Options"],
    ["referrer-policy", "Referrer-Policy"],
    ["permissions-policy", "Permissions-Policy"],
    ["strict-transport-security", "Strict-Transport-Security"],
    ["cross-origin-opener-policy", "Cross-Origin-Opener-Policy"],
    ["cross-origin-resource-policy", "Cross-Origin-Resource-Policy"],
  ];
  for (const [key, label] of expectedHeaders) check(Boolean(headers.get(key)), `${label} header is present`);
  check(headers.get("x-content-type-options") === "nosniff", "X-Content-Type-Options is nosniff");
  check(headers.get("x-frame-options") === "DENY", "X-Frame-Options is DENY");
  check((headers.get("content-security-policy") || "").includes("frame-ancestors 'none'"), "CSP blocks framing");
  check((headers.get("strict-transport-security") || "").includes("max-age="), "HSTS has max-age");
  const body = await home.text();
  check(body.length > 0 && /<html[\s>]/i.test(body), "Homepage returns HTML content");
} catch (error) {
  console.error("FAIL  Homepage request failed:", error.message);
  failures.push("Homepage request failed");
}

// Verify that the production session endpoint is configured and issues a hardened cookie.
// This creates one short-lived anonymous session but does not call Gemini or consume chat quota.
let sessionCookie = null;
try {
  const response = await request("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL },
    body: "{}",
  });
  check(response.status === 201, `Session creation returns HTTP 201 (got ${response.status})`);
  check(response.headers.get("cache-control") === "no-store", "Session response is not cacheable");
  const setCookie = response.headers.get("set-cookie") || "";
  const cookieMatch = setCookie.match(/(?:^|[,;]\s*)__Host-cv_session=([A-Za-z0-9_-]{40,64})/);
  sessionCookie = cookieMatch ? `__Host-cv_session=${cookieMatch[1]}` : null;
  check(Boolean(sessionCookie), "Session cookie is issued with a valid token");
  check(/\bHttpOnly\b/i.test(setCookie), "Session cookie is HttpOnly");
  check(/\bSecure\b/i.test(setCookie), "Session cookie is Secure");
  check(/\bSameSite=Strict\b/i.test(setCookie), "Session cookie uses SameSite=Strict");
  check(/\bPath=\\//i.test(setCookie), "Session cookie is scoped to root path");
} catch (error) {
  console.error("FAIL  Session creation failed:", error.message);
  failures.push("Session creation failed");
}

if (sessionCookie) {
  for (const [path, body] of [
    ["/api/chat", "{}"],
    ["/api/log/download", '{"unexpected":true}'],
  ]) {
    try {
      const response = await request(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: BASE_URL,
          Cookie: sessionCookie,
        },
        body,
      });
      check(response.status === 400, `${path} accepts the issued session and rejects invalid payload (HTTP ${response.status})`);
      check(response.headers.get("cache-control") === "no-store", `${path} authenticated error is not cacheable`);
    } catch (error) {
      console.error(`FAIL  ${path} authenticated request failed:`, error.message);
      failures.push(`${path} authenticated request failed`);
    }
  }
}

for (const path of ["/api/chat", "/api/log/download"]) {
  try {
    const response = await request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE_URL },
      body: "{}",
    });
    check(response.status === 401, `${path} rejects requests without a session (HTTP ${response.status})`);
    check(response.headers.get("cache-control") === "no-store", `${path} is not cacheable`);
    const data = await response.json().catch(() => ({}));
    check(typeof data.error === "string", `${path} returns a safe JSON error response`);
  } catch (error) {
    console.error(`FAIL  ${path} request failed:`, error.message);
    failures.push(`${path} request failed`);
  }
}

if (failures.length) {
  console.error(`\nSmoke test failed: ${failures.length} check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll production smoke checks passed.");
}
