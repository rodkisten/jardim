CREATE TABLE IF NOT EXISTS lectio_studies (
 cache_key TEXT PRIMARY KEY,
 day TEXT NOT NULL,
 model TEXT NOT NULL,
 prompt_version INTEGER NOT NULL,
 study TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS lectio_studies_day ON lectio_studies(day, model, prompt_version, created_at);
