# Jardim development instructions

- Read README.md before changing product scope; update its progress only for implemented, validated work.
- Run `npm run format` across the entire repository whenever you work on this code, before completing work or committing changes. Do not limit formatting to the files you edited.
- Keep Prettier configuration versioned. Do not hand-minify source files or bypass formatting checks.
- Run `npm run check` before publishing changes. It checks formatting, builds the app, generates Worker types, checks TypeScript and runs tests.
- Never commit secrets or generated build artifacts.

- Add focused comments for important business rules, invariants, security boundaries and non-obvious compatibility decisions. Explain why the rule exists and what must be preserved; avoid comments that merely repeat the code. Keep these comments updated when behavior changes.
