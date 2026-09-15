# Stack adapters

## Support tiers

### Tier 1

Primary guided workflow (runtime evidence is still required):

- React with Vite;
- Next.js;
- plain HTML, CSS, and JavaScript;
- plain CSS, CSS Modules, Tailwind, styled-components, and Emotion.

### Tier 2

Audit, planning, tokens, and conservative migration where safe:

- Vue and Nuxt;
- Svelte and SvelteKit;
- Angular and Astro (discovery and conservative native-stack planning).

Do not claim full support until stack-specific components and runtime tests exist.

### Tier 3

Unknown or custom stack:

- audit and plan only;
- no speculative production migration;
- identify missing capabilities; an audit can be `READY` for its scope, but unsupported implementation remains `PARTIAL`.

## Adapter contract

A stack adapter should define:

- route discovery;
- source file extensions;
- component discovery;
- styling/token entry points;
- runtime start and build evidence;
- test hooks;
- local UI boundary conventions;
- migration transforms that are safe for that stack.

Adapters are additive. Core decision rules, outputs, and status semantics remain stack-neutral.

## React and Next.js

Prefer typed local components. Preserve server/client boundaries in Next.js. Do not convert server components to client components merely to use a UI primitive unless required and documented.

## Plain HTML/CSS/JS

Use CSS custom properties, semantic HTML, and small local modules. Avoid introducing a framework solely for design-system migration.

## Tailwind

Centralize theme values and replace arbitrary utilities incrementally. A Tailwind utility is not automatically a semantic token. Shared component variants should be explicit and reviewable.

## CSS-in-JS

Centralize theme values and avoid component-local literal proliferation. Account for runtime theming and SSR behavior before changing providers.
