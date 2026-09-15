# Output contract

Create or update:

```text
docs/ui-system-migration/
├── 00-preflight.md
├── routes.json
├── runtime-baseline.md
├── inventory.json
├── component-clusters.md
├── token-candidates.json
├── token-map.json
├── library-decision.md
├── migration-map.json
├── decision-log.md
├── unresolved-decisions.md
├── validation-report.md
└── final-status.md
```

Not every mode changes every file, but `00-preflight.md`, `decision-log.md`, `unresolved-decisions.md`, `validation-report.md`, and `final-status.md` must remain truthful and current.

## Status semantics

### READY

All checks required for the selected mode ran and passed. Intentional exceptions are documented and accepted. No unresolved blocker remains.

### PARTIAL

Useful work exists, but one or more required checks, runtime states, routes, stacks, or agent-compatibility runs were unavailable or unresolved.

### BLOCKED

Safe progress cannot continue because required access, runtime, source, dependencies, or decisions are missing, or because proceeding would overwrite unrelated work.

## Final report fields

- mode and strategy;
- stack and support tier;
- observed sources;
- files changed;
- migrations completed;
- validation commands and results;
- skipped or blocked checks;
- remaining legacy count;
- unresolved decisions;
- rollback instructions;
- final status.
