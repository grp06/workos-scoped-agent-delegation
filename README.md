# Agent Passport Control

Agent Passport Control is a small WorkOS demo for scoped AI-agent access.

The demo shows a human user signing in, a finance agent trying to use document tools, and each tool call being checked by two gates:

1. **Human access:** WorkOS Authorization/FGA checks whether the signed-in user can access the document.
2. **Agent visa:** Local app data checks whether the agent has a narrow, temporary permission to act for that user.

The point is to make delegated AI access easy to explain: a human may have broad access, but the agent still needs a narrow pass for each sensitive action.

## What It Demonstrates

- WorkOS AuthKit login for the demo user.
- WorkOS Authorization/FGA checks for document permissions.
- WorkOS Audit Logs for allowed and denied tool calls.
- Neon Postgres for durable demo state.
- A local "agent visa" model for short-lived agent permissions.
- A visible audit replay showing why each decision was allowed or denied.

## Real APIs vs Demo Data

Real external services:

- **WorkOS AuthKit:** signs in the user.
- **WorkOS Authorization/FGA:** checks `document:read`, `document:summarize`, and `document:export`.
- **WorkOS Audit Logs:** receives audit events such as `agent.tool_call.allowed`.
- **Neon/Postgres:** stores agents, resources, visas, and local audit events.

Demo-only data:

- The Finance Agent is seeded locally.
- The documents are fake records: `q4-invoices.csv`, `payroll.xlsx`, `board-deck.pdf`, and `customer-contracts.pdf`.
- Tool calls are scripted; no real files are searched, summarized, or exported.
- Agent visas are local database rows, not a WorkOS product object.

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example` and fill in WorkOS and Postgres values.

Generate a cookie password:

```bash
openssl rand -base64 32
```

Initialize local database state:

```bash
npm run db:init
```

In WorkOS, create an Authorization resource type:

```txt
Name: Document
Slug: document
Parent: Organization
```

Then initialize WorkOS FGA and audit schemas:

```bash
npm run workos:fga:init
npm run workos:audit:init
```

Run the app:

```bash
npm run dev
```

Open [http://localhost:3000/demo](http://localhost:3000/demo).

## Expected Demo Flow

1. Sign in with the configured WorkOS user.
2. Click **Reset demo**.
3. Click **Run mission**.
4. Invoice read and summarize should pass.
5. Invoice export should fail because the agent lacks `invoice.export`.
6. Click **Grant narrow invoice export visa**.
7. Run the mission again.
8. Invoice export should pass, but payroll export should still fail.
9. Use the guided demo, integration status panel, and audit filters to inspect what happened.

## Validation

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Agent Docs

- `AGENTS.md`: durable coding-agent rules.
- `REPO_MAP.md`: fast navigation map for AI agents.
- `ARCHITECTURE.md`: system shape, ownership, and data flow.
- `.agent/execplan.md`: original implementation plan and remaining product direction.
