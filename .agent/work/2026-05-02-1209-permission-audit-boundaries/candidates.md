# Refactor Candidates: Permission and Audit Boundaries

Created: 2026-05-02T19:09:42Z
Status: candidates only

## Scope

Find the next materially useful refactor after the demo client/controller extraction. This pass does not select a final winner, write an ExecPlan, or change product code.

## Repo Evidence

- `app/demo/DemoClient.tsx` was recently slimmed, and state/API ownership moved into `app/demo/use-demo-controller.ts` and `app/demo/demo-api.ts`.
- The current largest files are now server/domain modules and tests: `scripts/init-workos-fga.ts`, `lib/audit.ts`, `lib/authz.ts`, and demo controller tests.
- The core product invariant remains: final authorization equals WorkOS human access AND local agent visa access.
- Permission/resource facts are repeated across `lib/demo-data.ts`, `lib/human-access.ts`, `lib/authz.ts`, `scripts/init-workos-fga.ts`, `lib/mission.ts`, `app/demo/demo-state.ts`, tests, and docs.
- WorkOS SDK/env construction is centralized in `lib/workos.ts`, but scripts and `lib/audit.ts` still create `new WorkOS(...)` and define local `requireEnv(...)`.
- `REPO_MAP.md` does not yet mention the recent `app/demo/demo-api.ts` and `app/demo/use-demo-controller.ts` split.

## Candidate 1: Shared Permission And Resource Catalog

### Shape

Create a small catalog module for stable demo concepts:

- WorkOS resource type slug: `document`
- WorkOS human permission slugs: `document:read`, `document:summarize`, `document:export`
- local agent permission slugs: `invoice.read`, `invoice.summarize`, `invoice.export`, `payroll.export`, etc.
- canonical resource ids used by the scripted mission and guided demo: `q4-invoices`, `payroll`
- mapping from tool action to WorkOS human permission

Keep policy evaluation in `lib/authz.ts` and WorkOS calls in `lib/human-access.ts`. The catalog should not become a new authorization engine.

### Evidence

- `lib/human-access.ts` maps tool actions to `document:*` permissions and hardcodes `resourceTypeSlug: "document"`.
- `scripts/init-workos-fga.ts` repeats `DOCUMENT_RESOURCE_TYPE`, `HUMAN_PERMISSIONS`, and finance document ids.
- `lib/demo-data.ts` owns local resource seeds and local permission strings, including `INVOICE_EXPORT_PERMISSION`.
- `lib/authz.ts` separately encodes the invoice summarize special case.
- `lib/mission.ts` hardcodes mission resource ids/names and target type `document`.
- `app/demo/demo-state.ts` repeats `q4-invoices` and `invoice.export`.
- Tests repeat many of the same strings, which makes permission-model changes noisy and easy to miss.

### Benefits

- Keeps the human WorkOS permission model and local agent visa model visibly distinct while placing their shared vocabulary in one obvious place.
- Reduces string drift between runtime checks, setup scripts, demo state, and docs.
- Makes future feature changes easier, especially if another resource/action is added for the demo story.

### Risks

- A too-large catalog could hide policy decisions and become a shallow global constants file.
- If it merges WorkOS permissions and local agent visas into one concept, it will blur the demo's most important distinction.
- The current code is small enough that this refactor only pays off if kept tight.

### Assumption Ledger

- Assumption: permission/resource vocabulary will keep changing as the demo is polished.
  - Confidence: medium.
  - Evidence: recent polish added guided steps, status panels, audit replay, and attack scenario behavior around the same strings.
- Assumption: tests can be made clearer by importing canonical ids/permissions rather than duplicating strings.
  - Confidence: medium.
  - Evidence: current unit tests assert repeated `invoice.export`, `document:export`, and `q4-invoices` values.
- Assumption: policy should remain in `lib/authz.ts`.
  - Confidence: high.
  - Evidence: `ARCHITECTURE.md` names `lib/authz.ts` as the final authorization owner.

## Candidate 2: Split Authorization Data Loading From Policy Evaluation

### Shape

Keep `checkAccess(input)` as the public interface, but pull database loading into a focused internal boundary:

- agent/resource loading and row mapping
- local visa lookup
- pure `evaluateAccess(...)` policy

This could be a small internal helper module or a clearer internal section in `lib/authz.ts`; avoid creating a generic repository layer unless tests and call sites actually benefit.

### Evidence

- `lib/authz.ts` currently owns SQL row shapes, row mapping, agent/resource loading, local visa SQL, required permission mapping, pure policy evaluation, and WorkOS orchestration.
- `lib/visas.ts` also queries active visas, so local visa persistence knowledge is already split.
- `lib/authz.test.ts` focuses on pure behavior and uses seed data to avoid the database, which suggests a useful boundary already exists but is not fully expressed.

### Benefits

- Makes the critical authorization module easier to audit.
- Lets tests target pure policy without carrying SQL mapping details.
- Reduces risk when modifying database schema or permission policy independently.

### Risks

- A new `repository` abstraction could be shallow if it only forwards one query per function.
- The existing public `checkAccess` interface is already simple; this is an internal maintainability refactor, not a user-visible fix.
- Moving SQL without changing behavior can create churn in a security-sensitive module.

### Assumption Ledger

- Assumption: future changes will touch authorization policy again.
  - Confidence: medium.
  - Evidence: FGA integration, attack scenario, and visa grant flow all converge through this module.
- Assumption: `lib/visas.ts` and `checkAgentVisa(...)` should not stay as separate owners long term.
  - Confidence: medium.
  - Evidence: both query `agent_visas` for active permissions.
- Assumption: no API route should need lower-level authorization internals.
  - Confidence: high.
  - Evidence: routes currently call `checkAccess(...)` or higher-level mission functions.

## Candidate 3: Audit Delivery Boundary Cleanup

### Shape

Keep `recordAndEmitAuditEvent(...)` as the caller interface, but separate the internal concerns:

- local audit event persistence and row mapping
- WorkOS audit payload construction
- WorkOS Audit Logs emission and status update

At minimum, reuse `getWorkos()` and `requireEnv()` from `lib/workos.ts` inside `lib/audit.ts`.

### Evidence

- `lib/audit.ts` is 217 lines and owns SQL insertion, SQL update, row mapping, metadata coercion, WorkOS client construction, WorkOS payload construction, delivery, and failure capture.
- `lib/audit.ts` duplicates `requireEnv(...)` and `new WorkOS(...)` despite `lib/workos.ts`.
- `scripts/init-workos-audit-schemas.ts` repeats audit schema metadata expectations that must stay compatible with emitted payloads.
- `ARCHITECTURE.md` says payload metadata changes must update both runtime audit code and schema setup.

### Benefits

- Makes audit behavior easier to test without touching the database or WorkOS.
- Reduces SDK/env duplication.
- Clarifies which part of audit failure is local persistence versus external delivery.

### Risks

- The caller-facing module is already deep; splitting internals could add files without reducing caller complexity.
- Audit behavior is high-risk because it affects demo credibility and WorkOS schema compatibility.
- A partial split could make metadata ownership less clear unless payload construction has an explicit owner.

### Assumption Ledger

- Assumption: WorkOS audit schemas and emitted payloads will need another edit before the demo is public.
  - Confidence: medium.
  - Evidence: polish work recently changed visible audit replay and integration status semantics.
- Assumption: local persistence should remain first, with external send status recorded after.
  - Confidence: high.
  - Evidence: architecture explicitly describes insert, emit, status update.
- Assumption: the quickest useful slice is SDK/env reuse plus pure payload builder extraction.
  - Confidence: medium.
  - Evidence: duplication is concrete and the payload object is large enough to deserve a named owner.

## Candidate 4: Minimal Surgical Change - Refresh Agent Navigation Docs

### Shape

Update `REPO_MAP.md` and, if needed, `ARCHITECTURE.md` to reflect the recent demo client split:

- `app/demo/DemoClient.tsx` is page composition.
- `app/demo/use-demo-controller.ts` owns client state, sequencing, and refresh behavior.
- `app/demo/demo-api.ts` owns browser fetch wrappers and response parsing.
- `app/demo/use-demo-controller.test.tsx` covers controller sequencing.

### Evidence

- The latest commit created `app/demo/demo-api.ts`, `app/demo/use-demo-controller.ts`, and `app/demo/use-demo-controller.test.tsx`.
- `REPO_MAP.md` still describes `app/demo/DemoClient.tsx` as owning client-side controls, state refresh, and page composition.
- The user explicitly values repo maps and architecture docs for future AI agents.

### Benefits

- Low risk and directly improves future-agent navigation.
- Keeps docs aligned with the refactor that just landed.
- Small, reviewable, and easy to verify.

### Risks

- This is documentation cleanup, not a code architecture improvement.
- It does not address the more substantial permission/audit duplication.
- If selected alone, it may leave the next implementation pass with no meaningful product-code improvement.

### Assumption Ledger

- Assumption: future agents will rely on `REPO_MAP.md` when deciding where to edit.
  - Confidence: high.
  - Evidence: the repo explicitly documents this purpose.
- Assumption: docs drift has low blast radius but high coordination cost.
  - Confidence: medium.
  - Evidence: stale ownership docs can steer agents back into `DemoClient.tsx`.

## Candidate 5: Do Nothing For Now

### Shape

Stop refactoring and move on to user-visible demo readiness, GitHub polish, or deployment.

### Evidence

- Recent work extracted the largest UI/control hotspot.
- The repo is small and recently passed validation before the last commit.
- The core modules have simple public interfaces even where internals are somewhat broad.

### Benefits

- Avoids churn in auth, audit, and persistence code shortly before publishing.
- Keeps momentum on demo storytelling and deployment.
- No risk of introducing regressions in a working app.

### Risks

- Permission/resource drift remains spread across runtime, setup scripts, tests, and docs.
- Audit SDK/env duplication remains.
- Stale repo map entries can mislead the next agent.

### Assumption Ledger

- Assumption: the current app is good enough to deploy or push without another refactor.
  - Confidence: medium.
  - Evidence: the last implementation/review cycle was committed cleanly.
- Assumption: future feature additions are small.
  - Confidence: low.
  - Evidence: the demo has been evolving quickly.

## Provisional Leader

Candidate 1, **Shared Permission And Resource Catalog**, is the provisional leader.

Reason: it targets the next real source of complexity after the UI controller refactor: the same demo vocabulary is repeated across WorkOS setup, local authorization, mission scripting, guided state, tests, and docs. The useful version is deliberately narrow: centralize stable vocabulary and mappings while leaving authorization policy, WorkOS calls, and database behavior in their current owning modules.

Candidate 4 is the smallest useful fallback if the next step should avoid code changes. Candidate 3 is a good follow-up if audit behavior becomes the next area of change.

## Non-Goals

- Do not implement any candidate in this work item.
- Do not rewrite the product ExecPlan.
- Do not add new demo features.
- Do not merge WorkOS human permissions and local agent visas into one authorization concept.

## Suggested Next Step

Run the selection step against Candidate 1 and Candidate 3 first, with Candidate 4 as the low-risk fallback.
