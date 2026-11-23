CREATE TABLE IF NOT EXISTS anonymous_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  expires_at INTEGER NOT NULL,
  chat_count INTEGER NOT NULL DEFAULT 0 CHECK (chat_count >= 0 AND chat_count <= 5),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_expires
  ON anonymous_sessions (expires_at);

CREATE TABLE IF NOT EXISTS security_rate_limits (
  scope TEXT NOT NULL,
  subject_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  hit_count INTEGER NOT NULL CHECK (hit_count > 0),
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (scope, subject_hash, window_start)
);

CREATE INDEX IF NOT EXISTS idx_security_rate_limits_expires
  ON security_rate_limits (expires_at);
