CREATE TABLE IF NOT EXISTS chat_conversations (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_session_created
  ON chat_conversations (session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_created
  ON chat_conversations (created_at);

CREATE TABLE IF NOT EXISTS cv_downloads (
  id TEXT PRIMARY KEY NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  downloaded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_cv_downloads_downloaded_at
  ON cv_downloads (downloaded_at);
