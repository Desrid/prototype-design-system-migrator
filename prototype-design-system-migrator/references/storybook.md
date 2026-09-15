# Storybook maintenance

Maintain Storybook as the executable catalog of the product's actual design system. Update stories alongside component changes so the next developer or agent can reuse a verified example.

## Scope and setup

- In audit/plan mode, inspect the catalog and record coverage gaps without installing packages or changing configuration.
- In implementation modes, maintain an existing Storybook. For foundation work without a catalog, set up Storybook when the native stack is supported and catalog infrastructure fits the authorized scope. Reuse a coherent equivalent catalog when that is the project's explicit choice; record the reason and validation method.
- Inspect package/workspace manifests, lockfile, `.storybook` configuration, story globs, framework adapter, builder, addons, scripts, aliases, styling, and CI before changing setup. Preserve working versions and conventions. Do not upgrade Storybook or switch builders merely to add stories.
- Select APIs and import paths from the installed version's documentation. Use the project's native renderer; React examples are not templates for Vue, Svelte, or static HTML. Add only required compatible development dependencies.
- In a monorepo, reuse package catalogs or composition conventions. Avoid a duplicate root catalog or providers that assume every application shares one theme.
- Keep stories, test helpers, fixtures, and generated Storybook output outside production entry points. Verify build/import boundaries rather than assuming file naming excludes them.

## Catalog organization

Preserve a coherent existing hierarchy. Otherwise organize by the public design-system layers, creating only populated groups:

| Group | Content |
| --- | --- |
| Foundations | Live token scales, typography, color roles, spacing, icons, themes |
| Layout | Containers, responsive layout primitives, composition examples |
| Components | Public reusable controls and their supported variants |
| Patterns | Forms, filters, navigation, tables, and other reusable compositions |

- Prefer stories beside their components unless the repository has an established central location. Use stable descriptive titles and exports, such as `Components/Button` and `Loading`.
- Keep one canonical story family per public component. Avoid duplicating a vendor component and its product wrapper as competing recommendations.
- Story examples must render the production component through its supported import path. Do not copy its markup or recreate its implementation in the story.
- Derive foundation displays from actual token and icon sources. Do not maintain a second hard-coded palette, spacing scale, or icon list.
- Document import path, purpose, supported variants, composition constraints, accessibility requirements, and when to use a different component. Preserve existing documentation language.
- Use compatible Autodocs for API documentation where available; add MDX or prose only for guidance that types and stories cannot express. Do not duplicate prop tables manually.

## Story authoring contract

Use the project's supported Component Story Format (CSF) and renderer-specific types where available. Keep story inputs in `args`, expose meaningful controls, and ensure custom render functions actually use those inputs. Do not silence type errors with broad casts to accommodate an obsolete example.

Each changed public component needs a default example and coverage of its relevant public states. Cover meaningful combinations rather than the Cartesian product of every prop.

| Component family | Applicable examples and checks |
| --- | --- |
| Actions | Variants, sizes, disabled/loading, icon-only accessible name, activation |
| Fields | Label/help, required/error, disabled/read-only, controlled input, validation |
| Overlays | Open/close, keyboard interaction, focus entry and restoration, long content |
| Collections | Normal/empty/loading/error, selection, overflow, paging or sorting when supported |
| Layout and patterns | Narrow/wide container, supported themes/density, long text and localization |

- Reproduce hover and focus through real interaction or compatible state tooling, not fake production props or story-only copies of component CSS.
- Add explicit stories for previously reported regressions and important edge cases. A controls playground does not replace reproducible named states.
- Use actual supported themes and responsive constraints. Avoid inventing themes or states that the product does not support.
- Keep variant galleries for comparison, but provide separately addressable stories for states that need interaction or visual regression checks.

## Match the application environment

- Load the same token/theme entry points, global styles, fonts, reset, and relevant assets as the application. Do not add story-only overrides to hide a product defect.
- Reuse minimal theme/router/i18n/data providers through decorators at the narrowest useful scope. Parameterize relevant theme, locale, or density choices instead of duplicating providers in each story.
- Isolate server-only or infrastructure dependencies through supported adapters/mocks. Do not change application server/client boundaries just to render a story.
- Use explicit, reusable fixtures with deterministic identifiers, dates, content, and network responses. Exercise success, empty, loading, and failure where relevant; do not rely on a live backend, credentials, or production data.
- Reset mutable stores, spies, timers, caches, and mock handlers between stories using hooks supported by the installed tooling. Verify stories independently and after navigating between them.
- Ensure overlays and portals render within an appropriate provider and test scope. A dialog mounted outside the story canvas still needs interaction and visual verification.

## Interaction and visual verification

- Use `play` functions or the existing compatible component-test runner for meaningful behavior: opening a dialog, submitting invalid input, choosing an option, or receiving an action callback. Assert the visible result or callback, not merely that a click was attempted.
- Query by role and accessible name where possible; scope queries to the story or its actual portal target. Await interactions and observable state changes rather than adding arbitrary sleeps.
- Use explicit test spies when asserting callbacks. Import testing utilities from the package supported by the installed Storybook version.
- Run available automated accessibility checks and inspect relevant keyboard/focus behavior. Record existing failures separately; do not suppress a rule globally to make a story pass.
- Inspect changed stories in the browser with relevant themes and widths. Verify font loading, text wrapping, overflow, overlays, console errors, and controls. A successful static build is not visual acceptance.
- Reuse existing visual comparison tooling and stable baselines. Review differences before accepting new baselines; never update all snapshots automatically to erase failures. Paid hosting or a paid visual service is not a prerequisite.
- Also verify the affected application route or flow: isolation in Storybook cannot prove integration behavior.

## Geometry and DS coverage

Apply `references/geometry-and-ds-acceptance.md` to every in-scope public component and state. Include open selects/menus, near-edge overlays, long labels, error/help content, responsive container constraints, and all four border insets. All visible controls in stories must use the actual DS implementation. Catalog coverage and application-route coverage must both be complete; stories alone do not prove page layout.

## Ongoing maintenance and completion

For every component change:

1. Locate its existing stories, consumers, and shared decorators/fixtures.
2. Update the implementation, affected stories, docs, and interaction assertions in the same change. New public variants need examples; removed APIs must not remain in active examples.
3. Preserve story identifiers where possible. When renaming or removing stories, check documentation links, tests, and visual baselines; document the replacement for deprecated components.
4. Run the project's actual Storybook build and relevant story checks. For shared tokens, providers, or configuration changes, broaden checks to affected component families.
5. Inspect rendered states, fix regressions within scope, and rerun affected checks. Record unresolved blockers rather than claiming catalog completion.

Record coverage in the existing migration map or validation report, using entries such as:

| Component | Story file / ID | Covered states | Missing states or exception | Verification evidence |
| --- | --- | --- | --- | --- |

Track changed public components without stories and stories that no longer represent an active component. Give exclusions a reason; do not silently exclude failures. Do not generate a separate tracking system when the project already has one.

Completion for an in-scope catalog change requires:

- updated examples for changed public components and relevant states;
- a passing Storybook build and applicable interaction/accessibility checks;
- inspected visual evidence for affected stories and application integration;
- actual commands, outcomes, and remaining gaps recorded in the validation report.

If a required catalog check cannot run, report `PARTIAL` with the exact limitation. For audit-only work, report catalog coverage and availability; do not require implementation deliverables to finish the audit.

## Official references

Select documentation matching the installed major version. These entry points describe the concepts; do not copy current import paths into an older project without verification.

- [Writing stories](https://storybook.js.org/docs/writing-stories)
- [Decorators and providers](https://storybook.js.org/docs/writing-stories/decorators)
- [Autodocs](https://storybook.js.org/docs/writing-docs/autodocs)
- [Interaction testing](https://storybook.js.org/docs/writing-tests/interaction-testing)
- [UI testing](https://storybook.js.org/docs/writing-tests)
