CREATE TABLE capsules(id TEXT PRIMARY KEY,month TEXT NOT NULL,title TEXT NOT NULL,payload TEXT NOT NULL,payload_hash TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX capsules_month ON capsules(month,created_at DESC);
