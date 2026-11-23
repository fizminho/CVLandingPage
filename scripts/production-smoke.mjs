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
