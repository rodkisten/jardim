CREATE TABLE integration_tokens(provider TEXT PRIMARY KEY,encrypted TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE oauth_pending(state_hash TEXT PRIMARY KEY,verifier TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE integration_events(id TEXT PRIMARY KEY,source TEXT NOT NULL,source_key TEXT NOT NULL,payload TEXT NOT NULL,received_at TEXT NOT NULL,UNIQUE(source,source_key));
