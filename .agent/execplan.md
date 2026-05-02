# Build Agent Passport Control as a deployable WorkOS demo

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan should be maintained in accordance with `.agent/PLANS.md` if that file exists in the repository. If `.agent/PLANS.md` does not exist yet, create it from the OpenAI ExecPlans guidance before using this document for implementation. This document is intentionally self-contained so a contributor can restart from only this plan and the current repository.

## Purpose / Big Picture

After this work, the repository will contain a small, polished Next.js demo called Agent Passport Control. A visitor can sign in with WorkOS AuthKit, open a fake enterprise data room, run a scripted AI agent mission, watch each tool call pass through a visible “passport check,” grant a narrow agent “visa,” and replay the audit trail.

The demo teaches one idea: an AI agent acting for a human should not automatically inherit every permission the human has. The human in the demo is Alice, a finance admin at Acme Corp. The agent is Finance Agent. Alice can view sensitive finance resources, but Finance Agent starts with only narrow permissions. When the agent tries to export payroll, the app denies the action and records why.

The system will be deployable as one Vercel-hosted Next.js app. The UI, application API routes, AuthKit callback route, authorization logic, local audit timeline, and WorkOS Audit Logs integration all live in one repository. Neon Postgres stores durable demo state. There is no separate backend service.

## Progress

- [x] (2026-05-01 00:00Z) Chose the implementation scope: Next.js App Router, Vercel hosting, WorkOS AuthKit login, WorkOS Audit Logs, Neon Postgres, local agent visa checks, and scripted agent actions.
- [x] (2026-05-01 00:00Z) Chose not to build a real LLM agent for the first version. The agent mission will be deterministic and scripted so the demo is reliable in a two-day build.
- [x] (2026-05-01) Created the Next.js application in the existing repository root with App Router, TypeScript, Tailwind, shadcn/ui, npm scripts, and root-level `app/` paths.
- [x] (2026-05-01) Added AuthKit integration code: provider, `/login`, `/callback`, protected `/demo`, and logout. Real local sign-in still requires WorkOS dashboard values and `.env.local`.
- [x] (2026-05-01) Created `db/schema.sql`, `.env.example`, and an idempotent `scripts/init-db.ts` seed script. Running the script against Neon still requires `DATABASE_URL`.
- [x] (2026-05-01) Built the local authorization check that combines Alice’s local human access with Finance Agent’s active visa.
- [x] (2026-05-01) Built API routes for health, mission run, access checks, narrow visa grant, audit log reading, and demo reset.
- [x] (2026-05-01) Implemented local audit rows and WorkOS Audit Logs emission with local `sent` / `failed` status recording.
- [x] (2026-05-01) Built the public landing page, protected demo page, passport-check cards, and audit replay panel.
- [x] (2026-05-01) Added authorization policy tests covering the initial visa, invoice export grant, and payroll export denial.
- [ ] Deploy to Vercel and configure production environment variables.
- [ ] Record or prepare the final 90-second demo flow.

## Surprises & Discoveries

Implementation discoveries:

- `create-next-app` could not scaffold directly into the repository because `.agent/` already existed, so the app was generated in a temporary sibling directory and copied into the repo without touching the plan.
- Next.js 16 uses `proxy.ts`; AuthKit’s current Next.js package exposes `authkitProxy` for this path.
- AuthKit reads its redirect URI from `NEXT_PUBLIC_WORKOS_REDIRECT_URI`, matching the variable already named in this plan.
- `npm run db:init` now fails loudly with `Missing required environment variable DATABASE_URL` until a real Neon connection string is supplied.
- `npm audit --omit=dev` reports moderate transitive `postcss` advisories through current `next` / `@workos-inc/authkit-nextjs`; npm reports no non-breaking fix.
- A review pass found that protecting only `/demo` left demo mutation APIs directly reachable. The proxy matcher now also protects the mission, authorization check, visa grant, reset, and audit-log API routes while leaving `/api/health` public.
- A second review pass tightened the authorization tests so they assert the required permission chosen by production code, not a duplicated test-only rule. The same pass changed the audit-log proxy matcher to the route-pattern form.
- A third review pass moved demo audit clearing into the same transaction as visa reset, preventing partial reset state if the visa reset queries fail. It also fixed an invalid Tailwind color class on the landing page.
- A fourth review pass fixed the sample WorkOS cookie password placeholder so it satisfies AuthKit's 32-character minimum if copied during setup, and corrected the Tailwind sans font token to reference the generated Geist variable.

Expected areas to watch are cookie behavior in preview deployments, WorkOS redirect URI mismatches, and duplicate audit events during retries. If any of these happen, record the exact symptom, the command or browser action that reproduced it, and the fix.

## Decision Log

- Decision: Use Next.js App Router in a single repository.
  Rationale: The app needs pages, server-side authentication, API routes, and deployment to Vercel. Next.js App Router supports all of these without a separate backend.
  Date/Author: 2026-05-01 / George and assistant.

- Decision: Use Vercel for hosting.
  Rationale: Vercel is the simplest deployment target for a Next.js demo. The UI and server-side API routes can deploy together from one repo.
  Date/Author: 2026-05-01 / George and assistant.

- Decision: Use Neon Postgres for durable state.
  Rationale: In-memory state is not reliable on deployed serverless functions. Neon gives the app a normal Postgres database with a single `DATABASE_URL`, and the demo only needs a few tables.
  Date/Author: 2026-05-01 / George and assistant.

- Decision: Use raw SQL with the Neon serverless driver instead of an ORM.
  Rationale: The schema is small. Avoiding an ORM reduces setup time and makes the data model obvious to a new contributor.
  Date/Author: 2026-05-01 / George and assistant.

- Decision: Use WorkOS AuthKit for login.
  Rationale: The demo is for a WorkOS DevRel application. Login should use a real WorkOS product surface rather than a mocked session.
  Date/Author: 2026-05-01 / George and assistant.

- Decision: Use WorkOS Audit Logs for external audit events and also store a local audit timeline in Postgres.
  Rationale: WorkOS Audit Logs prove the integration. The local audit timeline makes the demo UI fast, queryable, and reliable even if an external audit event fails.
  Date/Author: 2026-05-01 / George and assistant.

- Decision: Simulate the AI agent with scripted tool calls.
  Rationale: The value of the demo is the authorization and audit story, not model behavior. A scripted mission is easier to build, easier to record, and less likely to fail during a live demo.
  Date/Author: 2026-05-01 / George and assistant.

- Decision: Use “passport” and “visa” as product metaphors.
  Rationale: “Passport” means the agent has an identity. “Visa” means the agent has a narrow, temporary permission to perform certain actions. These terms make authorization visible without requiring the audience to know identity jargon.
  Date/Author: 2026-05-01 / George and assistant.

- Decision: Keep seeded demo constants in `lib/demo-data.ts`.
  Rationale: The database seed script and reset / grant endpoints share the same user, agent, resource, and initial visa identities. Centralizing these constants prevents subtle drift without creating a service layer.
  Date/Author: 2026-05-01 / assistant.

- Decision: Test authorization through a pure policy function before adding database-backed tests.
  Rationale: No test database exists yet. The pure policy tests prove the important authorization cases now, while the runtime `checkAccess` function still owns database loading and active visa lookup.
  Date/Author: 2026-05-01 / assistant.

## Outcomes & Retrospective

Local implementation is complete through the code and build stage. The repository now contains the planned Next.js app, AuthKit route/proxy integration, schema and seed script, authorization module, audit module, mission runner, API routes, UI, and authorization tests.

What remains out of scope for this local pass is external configuration: real WorkOS credentials, WorkOS dashboard redirect/sign-in URLs, WorkOS Audit Log schemas, a Neon `DATABASE_URL`, Vercel project setup, production deployment, and final demo recording.

The intended final outcome is that a reviewer can open the deployed app, sign in, run the mission, see two allowed actions and one denied action, grant a narrow visa, rerun part of the mission, and inspect a timeline showing every decision.

## Context and Orientation

This repository will be a new Next.js application named `agent-passport-control`. Next.js is a React framework that can render pages and also expose server-side API routes. An API route is an HTTP endpoint inside the Next.js app, such as `POST /api/demo/run`, that can run server-side code and return JSON. Vercel deploys these routes as server-side functions, which means they can safely read secret environment variables and call WorkOS.

WorkOS AuthKit is the login system. A user clicks “Sign in,” goes to a hosted WorkOS login page, and returns to the app through `/callback`. A callback route is the route that receives the user after WorkOS has authenticated them. The app then has a signed-in user session.

WorkOS Audit Logs is the external audit system. An audit event is a record of an important action, such as “Finance Agent attempted to export payroll and was denied.” Each event has an action name, an actor, targets, and metadata. This app will write audit events to WorkOS and also keep local copies in Postgres for display.

Neon Postgres is the database. Postgres is a relational database. Relational means the app stores data in tables with rows and columns. This demo uses tables for demo users, agents, resources, active visas, and audit events.

A resource is something the agent may try to touch. In this demo, resources are files in a fake data room: `q4-invoices.csv`, `payroll.xlsx`, `board-deck.pdf`, and `customer-contracts.pdf`.

A tool call is a fake action the agent wants to perform. In this demo, tool calls include `search_docs`, `summarize_document`, and `export_csv`.

A passport check is the UI card that explains one tool call decision. It shows the actor, the tool, the resource, whether Alice has access, whether Finance Agent’s visa allows the action, the final decision, and the reason.

A visa is a temporary permission granted to the agent. The app stores visas in Postgres. Finance Agent starts with `invoice.read` and `invoice.summarize`. After a denial, Alice can grant `invoice.export`. Granting `invoice.export` should not allow `payroll.export`.

The first version does not include a real language model, a real document search system, real enterprise directory sync, or a real customer admin console. Those features are deliberately out of scope. The app should feel polished, but the backend should stay small.

## Plan of Work

Begin by creating a fresh Next.js App Router project with TypeScript and Tailwind. Keep the repository flat and easy to navigate. Do not use a separate `src` directory unless the generated project already includes one. All paths in this plan assume there is no `src` directory.

Install the WorkOS AuthKit Next.js package, the WorkOS Node SDK, the Neon serverless driver, and `tsx` for running TypeScript scripts. Add a `.env.example` file that names every required environment variable without real secret values.

Create a database initialization script. The script should connect to `process.env.DATABASE_URL`, create the required tables if they do not already exist, and seed deterministic demo data. The script must be safe to run repeatedly. If it runs twice, it should not create duplicate demo users, agents, or resources.

Integrate AuthKit. Add the AuthKit provider to `app/layout.tsx`. Add `app/login/route.ts` to redirect users to WorkOS. Add `app/callback/route.ts` to handle the callback. Add a route protection proxy so `/demo` requires a signed-in user, while `/` remains public. Add a visible sign-in button on the landing page and a sign-out button on the demo page.

Build the local authorization logic in `lib/authz.ts`. The main function is `checkAccess`. It receives the human user, the agent, the action, and the resource. It returns whether the human has access, whether the agent visa allows the action, the final decision, and a plain-English reason. The final decision is allowed only when both human access and agent visa access are true.

Build audit helpers in `lib/audit.ts`. A helper named `recordAuditEvent` should always write to the local `audit_events` table first. A helper named `emitWorkosAuditEvent` should then attempt to send the event to WorkOS Audit Logs. If the WorkOS call fails, the local audit event should remain visible with a `workos_status` of `failed`. The UI should never break because a WorkOS Audit Logs call failed.

Build the API routes. `GET /api/health` returns a simple health response. `POST /api/demo/run` runs the deterministic mission and returns the list of tool call results. `POST /api/authz/check` runs one access check. `POST /api/agent/grant-visa` grants one narrow visa to Finance Agent. `GET /api/audit-log` returns local audit events newest last. `POST /api/demo/reset` resets the demo state to the original visas and clears local audit events.

Build the UI. The public landing page should explain the demo in one screen and link to sign in. The protected demo page should show three setup cards for Human, Agent, and Resources. It should include a mission button, a grant-visa button, and a reset button. It should render passport-check cards as the scripted mission runs. It should render an audit replay panel below the passport checks.

Add tests for the local authorization logic. The tests should prove that invoice summarization is allowed, payroll export is denied before granting a new visa, invoice export is allowed after granting the narrow visa, and payroll export remains denied even after invoice export is granted.

Deploy to Vercel only after local validation passes. Configure Vercel environment variables for production. Add the production callback URL to the WorkOS dashboard. Create a Neon database for production, run the database initialization script against it, and then deploy.

## Concrete Steps

Start in the directory where the new repository should live.

Create the project:

    npx create-next-app@latest agent-passport-control --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*"

Move into the project:

    cd agent-passport-control

Install runtime dependencies:

    npm install @workos-inc/authkit-nextjs @workos-inc/node @neondatabase/serverless

Install development dependencies:

    npm install -D tsx vitest

Add scripts to `package.json`. Keep the existing scripts and add these:

    "db:init": "tsx scripts/init-db.ts",
    "test": "vitest run"

Create `.env.example` with these variables:

    DATABASE_URL="postgresql://..."
    WORKOS_API_KEY="sk_..."
    WORKOS_CLIENT_ID="client_..."
    WORKOS_COOKIE_PASSWORD="at-least-32-characters"
    NEXT_PUBLIC_WORKOS_REDIRECT_URI="http://localhost:3000/callback"
    WORKOS_ORGANIZATION_ID="org_..."
    APP_URL="http://localhost:3000"

Create `.env.local` with real local values. Generate `WORKOS_COOKIE_PASSWORD` with:

    openssl rand -base64 32

In the WorkOS dashboard, configure the local redirect URI as:

    http://localhost:3000/callback

In the WorkOS dashboard, configure the sign-in endpoint as:

    http://localhost:3000/login

In the WorkOS dashboard, create or identify one organization to represent Acme Corp. Copy its organization ID into `WORKOS_ORGANIZATION_ID`.

In the WorkOS dashboard, configure Audit Log event schemas for these action names:

    agent.tool_call.allowed
    agent.tool_call.denied
    agent.visa.granted
    demo.reset

Create `db/schema.sql`. It should define the tables below. Use these table names and columns so future contributors can follow the API route code without guessing.

    demo_users:
      id text primary key
      workos_user_id text
      email text not null
      name text not null
      role text not null
      created_at timestamptz not null default now()

    agents:
      id text primary key
      name text not null
      slug text not null unique
      description text not null
      created_at timestamptz not null default now()

    resources:
      id text primary key
      name text not null
      resource_type text not null
      category text not null
      required_read_permission text not null
      required_export_permission text
      created_at timestamptz not null default now()

    agent_visas:
      id text primary key
      agent_id text not null references agents(id)
      permission text not null
      expires_at timestamptz not null
      created_at timestamptz not null default now()

    audit_events:
      id text primary key
      occurred_at timestamptz not null default now()
      actor_type text not null
      actor_id text not null
      action text not null
      target_type text not null
      target_id text not null
      decision text
      reason text
      metadata jsonb not null default '{}'::jsonb
      workos_status text not null default 'not_sent'
      workos_error text

Create `scripts/init-db.ts`. It must read `db/schema.sql`, execute it, and seed these rows using upserts or delete-and-insert inside a transaction:

    demo user:
      id: alice
      email: alice@example.com
      name: Alice Chen
      role: finance_admin

    agent:
      id: finance-agent
      slug: finance-agent
      name: Finance Agent
      description: Agent delegated to help with invoice close.

    resources:
      id: q4-invoices
      name: q4-invoices.csv
      resource_type: document
      category: invoice
      required_read_permission: invoice.read
      required_export_permission: invoice.export

      id: payroll
      name: payroll.xlsx
      resource_type: document
      category: payroll
      required_read_permission: payroll.read
      required_export_permission: payroll.export

      id: board-deck
      name: board-deck.pdf
      resource_type: document
      category: board
      required_read_permission: board.read
      required_export_permission: null

      id: customer-contracts
      name: customer-contracts.pdf
      resource_type: document
      category: contract
      required_read_permission: contract.read
      required_export_permission: contract.export

    initial visas:
      agent: finance-agent
      permission: invoice.read
      expires_at: now plus 10 minutes

      agent: finance-agent
      permission: invoice.summarize
      expires_at: now plus 10 minutes

Run the database initialization:

    npm run db:init

Expected result:

    Database initialized.
    Seeded demo user Alice Chen.
    Seeded Finance Agent.
    Seeded 4 resources.
    Seeded initial visas.

Create `lib/db.ts`. It should import `neon` from `@neondatabase/serverless`, read `process.env.DATABASE_URL`, throw a clear error if the variable is missing, and export a `sql` helper.

Create `lib/types.ts`. Define these TypeScript types:

    Decision:
      "allowed" or "denied"

    ToolAction:
      "search_docs" or "summarize_document" or "export_csv"

    DemoUser:
      id, email, name, role

    Agent:
      id, slug, name, description

    Resource:
      id, name, resourceType, category, requiredReadPermission, optional requiredExportPermission

    CheckInput:
      humanId, agentId, action, resourceId

    CheckResult:
      humanHasAccess, agentVisaAllows, decision, reason, requiredPermission

    ToolCallResult:
      tool, resourceId, resourceName, humanHasAccess, agentVisaAllows, decision, reason

Create `lib/authz.ts`. Implement these functions:

    getRequiredPermission(action, resource):
      For search_docs, use the resource read permission.
      For summarize_document, allow invoice.summarize for invoice resources and otherwise use the resource read permission.
      For export_csv, use the resource export permission.
      If a resource has no export permission and the action is export_csv, return no permission and deny.

    checkHumanAccess(user, action, resource):
      For this demo, Alice with role finance_admin has human access to invoice and payroll resources.
      Alice also has read access to board and contract resources.
      Alice does not have export access to board resources.
      Return a boolean and a reason string.

    checkAgentVisa(agentId, requiredPermission):
      Query active rows in agent_visas where agent_id matches, permission matches, and expires_at is in the future.
      Return true if at least one active row exists.

    checkAccess(input):
      Load the user, agent, and resource.
      Compute the required permission.
      Compute human access.
      Compute agent visa access.
      Allow only if both are true.
      Return a CheckResult with a reason that can be shown directly in the UI.

Create `lib/audit.ts`. Implement these functions:

    recordAuditEvent(input):
      Insert a local row in audit_events.
      Return the inserted row.

    emitWorkosAuditEvent(localEvent):
      Use the WorkOS Node SDK and process.env.WORKOS_API_KEY.
      Use process.env.WORKOS_ORGANIZATION_ID as the organization ID.
      Send the action, actor, targets, occurredAt, and metadata.
      If the call succeeds, update the local row to workos_status = "sent".
      If the call fails, update the local row to workos_status = "failed" and store the error message.

    recordAndEmitAuditEvent(input):
      Call recordAuditEvent first.
      Then call emitWorkosAuditEvent.
      Return the local event regardless of whether the external call succeeded.

Use a deterministic idempotency key for WorkOS Audit Logs based on the local audit event ID. This allows retrying a failed request without intentionally creating duplicate external events.

Create `lib/mission.ts`. Implement `runFinanceMission`. It should run exactly these scripted tool calls in this order:

    search_docs on q4-invoices
    summarize_document on q4-invoices
    export_csv on payroll

For each tool call, call `checkAccess`, record an audit event, and collect a ToolCallResult. The action name for allowed tool calls is `agent.tool_call.allowed`. The action name for denied tool calls is `agent.tool_call.denied`.

Create `app/layout.tsx`. Wrap the app body in `AuthKitProvider`.

Create `proxy.ts`. Protect `/demo` and allow `/`, `/login`, `/callback`, and public assets. If the user is not signed in and visits `/demo`, redirect them through AuthKit.

Create `app/login/route.ts`. It should call `getSignInUrl` from the AuthKit package and redirect the user to that URL.

Create `app/callback/route.ts`. It should export `GET = handleAuth({ returnPathname: "/demo" })` so users land on the demo page after sign-in.

Create `app/page.tsx`. This is the public landing page. It should show:

    Agent Passport Control
    Secure every AI agent tool call with identity, scoped permissions, and audit logs.
    A button or link: Run demo

The Run demo link should point to `/demo`.

Create `app/demo/page.tsx`. It should require a signed-in user. It should render the protected demo page and pass the signed-in user’s email to the client UI.

Create `app/demo/DemoClient.tsx`. This should be a client component that manages UI state. It should call the API routes with `fetch`. It should show:

    A Human card:
      Alice Chen
      Finance Admin
      signed-in email from AuthKit

    An Agent card:
      Finance Agent
      Initial visa: invoice.read, invoice.summarize
      Expires in 10 minutes

    A Resources card:
      q4-invoices.csv
      payroll.xlsx
      board-deck.pdf
      customer-contracts.pdf

    Buttons:
      Run mission
      Grant narrow invoice export visa
      Reset demo

    A passport-check feed:
      one card per tool call result

    An audit replay panel:
      local audit events from GET /api/audit-log

Create `components/passport-check-card.tsx`. It should accept a ToolCallResult and render:

    Tool call
    Resource
    Human access: yes or no
    Agent visa: yes or no
    Decision: ALLOWED or DENIED
    Reason

Use a visually strong stamp-style label for ALLOWED and DENIED. The component should not need to know anything about WorkOS or the database.

Create `components/audit-replay.tsx`. It should accept audit events and render them oldest first. Each row should show time, actor, action, target, decision, and reason.

Create `app/api/health/route.ts`. It should return:

    { "ok": true, "service": "agent-passport-control" }

Create `app/api/demo/run/route.ts`. It should accept POST, call `runFinanceMission`, and return:

    { "toolCalls": [...] }

Create `app/api/authz/check/route.ts`. It should accept POST with:

    {
      "humanId": "alice",
      "agentId": "finance-agent",
      "action": "export_csv",
      "resourceId": "payroll"
    }

It should return the CheckResult.

Create `app/api/agent/grant-visa/route.ts`. It should accept POST. For this version, it should always grant only `invoice.export` to `finance-agent` for 10 minutes. Do not allow the request body to grant arbitrary permissions. Record an audit event with action `agent.visa.granted`.

Create `app/api/audit-log/route.ts`. It should accept GET and return local audit events ordered by `occurred_at` ascending.

Create `app/api/demo/reset/route.ts`. It should accept POST. It should delete local audit events, delete current visas for `finance-agent`, reseed the initial `invoice.read` and `invoice.summarize` visas, record a local `demo.reset` event, attempt to send that event to WorkOS, and return:

    { "ok": true }

Create `lib/authz.test.ts`. Add tests for these cases:

    invoice search is allowed with the initial visa
    invoice summarization is allowed with the initial visa
    payroll export is denied with the initial visa
    invoice export is denied before granting invoice.export
    invoice export is allowed after granting invoice.export
    payroll export is still denied after granting invoice.export

The tests may use a test database if available. If a test database is too much for the first pass, isolate pure helper functions for required permission matching and human access, and test those first. Then add database-backed tests once the schema exists.

Run tests:

    npm run test

Expected result:

    PASS lib/authz.test.ts
    Test Files 1 passed
    Tests 6 passed

Run lint:

    npm run lint

Expected result:

    No lint errors.

Run a production build:

    npm run build

Expected result:

    Compiled successfully.

Run locally:

    npm run dev

Open:

    http://localhost:3000

Expected local behavior:

    The landing page loads.
    Clicking Run demo sends the user to WorkOS login.
    After login, the user lands on /demo.
    Clicking Run mission produces three passport-check cards.
    The first two cards are allowed.
    The payroll export card is denied.
    The audit replay shows the same three events.
    Clicking Grant narrow invoice export visa records a visa grant event.
    Running the mission again still denies payroll export.
    The local audit replay includes the second run.

Deploy to Vercel:

    vercel

When the preview deployment works, configure the production environment variables in Vercel:

    DATABASE_URL
    WORKOS_API_KEY
    WORKOS_CLIENT_ID
    WORKOS_COOKIE_PASSWORD
    NEXT_PUBLIC_WORKOS_REDIRECT_URI
    WORKOS_ORGANIZATION_ID
    APP_URL

For production, set:

    NEXT_PUBLIC_WORKOS_REDIRECT_URI="https://your-production-domain/callback"
    APP_URL="https://your-production-domain"

Add the production redirect URI to the WorkOS dashboard:

    https://your-production-domain/callback

Add the production sign-in endpoint to the WorkOS dashboard:

    https://your-production-domain/login

Deploy production:

    vercel --prod

Open the production URL and repeat the local behavior checklist.

## Validation and Acceptance

The feature is accepted only when the deployed app demonstrates the full story in a browser.

First, `GET /api/health` must return HTTP 200 and JSON with `ok: true`.

Second, AuthKit must work. A visitor who is not signed in can view `/`, but cannot use `/demo` without signing in. After signing in, the visitor lands on `/demo`.

Third, the mission must show the intended decisions. Clicking Run mission must produce three passport-check cards. `search_docs` on `q4-invoices.csv` is allowed. `summarize_document` on `q4-invoices.csv` is allowed. `export_csv` on `payroll.xlsx` is denied. The denied card must explain that Finance Agent lacks `payroll.export`.

Fourth, the visa grant must be narrow. Clicking Grant narrow invoice export visa must grant `invoice.export`, not broad export access. After the grant, invoice export can be allowed if tested directly, but payroll export must remain denied.

Fifth, local audit replay must work. After running the mission, the audit replay panel must show each tool call event, including allowed and denied decisions. After granting the narrow visa, the audit replay must show a visa grant event.

Sixth, WorkOS Audit Logs must receive events. In the WorkOS dashboard, the configured organization should show ingested events for allowed tool calls, denied tool calls, visa grants, and demo resets. If WorkOS emission fails during local development, the UI can still be accepted for local progress as long as the local audit row records `workos_status = "failed"` and includes a useful error message. For final production acceptance, at least one allowed event, one denied event, and one visa grant event must be visible in WorkOS.

Seventh, automated checks must pass. Run `npm run test`, `npm run lint`, and `npm run build`. All three must complete successfully.

The final demo script for recording is:

    Start on landing page.
    Click Run demo.
    Sign in with WorkOS.
    Show Human, Agent, and Resources cards.
    Click Run mission.
    Point out the two allowed invoice actions.
    Point out the denied payroll export.
    Click Grant narrow invoice export visa.
    Run the mission again or run a single invoice export check.
    Show that narrow invoice access works while payroll export remains blocked.
    Scroll to audit replay.
    Show that every action was recorded.

## Idempotence and Recovery

The database initialization script must be safe to run repeatedly. It should create tables with `CREATE TABLE IF NOT EXISTS`. It should seed deterministic records by ID and avoid duplicates. If the script fails halfway, rerun it after fixing the error.

The demo reset endpoint must be safe to call repeatedly. It should clear local audit events and restore the initial visas. It should not drop tables. It should not remove the seeded resources, agent, or user.

WorkOS Audit Log events are external records and should not be treated as removable demo state. Repeated demo runs will create additional events. That is acceptable. Use a local audit event ID as the idempotency key when sending to WorkOS so retrying the same local event does not intentionally create duplicates.

If the WorkOS API key is missing, the app should fail loudly during server-side calls that need WorkOS. The error message should name the missing variable. The public landing page may still render without WorkOS.

If `DATABASE_URL` is missing, any server-side route that needs the database should throw an error naming `DATABASE_URL`. The health route may either return a database-free health response or optionally check the database. If it checks the database, document that behavior in this section.

If Vercel deployment fails because environment variables were changed after a deployment, create a new deployment. Environment variable changes do not update already-created deployments.

If AuthKit redirects to the wrong URL, compare these three values and make them match:

    NEXT_PUBLIC_WORKOS_REDIRECT_URI in Vercel
    Redirect URI in the WorkOS dashboard
    The actual deployed callback route at /callback

If the audit replay appears empty after a mission, check the local `audit_events` table first. If local rows exist but WorkOS rows do not, debug `emitWorkosAuditEvent`. If local rows do not exist, debug `runFinanceMission` and `recordAuditEvent`.

## Artifacts and Notes

The final repository should contain these notable files:

    app/layout.tsx
    app/page.tsx
    app/login/route.ts
    app/callback/route.ts
    app/demo/page.tsx
    app/demo/DemoClient.tsx
    app/api/health/route.ts
    app/api/demo/run/route.ts
    app/api/demo/reset/route.ts
    app/api/authz/check/route.ts
    app/api/agent/grant-visa/route.ts
    app/api/audit-log/route.ts
    components/passport-check-card.tsx
    components/audit-replay.tsx
    lib/db.ts
    lib/types.ts
    lib/authz.ts
    lib/audit.ts
    lib/mission.ts
    lib/authz.test.ts
    db/schema.sql
    scripts/init-db.ts
    proxy.ts
    .env.example

The core scripted mission is:

    1. Finance Agent searches Q4 invoices.
       Expected decision: allowed.

    2. Finance Agent summarizes q4-invoices.csv.
       Expected decision: allowed.

    3. Finance Agent tries to export payroll.xlsx.
       Expected decision: denied.

The most important UI copy is:

    Human has access.
    Agent visa does not allow this action.
    Decision: DENIED.
    Reason: Finance Agent lacks payroll.export.

The short product explanation for the landing page is:

    Agent Passport Control is a demo of scoped AI agent access. A human can have broad access, but an agent only gets a narrow, temporary visa. Every tool call is checked, explained, and recorded.

The final launch artifact should be a 60 to 90 second video showing the denial and the audit replay. The app should be understandable without the video, but the video is the intended build-in-public asset.

## Interfaces and Dependencies

Use these runtime dependencies:

    next
    react
    react-dom
    @workos-inc/authkit-nextjs
    @workos-inc/node
    @neondatabase/serverless

Use these development dependencies:

    typescript
    eslint
    tailwindcss
    tsx
    vitest

The `lib/db.ts` module must export:

    sql

The `lib/authz.ts` module must export:

    getRequiredPermission(action, resource)
    checkHumanAccess(user, action, resource)
    checkAgentVisa(agentId, requiredPermission)
    checkAccess(input)

The `lib/audit.ts` module must export:

    recordAuditEvent(input)
    emitWorkosAuditEvent(localEvent)
    recordAndEmitAuditEvent(input)

The `lib/mission.ts` module must export:

    runFinanceMission()

The API interface for `POST /api/demo/run` is:

    Request body:
      {}

    Response body:
      {
        "toolCalls": [
          {
            "tool": "search_docs",
            "resourceId": "q4-invoices",
            "resourceName": "q4-invoices.csv",
            "humanHasAccess": true,
            "agentVisaAllows": true,
            "decision": "allowed",
            "reason": "Alice can access invoice resources and Finance Agent has invoice.read."
          }
        ]
      }

The API interface for `POST /api/authz/check` is:

    Request body:
      {
        "humanId": "alice",
        "agentId": "finance-agent",
        "action": "export_csv",
        "resourceId": "payroll"
      }

    Response body:
      {
        "humanHasAccess": true,
        "agentVisaAllows": false,
        "decision": "denied",
        "requiredPermission": "payroll.export",
        "reason": "Alice can access payroll, but Finance Agent lacks payroll.export."
      }

The API interface for `POST /api/agent/grant-visa` is:

    Request body:
      {}

    Response body:
      {
        "ok": true,
        "agentId": "finance-agent",
        "grantedPermission": "invoice.export",
        "expiresAt": "ISO timestamp"
      }

This endpoint intentionally ignores arbitrary permission requests in the first version. It always grants the narrow invoice export visa.

The API interface for `GET /api/audit-log` is:

    Response body:
      {
        "events": [
          {
            "id": "audit_...",
            "occurredAt": "ISO timestamp",
            "actorType": "agent",
            "actorId": "finance-agent",
            "action": "agent.tool_call.denied",
            "targetType": "document",
            "targetId": "payroll",
            "decision": "denied",
            "reason": "Finance Agent lacks payroll.export.",
            "workosStatus": "sent"
          }
        ]
      }

The API interface for `POST /api/demo/reset` is:

    Request body:
      {}

    Response body:
      {
        "ok": true
      }

The API interface for `GET /api/health` is:

    Response body:
      {
        "ok": true,
        "service": "agent-passport-control"
      }

When this plan is revised, update the relevant sections above and append a note here describing the revision and the reason for it.

Revision note, 2026-05-01: Initial plan created for a two-day Agent Passport Control demo using Next.js, Vercel, WorkOS AuthKit, WorkOS Audit Logs, and Neon Postgres.
