# Layout and spacing

## Local layout primitives

Provide:

- `Container` — content width and page gutters;
- `Section` — vertical page rhythm;
- `Stack` — vertical flow;
- `Inline` — single-line alignment;
- `Cluster` — wrapping inline groups;
- `Grid` — responsive columns.

The implementation may use native CSS Grid/Flexbox or the selected system internally. Feature code should use one stable local API.

## Grid policy

- centralize breakpoints, container widths, gutters, and responsive gaps;
- use the incumbent system's grid when coherent;
- when Ant Design is selected, use Ant Grid/Flex/Space internally rather than adding Bootstrap Grid;
- do not expose Ant Grid, Bootstrap, Tailwind layout utilities, Open Props layout utilities, and custom grid APIs as competing systems;
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
