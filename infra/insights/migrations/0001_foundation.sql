CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS catalog;

CREATE SCHEMA IF NOT EXISTS events;

CREATE SCHEMA IF NOT EXISTS context;

CREATE SCHEMA IF NOT EXISTS knowledge;

CREATE SCHEMA IF NOT EXISTS intelligence;

CREATE SCHEMA IF NOT EXISTS analytics;

CREATE SCHEMA IF NOT EXISTS system;

CREATE TABLE IF NOT EXISTS catalog.tracks (id text PRIMARY KEY, title text NOT NULL, duration_ms integer CHECK(duration_ms>=0), bpm real CHECK(bpm>0), metadata jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS catalog.artists (id text PRIMARY KEY, name text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}');

CREATE TABLE IF NOT EXISTS catalog.track_artists (track_id text REFERENCES catalog.tracks(id), artist_id text REFERENCES catalog.artists(id), PRIMARY KEY(track_id,artist_id));

CREATE TABLE IF NOT EXISTS events.listening (owner_id text NOT NULL, id text NOT NULL, track_id text NOT NULL REFERENCES catalog.tracks(id), occurred_at timestamptz NOT NULL, timezone text NOT NULL, local_date date NOT NULL, provider text NOT NULL, external_id text NOT NULL, source text NOT NULL CHECK(source IN ('playback','manual','reference')), PRIMARY KEY(owner_id,id), UNIQUE(owner_id,provider,external_id));

CREATE INDEX IF NOT EXISTS listening_owner_time ON events.listening(owner_id,occurred_at);

CREATE TABLE IF NOT EXISTS context.observations (owner_id text NOT NULL,id text NOT NULL,kind text NOT NULL,observed_at timestamptz NOT NULL,source text NOT NULL,value jsonb NOT NULL,PRIMARY KEY(owner_id,id));

CREATE INDEX IF NOT EXISTS observations_owner_kind_time ON context.observations(owner_id,kind,observed_at);

CREATE TABLE IF NOT EXISTS intelligence.embeddings (owner_id text NOT NULL,entity_type text NOT NULL,entity_id text NOT NULL,model text NOT NULL,content_hash text NOT NULL,embedding vector(1024) NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(owner_id,entity_type,entity_id,model));

CREATE TABLE IF NOT EXISTS knowledge.relationships (owner_id text NOT NULL,source_id text NOT NULL,target_id text NOT NULL,kind text NOT NULL,evidence jsonb NOT NULL DEFAULT '{}',PRIMARY KEY(owner_id,source_id,target_id,kind));

CREATE TABLE IF NOT EXISTS system.sync_cursors (owner_id text NOT NULL,provider text NOT NULL,cursor text,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(owner_id,provider));
