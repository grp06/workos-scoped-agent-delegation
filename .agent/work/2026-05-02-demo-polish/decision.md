# Decision: Polish The Agent Passport Control Demo

## Source Brief

The core WorkOS demo works. The next step is to make the story sharper and more legible in roughly 60 seconds for a reviewer, recruiter, or developer-relations hiring manager.

The polish pass should focus on making the existing value obvious:

1. A human signs in with WorkOS AuthKit.
2. WorkOS Authorization/FGA checks whether the human can access a document.
3. A local agent visa checks whether the AI agent has narrow delegated permission.
4. The final decision is allowed only when both gates pass.
5. Local audit replay and WorkOS Audit Logs prove what happened.

## Locked Scope

Implement a focused polish pass, not a new product surface:

- Add a state-aware guided demo stepper.
- Add an integration status panel for AuthKit, WorkOS FGA, Audit Logs, and Database.
- Make passport check cards communicate the final `human access AND agent visa` decision more clearly.
- Add a visible fake export success artifact when invoice export succeeds.
- Add simple audit replay filters.
- Tighten landing page copy and CTA only as needed.

## Explicit Non-Goals

- Do not add MCP.
- Do not add SCIM, Directory Sync, Admin Portal, API Keys, or Feature Flags.
- Do not add a real autonomous agent runtime.
- Do not create or download real document exports.
- Do not change the underlying authorization model.
- Do not move agent visas into WorkOS; they remain local demo state.

## Design Intent

This pass should reduce cognitive load for the viewer. The current system already has the right core behavior; the missing piece is a stronger demo narrative and clearer proof that real WorkOS APIs are involved.

The implementation should preserve the existing ownership boundaries:

- `lib/authz.ts` owns final authorization policy.
- `lib/human-access.ts` owns WorkOS FGA details.
- `lib/audit.ts` owns audit persistence and WorkOS Audit Logs emission.
- `app/demo/DemoClient.tsx` owns demo composition and browser state.
- `components/passport-check-card.tsx` owns one visible decision.
- `components/audit-replay.tsx` owns audit replay display.

## Success Criteria

- A first-time viewer can understand the demo path without reading the README.
- The UI makes it obvious why invoice export is denied before the visa grant and allowed afterward.
- Payroll export remains denied after the invoice visa grant.
- The app visibly distinguishes real WorkOS/Postgres integration from scripted demo data.
- Validation passes: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
