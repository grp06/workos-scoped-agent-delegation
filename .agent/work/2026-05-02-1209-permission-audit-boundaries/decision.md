# Refactor Decision: Narrow Demo Permission Catalog

Decided: 2026-05-02T19:10:52Z
Status: locked decision for planning

## Chosen Refactor

Choose Candidate 1: **Shared Permission And Resource Catalog**, with a strict boundary.

The refactor should create one small owner for stable demo vocabulary and mappings:

- WorkOS Authorization resource type slug: `document`
- WorkOS human permission slugs: `document:read`, `document:summarize`, `document:export`
- local agent visa permission slugs used by the demo
- canonical resource ids used by the scripted mission and guided demo
- the tool-action to WorkOS-human-permission mapping

This must not become a new authorization engine. Authorization policy stays in `lib/authz.ts`; WorkOS calls stay in `lib/human-access.ts`; persistence stays in the existing DB modules.

## Why This Wins Now

The current highest-change-amplification area is shared permission/resource vocabulary, not a missing abstraction around API calls.

Cheap repo evidence found the same concepts repeated across many ownership boundaries:

- runtime authorization: `lib/authz.ts`, `lib/human-access.ts`
- demo seed data: `lib/demo-data.ts`
- WorkOS setup: `scripts/init-workos-fga.ts`
- mission scripting: `lib/mission.ts`
- guided demo state: `app/demo/demo-state.ts`
- API grant flow: `app/api/agent/grant-visa/route.ts`
- tests: `lib/authz.test.ts`, `app/demo/demo-state.test.ts`, `app/demo/use-demo-controller.test.tsx`
- docs: `README.md`, `ARCHITECTURE.md`, `REPO_MAP.md`

The strongest signal is not file size; it is that changing or adding one demo permission would require touching runtime policy, WorkOS setup, UI state, tests, and docs while manually preserving the distinction between WorkOS human access and local agent visas.

## Evidence That Changed Confidence

The adversarial concern was that a catalog might be a shallow constants dump. The evidence supports a narrower, useful version:

- `scripts/init-workos-fga.ts` defines `DOCUMENT_RESOURCE_TYPE`, `HUMAN_PERMISSIONS`, and `FINANCE_DOCUMENT_IDS`.
- `lib/human-access.ts` separately maps tool actions to `document:*` and hardcodes `resourceTypeSlug: "document"`.
- `lib/demo-data.ts` owns local resource seeds and local agent permission strings.
- `app/demo/demo-state.ts` repeats `q4-invoices` and `invoice.export` for guided-progress logic.
- `lib/mission.ts` repeats `q4-invoices`, `payroll`, names, and `targetType: "document"`.

That means the useful interface is not "all constants." It is a small demo vocabulary module that exposes named concepts with clear separation between WorkOS human permissions and local agent visa permissions.

## Why Runner-Ups Lost

### Candidate 2: Split Authorization Data Loading From Policy Evaluation

This is plausible but loses now. `checkAccess(input)` is already a deep, simple interface for callers, and the current tests already exercise pure `evaluateAccess(...)`. Splitting SQL loading today risks adding a shallow repository layer around a small number of queries. It should be reconsidered only if authorization policy or DB schema changes become harder to test.

### Candidate 3: Audit Delivery Boundary Cleanup

This remains useful, especially because `lib/audit.ts` duplicates WorkOS SDK/env setup and owns a large payload. It loses because the current audit caller interface is already deep and the duplication is more localized than the permission vocabulary drift. A later plan can extract a pure WorkOS audit payload builder and reuse `lib/workos.ts`.

### Candidate 4: Refresh Agent Navigation Docs

This is correct and low-risk, but it is too small to be the main refactor. It should be included as documentation cleanup if the selected refactor changes navigation facts, and `REPO_MAP.md` should also be corrected for the recent demo controller split.

### Candidate 5: Do Nothing

This loses because the repo is still evolving quickly and the selected refactor reduces a concrete source of future mistakes without changing product behavior.

## Success Criteria

- A future agent can find the canonical names for demo resources, WorkOS resource type, WorkOS human permissions, and local agent visa permissions in one obvious module.
- WorkOS human permission vocabulary remains visibly separate from local agent visa vocabulary.
- `lib/human-access.ts` no longer owns hardcoded WorkOS permission strings or the `document` resource type slug.
- `scripts/init-workos-fga.ts` uses the same WorkOS permission definitions as runtime code.
- `app/demo/demo-state.ts`, `lib/mission.ts`, and the grant route use canonical ids/permissions where doing so improves clarity.
- `lib/authz.ts` keeps authorization policy ownership and does not delegate final policy to the catalog.
- Tests continue to cover the same behavior, with duplicated string literals reduced where the canonical names make tests clearer.
- `REPO_MAP.md` is updated to include the recent `app/demo/demo-api.ts` and `app/demo/use-demo-controller.ts` split.

## First Safe Slice

Create a narrow catalog module, likely `lib/demo-catalog.ts`, then migrate only the lowest-risk consumers first:

1. WorkOS resource type and human permission mapping in `lib/human-access.ts`.
2. WorkOS setup constants in `scripts/init-workos-fga.ts`.
3. invoice export/resource ids in `app/demo/demo-state.ts` and `app/api/agent/grant-visa/route.ts`.

After that slice passes tests, decide whether to migrate tests and mission literals in the same implementation plan or a second slice.

## Abandonment Conditions

Abandon or shrink the refactor if:

- the catalog starts owning final allow/deny policy;
- the catalog merges WorkOS human permissions and local agent visa permissions into one ambiguous permission concept;
- the implementation requires broad rewrites of tests without reducing runtime duplication;
- the module becomes a bag of unrelated UI labels, status text, or docs copy;
- more than one new abstraction is needed to make the catalog work.

## Hard Constraints For ExecPlan Creation

- Preserve the core invariant: final decision equals WorkOS human access AND local agent visa access.
- Preserve the current public `checkAccess(input)` behavior.
- Preserve the current mission behavior: invoice export is denied before `invoice.export`, allowed after grant, and payroll export remains denied.
- Preserve fail-closed WorkOS FGA behavior.
- Do not change schema, database seed semantics, WorkOS dashboard requirements, or audit event actions as part of this refactor.
- Do not introduce `src/`; this repo uses root-level `app/`, `lib/`, `components/`, and `scripts/`.
- Update docs only where ownership or navigation facts change.
