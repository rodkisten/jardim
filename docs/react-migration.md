# React + Girassol migration

## Target
React 19, Vite, TanStack Router and Query, Tailwind CSS v4, shadcn/ui (Radix), Vaul, Lucide and Tiptap React. Strict TypeScript. Semantic OKLCH tokens, graphite surfaces and sunflower yellow accents; mobile-first, safe areas and 16px form text on iOS.

## Workboard
- [ ] Port Girassol primitives to upstream shadcn patterns; preserve package boundary.
- [ ] Convert all web components and lifecycle effects, including Dexie subscriptions, audio cleanup and editor lifecycle.
- [ ] Replace Vite Solid Babel plugin, JSX settings and dependencies; regenerate pnpm lockfile.
- [ ] Introduce typed routes for home, timeline, memories, capsules, search and settings; preserve auth and existing faith/integration views.
- [ ] Apply approved dark mobile direction: compact cards, bottom navigation, quick capture, media-rich timeline and monthly capsules.
- [ ] Validate typecheck, lint, build, existing runtime/unit tests and authenticated Safari smoke.

## Invariants
Preserve IndexedDB schema, draft key, D1 migrations, API contracts, authentication, sync/retry and media queues. No destructive migrations or placeholder replacement of existing features. No Solid compatibility runtime in final bundle. No new component/E2E test suites. Intermediate commits [skip ci]; final validation commit [deploy]. Do not merge until checks pass.

## Status
Planning only; implementation not yet completed.
