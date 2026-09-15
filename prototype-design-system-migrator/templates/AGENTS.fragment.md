## UI-system migration contract

- This is a conservative migration, not an uncontrolled redesign.
- Default strategy is `preserve`.
- Preserve business logic, routes, copy, analytics hooks, test selectors, and approved brand assets.
- Audit before editing and migrate one representative vertical flow before rollout.
- Product features import UI only through the local UI boundary.
- Do not mix multiple full component systems.
- Use primitive tokens, then semantic tokens, then component tokens only when justified.
- Reuse approved layout APIs; create primitives only for repeated needs.
- Do not add arbitrary colors, spacing, radii, breakpoints, z-index values, or motion values outside approved token files.
- Use the selected icon set through the project's chosen semantic boundary.
- Do not replace logos or illustrations with generic icons.
- Preserve intentional content and coherent incumbent icons; review inconsistent icon substitutes.
- Do not synthesize font weight with `-webkit-text-stroke`.
- Preserve keyboard access, visible focus, accessible names, and reduced-motion behavior.
- Maintain Storybook stories and documentation alongside shared component changes; follow the skill's `references/storybook.md` for applicable states, fixtures, and validation.
- A skipped required check means the final status is `PARTIAL`, not `READY`.

- Require every visible UI control/component to use the fully themed DS API; inspect opened popups as well as triggers.
- Verify all applicable geometry and DS coverage entries according to `references/geometry-and-ds-acceptance.md`; unresolved clipping, border contact, overflow, or native fallback controls prevent `READY`.
