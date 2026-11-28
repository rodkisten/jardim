# Spotify history import

Accepts standard StreamingHistory and Extended Streaming History JSON arrays. Dates are stored in UTC; historical local timezone is unknown and must not be inferred. Extended URI is preferred, otherwise normalized artist/title. Deduplication is exact within the same export format; cross-format reconciliation is not automatic. Zero-duration and non-track entries are skipped. IP, device, account and country fields are discarded. No network or Neon access. Import one JSON file at a time.
