CREATE TABLE IF NOT EXISTS oracle_usage (
 day TEXT PRIMARY KEY,
 requests INTEGER NOT NULL CHECK(requests >= 0)
);
