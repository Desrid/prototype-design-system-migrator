---
name: prototype-design-system-migrator
description: Audit or incrementally migrate an existing web UI to a coherent code-first design system while preserving product behavior and visual identity. Use for token normalization, shared component consolidation, UI migration, and maintaining the accompanying Storybook catalog.
---

# Prototype Design System Migrator

Normalize an existing interface using source and runtime evidence. Preserve explicit user scope, business behavior, approved assets, and coherent existing conventions.

## Infer scope from intent

- Requests to inspect, review, audit, or propose select `audit-only` or `plan`; do not edit production UI.
- Requests to implement, migrate, or standardize authorize the necessary audit, foundation, pilot, rollout, and verification within the requested scope. Continue between phases without asking for the same authorization again.
- A narrow component fix needs a proportional local cycle, not a mandatory repository-wide migration.
- If intent is unclear, start with a read-only audit. Ask only for missing decisions that materially affect scope or behavior.
- Default strategy: `preserve`. Use `standardize` for an explicitly selected visual system, and `brand-refresh` only with user-approved direction. Existing authorization persists.

Modes remain `audit-only`, `plan`, `bootstrap-foundation`, `pilot-migration`, `rollout`, and `qa-only`. A mode selects work and its evidence requirements; it is not an extra permission checkpoint.

## Preflight

1. Read applicable repository instructions; inspect git status, scripts, lockfiles, stack, styles, and existing UI/catalog conventions. Preserve unrelated work.
2. Read `references/security.md` before running project commands.
3. Identify the actual application/package root. Run `scripts/profile-project.mjs` for multiple packages or uncertain structure; use `scripts/detect-stack.mjs` for a focused package.
4. Read `references/stack-adapters.md` and record available capabilities, missing runtime access, and uncertainties. A detected dependency is not proof of runtime use.
5. Establish the relevant source, interaction, and visual baseline before changing UI. Never jump from an unknown codebase to mass replacement.

## Routing

Read only the references needed for the selected work:

| Work | References |
| --- | --- |
| Audit and migration planning | `references/workflow.md`, `references/decision-matrix.md` |
| Component system or API changes | `references/component-systems.md` |
| Token normalization | `references/tokens.md` |
| Layout changes | `references/layout-and-spacing.md` |
| Every UI implementation or acceptance check | `references/geometry-and-ds-acceptance.md` |
| Icon migration | `references/icons.md` |
| Storybook audit, setup, component changes, or story QA | `references/storybook.md` |
| Implementation and regression checks | `references/visual-regression.md`, `references/accessibility.md` |
| Configuration, checks, transformations, and resuming | `references/automation.md` |
| Completion and reporting | `references/output-contract.md` |

## Execution contract

- Preserve the existing coherent component system. Prefer its supported theme/extension mechanisms over unnecessary wrappers or additional dependencies.
- Choose a stable public UI boundary per application or shared design system. Keep independent products separate; do not treat different libraries in independent applications as accidental mixing.
- Derive tokens from usage context, not frequency alone. Equal raw values can serve different semantic roles. Do not round or merge values without checking appearance.
- Reuse layout and icon APIs. Create new primitives only for repeated patterns that need them; derive sizes and stroke from the product rather than imposing a universal scale.
- For a full migration, verify a representative vertical pilot before rolling out shared component families. Preserve events, refs, form semantics, selectors, analytics, routes, data flow, and server/client boundaries.
- Update Storybook stories and documentation with component changes. Use actual production components, styles, and deterministic fixtures as specified in `references/storybook.md`.
- Use exact, reviewed transformations for repeatable changes. See `scripts/transform-ui.mjs`; a generated patch is not semantic proof and must pass functional and visual checks.
- Repeat: small change -> relevant checks -> inspect differences -> repair -> rerun affected checks. After the same unresolved failure repeats, stop spreading that change, record the cause, and continue independent work within scope.
- Resume from saved decisions and source evidence. Invalidate verification after changes to source, dependencies, configuration, providers, or runtime data; do not repeat unaffected work without reason.

## Mandatory visual and DS acceptance

Every visible control and reusable UI component must use the project DS public API with custom DS presentation. Native semantic elements are allowed inside DS implementations; visible browser-default widgets are not completion. Inspect both triggers and opened dropdown/select/menu content. Record unavoidable OS surfaces explicitly.

Verify spacing and containment for every in-scope route, component, and applicable state: all four border insets, inter-element gaps, clipping, focus rings, nested overflow, and responsive transitions. For full migrations, representative samples alone are insufficient. Keep a coverage matrix and fix/recheck all failures before `READY`; follow `references/geometry-and-ds-acceptance.md`.

## Policy checks

Use `scripts/run-checks.mjs` for a single shared source read and all static rules. Use a documented baseline to distinguish existing debt from new violations; use `--migrated` only with explicit migrated paths. Checks are heuristic evidence, not a quality certificate.

Use `scripts/inventory-ui.mjs` for source inventory and route candidates. Keep UI routes, API endpoints, and unresolved dynamic routes separate. Verify route candidates against the running application.

Do not change framework just to use a particular UI library. Do not replace logos or illustrations with generic icons. Preserve keyboard access, visible focus, accessible names, reduced motion, and supported responsive states. Document legitimate raw values or icon exceptions narrowly; do not hide failures with broad exclusions.

## Completion

Follow `references/output-contract.md`. End with one task status: `READY`, `PARTIAL`, or `BLOCKED`, tied to the selected scope. Report actual changes, evidence, and unresolved work. Package portability is a separate assessment; missing tests in another agent do not invalidate a verified project task. Never claim runtime or visual verification from a successful build or static scan alone.
