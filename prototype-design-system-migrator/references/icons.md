# Icons

## Default policy

Use the product's coherent existing icon set when one exists. When no coherent icon set exists, choose a compatible set using product style, stack, and dependency evidence. Tabler is one option, not a requirement.

## Local registry

Create a semantic registry and wrapper inside the local UI boundary. Feature code imports semantic names, not third-party package names.

```ts
export { IconSearch as SearchIcon } from "@tabler/icons-react";
export { IconPlus as AddIcon } from "@tabler/icons-react";
```

## Defaults

- derive approved sizes from the product;
- preserve the selected set's coherent stroke/weight conventions;
- color: `currentColor`;
- one semantic action uses one icon consistently; several semantic names may share a glyph, but a name must not resolve ambiguously.

## Accessibility

Decorative icons are hidden from assistive technology. Icon-only controls have an accessible name. Do not duplicate a visible label with an unnecessary spoken icon name.

## Prohibitions

- review ambiguous text or emoji icon substitutes; preserve intentional product content and coherent accessible incumbent glyphs;
- avoid introducing inconsistent icon fonts, text glyphs, or CSS drawings during migration;
- keep selected third-party icon sources behind the configured boundary; `iconPackages` controls static enforcement;
- no replacement of logos, brand marks, or illustrations;
- no fragile overrides of private third-party internal icons.
