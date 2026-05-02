# Architecture

This document is for AI agents working on Agent Passport Control. It explains the current system shape, module ownership, and data flow.

## Purpose

Agent Passport Control demonstrates scoped delegation for AI agents.

The key idea:

```txt
final decision = human WorkOS access AND local agent visa
```

A human may be allowed to export a finance document, but the agent cannot do it unless the app has also granted the agent a narrow, temporary visa for that exact action.

## System Overview

```txt
Browser UI
  |
  | AuthKit session
  v
Next.js App Router
  |
  | API routes / server code
  v
Authorization decision
  |-----------------------------|
  v                             v
WorkOS Authorization/FGA     Local Postgres visa check
  |                             |
  |                             v
  |                         agent_visas
  |
  v
WorkOS Audit Logs + local audit_events
```

## Real Services

- **WorkOS AuthKit** owns sign-in and session identity.
- **WorkOS Authorization/FGA** owns human document access.
- **WorkOS Audit Logs** receives durable audit events for reset, visa grant, and tool-call decisions.
- **Neon/Postgres** stores local demo state.

## Demo-Only State

These are intentionally fake or local:

- The Finance Agent is a seeded local row in `agents`.
- The documents are seeded local rows in `resources`; no real document content exists.
- The mission is scripted in `lib/mission.ts`; no real search, summary, or export tool runs.
- Agent visas are local rows in `agent_visas`; they model the concept of scoped delegated access.
- `demo_users` contains scaffold/demo identity data and is not the source of truth for AuthKit identity.

## Request Flow

### Login

1. `app/login/route.ts` redirects to WorkOS AuthKit.
2. WorkOS returns to `app/callback/route.ts`.
3. Signed-in routes use `withAuth({ ensureSignedIn: true })`.

### Mission Run

1. UI calls `POST /api/demo/run`.
2. `app/api/demo/run/route.ts` gets the signed-in WorkOS user.
3. `runFinanceMission()` runs four scripted tool calls:
   - search invoice docs
   - summarize invoice docs
   - export invoice CSV
   - export payroll CSV
4. Each tool call calls `checkAccess()`.
5. Each result is written locally and emitted to WorkOS Audit Logs.

### Integration Status

`app/api/health/route.ts` returns safe browser-visible integration status for:

- WorkOS AuthKit
- Database
- WorkOS Authorization/FGA
- WorkOS Audit Logs

This route is protected by `proxy.ts` like the other signed-in demo API routes. It may report service readiness or observed activity, but it must never return secret values such as API keys, database URLs, or raw provider errors.

Pure status classification lives in `lib/integration-status.ts`; the route owns request/session and database IO.

### Access Check

`lib/authz.ts` owns the final decision.

It loads:

- local agent row
- local resource row
- WorkOS human access result
- local agent visa result

Then it returns a single `CheckResult` with:

- `humanHasAccess`
- `humanAccessSource`
- `humanRequiredPermission`
- `agentVisaAllows`
- `decision`
- `reason`
- `requiredPermission`

Callers should not recreate this policy.

## Authorization Model

### WorkOS Human Access

Owned by `lib/human-access.ts`.

Stable permission vocabulary and the tool-action mapping live in `lib/demo-catalog.ts`.

Tool actions map to WorkOS permissions:

```txt
search_docs        -> document:read
summarize_document -> document:summarize
export_csv         -> document:export
```

The WorkOS FGA check uses:

```txt
resourceTypeSlug: document
resourceExternalId: local resource id
permissionSlug: mapped WorkOS permission
organizationMembershipId: active membership for signed-in user
```

If WorkOS lookup or authorization fails, the app fails closed and returns a denied decision.

### Local Agent Visa

Owned by `lib/authz.ts`, `lib/visas.ts`, and `agent_visas`.

Stable local permission strings live in `lib/demo-catalog.ts`. Final local authorization policy stays in `lib/authz.ts`.

Local resource permissions are demo-specific:

```txt
invoice.read
invoice.summarize
invoice.export
payroll.read
payroll.export
board.read
contract.read
contract.export
```

Initial visa state gives the Finance Agent:

```txt
invoice.read
invoice.summarize
```

Clicking **Grant narrow invoice export visa** adds:

```txt
invoice.export
```

No flow grants `payroll.export`, so payroll export remains denied.

## Audit Model

Local audit persistence is owned by `lib/audit.ts`.

Every recorded event:

1. inserts into `audit_events`
2. attempts to emit to WorkOS Audit Logs
3. updates local `workos_status` to `sent` or `failed`

WorkOS schemas are created by `scripts/init-workos-audit-schemas.ts` for:

```txt
demo.reset
agent.visa.granted
agent.tool_call.allowed
agent.tool_call.denied
```

If audit payload metadata changes, update both `lib/audit.ts` or the callsite metadata and `scripts/init-workos-audit-schemas.ts`.

## Database Tables

Defined in `db/schema.sql`.

- `demo_users`: demo scaffold user rows.
- `agents`: local agent definitions.
- `resources`: fake document records and local agent permissions.
- `agent_visas`: narrow, expiring local permissions for the agent.
- `audit_events`: local replay log plus WorkOS delivery status.

## Setup Scripts

- `scripts/init-db.ts`: local Postgres schema and seed data.
- `scripts/init-workos-fga.ts`: WorkOS permissions, org role, resources, assignments.
- `scripts/init-workos-audit-schemas.ts`: WorkOS Audit Log validation schemas.

The WorkOS FGA script assumes the dashboard already has resource type `document`. The dashboard currently requires that model step before SDK setup can create permissions.

## Ownership Rules For Future Changes

- Keep final authorization policy in `lib/authz.ts`.
- Keep stable demo vocabulary and tool-action-to-WorkOS-permission mapping in `lib/demo-catalog.ts`.
- Keep WorkOS user/membership/FGA details in `lib/human-access.ts`.
- Keep WorkOS SDK creation in `lib/workos.ts`.
- Keep audit emit details in `lib/audit.ts`.
- Keep integration status classification in `lib/integration-status.ts`; it may consume WorkOS document permission vocabulary for classification, but it owns the status-state rules.
- Keep demo fixture data in `lib/demo-data.ts`.
- Keep guided-demo progress and fake export derivation in `app/demo/demo-state.ts`.
- Keep browser-visible decision display in `components/passport-check-card.tsx`.

Do not spread policy decisions into route handlers or UI components. Routes should gather request context and call the owning module.

## Current Known Limits

- This is a demo app, not a production authorization gateway.
- The agent is simulated; there is no real autonomous runtime.
- The document tools are scripted; no external document store is queried.
- WorkOS FGA covers the human side only. The agent visa model is intentionally local so the concept is easy to inspect.
- There is no deployment config yet beyond Vercel-compatible Next.js conventions.
