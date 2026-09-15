# Workflow

## Principle

This workflow canonicalizes an existing interface. It does not assume the interface is good, but it also does not grant permission to replace it with the agent's taste.

## Phase 0 — preflight

Record:

- repository root and current branch;
- dirty files and unrelated work;
- package manager and lockfile;
- framework and styling method;
- test, lint, typecheck, build, and start commands;
- route mechanism;
- currently installed component and icon systems;
- whether a safe local runtime is available;
- existing Storybook or equivalent catalog, framework/version, story locations, and build/test commands.

Do not run unknown scripts before inspecting their definitions. Do not expose secrets in logs or reports.

## Phase 1 — baseline

Use both source and rendered evidence when available.

Capture affected viewport widths, representative routes, and relevant states. Use risk and public behavior to select default, focus, active, selected, disabled, loading, error, and empty states; avoid meaningless combinations.

A baseline is a comparison point, not approval of the current design.

## Phase 2 — inventory

Inventory:

- color, typography, spacing, sizing, radii, borders, shadows, opacity, z-index, motion;
- component implementations and near-duplicates;
- icons, logos, illustrations, and asset origins;
- layout systems, breakpoints, containers, page gutters, grid usage, and overflow;
- accessibility, keyboard, and reduced-motion behavior;
- direct third-party imports and one-off styles.

Classify each statement as one of:

- `observed`
- `inferred`
- `proposed`
- `unresolved`

## Phase 3 — canonicalization plan

Select the smallest coherent target architecture. Prefer the incumbent component system when it is already broadly used and serviceable. Otherwise introduce a local token and component boundary without automatically adding a large framework.

Create a migration map that links every legacy pattern to:

- an approved token or component;
- a temporary documented exception;
- an unresolved decision;
- or a removal candidate.

## Phase 4 — foundation

Adapt the existing foundation in dependency order; create only missing, justified layers:

1. primitive tokens;
2. semantic tokens;
3. component tokens only where justified;
4. existing or necessary local layout primitives;
5. semantic icon registry;
6. low-level components;
7. composed patterns;
8. policy checks and test infrastructure.

Set up or adapt the executable component catalog according to `references/storybook.md`. Reuse production styles and providers; document the new foundation and public components with reproducible stories.

Do not use feature-specific names in shared component APIs.

## Phase 5 — pilot

Choose one vertical flow that exercises several shared components. Avoid the easiest and the most complex route.

Before migrating, record business behavior, analytics hooks, test selectors, network interactions, and state transitions. After migrating, compare function and appearance at each supported viewport.

Update pilot component stories and interaction checks alongside the migration. Verify both isolated stories and the integrated application flow.

## Phase 6 — rollout

Migrate by shared component family, not by independently redesigning pages. Keep adapters reversible. Keep each change narrow enough to review and roll back. After each batch, run relevant checks, inspect visual and behavioral differences, repair regressions, and rerun affected checks before continuing.

Keep the catalog current for each migrated family: update examples, remove obsolete API usage, and record missing state coverage. Follow `references/storybook.md` for maintenance and validation.

## Phase 7 — enforcement

Add static checks for raw values, arbitrary spacing, direct icon imports, mixed full UI systems, and new legacy usage. Add visual, accessibility, responsive, and functional checks where the target stack supports them.

## Resume

Read `references/automation.md`. Save completed families, decisions, evidence, and the next step in the existing report; compare `scripts/migration-state.mjs` snapshots before reusing verification. Recheck changed files and affected consumers, providers, and themes.

## Phase 8 — completion

Use `READY` only when the required checks for the selected mode actually ran and passed. Use `PARTIAL` when work is useful but evidence is incomplete. Use `BLOCKED` when safe progress cannot continue.
