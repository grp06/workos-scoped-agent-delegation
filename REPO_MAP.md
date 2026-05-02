# Repo Map

This file is for AI agents that need to navigate the repo quickly. Read `AGENTS.md` first for working rules, then use this map to find the owning code.

## Product Surface

- `app/page.tsx`: public landing page.
- `app/demo/page.tsx`: server component for the signed-in demo screen.
- `app/demo/DemoClient.tsx`: client-side demo page composition and display.
- `app/demo/demo-api.ts`: browser fetch wrappers and response parsing for demo APIs.
- `app/demo/demo-state.ts`: pure guided-demo step and fake export artifact derivations.
- `app/demo/use-demo-controller.ts`: client state, refresh sequencing, and user actions for the demo page.
- `components/passport-check-card.tsx`: one visible authorization decision card.
- `components/audit-replay.tsx`: local audit timeline display.
- `components/ui/button.tsx`: shared button primitive.

## API Routes

- `app/login/route.ts`: starts WorkOS AuthKit login.
- `app/callback/route.ts`: handles WorkOS AuthKit callback.
- `app/api/demo/reset/route.ts`: resets local visas and audit events to the scripted starting state.
- `app/api/demo/run/route.ts`: runs the scripted finance mission for the signed-in user.
- `app/api/agent/grant-visa/route.ts`: grants the local narrow `invoice.export` visa.
- `app/api/agent/visas/route.ts`: returns active local visas.
- `app/api/authz/check/route.ts`: direct authorization check endpoint. The route validates request shape; valid tool-action vocabulary lives in `lib/demo-catalog.ts`.
- `app/api/audit-log/route.ts`: returns local audit events.
- `app/api/health/route.ts`: signed-in safe integration status for AuthKit, database, WorkOS FGA, and WorkOS Audit Logs. It returns status labels/details only, never secrets.
- `proxy.ts`: AuthKit proxy matcher for signed-in demo pages and API routes, including `/api/health`.

## Core Authorization Modules

- `lib/authz.ts`: central access decision module. It combines WorkOS human access and local agent visa access.
- `lib/demo-catalog.ts`: stable demo vocabulary for WorkOS resource type, WorkOS human permission slugs, local agent permission slugs, canonical demo resource ids, and tool-action mapping/validation.
- `lib/human-access.ts`: WorkOS FGA membership lookup and permission checks.
- `lib/visas.ts`: active local agent visa loading.
- `lib/mission.ts`: scripted tool calls used by the demo.
- `lib/audit.ts`: local audit persistence and WorkOS Audit Logs emission.
- `lib/integration-status.ts`: pure status classification for the signed-in integration status panel.
- `lib/workos.ts`: WorkOS SDK construction and required env handling.
- `lib/types.ts`: shared TypeScript contracts.
- `lib/demo-data.ts`: local seed data for the fake user, agent, documents, and initial visas.
- `lib/db.ts`: Neon/Postgres SQL client.

## Persistence And Setup

- `db/schema.sql`: database tables for users, agents, resources, visas, and audit events.
- `scripts/init-db.ts`: creates tables and seeds local demo data.
- `scripts/init-workos-fga.ts`: creates WorkOS document permissions, an org role, demo resources, and role assignments.
- `scripts/init-workos-audit-schemas.ts`: creates WorkOS Audit Log schemas for emitted demo actions.
- `.env.example`: environment variable template. Never commit `.env.local`.

## Tests And Validation

- `lib/authz.test.ts`: unit tests for local authorization decision behavior.
- `lib/integration-status.test.ts`: unit tests for integration status classification.
- `app/demo/demo-state.test.ts`: unit tests for guided demo state and fake export artifact derivation.
- `app/demo/use-demo-controller.test.tsx`: unit tests for demo controller sequencing and stale-load protection.
- `vitest.config.ts`: unit test config.
- `eslint.config.mjs`: lint config.
- `package.json`: scripts and dependencies.

Primary validation commands:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Generated Or External Directories

- `.next/`: Next.js build/dev output. Do not edit.
- `node_modules/`: installed dependencies. Do not edit.
- `public/`: static assets from the Next.js scaffold.
- `.agent/`: planning docs. Read `.agent/execplan.md` before changing product behavior.

## Common Change Targets

- To change permission/resource vocabulary: start in `lib/demo-catalog.ts`, then update `lib/demo-data.ts`, WorkOS setup scripts, and affected tests.
- To change final authorization policy: start in `lib/authz.ts`.
- To change WorkOS membership or FGA call behavior: start in `lib/human-access.ts`.
- To change agent visa rules: start in `lib/authz.ts`, `lib/demo-data.ts`, and `app/api/agent/grant-visa/route.ts`.
- To change the scripted demo mission: start in `lib/mission.ts`.
- To change audit payloads: start in `lib/audit.ts`, then update `scripts/init-workos-audit-schemas.ts`.
- To change guided demo progress: start in `app/demo/demo-state.ts`, then update `app/demo/DemoClient.tsx`.
- To change demo client action sequencing: start in `app/demo/use-demo-controller.ts`.
- To change visible copy or layout: start in `app/demo/DemoClient.tsx`, `components/passport-check-card.tsx`, and `components/audit-replay.tsx`.
