# ExecPlan: Demo Polish Pass

This plan is a living implementation contract. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` current while implementing.

## Purpose

Agent Passport Control already demonstrates scoped AI-agent access with WorkOS AuthKit, WorkOS Authorization/FGA, WorkOS Audit Logs, Neon/Postgres, and local agent visas. The behavior works, but the demo page still asks the viewer to infer too much from separate UI regions.

This plan makes the existing story legible in about 60 seconds:

```txt
human WorkOS access AND local agent visa = final tool-call decision
```

The goal is not to broaden the product. The goal is to reduce viewer cognitive load, make real integrations visible without leaking secrets, and make the allow/deny path feel like a polished developer-relations demo.

## Current System Shape

Read these files before editing:

- `README.md`: current purpose, setup, and demo flow.
- `ARCHITECTURE.md`: ownership rules and real-vs-demo boundaries.
- `REPO_MAP.md`: navigation map.
- `app/page.tsx`: landing page.
- `app/demo/page.tsx`: signed-in demo shell. It calls `withAuth({ ensureSignedIn: true })` and passes `signedInEmail` and `signedInName` into the client component.
- `app/demo/DemoClient.tsx`: client-side demo orchestration. It owns `toolCalls`, `auditEvents`, `activeVisas`, `busyAction`, and `status`; it fetches `/api/audit-log`, `/api/agent/visas`, `/api/demo/run`, `/api/agent/grant-visa`, and `/api/demo/reset`.
- `components/passport-check-card.tsx`: visible authorization decision card. It currently renders `humanHasAccess`, `humanRequiredPermission`, `agentVisaAllows`, `requiredPermission`, `decision`, and `reason`.
- `components/audit-replay.tsx`: audit replay list. It currently renders all events with no local filter state.
- `app/api/health/route.ts`: shallow health endpoint that currently returns only `{ ok: true, service: "agent-passport-control" }`.
- `app/api/demo/run/route.ts`: mission runner route. It requires AuthKit sign-in and calls `runFinanceMission()`.
- `app/api/agent/visas/route.ts`: active visa route for the Finance Agent.
- `app/api/audit-log/route.ts`: local audit event route.
- `proxy.ts`: AuthKit proxy matcher. It currently protects `/demo`, `/api/demo`, `/api/authz`, `/api/agent`, and `/api/audit-log`, but not `/api/health`.
- `lib/mission.ts`: scripted tool calls. It runs invoice search, invoice summarize, invoice export, and payroll export, then records audit metadata including `humanHasAccess`, `humanAccessSource`, `humanRequiredPermission`, `agentVisaAllows`, and `requiredPermission`.
- `lib/types.ts`: shared UI/API contracts. `ToolCallResult`, `AuditEvent`, `Decision`, and `WorkosStatus` are already defined here.
- `lib/authz.ts`: final authorization decision owner. `evaluateAccess()` is pure and already covered by tests; UI must not reimplement its policy.
- `lib/audit.ts`: local audit persistence and WorkOS Audit Logs emission. `listAuditEvents()` is the safe source for local audit status.
- `lib/human-access.ts`: WorkOS FGA owner. `checkWorkosHumanAccess()` fails closed and maps tool actions to WorkOS permissions.
- `lib/db.ts`: Neon/Postgres client. A cheap `select 1` is enough to prove database connectivity.
- `lib/authz.test.ts`: existing Vitest coverage for the authorization policy.

The current UI has the important data, but the story is fragmented:

- The viewer sees setup cards, mission controls, decision cards, and audit replay, but not a guided sequence.
- The health endpoint is too shallow to support a credible "real integrations" panel.
- Passport cards show the two gates, but the `AND` decision rule is not visually central.
- Successful invoice export is only another allowed card; there is no visible demo artifact showing what changed after the visa grant.
- Audit replay is a flat list with no filters, so it reads like raw debug output rather than an audit UI.
- The landing page is close, but the CTA and copy can be tightened around scoped delegation with WorkOS.

## Complexity Lens

The main complexity today is cognitive load for the viewer, not backend implementation complexity. A reviewer must connect separate UI regions and remember the intended demo sequence.

This plan should pull demo narration and status interpretation behind small, stable boundaries:

- `app/demo/demo-state.ts` owns pure client-visible derivations such as guided step completion and fake export artifact detection.
- `app/api/health/route.ts` owns safe integration diagnostics and never returns secret values.
- `PassportCheckCard` owns the visual explanation of a single already-computed decision.
- `AuditReplay` owns local filtering and presentation of existing audit events.

Authorization policy stays in `lib/authz.ts`; WorkOS FGA details stay in `lib/human-access.ts`; audit emission stays in `lib/audit.ts`. UI code may explain decisions but must not recreate access-control policy.

The complexity dividend is a simpler mental model for both future agents and reviewers: one server route reports integration state, one pure helper module derives demo progress, and each UI component owns only its own display.

## Hard Constraints

- Do not change the final authorization model.
- Do not move agent visas into WorkOS.
- Do not grant `payroll.export` in any UI path.
- Do not create a real document export or download.
- Do not expose secrets or environment variable values in browser responses.
- Do not make the UI claim WorkOS integration is healthy unless the app can prove enough to support that specific label.
- Do not let a status-panel failure break the existing audit-event or active-visa loading path.
- Keep the demo compatible with Next.js App Router and the repo's current scripts.
- Keep edits scoped to the demo polish surface unless validation reveals a root-cause bug.
- Keep WorkOS failures fail-closed in authorization; polish must not mask denied decisions as demo success.

## Implementation Plan

### Milestone 1: Add Pure Demo State Derivations

Create `app/demo/demo-state.ts` for pure UI derivations that would otherwise become scattered across `DemoClient.tsx`.

Define small functions around existing contracts:

```ts
type DemoStepKey =
  | "signedIn"
  | "missionRun"
  | "exportBlocked"
  | "visaGranted"
  | "exportPrepared"
  | "auditProof";

type DemoStep = {
  key: DemoStepKey;
  label: string;
  state: "complete" | "current" | "pending";
  detail: string;
};
```

Functions:

- `getDemoSteps(input)` derives step state from `signedInEmail`, `toolCalls`, `activeVisas`, and `auditEvents`.
- `getPreparedExport(toolCalls)` returns a small export artifact only when the latest in-memory mission results include invoice export allowed.
- `hasInvoiceExportDenied(toolCalls)` and `hasInvoiceExportAllowed(toolCalls)` may be private helpers if they keep `getDemoSteps()` readable.

Use exact existing data:

- Signed-in: `Boolean(signedInEmail)`.
- Mission run: `toolCalls.length > 0`.
- Export blocked: `tool === "export_csv"`, `resourceId === "q4-invoices"`, `decision === "denied"`.
- Visa granted: `activeVisas.includes("invoice.export")`.
- Export prepared: `tool === "export_csv"`, `resourceId === "q4-invoices"`, `decision === "allowed"`.
- Audit proof: at least one audit event exists and at least one event has `workosStatus === "sent"`.

Add focused Vitest coverage for these pure helpers. Prefer `app/demo/demo-state.test.ts` or `tests/unit/demo-state.test.ts`; use whichever location is least surprising after checking current test conventions. The existing repo already runs Vitest over TypeScript files and has `lib/authz.test.ts`.

Acceptance:

- The step states are deterministic and tested without a browser.
- Reset-like input with no `toolCalls` returns only signed-in/current initial steps.
- First mission input marks invoice export blocked but not export prepared.
- Visa grant input marks visa granted.
- Second mission input marks export prepared.
- Audit proof only marks complete when a sent WorkOS audit event is present.

### Milestone 2: Render A State-Aware Guided Demo Stepper

Update `app/demo/DemoClient.tsx` to render a compact stepper near the top of the page, preferably after the setup cards and before mission control.

Use `getDemoSteps()` from `app/demo/demo-state.ts`. The stepper should communicate:

```txt
1. Signed in
2. Run mission
3. Export blocked
4. Grant narrow visa
5. Run again
6. Audit proof
```

Implementation guidance:

- Keep the component colocated inside `DemoClient.tsx` unless it becomes large enough to justify `components/demo-stepper.tsx`.
- Use stable dimensions and wrapping so labels do not collide on mobile.
- Do not add another state variable for current step; derive it from existing state.
- Do not persist step state to the database.

Acceptance:

- The stepper visibly updates after reset, first mission run, visa grant, and second mission run.
- It is readable on narrow screens.
- It does not alter API behavior.

### Milestone 3: Add A Safe Integration Status Endpoint And Panel

Extend `app/api/health/route.ts` or replace it with a more useful response. Keep the route server-owned so UI code does not know how to inspect environment, database, or audit internals.

Also update `proxy.ts` so `/api/health/:path*` is protected by the AuthKit proxy. Without this, a route that calls `withAuth({ ensureSignedIn: true })` has different protection semantics from the rest of the signed-in demo API surface.

Preferred response:

```ts
type IntegrationStatus = {
  key: "authkit" | "database" | "fga" | "auditLogs";
  label: string;
  state: "connected" | "ready" | "notConfigured" | "failing" | "noEventsYet";
  detail: string;
};
```

Concrete status rules grounded in the current code:

- `authkit`: call `withAuth({ ensureSignedIn: true })`. If it returns a user, state is `connected` with a safe detail like `Signed in as user email`; if it throws, let the route return the appropriate auth failure rather than pretending health is public.
- `database`: run a cheap `sql\`select 1 as ok\``. State is `connected` on success and `failing` with a sanitized error message on failure.
- `fga`: do not perform an extra authorization check just for status unless it can reuse existing helpers without changing policy. Report `notConfigured` if `WORKOS_API_KEY` or `WORKOS_ORGANIZATION_ID` is missing. If recent audit metadata includes `humanAccessSource: "workos_fga"` or a `humanRequiredPermission` beginning with `document:`, report `connected` with a detail like `Last mission used WorkOS FGA`. Otherwise report `ready` with `Configured; run mission to observe a check`.
- `auditLogs`: use `listAuditEvents()`. If any event has `workosStatus === "sent"`, report `connected`. If events exist but all are `failed`, report `failing` with `Most recent WorkOS audit send failed` and do not expose the raw WorkOS error by default. If no events exist, report `noEventsYet`.

If this logic becomes hard to read inside the route, move the pure classification into `lib/integration-status.ts` and keep the route as the owner of request/session and IO. Avoid a shallow pass-through module; extract only to hide error sanitization and status classification from the route.

Never return:

- `WORKOS_API_KEY`
- `DATABASE_URL`
- full `WORKOS_CLIENT_ID` unless intentionally public elsewhere
- raw Neon hostnames or passwords
- raw WorkOS audit error strings that may contain request details

Update `DemoClient.tsx` to fetch this health response on initial load and after reset/mission/grant actions so Audit Logs status can update after events are emitted.

The current initial load uses `Promise.all()` for audit events and visas. Do not add health to that same all-or-nothing chain. Use a separate `refreshIntegrationStatus()` function or `Promise.allSettled()` so a health/status failure can mark the integration panel as failing without preventing audit events or active visas from rendering.

Add a compact integration status panel:

- AuthKit
- WorkOS FGA
- WorkOS Audit Logs
- Database

Use copy that distinguishes actual evidence from readiness. For example, `ready` is not the same as `connected`.

Acceptance:

- The panel distinguishes real services from scripted demo data.
- Missing or failing integrations are visible without crashing the whole demo page.
- No secret values are returned in the API payload or rendered in the UI.
- Audit Logs status updates after events are emitted.
- `/api/health` is protected consistently with the other signed-in demo API routes.

### Milestone 4: Make Passport Decisions Instantly Legible

Update `components/passport-check-card.tsx` so the decision formula is visually central:

```txt
WorkOS human access   yes
AND
Agent visa            no
=
Final decision        DENIED
```

Use only existing `ToolCallResult` fields:

- `humanHasAccess`
- `humanRequiredPermission`
- `agentVisaAllows`
- `requiredPermission`
- `decision`
- `reason`

Do not compute new policy in the component. It should render the result already returned by `checkAccess()`.

Keep the existing reason text, but make it secondary to the formula. The reason is useful detail; the formula is the core concept.

Implementation guidance:

- Prefer a small internal `DecisionLine` component over introducing a new shared abstraction.
- Keep current allowed/denied color language, but avoid making the whole page read as a one-color palette.
- Ensure long permission strings wrap using existing `break-words`/monospace treatment.

Acceptance:

- Invoice export before visa clearly reads as denied because agent visa is missing.
- Invoice export after visa clearly reads as allowed because both gates pass.
- Payroll export after invoice visa clearly reads as denied because the payroll visa is missing.
- The card remains readable on narrow screens.

### Milestone 5: Show A Fake Export Success Artifact

Use `getPreparedExport(toolCalls)` from `app/demo/demo-state.ts` in `DemoClient.tsx`.

Render a small result panel only when the latest in-memory mission results include:

```txt
tool === "export_csv"
resourceId === "q4-invoices"
decision === "allowed"
```

Copy:

```txt
q4-invoices.csv export prepared
Scoped to invoice.export visa
Demo artifact only; no real file was created.
```

This makes the success path visible without adding a real export route or file generation.

Acceptance:

- Artifact appears only after invoice export is allowed.
- Artifact disappears on reset because `resetDemo()` already clears `toolCalls`.
- No file is generated and no download button is added.

### Milestone 6: Add Audit Replay Filters

Update `components/audit-replay.tsx` to support local filters:

- All
- Allowed
- Denied
- Visa grants
- WorkOS sent

The component may own its selected filter as local React state. Filtering should use existing `AuditEvent` fields:

- `decision`
- `action`
- `workosStatus`

Preferred filter rules:

- `Allowed`: `event.decision === "allowed"`.
- `Denied`: `event.decision === "denied"`.
- `Visa grants`: `event.action === "agent.visa.granted"`.
- `WorkOS sent`: `event.workosStatus === "sent"`.

Prefer a compact segmented-control style using existing button/classes. Do not add a new UI library.

Acceptance:

- Each filter changes the visible list without network requests.
- Empty filtered states explain that no matching events exist.
- The list still shows timestamp, actor/target, action, decision, reason, and WorkOS status.
- The default view remains all events.

### Milestone 7: Tighten Landing Page Copy

Update `app/page.tsx` only enough to sharpen the story:

- Headline remains `Agent Passport Control`.
- Supporting copy says this is scoped delegation for AI agents using WorkOS AuthKit, Authorization/FGA, and Audit Logs.
- CTA becomes `Open live demo`.
- Keep the visual demo card, but align labels with product language:
  - `WorkOS FGA`
  - `Agent visa`
  - `Audit Logs`

Do not turn the landing page into a long marketing site.

Acceptance:

- The homepage explains the app in one short paragraph.
- The CTA points to `/demo`.
- The first viewport still contains the product name and a hint of the demo concept.

### Milestone 8: Update Agent-Facing Docs If Contracts Change

If implementation adds `app/demo/demo-state.ts` or changes `/api/health` response shape, update:

- `REPO_MAP.md` with the new helper/status route responsibility.
- `ARCHITECTURE.md` with the safe integration-status rule if the route becomes part of the architecture.
- `README.md` only if visible demo flow or setup expectations change.
- `proxy.ts` should be reflected in `REPO_MAP.md` if `/api/health` protection changes there.

Do not over-document visual-only changes.

Acceptance:

- Future agents can find the new demo-state helper and health/status contract.
- Docs still distinguish real WorkOS/Postgres services from scripted demo data.

## Testing And Validation

Automated checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Focused test expectations:

- Existing `lib/authz.test.ts` must still pass unchanged unless a real policy bug is found.
- Add tests for `app/demo/demo-state.ts` derivations.
- If `/api/health` logic grows beyond simple inline route code, extract only the pure status classification into a helper and test that helper. Do not create a shallow route wrapper just for testing.

Manual browser validation at `http://localhost:3000/demo`:

1. Reset the demo.
2. Confirm the stepper returns to the initial signed-in/ready state.
3. Confirm the integration panel shows AuthKit and Database connected, and Audit Logs as connected or failing based on the reset audit event that `/api/demo/reset` emits.
4. Run mission.
5. Confirm invoice read/summarize pass, invoice export is denied, payroll export is denied.
6. Confirm the stepper marks the blocked export step.
7. Confirm passport cards show the `WorkOS human access AND Agent visa` formula.
8. Grant the narrow invoice export visa.
9. Confirm active visas update.
10. Run mission again.
11. Confirm invoice export passes, payroll export remains denied.
12. Confirm fake export artifact appears.
13. Confirm audit filters work.
14. Confirm integration status panel does not expose secrets and accurately reflects local app state.

If browser automation is available, use the in-app browser or Playwright to capture at least one desktop and one mobile viewport sanity check. If not, record that manual browser validation remains.

## Progress

- [x] Plan created from the locked demo polish decision.
- [x] Plan improved against current repo evidence.
- [x] Milestone 1: pure demo state derivations.
- [x] Milestone 2: guided demo stepper.
- [x] Milestone 3: integration status panel.
- [x] Milestone 4: passport decision polish.
- [x] Milestone 5: fake export success artifact.
- [x] Milestone 6: audit replay filters.
- [x] Milestone 7: landing page copy cleanup.
- [x] Milestone 8: docs updated for changed contracts.
- [x] Validation complete.

## Surprises & Discoveries

- `app/api/health/route.ts` is currently too shallow for the planned integration panel; it only returns `{ ok: true, service: "agent-passport-control" }`.
- `proxy.ts` does not currently include `/api/health`, so the implementation must add it if health starts depending on signed-in AuthKit state.
- `DemoClient.tsx` currently uses `Promise.all()` for initial audit/visa loading; health fetches should not be added to that all-or-nothing chain.
- `lib/mission.ts` already records enough audit metadata to infer whether a recent mission exercised WorkOS FGA without adding another WorkOS authorization call just for status.
- The project already has Vitest coverage for pure authorization policy in `lib/authz.test.ts`, so demo-step derivations can be tested cheaply as pure functions.
- Browser validation reached the WorkOS AuthKit sign-in screen. Completing the signed-in manual flow would require typing a personal email address into the hosted login form, so manual browser validation stopped there.

## Decision Log

- Keep this as a UI/demo polish pass. The authorization model remains `human WorkOS access AND local agent visa`.
- Put pure demo progress/export derivation in `app/demo/demo-state.ts` so `DemoClient.tsx` stays mostly composition and event handling.
- Keep integration diagnostics behind a safe server route that returns statuses, not secret values.
- Protect `/api/health` with the same AuthKit proxy matcher as the other signed-in demo API routes once it reports session-sensitive status.
- Fetch integration status independently from required demo data so diagnostics remain advisory rather than a new critical path.
- Infer FGA "connected" from observed mission audit metadata when available; otherwise report "ready" rather than adding an extra authorization check with unclear product meaning.
- Keep fake export as browser-visible demo state only, not a real file export.

## Outcomes & Retrospective

- Implemented the polish pass end to end.
- Added `app/demo/demo-state.ts` and `app/demo/demo-state.test.ts` for guided demo progress and fake export artifact derivation.
- Expanded `/api/health` into a signed-in, secret-safe integration status route and added `/api/health/:path*` to the AuthKit proxy matcher.
- Updated the demo page with a guided stepper, integration status panel, export success artifact, clearer passport decision formula, and audit replay filters.
- Tightened landing page copy and updated `README.md`, `REPO_MAP.md`, and `ARCHITECTURE.md` for the new helper and status contract.
- Validation passed: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Manual browser validation is partially complete: Chrome reached the AuthKit sign-in page, but the signed-in flow was not exercised because entering an email into WorkOS would transmit personal data.
- Review pass extracted integration status classification into `lib/integration-status.ts`, added unit coverage in `lib/integration-status.test.ts`, and changed audit replay to hide raw WorkOS error details from the browser.
- Review validation passed: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Second review pass separated database connectivity status from local audit-event loading failure status in `/api/health`, and added coverage for audit-load failure classification.
- Second review validation passed: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
