# Layout and spacing

## Local layout primitives

Reuse the existing layout API. Introduce only the primitives justified by repeated patterns; possible roles include:

- `Container` — content width and page gutters;
- `Section` — vertical page rhythm;
- `Stack` — vertical flow;
- `Inline` — single-line alignment;
- `Cluster` — wrapping inline groups;
- `Grid` — responsive columns.

The implementation may use native CSS Grid/Flexbox or the selected system internally. Feature code should use the existing stable local API; avoid creating wrappers solely to rename native utilities.

## Grid policy

- centralize breakpoints, container widths, gutters, and responsive gaps;
- use the incumbent system's grid when coherent;
- when Ant Design is selected, use Ant Grid/Flex/Space internally rather than adding Bootstrap Grid;
- avoid redundant competing layout conventions within one application; preserve coherent existing utility-based layouts;
- detect horizontal overflow at supported widths;
- avoid screen-specific breakpoints without evidence.

## Spacing scale

Start from observed values. Reduce them to a minimal scale only after frequency and context are known.

Separate semantic roles:

- internal control spacing;
- form spacing;
- component/card spacing;
- content spacing;
- page gutters;
- section rhythm.

After migration, arbitrary `margin`, `padding`, `gap`, and inset values are prohibited except documented temporary exceptions.

Negative spacing requires explicit documentation because it often hides structural problems.

## Mandatory rendered acceptance

Read `references/geometry-and-ds-acceptance.md`. Verify the measured DS insets on all four edges, nested spacing, text/adornment clearances, and containment for every in-scope component/state and responsive transition. Record coverage and evidence; never hide defects with global overflow clipping or treat passing token lint as geometric proof.
