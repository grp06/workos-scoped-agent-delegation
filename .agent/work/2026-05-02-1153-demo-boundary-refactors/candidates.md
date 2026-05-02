# Refactor Candidates: Demo Boundary Refactors

## Repo Scope And Constraints

Scope: `/Users/georgepickett/workos-demo`, a committed Next.js 16 App Router demo for scoped AI-agent delegation with WorkOS AuthKit, WorkOS Authorization/FGA, WorkOS Audit Logs, Neon/Postgres, and local agent visas.

Hard constraints:

- Do not change the demo's authorization semantics: final decision remains `human WorkOS access AND local agent visa`.
- Do not move agent visas into WorkOS.
- Do not create real document exports.
- Keep secrets out of browser-visible payloads and committed files.
- This is a candidate search only. Do not create a decision or ExecPlan here.

Soft guidance:

- This repo is being polished as a developer-relations portfolio demo, so clarity and low cognitive load matter more than broad product scope.
- Prefer refactors that make future agents safer and faster when changing auth, audit, and demo UI flows.

## First-Principles Repo Model

Primary product flow:

1. User enters `/demo`.
2. `app/demo/page.tsx` requires a WorkOS AuthKit session.
3. `app/demo/DemoClient.tsx` loads audit events, active visas, and integration status.
4. User runs the scripted mission.
5. `app/api/demo/run/route.ts` calls `runFinanceMission()` in `lib/mission.ts`.
6. `runFinanceMission()` loops over scripted tool calls, calls `checkAccess()`, and records audit events.
7. `lib/authz.ts` loads agent/resource rows, asks `lib/human-access.ts` for WorkOS FGA human access, checks local agent visas, and evaluates the final decision.
8. `lib/audit.ts` writes the local audit event and attempts to emit a WorkOS Audit Log event.
9. UI renders guided steps, passport checks, fake export artifact, integration status, and audit replay.

Setup flow:

1. `npm run db:init` executes `db/schema.sql` and seeds local rows from `lib/demo-data.ts`.
2. `npm run workos:fga:init` creates WorkOS permissions, role, resources, and assignments from a partly separate set of constants.
3. `npm run workos:audit:init` creates WorkOS Audit Log schemas from another separate schema list.

Current central modules by size:

- `app/demo/DemoClient.tsx`: 502 lines. Owns fetch orchestration, local page state, and several sizable presentational components.
- `scripts/init-workos-fga.ts`: 235 lines. Owns WorkOS FGA setup with constants parallel to runtime permission mapping.
- `lib/audit.ts`: 217 lines. Owns local audit persistence, metadata mapping, WorkOS SDK construction, emission, and status update.
- `lib/authz.ts`: 204 lines. Owns DB row loading, row mapping, local permission mapping, local visa query, and final access evaluation.
- `components/audit-replay.tsx`: 122 lines and `components/passport-check-card.tsx`: 116 lines. These are compact enough to leave alone unless UI composition is selected.

Git history:

- The repo has one initial commit, so change-frequency and co-change evidence are not yet meaningful.

Testing:

- `lib/authz.test.ts` covers pure final access evaluation and permission mapping.
- `app/demo/demo-state.test.ts` covers guided demo derivation.
- `lib/integration-status.test.ts` covers status classification.
- Route handlers, local DB row mapping, WorkOS FGA setup constants, and audit payload/schema alignment are not directly tested.

## Ranked Shortlist

1. **Extract A Demo Client Boundary**
   - Class: deepen a UI module / hide client sequencing.
   - Provisional rank: 1.
   - Why: `DemoClient.tsx` is now the largest source file and mixes network choreography, state derivation consumption, action handlers, and multiple presentational sections. This is the clearest cognitive-load hot spot.

2. **Create A Shared Demo Permission Catalog**
   - Class: consolidate duplicate concepts / reduce change amplification.
   - Provisional rank: 2.
   - Why: WorkOS permission setup, runtime human permission mapping, local resource permissions, tests, UI step copy, and audit schema expectations all encode related permission knowledge separately.

3. **Split Authorization Data Access From Policy Evaluation**
   - Class: hide persistence details / deepen authorization module.
   - Provisional rank: 3.
   - Why: `lib/authz.ts` owns the right policy, but also owns DB row loading and SQL details. It is still manageable, yet future auth changes could amplify across loading and policy concerns.

4. **Minimal Surgical Change: Reuse WorkOS SDK Construction In Audit Emission**
   - Class: minimal cleanup / remove a small duplicate.
   - Provisional rank: 4.
   - Why: `lib/workos.ts` already owns `getWorkos()` and `requireEnv()`, but `lib/audit.ts` locally constructs `new WorkOS()` and defines its own `requireEnv()`.

5. **Do Nothing For Now**
   - Class: no refactor.
   - Provisional rank: 5.
   - Why: The app is small, recently validated, and docs are clear. The cost of churn could exceed payoff if the immediate next step is GitHub push, deployment, or application materials.

## Candidate Ledgers

### 1. Extract A Demo Client Boundary

Refactor class: deepen a UI module / hide client sequencing.

Scope:

- `app/demo/DemoClient.tsx`
- possible new `app/demo/demo-api.ts` or colocated helper for fetch/action sequencing
- possible new components under `app/demo/` or `components/` for `DemoStepper`, `IntegrationStatusPanel`, `PreparedExportPanel`, and `SetupCard`
- existing `app/demo/demo-state.ts`

Problem it believes it solves:

`DemoClient.tsx` is a single 502-line client component that owns too many kinds of knowledge:

- API endpoint paths
- response shapes
- loading/error handling
- action sequencing after mission/grant/reset
- page composition
- multiple presentational subcomponents

The current interface burden is paid by future agents editing any demo UI slice. A small copy/layout change requires scanning through fetch and state choreography, and an action-flow change requires navigating around visual component code.

Supporting repo evidence:

- `wc -l` shows `app/demo/DemoClient.tsx` at 502 lines, over twice the next runtime module.
- It fetches five endpoints directly: `/api/audit-log`, `/api/agent/visas`, `/api/health`, `/api/demo/run`, `/api/agent/grant-visa`, `/api/demo/reset`.
- It repeats post-action refresh choreography: mission refreshes audit/status, grant refreshes visas/audit/status, reset refreshes visas/audit/status.
- It contains several presentational components after the main component: `DemoStepper`, `IntegrationStatusPanel`, `PreparedExportPanel`, `SetupCard`, and `EmptyPanel`.
- `app/demo/demo-state.ts` already shows one successful boundary extraction for pure derived state.

Contradictory or weakening evidence:

- The component is not duplicated across pages.
- Its logic is straightforward and currently passes lint/typecheck/build.
- Extracting too aggressively could create shallow wrappers or make the app harder for a reviewer to navigate.

What would falsify it:

- If most future changes are isolated copy tweaks on this one page, a large split may add indirection without reducing real complexity.
- If extracted helpers merely wrap `fetch()` calls one-to-one without hiding sequencing, this candidate becomes shallow.

Expected payoff:

- Lower cognitive load for future UI changes.
- A clearer interface such as `useDemoController()` or a small action helper could hide refresh sequencing.
- UI sections become easier to visually polish or screenshot-test independently.

Blast radius:

- Medium. Touches the main demo page and could affect the core user-facing flow.

Reversibility:

- Good if done in small slices: extract presentational components first or extract action orchestration first.

Cheapest useful probe:

- Move only the repeated API action orchestration into a small colocated helper or hook and verify `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`. If the main component becomes meaningfully smaller without new concepts, continue.

### 2. Create A Shared Demo Permission Catalog

Refactor class: consolidate duplicate concepts / reduce change amplification.

Scope:

- `lib/demo-data.ts`
- `lib/human-access.ts`
- `lib/authz.ts`
- `lib/mission.ts`
- `scripts/init-workos-fga.ts`
- `scripts/init-workos-audit-schemas.ts`
- `lib/authz.test.ts`
- maybe `app/demo/demo-state.ts` for `invoice.export` copy

Problem it believes it solves:

Permission knowledge is spread across several files:

- WorkOS permission slugs live in `lib/human-access.ts` and `scripts/init-workos-fga.ts`.
- Local resource permissions live in `lib/demo-data.ts`.
- Special local summarize behavior lives in `lib/authz.ts`.
- The scripted mission lives in `lib/mission.ts`.
- Audit schema metadata expects `requiredPermission` and human permission fields in `scripts/init-workos-audit-schemas.ts`.
- UI progress and copy hard-code `invoice.export` in `app/demo/demo-state.ts`.

This increases change amplification if the demo adds a tool action, renames a permission, or changes the invoice/payroll story.

Supporting repo evidence:

- `getHumanPermission()` maps `search_docs`, `summarize_document`, and `export_csv` to WorkOS permissions.
- `getRequiredPermission()` maps the same `ToolAction` to local permissions with a special case: invoice summarization uses `invoice.summarize`, otherwise summarization falls back to read permission.
- `scripts/init-workos-fga.ts` defines `HUMAN_PERMISSIONS` separately from runtime mapping.
- `lib/demo-data.ts` defines `INVOICE_EXPORT_PERMISSION`, `requiredReadPermission`, and `requiredExportPermission`.
- `app/demo/demo-state.ts` repeats `INVOICE_RESOURCE_ID = "q4-invoices"` and `INVOICE_EXPORT_PERMISSION = "invoice.export"`.

Contradictory or weakening evidence:

- This is a tiny demo with only three tool actions and four resources.
- Some duplication is intentional because WorkOS human permissions and local agent visas are conceptually different.
- Over-unifying WorkOS and local visa permissions would blur the core demo concept.

What would falsify it:

- If a shared catalog forces WorkOS permissions and local agent visa permissions into one confusing object, it would increase cognitive load.
- If the next roadmap does not add any new tools/resources, current duplication may remain tolerable.

Expected payoff:

- Lower risk when changing or extending the demo mission.
- Clearer distinction between WorkOS human permission and local agent visa permission in one well-named catalog.
- Fewer missed updates between runtime checks, setup scripts, tests, and audit schemas.

Blast radius:

- Medium-high. Touches runtime policy, setup scripts, and tests.

Reversibility:

- Moderate. Easy to back out if extracted as a data module first, harder if it reshapes all call sites at once.

Cheapest useful probe:

- Extract constants for WorkOS human permissions and local agent permissions into a small `lib/demo-permissions.ts`, then update only `lib/human-access.ts`, `scripts/init-workos-fga.ts`, and tests. Do not change `lib/authz.ts` policy until the catalog proves clearer.

### 3. Split Authorization Data Access From Policy Evaluation

Refactor class: hide persistence details / deepen authorization module.

Scope:

- `lib/authz.ts`
- possible new `lib/demo-repository.ts`, `lib/resources.ts`, or `lib/agents.ts`
- `lib/visas.ts`
- `lib/authz.test.ts`
- API routes that depend on authorization behavior

Problem it believes it solves:

`lib/authz.ts` owns the final decision, which is correct, but it also owns:

- SQL row loading for agents
- SQL row loading for resources
- row-to-domain mapping
- local agent visa SQL
- local permission mapping
- pure decision evaluation
- orchestration of WorkOS human access and local visa checks

This is a lot of hidden knowledge in one module. It is still a deep module to callers, but internally it mixes persistence and policy enough that future changes could be harder to reason about.

Supporting repo evidence:

- `lib/authz.ts` is 204 lines, one of the largest runtime files.
- Private `loadAgent()` and `loadResource()` include SQL and row mapping.
- `checkAgentVisa()` duplicates some responsibility with `lib/visas.ts`, which has `listActiveVisaPermissions()`.
- Tests focus on pure `evaluateAccess()` and `getRequiredPermission()`, not the DB-loading boundary.

Contradictory or weakening evidence:

- `lib/authz.ts` currently gives callers a simple `checkAccess(input)` interface, which is good.
- Pulling loaders out could create shallow repositories if not done carefully.
- DB access is currently small and local to the authorization flow.

What would falsify it:

- If extraction only moves SQL into files with one exported function each and no clearer ownership, it is a net loss.
- If no future code needs resource/agent loading outside authorization, separate repositories may be unnecessary.

Expected payoff:

- Cleaner separation between "load facts" and "evaluate policy."
- Better testability for missing resource/agent and visa-loading behavior.
- Easier future expansion if resources/agents become richer.

Blast radius:

- Medium. Touches core authorization.

Reversibility:

- Moderate. Can be done as a narrow extraction while preserving `checkAccess()`.

Cheapest useful probe:

- Move `checkAgentVisa()` into `lib/visas.ts` next to `listActiveVisaPermissions()` and leave `checkAccess()` unchanged. If that reduces duplicated visa ownership without adding caller burden, consider resource/agent loading next.

### 4. Minimal Surgical Change: Reuse WorkOS SDK Construction In Audit Emission

Refactor class: minimal cleanup / remove a small duplicate.

Scope:

- `lib/audit.ts`
- `lib/workos.ts`
- `lib/audit` call sites only if tests expose needed changes

Problem it believes it solves:

`lib/workos.ts` already owns WorkOS SDK construction and required-env handling, but `lib/audit.ts` defines its own `requireEnv()` and constructs `new WorkOS()` directly. This is a small ownership leak.

Supporting repo evidence:

- `lib/workos.ts` exports `requireEnv()` and `getWorkos()`.
- `lib/human-access.ts` uses `getWorkos()` and `requireEnv()`.
- `lib/audit.ts` imports `WorkOS` directly and defines a local `requireEnv()`.
- This is the only runtime module besides `lib/workos.ts` and scripts that constructs a WorkOS client.

Contradictory or weakening evidence:

- The local duplication is small.
- Scripts reasonably construct WorkOS directly because they are one-off setup tools.
- `emitWorkosAuditEvent()` currently creates a fresh WorkOS client per call, which may be intentional if SDK state is cheap and scoped.

What would falsify it:

- If `getWorkos()` caching creates issues with test isolation or serverless behavior.
- If importing from `lib/workos.ts` into `lib/audit.ts` introduces an unwanted coupling, though current human-access code already uses it.

Expected payoff:

- Slightly clearer WorkOS SDK ownership.
- Fewer duplicated env helper definitions.
- Very small reduction in cognitive load.

Blast radius:

- Low.

Reversibility:

- High.

Cheapest useful probe:

- Change `lib/audit.ts` to import `getWorkos` and `requireEnv` from `lib/workos.ts`, remove the local helper and direct `WorkOS` import, then run validation.

### 5. Do Nothing For Now

Refactor class: no refactor.

Scope:

- No code changes.

Problem it believes it solves:

Avoids refactoring a small, freshly validated demo before it has real user feedback from GitHub, deployment, or a reviewer.

Supporting repo evidence:

- The repo has one clean initial commit.
- Validation passed recently: lint, typecheck, tests, and build.
- Docs are strong for the current size: `README.md`, `ARCHITECTURE.md`, `REPO_MAP.md`, and `AGENTS.md`.
- Current tests cover the highest-risk pure policy and UI derivation logic.

Contradictory or weakening evidence:

- `DemoClient.tsx` is already 502 lines, which is a clear future-maintenance smell.
- Permission concepts are already duplicated enough that adding one more tool/action could require many edits.
- The project is meant to be inspected by humans and agents; shallow comprehension matters.

What would falsify it:

- If the next planned work is more UI polish or feature additions, doing nothing will make those changes more error-prone.
- If deployment or reviewer feedback requires quick iteration, the large client component will slow future work.

Expected payoff:

- Zero churn.
- No risk of over-abstraction before the demo is public.

Blast radius:

- None.

Reversibility:

- Not applicable.

Cheapest useful probe:

- Deploy or share the current app, collect one round of feedback, and only refactor where feedback or next feature work creates pressure.

## Provisional Leader

**Extract A Demo Client Boundary** is the provisional leader.

Reason: it has the clearest current evidence and the most direct DevRel-demo payoff. `app/demo/DemoClient.tsx` is the largest file by a wide margin and currently mixes UI composition with fetch choreography. A careful extraction can make the page easier to understand without changing the authorization model, WorkOS setup, or database behavior.

The winning version of this refactor should not be "split every component into its own file." It should hide real sequencing or reduce real scan burden. The best first slice is likely either:

- a `useDemoController()` hook that owns fetches, action handlers, busy state, and status text, or
- a `demo-api.ts` helper that owns endpoint calls and response shapes while `DemoClient.tsx` keeps page state.

`select-refactor` should pressure-test which of those actually reduces complexity with the least indirection.

## Why Each Runner-Up Is Still Alive

- **Shared Demo Permission Catalog** remains high value if the next work adds more tools/resources or modifies permission names. It could prevent change amplification across runtime policy, setup scripts, tests, and UI copy.
- **Split Authorization Data Access From Policy Evaluation** remains alive because auth is high-risk and already mixes SQL with policy. It should wait until there is evidence that `lib/authz.ts` is actively slowing changes.
- **Minimal Surgical WorkOS SDK Reuse** remains alive as a quick cleanup if a small low-risk refactor is preferred.
- **Do Nothing** remains alive because the app is small, committed, and validated. If the immediate objective is pushing/deploying/applying, refactor churn may be less useful than public polish.

## Next Step For `select-refactor`

Run `select-refactor` against this work item. It should pressure-test the provisional leader against the shared permission catalog and do-nothing option with cheap repo evidence, then write a `decision.md`. Do not create an ExecPlan until selection locks one refactor direction.
