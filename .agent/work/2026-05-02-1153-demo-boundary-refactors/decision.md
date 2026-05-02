# Refactor Decision: Extract A Demo Controller Boundary

## Chosen Refactor

Extract a focused demo controller boundary for `app/demo/DemoClient.tsx`.

The goal is to move client API calls, busy/status state, initial loading, and post-action refresh sequencing behind one small interface, while leaving the visible demo composition in `DemoClient.tsx` and pure derived state in `app/demo/demo-state.ts`.

This is not a generic component-splitting refactor. The value comes from hiding the client-side choreography for:

- initial loading of audit events, active visas, and integration status
- running the mission, then refreshing audit/status
- granting the narrow visa, then refreshing visas/audit/status
- resetting the demo, clearing local tool calls, then refreshing visas/audit/status
- converting endpoint failures into user-visible status text

## Why This Beats The Alternatives Now

`DemoClient.tsx` is the clearest current complexity hot spot. It is 502 lines and mixes endpoint paths, response shapes, retry/fallback behavior, action sequencing, page state, and several UI sections. Future polish work is likely to touch this page first, so reducing its cognitive load has immediate payoff.

The selected shape also matches the existing direction of the repo. `app/demo/demo-state.ts` already owns pure derived demo state. A controller hook or colocated controller module would own impure client orchestration. `DemoClient.tsx` can then focus on rendering the demo.

## Evidence That Changed Confidence

- `app/demo/DemoClient.tsx` is 502 lines, more than twice the size of most runtime modules inspected.
- It directly fetches six endpoints: `/api/audit-log`, `/api/agent/visas`, `/api/health`, `/api/demo/run`, `/api/agent/grant-visa`, and `/api/demo/reset`.
- The file repeats refresh choreography in multiple actions:
  - mission refreshes audit events and integration status
  - visa grant refreshes active visas, audit events, and integration status
  - reset clears tool calls and refreshes active visas, audit events, and integration status
- It has two different initial-load paths: a combined audit/visa load and a separate health load, both with cancellation handling.
- The permission-catalog candidate is real, but the source reads confirmed that WorkOS human permissions and local agent visas are intentionally separate concepts. Over-unifying them would make the demo less legible.
- `lib/authz.ts` already exposes a simple `checkAccess(input)` interface. Its internals are mixed, but callers are still protected from that complexity.
- The WorkOS SDK duplication in `lib/audit.ts` is valid cleanup but too small to justify being the next main refactor.

## Why Runner-Ups Lost

### Shared Demo Permission Catalog

This is the strongest runner-up. There is duplicate permission knowledge in `lib/human-access.ts`, `scripts/init-workos-fga.ts`, `lib/demo-data.ts`, `lib/authz.ts`, tests, and demo copy. However, the core demo message depends on keeping human WorkOS authorization and local agent visas visibly distinct. A shared catalog could help later, but it must be designed carefully enough that it is not the safest next refactor.

### Split Authorization Data Access From Policy Evaluation

`lib/authz.ts` combines row loading, SQL, mapping, WorkOS access orchestration, local visa checks, and pure decision evaluation. That is worth watching. It lost because its public interface is already deep and simple: callers use `checkAccess(input)`. Extracting small repository wrappers now would likely add indirection before there is enough pressure.

### Reuse WorkOS SDK Construction In Audit Emission

This is correct and low-risk: `lib/audit.ts` duplicates `requireEnv()` and constructs `new WorkOS()` instead of using `lib/workos.ts`. It lost because the payoff is narrow. It can be folded into a later cleanup pass or handled opportunistically.

### Do Nothing For Now

Doing nothing is defensible if the immediate priority is only GitHub push/deploy. It lost because the demo client is already large enough that one more polish pass will be slower and riskier than necessary.

## Success Criteria

- `DemoClient.tsx` no longer directly owns endpoint paths or response-shape parsing for demo API calls.
- Post-action refresh sequencing is owned in one place and is hard to accidentally skip.
- `DemoClient.tsx` remains easy to read as a page composition file.
- The final authorization semantics remain unchanged: WorkOS human access and local agent visa must both pass.
- The UI behavior remains unchanged except for incidental wording/status improvements explicitly covered by tests or manual verification.
- Existing tests continue to pass.
- Validation commands pass:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`

## First Safe Slice

Create a colocated client boundary under `app/demo/`, likely:

- `app/demo/demo-api.ts` for typed endpoint calls and `readJson`
- `app/demo/use-demo-controller.ts` for React state, initial loading, action sequencing, and status messages

Then update `app/demo/DemoClient.tsx` to consume the controller:

- `toolCalls`
- `auditEvents`
- `activeVisas`
- `integrationStatuses`
- `busyAction`
- `status`
- `runMission`
- `grantVisa`
- `resetDemo`

Keep `getDemoSteps()` and `getPreparedExport()` in `app/demo/demo-state.ts`. Do not move product policy into the client controller.

## Abandonment Conditions

Abandon or shrink the refactor if:

- the extracted files become one-to-one `fetch()` wrappers with no hidden sequencing or error handling
- the controller interface grows broad enough that callers still need to understand endpoint details
- the refactor changes authorization, audit, or database behavior
- the diff becomes mostly presentational churn
- the page becomes harder to trace in a quick demo walkthrough

## Hard Constraints For ExecPlan Creation

- Do not change server route behavior.
- Do not change WorkOS FGA, AuthKit, Audit Logs, or Neon/Postgres setup.
- Do not move local agent visas into WorkOS.
- Do not create a real export/download.
- Do not add a general-purpose data-fetching library.
- Keep files colocated under `app/demo/` unless there is a concrete cross-page consumer.
- Preserve `app/demo/demo-state.ts` as the pure derived-state boundary.
- Add focused tests only if logic moves into pure helpers; otherwise rely on existing unit tests plus browser/manual verification of `/demo`.
