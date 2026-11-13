# Jardim development instructions

- Read README.md before changing product scope; update its progress only for implemented, validated work.
- Run `pnpm format` across the entire repository whenever you work on this code, before completing work or committing changes. Do not limit formatting to the files you edited.
- Keep Prettier configuration versioned. Do not hand-minify source files or bypass formatting checks.
- Run `pnpm check` before publishing changes. It checks formatting, builds the app, generates Worker types, checks TypeScript and runs tests.
- Never commit secrets or generated build artifacts.

- Add focused comments for important business rules, invariants, security boundaries and non-obvious compatibility decisions. Explain why the rule exists and what must be preserved; avoid comments that merely repeat the code. Keep these comments updated when behavior changes.

- Use the pinned pnpm version and frozen pnpm-lock.yaml for installs. Declare imports through workspace package exports and list each package dependency explicitly.
- Preserve infra/cloudflare/migrations/0001_foundation.sql: it is already deployed. Prisma must map existing tables; forward migrations require reviewed SQL and preservation tests, never reset/db push in production.
