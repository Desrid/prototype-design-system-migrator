# v0.3.0 geometry and DS acceptance verification

Date: 2026-09-15

- Package validator: PASS.
- Original static suite: PASS, 6 groups.
- Regression suite: PASS, 26 scenarios (21 existing and 5 DS-control scenarios).
- New native-control rule participates in the shared-read policy runner.
- Guidance is routed from the entrypoint, geometry/component references, Storybook, and report/agent templates.

The new tests caught and resolved a false positive that classified JSX `Button` as native `button`.

Geometry verification is an explicit browser acceptance protocol covering every in-scope route/component/state, measured insets, overflow/clipping, responsive transitions, and opened overlays. No real product/browser geometry audit was performed while editing this skill. The static scanner cannot prove full DS styling or replace runtime and visual inspection. Platform-owned surfaces and hidden native form helpers require explicit evidence-based handling.
