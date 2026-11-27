CREATE ROLE jardim_insights_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

GRANT USAGE ON SCHEMA catalog, events, context, intelligence, knowledge, system TO jardim_insights_runtime;

GRANT SELECT ON catalog.tracks, catalog.artists, catalog.track_artists TO jardim_insights_runtime;

ALTER TABLE events.listening ENABLE ROW LEVEL SECURITY;

ALTER TABLE events.listening FORCE ROW LEVEL SECURITY;

CREATE POLICY owner_scope ON events.listening TO jardim_insights_runtime USING (owner_id = nullif(current_setting('jardim.owner_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('jardim.owner_id', true), ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON events.listening TO jardim_insights_runtime;

ALTER TABLE context.observations ENABLE ROW LEVEL SECURITY;

ALTER TABLE context.observations FORCE ROW LEVEL SECURITY;

CREATE POLICY owner_scope ON context.observations TO jardim_insights_runtime USING (owner_id = nullif(current_setting('jardim.owner_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('jardim.owner_id', true), ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON context.observations TO jardim_insights_runtime;

ALTER TABLE intelligence.embeddings ENABLE ROW LEVEL SECURITY;

ALTER TABLE intelligence.embeddings FORCE ROW LEVEL SECURITY;

CREATE POLICY owner_scope ON intelligence.embeddings TO jardim_insights_runtime USING (owner_id = nullif(current_setting('jardim.owner_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('jardim.owner_id', true), ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON intelligence.embeddings TO jardim_insights_runtime;

ALTER TABLE knowledge.relationships ENABLE ROW LEVEL SECURITY;

ALTER TABLE knowledge.relationships FORCE ROW LEVEL SECURITY;

CREATE POLICY owner_scope ON knowledge.relationships TO jardim_insights_runtime USING (owner_id = nullif(current_setting('jardim.owner_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('jardim.owner_id', true), ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge.relationships TO jardim_insights_runtime;

ALTER TABLE system.sync_cursors ENABLE ROW LEVEL SECURITY;

ALTER TABLE system.sync_cursors FORCE ROW LEVEL SECURITY;

CREATE POLICY owner_scope ON system.sync_cursors TO jardim_insights_runtime USING (owner_id = nullif(current_setting('jardim.owner_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('jardim.owner_id', true), ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON system.sync_cursors TO jardim_insights_runtime;
