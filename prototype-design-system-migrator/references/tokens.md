# Tokens

## Layers

### Primitive

Raw scales and values:

```css
--ds-blue-500: #2563eb;
--ds-space-4: 1rem;
--ds-radius-2: 0.5rem;
```

### Semantic

Purpose-oriented aliases:

```css
--ds-surface-page: var(--ds-neutral-0);
--ds-text-primary: var(--ds-neutral-900);
--ds-action-primary-bg: var(--ds-blue-500);
--ds-focus-ring: var(--ds-blue-400);
--ds-page-gutter: var(--ds-space-6);
```

### Component

Add only when semantic tokens are insufficient:

```css
--ds-button-primary-bg-hover: var(--ds-blue-600);
```

## Required domains

- color;
- typography;
- spacing and sizing;
- radii and borders;
- elevation;
- opacity;
- z-index;
- breakpoints;
- duration and easing.

## Migration rules

- inventory values and frequency before creating a scale;
- preserve meaningful distinctions;
- merge near-duplicates only when the visual effect is acceptable;
- map every legacy value to a token, documented exception, or unresolved decision;
- keep raw values in token source files only after migration;
- do not create a token for every accidental one-off value;
- do not silently round values when the difference is material.

## Open Props

Open Props may be used as a donor for selected values. Do not expose its variable names as the product API. Import only required modules, map values to local primitive names, then use semantic aliases in product components.
