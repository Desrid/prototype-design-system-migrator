## UI-system migration contract

Use the project skill `prototype-design-system-migrator` for audits and migrations of the existing UI.

- Infer scope from user intent: review requests remain read-only; implementation requests proceed through necessary phases within the authorized scope.
- Default to the `preserve` strategy.
- Do not reinterpret product content, brand assets, information architecture, or business behavior.
- Keep third-party component and icon packages behind the local UI boundary.
- Do not mix full UI systems or create one-off variants without evidence.
- Record unresolved decisions instead of guessing.
- Maintain Storybook stories and documentation alongside shared component changes; follow the skill's `references/storybook.md` for applicable states, fixtures, and validation.
- Report `PARTIAL` when a required check for the selected scope is incomplete.

- Require every visible UI control/component to use the fully themed DS API; inspect opened popups as well as triggers.
- Verify all applicable geometry and DS coverage entries according to `references/geometry-and-ds-acceptance.md`; unresolved clipping, border contact, overflow, or native fallback controls prevent `READY`.
