# AGENTS.md

Durable guidance for agents working in this repository.

## Project Orientation

- This repo is the Scoped Agent Delegation WorkOS demo.
- `README.md` explains the public demo purpose and setup.
- `REPO_MAP.md` is the fast navigation map for AI agents.
- `ARCHITECTURE.md` explains ownership boundaries, data flow, and real-vs-demo services.
- The app uses Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, and npm.
- Paths currently use root-level `app/`, `components/`, and `lib/`. Add new top-level directories only when they have real code to own.

## Next.js 16 Warning

This is a current Next.js project, not the older Next.js shape most agents may remember. Before using unfamiliar Next.js APIs or conventions, check the installed docs under `node_modules/next/dist/docs/` or the current official docs. Use `eslint .`; do not use the removed `next lint` flow.

## How To Work

- Understand the existing design before editing.
- Keep diffs small and reviewable.
- Local `.agent/` planning files are ignored. Do not assume they are present in a fresh clone.
- Prefer extending existing modules over adding wrappers.
- Keep related invariants together, especially auth, authorization, audit logging, and persistence.
- Hide sequencing, caching, and policy decisions inside the owning module so callers have simple interfaces.
- Avoid adding knobs, flags, callbacks, or alternate paths unless they clearly reduce net complexity.
- Comments should explain invariants, lifecycle rules, tradeoffs, or surprising constraints, not narrate obvious code.

## Repository Conventions

- Package manager: npm.
- Import alias: `@/*`.
- UI primitives: `components/ui`.
- Shared cross-feature UI may live in `components/shared` once there is enough shared UI to justify it.
- Route-specific code may stay colocated under `app/`.
- Feature-owned code may live under `features/<feature>/` when a feature grows beyond route-local ownership.
- Shared utilities belong in `lib/`.
- Unit tests may stay colocated with the module under test.
- End-to-end tests should live in `tests/e2e` when Playwright is added.

## Validation

Use the smallest validation that proves the changed behavior. For ordinary code changes, run the relevant subset of:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Before finishing, inspect the diff and call out skipped checks with the reason.
