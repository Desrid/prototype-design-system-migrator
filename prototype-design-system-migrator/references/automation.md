# Migration automation

## Configuration

Use `ui-system.config.json` (or the legacy `.ui-system.json`) at the target application/package root. The first file takes precedence. Invalid JSON, unknown keys, unsafe relative paths, and wrong field types fail explicitly. Start from `templates/ui-system.config.example.json`, then adapt to observed paths; do not copy sample paths blindly.

- `sourceRoots`: literal paths or glob patterns. Default `["."]` supports root-level static sites and arbitrary source layouts. An empty list is invalid.
- `ignore`: directory basenames, relative paths, or globs using `*`, `**`, and `?`. Built-in excludes include dependencies, generated output, agent installations, and the generated `docs/ui-system-migration` directory. No negation or brace syntax is supported. Keep real UI source outside these excluded directories or use a focused application root.
- `tokenPaths`, `iconRegistryPaths`, `uiBoundaryPaths`, `legacyPaths`: literal project-relative paths.
- `migratedPaths`: explicit paths/globs for strict migrated-area policy checks.
- `selectedComponentSystem`: nullable system identifier; scope configuration to one application.
- `iconPackages`: module names or patterns, including subpath imports. Reuse the installed icon set; add custom sources here.
- `approvedIconSizes`: product-derived documentation input; the static scanner does not verify rendered sizes.
- `aliases`: explicit alias-to-relative-target mappings, including a single wildcard. Overrides locally observed tsconfig/jsconfig mappings for the legacy check. Inherited config and fallback aliases are reported for review.
- `exceptions`: exact `kind`, `file`, `value`, `reason`, and ISO date `expires`. Active exceptions are shown separately; expired ones no longer suppress findings. Do not use an exception to hide an unknown defect.

## Read-only discovery

```bash
node <skill>/scripts/profile-project.mjs --root <repo> --out <report-dir>/profile.json
node <skill>/scripts/inventory-ui.mjs --root <app> --out <report-dir>/inventory.json
node <skill>/scripts/run-checks.mjs --root <app> --json
```

The profile discovers nested manifests, imports, script definitions, aliases, story files, and route candidates. Inspect package ownership and workspace inheritance. It never executes project scripts or proves runtime readiness.

All six checks share one source read per `run-checks` invocation. No persistent source cache is trusted. Scans report skipped symlinks, unreadable files, and oversized files; investigate relevant gaps before acceptance. Source comments are masked, but regex/style and literal import analysis remain conservative. Runtime values, CSS-in-JS object conventions, computed imports, Sass indirection, and custom routing still require native tooling or browser inspection.

## Baseline and incremental enforcement

```bash
node <skill>/scripts/run-checks.mjs --root <app> --write-baseline <report-dir>/baseline.json --no-fail --json
node <skill>/scripts/run-checks.mjs --root <app> --baseline <report-dir>/baseline.json --json
node <skill>/scripts/run-checks.mjs --root <app> --migrated --json
```

Baseline capture is an explicit initial inventory, not acceptance. Review and retain it; do not automatically replace it to make checks pass. Baselines are tied to the project root and match findings by rule, file, value, and source excerpt, including occurrence counts. Line shifts alone do not create new debt. Changed excerpts may conservatively appear as new findings.

Run strict checks on migrated paths without a baseline so old debt in completed work cannot be hidden. Existing legacy outside this scope remains visible in the full report. Exit 1 means violations or incomplete scanning; malformed configuration/inputs fail the command. `--no-fail` is for evidence capture, not a passing quality gate.

## DS control enforcement

`check-native-controls.mjs` is included in the combined runner. It flags native controls outside `uiBoundaryPaths`, native widget candidates inside the DS, browser dialogs, and title-based tooltip candidates. Resolve heuristic findings using runtime evidence; a styled trigger alone does not establish a custom popup. Use `--enforce-boundary` to also reject direct vendor UI imports in feature code.

## Reviewed transformations

Use `scripts/transform-ui.mjs` for exact, context-qualified source changes, including import/API migrations and approved token mappings. It is a patch executor, not an AST codemod or semantic token inference engine. For complex syntax, generate changes with the project's parser tooling or edit a small slice directly, then verify it.

A mapping has `schemaVersion: 1`, a decision `reason`, and `files`, each with `file` and `replacements` containing exact `before` and `after` strings. Every replacement must match once. Include enough context to distinguish semantic roles; never map a color globally merely because its value matches.

```bash
node <skill>/scripts/transform-ui.mjs --root <app> --prepare mapping.json --out plan.json
node <skill>/scripts/transform-ui.mjs --root <app> --plan plan.json
node <skill>/scripts/transform-ui.mjs --root <app> --plan plan.json --apply
```

Review the full before/after plan before apply. It contains source content, so keep it local and out of published artifacts. Only existing scanned source files can be targets. The executor checks every file hash before writing, refuses stale plans and linked targets, and skips files already matching the result. On failure, it restores only its completed writes when they still match its output. It is not a transaction against concurrent editors: preserve isolation and inspect any interruption.

After applying, run affected policy/build/type checks, interactions, Storybook checks, and visual comparison. Record exceptions and intentional visual differences. Never rename a handler, drop a ref, or change controlled/uncontrolled semantics merely to satisfy the new API.

## Resume and verification freshness

```bash
node <skill>/scripts/migration-state.mjs --root <app> --snapshot --out <report-dir>/source-state.json
node <skill>/scripts/migration-state.mjs --root <app> --previous <report-dir>/source-state.json
```

Save a snapshot after a verified batch and retain decisions, completed families, the next step, and evidence links in the migration report. On resume, compare source hashes and config before reusing evidence. Recheck changed files plus their consumers; global token/provider changes may affect the whole catalog. Package manifests, lockfiles, and local TypeScript/JavaScript config are included in snapshots. Check external configuration and runtime data separately. `UNCHANGED` describes source/config freshness only, never task readiness.

## Validation matrix

Select required checks before implementation. Record each as passed, failed, blocked, or not applicable with a reason. A missing tool is blocked, not silently not applicable. Scope audit checks to discovery; scope implementation checks to affected behaviors. Reuse native commands and existing test infrastructure. A full migration requires a verified pilot, component-family checks, affected application flows, and Storybook coverage when in scope.
