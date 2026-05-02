# ExecPlan: Narrow Demo Permission Catalog

Created: 2026-05-02T19:11:34Z
Status: ready for implementation

## Purpose

This plan reduces change amplification around demo permission and resource vocabulary.

Today the same stable facts are repeated in runtime authorization, WorkOS setup, mission scripting, guided demo state, tests, and docs:

- the WorkOS Authorization resource type is `document`;
- WorkOS human permissions are `document:read`, `document:summarize`, and `document:export`;
- local agent/resource permissions include `invoice.read`, `invoice.summarize`, `invoice.export`, `payroll.read`, `payroll.export`, `board.read`, `contract.read`, and `contract.export`;
- the seeded document ids are `q4-invoices`, `payroll`, `board-deck`, and `customer-contracts`;
- `ToolAction` values are `search_docs`, `summarize_document`, and `export_csv`, and they map to WorkOS human permissions.

The refactor creates one small module that owns this vocabulary and the pure mapping from tool action to WorkOS human permission. It does not move authorization policy, WorkOS calls, database behavior, or audit behavior.

Important script constraint: `scripts/init-db.ts`, `scripts/init-workos-fga.ts`, and `scripts/init-workos-audit-schemas.ts` run through `tsx`. They currently import app modules with relative paths such as `../lib/demo-data`. Because scripts will consume the catalog directly or indirectly, `lib/demo-catalog.ts` must not depend on the `@/*` path alias internally. Use relative type imports inside the catalog so script execution does not depend on runtime alias resolution.

## Complexity Dividend

After this work, a future change to the demo's permission vocabulary should start in one obvious place instead of requiring a manual search across runtime code, setup scripts, UI progress logic, tests, and docs.

The intended boundary is deep enough to hide string and mapping details, but narrow enough to avoid becoming a new policy layer. Callers should import named vocabulary rather than recreating strings, while `lib/authz.ts` remains the owner of final allow/deny behavior.

## Hard Constraints

- Preserve the core invariant: final decision equals WorkOS human access AND local agent visa access.
- Preserve public `checkAccess(input)` behavior.
- Preserve current mission behavior:
  - invoice search allowed with initial visas;
  - invoice summarize allowed with initial visas;
  - invoice export denied before `invoice.export`;
  - invoice export allowed after the grant route runs;
  - payroll export remains denied after granting `invoice.export`.
- Preserve fail-closed WorkOS FGA behavior.
- Do not change schema, seed semantics, WorkOS dashboard requirements, or audit event action names.
- Do not introduce `src/`; this repo uses root-level `app/`, `lib/`, `components/`, and `scripts/`.
- Keep WorkOS human permissions visibly separate from local agent visa permissions.
- Do not move final authorization policy out of `lib/authz.ts`.

## Current Ownership

- `lib/authz.ts` owns the final authorization decision and local required-permission policy.
- `lib/human-access.ts` owns WorkOS membership lookup and WorkOS Authorization/FGA checks.
- `lib/demo-data.ts` owns seed data for local users, agents, resources, and initial local visas.
- `scripts/init-workos-fga.ts` owns WorkOS setup for permissions, role, resources, and role assignments.
- `lib/mission.ts` owns the scripted demo tool calls.
- `app/demo/demo-state.ts` owns guided demo progress and fake export derivation.
- `app/api/agent/grant-visa/route.ts` owns granting the local invoice export visa.
- `app/api/demo/reset/route.ts` owns resetting local visas back to `initialVisaPermissions`.
- `app/api/authz/check/route.ts` owns request validation for direct authorization checks and currently repeats the allowed `ToolAction` values in a local `Set<ToolAction>`.
- `scripts/init-workos-audit-schemas.ts` owns WorkOS Audit Log schema targets and still repeats the `document` target type.
- `lib/integration-status.ts` owns pure integration-status classification and currently infers FGA activity from metadata containing `humanAccessSource === "workos_fga"` or a `humanRequiredPermission` that starts with `document:`.
- `REPO_MAP.md` and `ARCHITECTURE.md` guide future agents.

These ownership rules remain true after the refactor.

## Target Design

Add `lib/demo-catalog.ts`.

It should export stable, typed values for the demo vocabulary:

- `DOCUMENT_RESOURCE_TYPE = "document"`
- `WORKOS_DOCUMENT_PERMISSIONS`, an object with readable keys for `read`, `summarize`, and `export`
- `WORKOS_DOCUMENT_PERMISSION_DEFINITIONS`, the permission setup definitions currently repeated in `scripts/init-workos-fga.ts`
- `TOOL_ACTIONS`, a readonly tuple of `search_docs`, `summarize_document`, and `export_csv`
- `isToolAction(value: string): value is ToolAction`, a tiny type guard backed by `TOOL_ACTIONS`
- `AGENT_PERMISSIONS`, an object with readable keys for all local resource/visa permission strings currently present in `resourceSeeds` or initial visas: `invoiceRead`, `invoiceSummarize`, `invoiceExport`, `payrollRead`, `payrollExport`, `boardRead`, `contractRead`, and `contractExport`
- `DEMO_RESOURCE_IDS`, an object for all seeded resource ids: `q4Invoices`, `payroll`, `boardDeck`, and `customerContracts`
- `FINANCE_DOCUMENT_RESOURCE_IDS`, a readonly array or set source for documents assigned to Alice in WorkOS setup
- `WORKOS_DOCUMENT_PERMISSION_PREFIX = "document:"`, if needed to keep integration status classification aligned with the same WorkOS permission vocabulary
- `getWorkosPermissionForToolAction(action: ToolAction)`, a pure mapping from `ToolAction` to WorkOS permission slug

The catalog may also export narrowly named type aliases derived from these values if that improves type checking, but it should not export generic registries or UI copy. `TOOL_ACTIONS` and `isToolAction` are allowed because they are vocabulary validation, not authorization policy.

Implementation guardrail: import `ToolAction` with a relative type-only import:

```ts
import type { ToolAction } from "./types";
```

Do not import from `@/lib/types` inside `lib/demo-catalog.ts`; that can leak Next/Vitest alias assumptions into setup scripts.

Do not put these in the catalog:

- final authorization decisions;
- SQL queries;
- WorkOS SDK calls;
- audit payloads;
- UI labels or status text;
- setup script control flow.

## Milestone 1: Create The Catalog

Add `lib/demo-catalog.ts` with the vocabulary above.

Implementation details:

- Import `ToolAction` from `./types` with `import type` only for the pure mapping function.
- Use `as const` objects so call sites preserve exact string values.
- Keep object names explicit enough that readers can tell WorkOS human permissions from local agent visa permissions.
- Use a `switch` or exhaustive branch in `getWorkosPermissionForToolAction(action)` so adding a `ToolAction` later forces a deliberate mapping update.
- Define `TOOL_ACTIONS` once and implement `isToolAction(value)` from it so route validation does not repeat the same action list.
- Keep the catalog free of imports from `lib/demo-data.ts`; `lib/demo-data.ts` should be allowed to depend on the catalog, not the other way around.

Validation after this milestone:

```bash
npm run typecheck
```

## Milestone 2: Migrate WorkOS Human Access And Setup

Update `lib/human-access.ts`:

- replace `getHumanPermission(action)` internals with `getWorkosPermissionForToolAction(action)`;
- replace hardcoded `resourceTypeSlug: "document"` with `DOCUMENT_RESOURCE_TYPE`;
- either keep exporting `getHumanPermission` as a compatibility wrapper or rename only if all call sites are updated in this plan.

Update `app/api/authz/check/route.ts`:

- replace the local `toolActions = new Set<ToolAction>(...)` with `isToolAction(candidate.action)` from the catalog;
- keep request-shape validation and `withAuth({ ensureSignedIn: true })` in the route.

Update `scripts/init-workos-fga.ts`:

- replace local `DOCUMENT_RESOURCE_TYPE` with the catalog export;
- replace local `HUMAN_PERMISSIONS` with `WORKOS_DOCUMENT_PERMISSION_DEFINITIONS`;
- replace local `FINANCE_DOCUMENT_IDS` setup with the catalog's finance document ids.

Update `scripts/init-workos-audit-schemas.ts`:

- replace WorkOS Audit Log target literals `{ type: "document" }` for tool-call schemas with `DOCUMENT_RESOURCE_TYPE`;
- do not change schema action names, metadata keys, or target structure.

Update `lib/integration-status.ts`:

- replace `event.metadata.humanRequiredPermission.startsWith("document:")` with the catalog's WorkOS document permission prefix or an equivalent helper from the catalog;
- keep the existing `humanAccessSource === "workos_fga"` check, because it is the strongest signal and is not permission-vocabulary drift;
- do not move status classification out of this module.

Important: keep script behavior the same. It should still create the same WorkOS permissions, role, resources, and role assignments. Do not change the resource-type dashboard requirement.

Validation after this milestone:

```bash
npm run typecheck
npm run test -- lib/authz.test.ts lib/integration-status.test.ts
npx tsx -e "import('./lib/demo-catalog.ts').then(() => import('./lib/demo-data.ts'))"
```

The `tsx -e` command is a cheap script-compatibility check. It should import the catalog and seed data without touching WorkOS or the database.

## Milestone 3: Migrate Local Demo Permissions And Resource Ids

Update `lib/demo-data.ts`:

- replace local `INVOICE_EXPORT_PERMISSION` with `AGENT_PERMISSIONS.invoiceExport`;
- replace every seeded local permission string with `AGENT_PERMISSIONS`, including `payrollRead`, `payrollExport`, `boardRead`, `contractRead`, and `contractExport`;
- replace literal seeded resource ids for all four seeded resources with `DEMO_RESOURCE_IDS.q4Invoices`, `DEMO_RESOURCE_IDS.payroll`, `DEMO_RESOURCE_IDS.boardDeck`, and `DEMO_RESOURCE_IDS.customerContracts`;
- replace every seeded `resourceType: "document"` with `DOCUMENT_RESOURCE_TYPE`;
- replace initial visa strings with catalog local agent permission constants;
- leave `resourceSeeds` ownership in `lib/demo-data.ts`.

Update `app/api/agent/grant-visa/route.ts`:

- import the invoice export permission from the catalog directly or through `lib/demo-data.ts`, choosing the path with the least ambiguity;
- preserve the response shape and audit metadata.

Update `app/api/demo/reset/route.ts`:

- keep using `initialVisaPermissions` from `lib/demo-data.ts`;
- confirm `initialVisaPermissions` now derives from `AGENT_PERMISSIONS` so reset behavior uses the same canonical local visa vocabulary as database initialization.

Update `app/demo/demo-state.ts`:

- replace local `INVOICE_RESOURCE_ID` and `INVOICE_EXPORT_PERMISSION` constants with catalog values;
- keep guided progress logic in this file.

Update `lib/mission.ts`:

- replace mission resource id literals for invoice and payroll with catalog resource ids;
- replace audit `targetType: "document"` with `DOCUMENT_RESOURCE_TYPE`;
- keep the scripted mission array in `lib/mission.ts`.

Do not move resource names such as `q4-invoices.csv` into the catalog during this milestone. They already live canonically in `resourceSeeds` and are displayed directly in `app/demo/DemoClient.tsx` and `app/page.tsx`; duplicating or exporting UI/display names from the catalog would broaden its purpose.

Validation after this milestone:

```bash
npm run typecheck
npm run test -- app/demo/demo-state.test.ts lib/authz.test.ts
```

## Milestone 4: Reduce Test String Drift Where It Helps

Update tests only where canonical names make the behavior clearer.

Targets:

- `lib/authz.test.ts`
- `app/demo/demo-state.test.ts`
- `app/demo/use-demo-controller.test.tsx`
- `lib/integration-status.test.ts`, only if replacing `document` or `document:export` improves clarity without making fixtures harder to read

Specific guidance:

- In `lib/authz.test.ts`, use catalog ids/permissions for setup values like `DEMO_RESOURCE_IDS.q4Invoices`, `AGENT_PERMISSIONS.invoiceExport`, and `WORKOS_DOCUMENT_PERMISSIONS.export`.
- In direct route validation tests, if any are added later, validate through `isToolAction` rather than rebuilding a route-local tool-action set.
- In `app/demo/demo-state.test.ts`, use catalog values for fixture ids and active visa arrays.
- In controller tests, keep status text literals such as `"Granted invoice.export to Finance Agent"` when they assert user-visible copy.
- In `lib/integration-status.test.ts`, use the catalog WorkOS document permission value or prefix for `humanRequiredPermission`; keep `targetType: "document"` literal if changing it makes the fixture less clear.

Keep tests readable. It is acceptable for assertion strings like `"Finance Agent lacks invoice.export"` to remain literal when the literal is the user-visible behavior being asserted.

Validation after this milestone:

```bash
npm run test
```

## Milestone 5: Update Agent-Facing Docs

Update `REPO_MAP.md`:

- add `app/demo/demo-api.ts` as browser fetch wrappers and response parsing;
- add `app/demo/use-demo-controller.ts` as client state, sequencing, refresh behavior, and user actions;
- add `app/demo/use-demo-controller.test.tsx` under tests;
- revise `app/demo/DemoClient.tsx` so it is page composition and display, not state refresh ownership;
- update common change targets so permission vocabulary starts in `lib/demo-catalog.ts` and policy remains in `lib/authz.ts`.
- add `lib/demo-catalog.ts` under core modules as stable demo vocabulary for WorkOS resource type, WorkOS human permission slugs, local agent permission slugs, canonical demo resource ids, and tool-action mapping.
- update `app/api/authz/check/route.ts` documentation if it mentions validation details: the route validates request shape, while the catalog owns the list of valid tool actions.

Update `ARCHITECTURE.md`:

- add `lib/demo-catalog.ts` to ownership rules as the owner of stable demo vocabulary and tool-action-to-WorkOS-permission mapping;
- keep `lib/authz.ts` as final authorization policy owner;
- keep `lib/human-access.ts` as WorkOS membership/FGA call owner.
- mention that `lib/integration-status.ts` may consume the WorkOS document permission prefix only for classification; it still owns the status-state rules.

Do not make the docs longer than needed. The docs should help future agents navigate the boundary.

Validation after this milestone:

```bash
npm run lint
npm run typecheck
npm run test
```

## Full Validation

Before marking implementation complete, run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

If any check cannot be run, record the exact reason in the implementation notes and final report.

## Progress

- [x] Milestone 1: Create `lib/demo-catalog.ts`.
- [x] Milestone 2: Migrate WorkOS human access and FGA setup script.
- [x] Milestone 3: Migrate local demo permissions, seeded resource ids, and resource type literals.
- [x] Milestone 4: Reduce useful test string drift.
- [x] Milestone 5: Update agent-facing docs.
- [x] Full validation passes or skipped checks are explicitly documented.

## Surprises & Discoveries

- 2026-05-02T19:17:30Z: `app/demo/use-demo-controller.test.tsx` had a local deferred variable named `initialVisas` that shadowed the new shared initial visa fixture array. Renamed the deferred to `initialVisaLoad`; no production behavior changed.
- 2026-05-02T19:19:22Z: Review pass tightened `getWorkosPermissionForToolAction()` with an explicit return type and `assertNever()` default so future `ToolAction` additions force a deliberate WorkOS permission mapping update.

## Decision Log

- 2026-05-02T19:11:34Z: Plan chooses a narrow vocabulary/catalog module. It explicitly rejects moving final authorization policy, WorkOS calls, persistence, or audit behavior into the catalog.
- 2026-05-02T19:11:34Z: Tests may keep some literals when the literal is user-visible behavior being asserted. The goal is less drift, not abstracting every string.
- 2026-05-02T19:12:36Z: Improvement pass added script-compatibility constraints after confirming setup scripts run with `tsx` and import app modules by relative paths. `lib/demo-catalog.ts` should use relative type-only imports, not `@/*` imports.
- 2026-05-02T19:12:36Z: Improvement pass added `scripts/init-workos-audit-schemas.ts` and `app/api/demo/reset/route.ts` as adjacent consumers because they also touch the `document` target type and canonical initial visa permissions.
- 2026-05-02T19:13:35Z: Second improvement pass added `lib/integration-status.ts` because it checks `humanRequiredPermission.startsWith("document:")`; that prefix is WorkOS permission vocabulary and should stay aligned with the catalog.
- 2026-05-02T19:13:35Z: Second improvement pass expanded `DEMO_RESOURCE_IDS` to all four seeded resource ids after confirming `lib/demo-data.ts` seeds `q4-invoices`, `payroll`, `board-deck`, and `customer-contracts`. Display names still stay out of the catalog.
- 2026-05-02T19:14:20Z: Third improvement pass added `app/api/authz/check/route.ts` because it repeats the allowed `ToolAction` list in a route-local set. The catalog may own `TOOL_ACTIONS` and `isToolAction` as vocabulary validation without becoming an authorization policy layer.
- 2026-05-02T19:14:20Z: Third improvement pass expanded `AGENT_PERMISSIONS` to every seeded local resource/visa permission string after confirming `lib/demo-data.ts` also uses `payroll.read`, `board.read`, `contract.read`, and `contract.export`.

## Outcomes & Retrospective

Implemented `lib/demo-catalog.ts` as the stable owner of demo vocabulary: WorkOS document resource type, WorkOS human permission slugs and setup definitions, valid tool actions, local agent/resource permission strings, canonical resource ids, finance document ids, and tool-action-to-WorkOS-permission mapping.

Migrated runtime and setup consumers without moving final policy or IO ownership:

- `lib/human-access.ts` still owns WorkOS membership/FGA calls.
- `lib/authz.ts` still owns final allow/deny policy.
- `lib/demo-data.ts` still owns seed data.
- `lib/integration-status.ts` still owns status classification.
- scripts still own their setup control flow.

Updated tests and agent-facing docs to point future changes at the catalog for vocabulary and at the existing modules for policy.

Validation completed successfully:

```bash
npm run typecheck
npm run test -- lib/authz.test.ts lib/integration-status.test.ts
npx tsx -e "import('./lib/demo-catalog.ts').then(() => import('./lib/demo-data.ts'))"
npm run test -- app/demo/demo-state.test.ts lib/authz.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
```

No checks were skipped. Remaining risk is low and limited to semantic drift in UI copy intentionally left outside the catalog because it is display text, not stable vocabulary.

Review validation on 2026-05-02T19:19:22Z also passed:

```bash
npm run lint
npm run typecheck
npm run test
npx tsx -e "import('./lib/demo-catalog.ts').then(() => import('./lib/demo-data.ts'))"
npm run build
```

## Abandonment Conditions

Stop and revise the plan before continuing if:

- `lib/demo-catalog.ts` starts to own allow/deny policy;
- WorkOS human permissions and local agent visa permissions become ambiguous or merged;
- implementation requires changing database schema or WorkOS setup semantics;
- tests become less readable because too many assertion literals were replaced with constants;
- more than one new abstraction is needed to make the catalog usable.
