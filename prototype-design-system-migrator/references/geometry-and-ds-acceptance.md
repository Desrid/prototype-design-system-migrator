# Geometry and design-system acceptance

These are mandatory acceptance gates for UI implementation. Audit-only reports gaps without changing UI. For a full migration, cover every in-scope route, public DS component, and applicable state; representative screenshots alone are not completion. For a local change, include the changed component and all affected consumers.

## 1. Complete geometry coverage

Create a coverage table in the existing validation report before rollout:

| Route / component / story | State | Viewport / container / theme | Expected spacing tokens | Measured result / screenshot | Status |
| --- | --- | --- | --- | --- | --- |

Inventory nested surfaces as well as pages: panels, cards, fields, tables, menus, dropdowns, dialogs, popovers, tooltips, toasts, headers, sticky footers, and scroll containers. Mark unsupported states as not applicable with a reason; never silently omit a failing state. Every in-scope entry must be checked before `READY`.

### Spacing requirements

- Derive exact outer margins, inner padding, gaps, control insets, and popup offsets from the DS. Compare against the relevant semantic token, not an arbitrary universal minimum.
- Check all four edges of every content surface. Text, icons, labels, inputs, and actions must retain their specified inset from the inner border edge. Check nested wrappers too: double padding can be as wrong as missing padding.
- Check icon-to-text, label-to-field, help/error-to-field, adjacent controls, card rows, and header/body/footer gaps. Include loading indicators, validation errors, badges, and multiline text.
- Inspect empty and dense layouts, longest plausible localized strings, unbroken identifiers/URLs, large values, long option labels, and variable row counts. Content must wrap, truncate intentionally with an accessible way to inspect the full value, or scroll inside an explicitly designed region.
- Inspect input text and placeholders, control arrows, clear buttons, adornments, and focus outlines in every state. Centering and clearances must remain correct after loading/error/disabled styles apply.
- Zero inset is allowed only for a named intentional edge-to-edge element such as a divider or full-bleed image; document the component rule. It is not a blanket exception for text or controls.

### Boundaries and overflow

- Check page `scrollWidth` against its client width and examine every unexpected overflow source. Also check nested panels, tables, horizontal groups, and popups. Page-level overflow alone cannot reveal clipped children.
- Measure visible element rectangles and text ranges against the intended content/clip region. Account for borders, padding, scroll position, transforms, and fractional pixel rounding. A small rounding tolerance is for measurement noise, not permission to reduce required padding.
- Check clipping on every relevant ancestor, including `overflow: hidden/clip`, fixed heights, line-height, ellipsis, and min/max constraints. Ensure content, focus rings, and interactive targets remain visible and reachable.
- Check every responsive breakpoint just below, at, and above the transition, plus minimum and maximum supported widths. Test component container widths, not only the viewport. Include supported zoom/reflow, themes, density, and writing direction.
- Open overlays near each viewport edge and inside scrolled containers. Verify placement, collision handling, max-height, internal scrolling, trigger-to-popup spacing, stacking, and focus visibility. Portals are checked against the viewport/overlay boundary, not necessarily the trigger's DOM parent.
- Distinguish intentional scroll regions from accidental overflow. Intentional regions need reachable content, keyboard support, and correct padding at both scroll ends.
- Do not fix geometry by globally hiding overflow, shrinking all text, applying unexplained negative margins, or clipping focus rings. Fix the responsible layout constraint, spacing token, wrapping, or popup placement.

### Verification loop

1. Wait for fonts, assets, data fixtures, and transitions to settle.
2. Capture the exact route/story and state; measure computed padding/gap plus rendered content clearances. Text-range or screenshot inspection is required where element boxes include whitespace.
3. Record expected versus measured values, selectors or story IDs, viewport, and screenshots for findings.
4. Fix the shared DS component/token when it is the cause, then recheck every affected consumer and state.
5. Run automated geometry assertions in the existing browser test harness where available; inspect screenshots and keyboard behavior as well. Neither passing token lint nor one clean screenshot proves geometry correctness.

If browser access or required states are unavailable, report `PARTIAL` with the uncovered entries. Do not claim that all spacing was checked from source inspection.

## 2. Every visible UI component belongs to the DS

The product must use the project-owned or project-themed DS public API for all visible controls and reusable presentation components. Include buttons, links with UI variants, fields, selects/comboboxes, multiselects, checkbox/radio/switch controls, date/time pickers, file/color controls, menus, dialogs, tooltips, tables, cards, tabs, pagination, progress, skeletons, empty/error states, and notifications. Map the inventory to DS components; list unmatched controls as migration work, not accepted browser defaults.

- Reuse accessible primitives or the selected library behind the DS boundary, and fully theme them. Custom DS presentation does not require reimplementing keyboard behavior from scratch.
- Native semantic HTML remains valid internally: a DS Button should generally render a button, and a DS text field can render an input. Plain document structure (`main`, headings, paragraphs, lists, etc.) does not need a meaningless wrapper merely to be custom.
- Feature code must consume the DS component API. Styling an inline native control in one feature is not a reusable DS component. For static HTML, identify the equivalent DS template/module and shared styles; document the proven mapping rather than inventing a React layer.
- A visible native `select`, `datalist`, default date/time/color popup, browser `alert/confirm/prompt`, or `title`-only tooltip is not a completed DS implementation. A custom arrow or `appearance: none` does not customize a select's opened browser popup.
- Inspect native details that can remain inside styled controls: validation bubbles, numeric spinners, range tracks/thumbs, checkbox/radio marks, disclosure markers, textarea resize handles, and progress/meter styling. Provide the DS presentation and error feedback while preserving native form semantics and useful platform behavior.
- Implement both the trigger and opened content through the DS: option rows, selected/disabled states, search, empty/loading/error feedback, scrollbars where styled by the DS, and popup spacing. Verify the opened state in supported browsers, especially on mobile.
- A hidden native input/select may support form submission or a custom trigger when it does not expose native UI or duplicate keyboard/accessibility focus. Verify this behavior; `aria-hidden` alone does not hide a visible native control.
- File selection, permission prompts, autofill, virtual keyboards, and similar OS/browser-owned surfaces cannot all be replaced by page components. The page trigger and status must use the DS; record unavoidable platform surfaces explicitly. Never pretend they are custom or disable useful platform accessibility to hide them.
- Preserve names, values, labels, validation, form submission/reset, refs, events, focus, and keyboard behavior when replacing controls. Follow the appropriate combobox/listbox/menu/dialog pattern; do not replace native controls with inaccessible clickable divs.

## Enforcement and completion

Run `scripts/check-native-controls.mjs` (included in `scripts/run-checks.mjs`) to find direct native controls outside the DS boundary and native widget candidates inside it. It is a heuristic inventory, not proof that controls are fully styled. Resolve every finding in completed scope through a DS implementation or a narrowly documented, verified platform/hidden-control exception.

Run strict migrated-scope checks without a baseline during acceptance. Historical debt may remain outside the requested scope; it must not hide missing DS controls in completed work. Avoid direct third-party UI imports in features; use the existing library-boundary check with `--enforce-boundary`.

The report must show both geometry coverage and DS ownership coverage. All applicable entries must pass; intentional exceptions must identify the exact element, reason, and evidence. Missing measurements, uninspected opened states, native fallback controls, or unexplained border contact prevent `READY`.

## Implementation references

Use the framework/library's compatible APIs and the relevant accessibility pattern. Browser geometry measurements are viewport-relative; interpret them in the correct coordinate space.

- [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [WAI-ARIA listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)
- [MDN: element bounding rectangles](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect)
