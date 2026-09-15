# Output contract

Scale evidence to scope. A focused task may use one existing report. A full migration should retain a project profile, inventory, component/token migration map, decisions, source snapshot, and validation evidence under `docs/ui-system-migration/` or the project's established location. Generate derived reports from these records rather than maintaining duplicate facts in many files.

## Required report content

- User intent, selected mode/strategy, application/package scope, and exclusions.
- Observed source/runtime baseline and any inference or unresolved decision.
- Completed components/families, changed files, and next step for resumption.
- Relevant validation matrix: command/method, passed/failed/blocked/not-applicable, reason, and evidence location.
- Storybook coverage, build/interaction results, visual evidence, and gaps when catalog work is in scope; follow `references/storybook.md`.
- Existing debt, new findings, accepted exceptions, intentional differences, and rollback path.
- Geometry coverage: every in-scope route/component/state, viewport, expected versus measured spacing, overflow/clipping findings, and evidence.
- DS ownership coverage: component mapping, native-widget findings, opened-state verification, and explicit unavoidable platform exceptions.
- One final task status.

## Task status

- `READY`: all requirements and applicable checks for this task ran and passed; accepted intentional exceptions are explicit. Audit completion means a verified audit, not a completed product migration.
- `PARTIAL`: useful work exists, but a required check, state, route, or deliverable remains incomplete. Name it and the next action.
- `BLOCKED`: no meaningful safe progress is possible without missing access, a material decision, or resolving conflicting edits.

Do not use successful static checks, screenshots alone, or unchanged source hashes as proof of a working migration. Keep evidence tied to the verified source and runtime state.

## Package validation is separate

The skill package's Codex/Claude compatibility evidence lives under `evals/evidence/`. Report its limitations separately from the target project's status. A missing Claude run does not force a completed Codex project task to `PARTIAL`; conversely static packaging tests do not prove agent behavior.
