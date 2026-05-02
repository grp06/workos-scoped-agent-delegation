# AGENTS.md

Durable guidance for agents working in this repository.

## Project Orientation

- This repo is the Agent Passport Control WorkOS demo.
- The implementation plan lives in `.agent/execplan.md`. Read it before implementing product behavior, and update its living sections only when doing plan work.
- `README.md` explains the public demo purpose and setup.
- `REPO_MAP.md` is the fast navigation map for AI agents.
- `ARCHITECTURE.md` explains ownership boundaries, data flow, and real-vs-demo services.
- The app uses Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, and npm.
- Paths currently follow the ExecPlan convention: root-level `app/`, `components/`, `lib/`, `features/`, `hooks/`, `styles/`, and `tests/`. Do not introduce `src/` unless the plan is deliberately revised.

## Next.js 16 Warning

This is a current Next.js project, not the older Next.js shape most agents may remember. Before using unfamiliar Next.js APIs or conventions, check the installed docs under `node_modules/next/dist/docs/` or the current official docs. Use `eslint .`; do not use the removed `next lint` flow.

## How To Work

- Understand the existing design before editing.
- Keep diffs small and reviewable.
- Do not implement `.agent/execplan.md` product steps unless the user asks for that step.
- Prefer extending existing modules over adding wrappers.
- Keep related invariants together, especially auth, authorization, audit logging, and persistence.
- Hide sequencing, caching, and policy decisions inside the owning module so callers have simple interfaces.
- Avoid adding knobs, flags, callbacks, or alternate paths unless they clearly reduce net complexity.
- Comments should explain invariants, lifecycle rules, tradeoffs, or surprising constraints, not narrate obvious code.

## Repository Conventions

- Package manager: npm.
- Import alias: `@/*`.
- UI primitives: `components/ui`.
- Shared cross-feature UI: `components/shared`.
- Route-specific code may stay colocated under `app/`.
- Feature-owned code may live under `features/<feature>/`.
- Shared utilities belong in `lib/`.
- Unit tests belong in `tests/unit`.
- End-to-end tests belong in `tests/e2e` when Playwright is added.

## Validation

Use the smallest validation that proves the changed behavior. For ordinary code changes, run the relevant subset of:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Before finishing, inspect the diff and call out skipped checks with the reason.
