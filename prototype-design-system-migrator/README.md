# Prototype Design System Migrator

A portable Codex and Claude Code skill for auditing and incrementally normalizing an existing web prototype into a code-first design system.

## Install

From a clone of this repository:

```bash
node skills/prototype-design-system-migrator/scripts/install-skill.mjs \
  --agent both \
  --scope project \
  --target /path/to/prototype
```

User-level installation:

```bash
node skills/prototype-design-system-migrator/scripts/install-skill.mjs \
  --agent both \
  --scope user
```

Preview without writing:

```bash
node skills/prototype-design-system-migrator/scripts/install-skill.mjs \
  --agent both \
  --scope project \
  --target /path/to/prototype \
  --dry-run
```

Check for drift:

```bash
node skills/prototype-design-system-migrator/scripts/install-skill.mjs \
  --agent both \
  --scope project \
  --target /path/to/prototype \
  --check
```

The installer refuses to overwrite a locally modified installed copy unless `--force` is supplied.

## Invoke

Codex:

```text
$prototype-design-system-migrator audit this existing prototype in preserve mode.
```

Claude Code:

```text
/prototype-design-system-migrator audit this existing prototype in preserve mode.
```

## Modes

```text
audit-only
plan
bootstrap-foundation
pilot-migration
rollout
qa-only
```

`audit-only` and `preserve` are the defaults.

## Examples

Preserve the current style:

```text
Use prototype-design-system-migrator in audit-only mode with preserve strategy. Inspect the running product and source, produce the full evidence set, and do not edit production UI.
```

Standardize an existing Ant Design application without replacing Ant:

```text
Use prototype-design-system-migrator in bootstrap-foundation mode. Retain the existing Ant Design foundation, create a local UI boundary, centralize theme tokens, wrap layout primitives, and report direct feature imports. Do not add MUI, Carbon, Chakra, or Bootstrap Grid.
```

Use Open Props only as a donor:

```text
Use selected Open Props size values only as inputs to local primitive tokens. Do not expose --size-* variables to product code. Build semantic spacing aliases for controls, cards, page gutters, and section rhythm.
```

Introduce Tabler Icons safely:

```text
Use Tabler Icons only if the current icon system is missing or inconsistent. Create a semantic local registry and wrapper, preserve logos, allow sizes 14/16/20/24, use stroke 2 and currentColor, and reject direct feature imports.
```

## Static tools

```bash
node skills/prototype-design-system-migrator/scripts/detect-stack.mjs --root . --json
node skills/prototype-design-system-migrator/scripts/inventory-ui.mjs --root . --out docs/ui-system-migration/inventory.json
node skills/prototype-design-system-migrator/scripts/check-token-usage.mjs --root .
node skills/prototype-design-system-migrator/scripts/check-spacing-usage.mjs --root .
node skills/prototype-design-system-migrator/scripts/check-icon-imports.mjs --root .
node skills/prototype-design-system-migrator/scripts/check-library-mixing.mjs --root .
node skills/prototype-design-system-migrator/scripts/check-legacy-usage.mjs --root .
```

The scanners are heuristic. They produce evidence; they do not prove design quality or runtime correctness.

## Validate this package

```bash
node skills/prototype-design-system-migrator/scripts/validate-skill-package.mjs
node skills/prototype-design-system-migrator/evals/run-static-evals.mjs
```

## Status semantics

- `READY`: every required check for the selected mode ran and passed.
- `PARTIAL`: useful work exists, but required evidence or checks are incomplete.
- `BLOCKED`: safe progress cannot continue.

## Rollback

Migration changes should be isolated on a branch or worktree and split into narrow commits. Revert the pilot or component-family commit rather than deleting the local UI layer blindly. Installed skill copies can be removed from `.agents/skills/prototype-design-system-migrator` and `.claude/skills/prototype-design-system-migrator`; this does not revert product migrations.

## Known limitations

- Static scanners cannot see every runtime or generated style.
- Vue, Nuxt, Svelte, and SvelteKit support is conservative Tier 2 in v0.1.0.
- Unknown stacks are audit/plan only.
- Real clean Codex and Claude Code fixture runs are still required before the package can claim READY cross-agent compatibility.
