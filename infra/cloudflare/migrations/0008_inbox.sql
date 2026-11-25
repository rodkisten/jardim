CREATE TABLE IF NOT EXISTS automation_inbox (
 id TEXT PRIMARY KEY, device_id TEXT NOT NULL, source TEXT NOT NULL, kind TEXT NOT NULL,
 title TEXT NOT NULL, url TEXT, observed_at TEXT NOT NULL, received_at TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','dismissed','approved'))
);
CREATE INDEX IF NOT EXISTS automation_inbox_status ON automation_inbox(status,received_at);
