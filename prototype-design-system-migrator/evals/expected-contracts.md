# Static evaluation contracts

The static suite verifies:

- the shared skill package passes portability validation;
- React/Vite, Next.js, Ant Design, shadcn-style, static HTML, Vue, and unknown stacks are classified conservatively;
- existing Ant Design is retained rather than duplicated;
- unknown stacks remain Tier 3;
- audit inventory does not mutate production source files;
- raw color and spacing checks report evidence and non-zero status;
- configured icon-package imports outside the local registry and conflicting semantic aliases are rejected;
- multiple full UI systems in feature code are rejected;
- migrated paths cannot introduce configured legacy UI imports;
- the installer writes identical skill copies for Codex and Claude project scopes;
- repeated installation is idempotent;
- local installed-copy drift is detected and is not overwritten without `--force`.

Additional regression cases cover CRLF/BOM, strict config and source scope, route separation, modern CSS values, aliases, baseline occurrence counts, exceptions, package profiles, transform preview/idempotence/stale input, and source snapshots. Run `node evals/run-regression-evals.mjs` from the skill directory.

These static contracts do not replace real clean runs in Codex and Claude Code. Package compatibility remains PARTIAL until those runs are recorded; project task status is assessed separately.

The v0.3.0 suite also verifies native controls outside DS boundaries, allowed semantic internals, native popup candidates, browser dialog/tooltip candidates, hidden values, and strict migrated-area enforcement. Geometry acceptance is a required browser workflow, not a claim made by static tests.
