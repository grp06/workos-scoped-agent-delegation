# ExecPlan: Extract Demo Controller Boundary

This ExecPlan is the implementation contract for the decided refactor in this work item. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` current while implementing.

## Goal

Make the `/demo` client easier to understand and safer to change by moving client-side API calls, loading state, action status text, and post-action refresh sequencing out of `app/demo/DemoClient.tsx` and into a focused colocated controller boundary.

After this work, `DemoClient.tsx` should read mostly as page composition. A future agent polishing the UI should not need to understand which endpoints refresh after mission/grant/reset, and a future agent changing client orchestration should not need to scan through every visual section.

## Current Pain

`app/demo/DemoClient.tsx` is currently the largest source file in the app at 502 lines. It owns several unrelated kinds of knowledge:

- API endpoint paths for audit events, active visas, integration status, mission run, visa grant, and reset
- endpoint response shapes
- `readJson()` error handling
- initial load sequencing and cancellation
- fallback behavior when `/api/health` fails
- busy action and status message state
- post-action refresh sequencing
- page composition and presentational subcomponents

This creates cognitive load and change amplification. A copy or layout change requires reading around network choreography. A sequencing change requires editing inside a large render file and remembering which refreshes each action needs.

## Intended Boundary

Create two colocated client modules under `app/demo/`:

- `app/demo/demo-api.ts` owns typed client calls to the existing API routes and endpoint-specific response parsing.
- `app/demo/use-demo-controller.ts` owns React state, initial loading, action sequencing, fallback integration status, busy action, and status messages.

`app/demo/DemoClient.tsx` should consume one controller interface and keep responsibility for rendering:

- setup cards
- guided stepper
- mission buttons
- integration status panel
- export artifact panel
- passport check cards
- audit replay

`app/demo/demo-state.ts` remains the pure derived-state boundary for `getDemoSteps()` and `getPreparedExport()`.

Do not move `DemoStepper`, `IntegrationStatusPanel`, `PreparedExportPanel`, `SetupCard`, or `EmptyPanel` in this pass unless the controller extraction creates a concrete readability problem. The chosen refactor is about hiding client sequencing, not reducing line count by moving JSX into separate files.

## Current Route Contracts

The new API adapter must preserve the current client-visible contracts from these route files:

- `app/api/audit-log/route.ts`
  - `GET /api/audit-log`
  - response: `{ events: AuditEvent[] }`
- `app/api/agent/visas/route.ts`
  - `GET /api/agent/visas`
  - response: `{ agentId: string; permissions: string[] }`
- `app/api/health/route.ts`
  - `GET /api/health`
  - response: `{ ok: true; service: string; statuses: IntegrationStatus[] }`
- `app/api/demo/run/route.ts`
  - `POST /api/demo/run`
  - response: `{ toolCalls: ToolCallResult[] }`
- `app/api/agent/grant-visa/route.ts`
  - `POST /api/agent/grant-visa`
  - response: `{ ok: true; agentId: string; grantedPermission: string; expiresAt: string }`
- `app/api/demo/reset/route.ts`
  - `POST /api/demo/reset`
  - response: `{ ok: true }`

These are browser calls from `DemoClient.tsx`; no server route should be edited for this refactor.

## Complexity Dividend

This refactor pulls sequencing downward into the module that owns it. Callers no longer need to know:

- that mission refreshes audit events and integration status
- that granting a visa refreshes visas, audit events, and integration status
- that reset clears local tool calls and refreshes visas, audit events, and integration status
- that health failures become a synthetic failing integration status row
- the exact JSON envelope returned by each API route

The interface to the page becomes a small set of values and actions. That makes the demo UI easier to polish and makes the action flow harder to accidentally break.

## Hard Constraints

- Do not change server route behavior.
- Do not change WorkOS FGA, AuthKit, Audit Logs, or Neon/Postgres setup.
- Do not change authorization semantics: final decision remains WorkOS human access AND local agent visa.
- Do not move local agent visas into WorkOS.
- Do not create a real export or download.
- Do not add a general-purpose data-fetching library.
- Keep the new modules colocated under `app/demo/` unless a concrete cross-page consumer appears.
- Preserve `app/demo/demo-state.ts` as the pure derived-state boundary.
- Keep the user-visible demo behavior unchanged except for incidental status wording that is explicitly accepted during implementation.

## Implementation Plan

### Milestone 1: Extract Typed Demo API Calls

Add `app/demo/demo-api.ts`.

It should export narrow async functions for the existing browser calls:

- `fetchAuditEvents(): Promise<AuditEvent[]>`
- `fetchActiveVisaPermissions(): Promise<string[]>`
- `fetchIntegrationStatuses(): Promise<IntegrationStatus[]>`
- `runDemoMission(): Promise<ToolCallResult[]>`
- `grantDemoVisa(): Promise<void>`
- `resetDemoState(): Promise<void>`

Move `readJson<T>()` into this module as a private helper. Keep endpoint paths and JSON envelope details private to this module.

Use the existing fetch options exactly where they matter:

- `GET` calls for audit events, active visas, and integration status should keep `{ cache: "no-store" }`.
- `POST` calls should preserve the existing method and not add request bodies.
- `readJson<T>()` should keep the current behavior: if `response.ok` is false, read the response text and throw that text or `Request failed with ${response.status}`.

Do not add wrappers for server-side modules, WorkOS, database, or auth logic. This file is only the browser-side API adapter for `/demo`.

Validation after this milestone:

- `npm run typecheck`

### Milestone 2: Extract The Demo Controller Hook

Add `app/demo/use-demo-controller.ts`.

The hook should be a client hook. Put `"use client";` at the top because this module imports React hooks directly and is intended only for the browser client graph.

It should export:

- `type BusyAction = "mission" | "grant" | "reset" | null`
- `interface DemoController`
- `function useDemoController(): DemoController`

The returned controller should include:

- `toolCalls`
- `auditEvents`
- `activeVisas`
- `integrationStatuses`
- `busyAction`
- `status`
- `runMission`
- `grantVisa`
- `resetDemo`

The action functions should be typed as `() => Promise<void>`. The page does not need to know response payloads or refresh details.

Move these responsibilities from `DemoClient.tsx` into the hook:

- React state initialization
- initial audit/visa load
- initial integration status load
- cancellation checks inside `useEffect`
- health fallback row:
  - key: `authkit`
  - label: `Integration status`
  - state: `failing`
  - detail: `Status check failed.`
- action busy states and status strings
- post-action refresh sequencing

Keep action sequencing explicit inside the hook. Prefer small private helpers such as `refreshAuditEvents()`, `refreshActiveVisas()`, `refreshIntegrationStatus()`, and `messageFromError()` if they make the hook easier to read. Do not expose those helpers from the hook unless tests require it.

Keep these current status strings unless implementation discovers a reason to change them:

- initial status: `Ready`
- mission start: `Running mission`
- mission success: `Mission complete`
- visa grant start: `Granting invoice.export`
- visa grant success: `Granted invoice.export to Finance Agent`
- reset start: `Resetting demo`
- reset success: `Demo reset`

The initial load should preserve the current behavior:

- load audit events and active visas together
- set `status` to the thrown message if that combined load fails
- load integration status independently
- if integration status fails, set the synthetic failing row instead of changing `status`
- use a cancellation guard so settled promises do not update state after unmount

Avoid adding a new request manager or reducer unless implementation proves it necessary. The existing page already gates user actions with `busyAction`; the controller only needs one straightforward ownership point for refresh sequencing. If overlapping initial-load and button-action promises create stale state during implementation or testing, prefer a small monotonic request id inside the hook over spreading stale-response checks into `DemoClient.tsx` or `demo-api.ts`.

Validation after this milestone:

- `npm run typecheck`

### Milestone 3: Slim `DemoClient.tsx`

Update `app/demo/DemoClient.tsx` to import and call `useDemoController()`.

Remove from `DemoClient.tsx`:

- `useEffect` and `useState` imports if no longer needed
- `readJson()`
- `BusyAction` if exported from the hook and not needed locally
- direct `fetch()` calls
- refresh helper functions
- action sequencing functions

Keep in `DemoClient.tsx`:

- signed-in user props
- calls to `getDemoSteps()` and `getPreparedExport()`
- render structure and presentational subcomponents
- button disabled logic based on `busyAction`
- existing visible UI sections

At the end of this milestone, these checks should hold:

- `rg -n "fetch\\(|readJson|useEffect|useState" app/demo/DemoClient.tsx` returns no matches.
- `rg -n "/api/" app/demo/DemoClient.tsx` returns no matches.
- `rg -n "/api/" app/demo/demo-api.ts` shows all browser endpoint paths in one file.

Validation after this milestone:

- `npm run lint`
- `npm run typecheck`

### Milestone 4: Add Focused Tests Only If They Prove Moved Logic

Do not add tests just to snapshot React implementation details.

The repo already has `@testing-library/react` and `jsdom` installed, but `vitest.config.ts` does not set a global jsdom environment. If testing the hook directly, put `// @vitest-environment jsdom` at the top of the hook test file.

Preferred focused test, if practical:

- add `app/demo/use-demo-controller.test.tsx`
- mock `app/demo/demo-api.ts` with `vi.mock`
- use `renderHook`, `act`, and `waitFor` from `@testing-library/react`
- prove the controller hides sequencing by asserting:
  - initial load calls audit, visas, and integration status
  - `runMission()` calls mission, then refreshes audit and integration status, but not active visas
  - `grantVisa()` calls grant, then refreshes visas, audit, and integration status
  - `resetDemo()` calls reset, clears `toolCalls`, then refreshes visas, audit, and integration status
  - integration status failure produces the synthetic failing row

Keep this test at the controller boundary. Do not test DOM markup here; `DemoClient.tsx` should remain covered by typecheck/build and manual browser verification.

If the hook test becomes brittle because mocked async state timing dominates the implementation, abandon it and record the reason in `Surprises & Discoveries`. The existing `app/demo/demo-state.test.ts` should continue proving derived step/export behavior.

Optional low-cost test target if useful:

- extract and test an exported `integrationStatusFailureRow` constant only if duplication or typing pressure makes that worthwhile

Validation after this milestone:

- `npm run test`

### Milestone 5: Full Validation And Manual Demo Check

Run the full local validation suite:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Then, if a dev server is available or can be started, manually verify `/demo` in the browser:

1. page loads for a signed-in user
2. initial active visas and integration status appear
3. `Run mission` populates passport checks and audit replay
4. invoice export is denied before the narrow visa
5. `Grant narrow invoice export visa` updates active visas
6. running the mission again shows the fake prepared export artifact
7. `Reset demo` clears tool calls and restores the initial visa state

Record exact commands and manual results in `Progress` and `Outcomes & Retrospective`.

Also inspect the final diff before finishing:

- confirm no files under `app/api/`, `lib/authz.ts`, `lib/human-access.ts`, `lib/audit.ts`, `lib/mission.ts`, or database schema files changed
- confirm `DemoClient.tsx` no longer imports `useEffect` or `useState`
- confirm all endpoint paths live in `app/demo/demo-api.ts`

## Progress

- [x] Milestone 1: Extract typed demo API calls.
- [x] Milestone 2: Extract `useDemoController()`.
- [x] Milestone 3: Slim `DemoClient.tsx`.
- [x] Milestone 4: Add focused tests only if useful.
- [x] Milestone 5: Run full validation and manual demo check.

## Surprises & Discoveries

- A focused hook test was practical with the existing `@testing-library/react` and per-file jsdom environment. It protects the refresh sequencing without coupling to page markup.
- Review found the stale initial-load overlap risk named in the plan was still possible. A user action now increments a small hook-local generation counter so late initial-load promises cannot overwrite action results.

## Decision Log

- Decision: Use a colocated hook and API adapter under `app/demo/`.
  Rationale: The boundary is specific to the `/demo` client flow and has no current cross-page consumer.

- Decision: Keep `app/demo/demo-state.ts` unchanged as the pure derived-state module.
  Rationale: It already hides step/export derivation and has focused tests.

- Decision: Do not split presentational subcomponents in this pass unless required by the controller extraction.
  Rationale: The selected refactor is about hiding client sequencing, not reducing line count through visual component churn.

- Decision: Treat hook testing as useful only if it can prove refresh sequencing without coupling to markup.
  Rationale: The repo has React Testing Library and jsdom installed, but current tests are pure Vitest unit tests; adding a hook test is worthwhile only if it protects the moved behavior.

- Decision: Keep refresh coordination simple unless stale async state appears during implementation.
  Rationale: The existing UI disables concurrent button actions, so a full request-state abstraction would be a shallow concept; the only realistic overlap is initial loading settling near a user action.

- Decision: Use a hook-local generation counter for initial-load staleness.
  Rationale: This keeps stale-response protection inside the sequencing owner without adding a reducer, request manager, or leaking coordination into `DemoClient.tsx`.

## Abandonment Conditions

Stop or shrink the refactor if:

- the new API module becomes shallow one-line pass-throughs without improving the controller interface
- the hook interface exposes endpoint paths, JSON envelopes, or refresh ordering details
- the diff changes server route behavior or authorization/audit semantics
- validation failures suggest behavior changed outside the intended client boundary
- `DemoClient.tsx` becomes harder to read because state and render are now separated in name only

## Outcomes & Retrospective

- Added `app/demo/demo-api.ts` so endpoint paths, fetch options, response envelopes, and `readJson()` behavior live in one browser API adapter.
- Added `app/demo/use-demo-controller.ts` so initial loading, status text, busy action state, fallback integration status, and mission/grant/reset refresh sequencing live behind one hook interface.
- Updated `app/demo/DemoClient.tsx` so it no longer imports React state/effect hooks, calls `fetch()`, parses JSON envelopes, or references `/api/` paths.
- Added `app/demo/use-demo-controller.test.tsx` to verify initial load behavior, mission/grant/reset refresh ordering with call-order assertions, tool-call clearing on reset, and the synthetic failing integration-status row.
- Validation passed:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test` with 4 files and 27 tests passing
  - `npm run build`
- Review pass validation also passed after strengthening the hook tests:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test` with 4 files and 27 tests passing
  - `npm run build`
- Second review pass fixed stale initial-load protection and passed:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test` with 4 files and 28 tests passing
  - `npm run build`
- Third review pass found no further code changes and passed:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test` with 4 files and 28 tests passing
  - `npm run build`
- Browser smoke check passed in Chrome at `http://localhost:3000/demo` with an existing server on port 3000:
  - signed-in `/demo` page loaded
  - initial active visas and integration status appeared
  - `Run mission` populated the guided demo state and audit-backed status
  - `Grant narrow invoice export visa` updated active visas to include `invoice.export`
  - running the mission again showed `q4-invoices.csv export prepared`
  - `Reset demo` cleared tool calls and restored `invoice.read, invoice.summarize`
- Static acceptance checks passed:
  - `rg -n "fetch\\(|readJson|useEffect|useState" app/demo/DemoClient.tsx` returned no matches.
  - `rg -n "/api/" app/demo/DemoClient.tsx app/demo/demo-api.ts` showed endpoint paths only in `app/demo/demo-api.ts`.
- Final diff inspection confirmed no tracked changes under `app/api/`, `lib/authz.ts`, `lib/human-access.ts`, `lib/audit.ts`, `lib/mission.ts`, or database schema files.
