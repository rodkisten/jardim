# Jardim development instructions

- Read README.md before changing product scope; update its progress only for implemented, validated work.
- Run `pnpm format` across the entire repository whenever you work on this code, before completing work or committing changes. Do not limit formatting to the files you edited.
- Keep Prettier configuration versioned. Do not hand-minify source files or bypass formatting checks.
- Run `pnpm check` before publishing changes. It checks formatting, builds the app, generates Worker types, checks TypeScript and runs tests.
- Never commit secrets or generated build artifacts.

- Add focused comments for important business rules, invariants, security boundaries and non-obvious compatibility decisions. Explain why the rule exists and what must be preserved; avoid comments that merely repeat the code. Keep these comments updated when behavior changes.

- Use the pinned pnpm version and frozen pnpm-lock.yaml for installs. Declare imports through workspace package exports and list each package dependency explicitly.
- Preserve infra/cloudflare/migrations/0001_foundation.sql: it is already deployed. Prisma must map existing tables; forward migrations require reviewed SQL and preservation tests, never reset/db push in production.

## Solid 2.0

This project uses Solid 2.0 (`solid-js` 2.x with `@solidjs/web`). Components run once;
there is no re-render. Read `node_modules/solid-js/CHEATSHEET.md` before writing Solid code,
especially its last section, "What changed from 1.x".

Rules that matter most:

- Props are read, never destructured: `props.name` inside JSX, a memo, or an effect.
  `function Comp({ name })` loses reactivity. Pass values, not accessors: `<Child count={count()} />`.
- `createEffect(compute, apply)` takes two functions. The first reads reactive values and
  returns a result; the second receives it and performs side effects. One argument is an error.
- Stores are written through the draft: `setStore(s => { s.user.name = "Ada" })`.
  There are no path setters and no `produce`.
- Read reactive values inside JSX, a memo, or an effect, never at the top of a component body.
- Do not write a signal or store from a memo, an effect's compute function, or a component body.
  Write from event handlers, `onSettled`, or actions.

Names that no longer exist, and what to use:

- `solid-js/web` -> `@solidjs/web`; `solid-js/store` -> `solid-js`
- `Suspense` -> `Loading`; `SuspenseList` -> `Reveal`; `ErrorBoundary` -> `Errored`
- `mergeProps` -> `merge`; `splitProps` -> `omit`; `unwrap` -> `snapshot`; `onMount` -> `onSettled`
- `createResource` -> an async `createMemo` or `createStore(fn)` read under `<Loading>`
- `createSelector` -> `createProjection`; `createComputed` -> `createMemo` or a two-function `createEffect`
- `batch` -> writes batch on a microtask (`flush()` applies them now); `on()` -> the compute half of `createEffect`
- `startTransition` / `useTransition` -> built in; `isPending()` reports an in-flight change
- `Index` -> `<For keyed={false}>`; `indexArray` -> `mapArray`; `createMutable` -> `createStore` with draft setters
- `onError` / `catchError` -> `<Errored>` or the `error` option of `createEffect`
- `classList` -> `class={{ active: isActive() }}`; `use:` directives -> `ref={factory(args)}`
- `Context.Provider` -> `<Context value={...}>`; `equalFn` -> `isEqual`; `getListener` -> `getObserver`

Tooling:

- Skills: `node_modules/solid-js/skills/solid-2.0/SKILL.md` (primer),
  `node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md` (every warning code and its fix),
  `node_modules/@solidjs/diagnostics/skills/agent-loops/SKILL.md` (capture evidence, assert budgets),
  `node_modules/@solidjs/web/skills/server-components/SKILL.md` (server components and slots).
- A console warning with a bracketed code, such as `[REACTIVE_WRITE_IN_OWNED_SCOPE]`, is a defect.
  Look it up in the repair guide; do not suppress it.
- Verify a reactive change with `captureArtifact` and `expectNoDiagnostics` from `@solidjs/diagnostics`,
  or `POST /__solid/diagnostics` on the dev server with `{"method":"begin"}` ... `{"method":"end"}`.
- Lint with `eslint-plugin-solid/configs/v2` (or `v2-strict`).
- Docs: https://v2.solidjs.com/llms.txt; append `.md` to any page URL for its Markdown.
