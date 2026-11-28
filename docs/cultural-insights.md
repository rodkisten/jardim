# Jardim Insights

All cultural ingestion paths (archive imports, OAuth sync, pasted links, manual entries) must resolve to a shared cultural registry. Keep interactions separate from notes and deduplicate provider identities. Support music, albums, podcasts, films, series, books and other cultural works.

Metadata must preserve provenance, retrieval date, missing values and provider restrictions. Never invent acoustic features. Spotify-derived content must not be used for prohibited AI processing. Use licensed sources or user-provided audio for acoustic analysis. User mood and musical mood are separate dimensions.

Note sentiment analysis is opt-in, editable and private. Store suggested emotions, confidence, model/version and analysis timestamp separately from user-confirmed emotions. Never diagnose health or overwrite user labels. Support deletion and reanalysis; do not transmit private notes to external services without explicit consent.

Large archive import: stream ZIP entries and JSON records in a worker, checkpoint batches, deduplicate stable event identities, expose progress/cancel/resume, enforce decompression limits and never create one diary note per playback. Enrichment uses a bounded persistent queue with retry, cache and provider rate limits.

Settings must expose providers, automatic enrichment, analysis consent, limits and retention. Keep production and preview data isolated. Future Neon insights storage must not block local ingestion.

Acceptance: a pasted Spotify track and imported playback resolve to the same work; films/books follow the same registry contract; emotional suggestions remain distinct from confirmed feelings; all missing metrics remain null.
