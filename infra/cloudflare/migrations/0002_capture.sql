-- Additive migration: never recreate memories because rowid is the existing sync cursor.
CREATE TABLE capture_devices (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE TABLE capture_events (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  source_event_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  url TEXT NOT NULL,
  UNIQUE(device_id, source_event_id)
);
CREATE INDEX capture_events_device ON capture_events(device_id);
