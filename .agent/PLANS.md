# ExecPlan Guidance

ExecPlans are implementation contracts. They must be self-contained enough for a new contributor to resume from the plan plus the current repository.

## Required Practice

- Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` current while implementing.
- Record only facts discovered during implementation, decisions that affect future work, and outcomes that change the contract.
- Do not use plan updates as a substitute for implementation.
- Prefer small milestones with validation after each meaningful slice.
- If work stops before completion, record the blocker and the exact next step.

## Design Bar

- Put ownership where the invariant lives.
- Keep interfaces narrow and hard to misuse.
- Pull sequencing and policy into the owning module.
- Avoid wrappers that merely rename calls.
- Comments should explain invariants and tradeoffs, not restate code.

## Validation

Each completed implementation pass should record the exact commands run and any checks skipped. A plan is not complete until the behavior works, automated checks pass, and remaining manual or deployment risks are explicit.
