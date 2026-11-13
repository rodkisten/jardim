CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE, title TEXT NOT NULL, body TEXT NOT NULL, tags TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts (ip_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_start INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS memories_created ON memories(created_at DESC, id);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
