## UI-system migration contract

Use the project skill `prototype-design-system-migrator` for audits and migrations of the existing UI.

- Start in `audit-only` unless a later mode is explicitly requested and prerequisite evidence exists.
- Default to the `preserve` strategy.
- Do not reinterpret product content, brand assets, information architecture, or business behavior.
- Keep third-party component and icon packages behind the local UI boundary.
- Do not mix full UI systems or create one-off variants without evidence.
- Record unresolved decisions instead of guessing.
- Report `PARTIAL` when runtime, visual, accessibility, or responsive validation is incomplete.
