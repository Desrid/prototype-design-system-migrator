## UI-system migration contract

- This is a conservative migration, not an uncontrolled redesign.
- Default strategy is `preserve`.
- Preserve business logic, routes, copy, analytics hooks, test selectors, and approved brand assets.
- Audit before editing and migrate one representative vertical flow before rollout.
- Product features import UI only through the local UI boundary.
- Do not mix multiple full component systems.
- Use primitive tokens, then semantic tokens, then component tokens only when justified.
- Use the approved layout primitives: `Container`, `Section`, `Stack`, `Inline`, `Cluster`, and `Grid`.
- Do not add arbitrary colors, spacing, radii, breakpoints, z-index values, or motion values outside approved token files.
- Tabler Icons may be used only through the local semantic icon registry.
- Do not replace logos or illustrations with generic icons.
- Do not use emoji, Unicode symbols, icon fonts, or CSS drawings as interface icons.
- Do not synthesize font weight with `-webkit-text-stroke`.
- Preserve keyboard access, visible focus, accessible names, and reduced-motion behavior.
- A skipped required check means the final status is `PARTIAL`, not `READY`.
