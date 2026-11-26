# Jardim offline-first

Delivery rule: ship coherent, integrated feature batches with validation and a usable preview; avoid fragmented micro-commits. Intermediate commits use [skip ci], final delivery uses [deploy].

## Offline contract

- Workbox precaches the versioned shell and lazy route chunks.
- Navigation uses the network first; offline fallback is the installed shell.
- API requests and personal data are not cached by Workbox. IndexedDB owns local data.
- Logout removes shell caches; it does not erase local memories.
- Updates require explicit user confirmation. Unsaved attachment selections must be completed before reload.
- PNG icons are generated deterministically at build time, including iOS 180px.
- Liturgies and completed studies can be stored locally. New inference needs network.
- Verify on a physical iPhone: install, open online, wait for readiness, airplane mode, reopen, create memory, reopen, reconnect and verify sync. Preview intentionally disables production sync and inference.

## Acceptance

CI must validate build, types, unit tests and preview. Production authentication and offline behavior require a separate authenticated device test.
