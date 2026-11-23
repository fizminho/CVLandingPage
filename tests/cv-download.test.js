import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

function createDatabase() {
  const sessions = new Map();
  const downloadRows = [];
  const rateLimitRows = [];

  return {
    downloadRows,
    prepare(sql) {
      let values = [];
      return {
        bind(...args) {
          values = args;
          return this;
        },
        async run() {
          if (sql.includes("INSERT INTO anonymous_sessions")) {
            sessions.set(values[0], { token_hash: values[0], expires_at: values[1], chat_count: 0 });
          } else if (sql.includes("INSERT INTO cv_downloads")) {
            downloadRows.push({ id: values[0], user_agent: values[1], referrer: values[2] });
          }
          return { success: true };
        },
        async first() {
          if (sql.includes("INSERT INTO security_rate_limits")) {
            rateLimitRows.push({ scope: values[0], subject_hash: values[1] });
            return { hit_count: 1 };
          }
          if (sql.includes("SELECT token_hash, expires_at, chat_count FROM anonymous_sessions")) {
            const session = sessions.get(values[0]);
            return session && session.expires_at > values[1] ? session : null;
          }
          return null;
        },
      };
    },
  };
}

test("CV download endpoint stores a row in D1 after creating a session", async () => {
  const DB = createDatabase();
  const env = { DB, RATE_LIMIT_SECRET: "test-rate-limit-secret-that-is-32-bytes-minimum" };
  const origin = "https://cv.example.com";

  const sessionResponse = await worker.fetch(new Request(origin + "/api/session", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: "{}",
  }), env);

  assert.equal(sessionResponse.status, 201);
  const cookie = sessionResponse.headers.get("Set-Cookie");
  assert.match(cookie, /^__Host-cv_session=/);

  const downloadResponse = await worker.fetch(new Request(origin + "/api/log/download", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: cookie.split(";")[0],
      "User-Agent": "CV download integration test",
      Referer: "https://www.linkedin.com/",
    },
    body: "{}",
  }), env);

  assert.equal(downloadResponse.status, 201);
  assert.deepEqual(await downloadResponse.json(), { ok: true });
  assert.equal(DB.downloadRows.length, 1);
  assert.equal(DB.downloadRows[0].user_agent, "CV download integration test");
  assert.equal(DB.downloadRows[0].referrer, "https://www.linkedin.com");
});

test("CV download endpoint rejects requests without a same-origin header", async () => {
  const DB = createDatabase();
  const response = await worker.fetch(new Request("https://cv.example.com/api/log/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  }), { DB, RATE_LIMIT_SECRET: "test-rate-limit-secret-that-is-32-bytes-minimum" });

  assert.equal(response.status, 403);
  assert.equal(DB.downloadRows.length, 0);
});
