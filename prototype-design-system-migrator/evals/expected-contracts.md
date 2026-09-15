# Static evaluation contracts

The static suite verifies:

- the shared skill package passes portability validation;
- React/Vite, Next.js, Ant Design, shadcn-style, static HTML, Vue, and unknown stacks are classified conservatively;
- existing Ant Design is retained rather than duplicated;
- unknown stacks remain Tier 3;
- audit inventory does not mutate production source files;
- raw color and spacing checks report evidence and non-zero status;
- direct Tabler imports outside the local registry and duplicate semantic aliases are rejected;
- multiple full UI systems in feature code are rejected;
- migrated paths cannot introduce configured legacy UI imports;
- the installer writes identical skill copies for Codex and Claude project scopes;
- repeated installation is idempotent;
- local installed-copy drift is detected and is not overwritten without `--force`.

These static contracts do not replace real clean runs in Codex and Claude Code. Cross-agent status remains PARTIAL until those runs are recorded.
