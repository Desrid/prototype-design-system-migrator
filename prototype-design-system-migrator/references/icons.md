# Icons

## Default policy

Use the product's coherent existing icon set when one exists. Use Tabler Icons as the default product-facing system when the icon language is missing, inconsistent, or explicit standardization was requested.

## Local registry

Create a semantic registry and wrapper inside the local UI boundary. Feature code imports semantic names, not third-party package names.

```ts
export { IconSearch as SearchIcon } from "@tabler/icons-react";
export { IconPlus as AddIcon } from "@tabler/icons-react";
```

## Defaults

- approved sizes: 14, 16, 20, and 24;
- stroke width: 2;
- color: `currentColor`;
- one semantic action uses one icon consistently.

## Accessibility

Decorative icons are hidden from assistive technology. Icon-only controls have an accessible name. Do not duplicate a visible label with an unnecessary spoken icon name.

## Prohibitions

- no emoji or Unicode symbols as interface icons;
- no icon fonts, text glyphs, or CSS drawings as replacements;
- no direct Tabler imports in feature code;
- no replacement of logos, brand marks, or illustrations;
- no fragile overrides of private third-party internal icons.
