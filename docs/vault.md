# Vault v1
Local memory-only backup, AES-256-GCM, PBKDF2 SHA-256 600000 iterations, random salt and IV, authenticated version header. 32 MiB plaintext limit. Restore validates schema before preview and uses existing non-overwriting transaction. No password recovery. Attachments, capsules, drafts, history and encryption at rest are excluded. Browser download and crypto tests pending.

## V2 multimedia
Authenticated manifest and independently authenticated 1 MiB media chunks; per-file random salt and nonce prefix with monotonic counter. Restore reads slices, rejects truncation/trailing bytes and duplicate IDs; existing attachments are not overwritten. V1 imports remain supported. 128 MiB total plaintext cap; output Blob still retains encrypted chunks, so this is not disk streaming. Only local attachments included; remote-only media and sync behavior need verification.
