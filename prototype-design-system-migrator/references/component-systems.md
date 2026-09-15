# Open-source component systems

Do not install a component system solely because it is popular. Detect the target stack and current dependencies first.

## Ant Design

Eligible for React enterprise and operational products with dense forms, filters, tables, trees, and admin workflows. Use its grid, Flex, and Space internally when Ant is the selected foundation. Avoid adding a second grid framework.

## MUI

Eligible when Material conventions already exist or are explicitly acceptable. Centralize theme overrides rather than scattering `sx` and one-off values through feature code.

## Carbon

Eligible when the product intentionally uses a strict enterprise language compatible with Carbon. Do not adopt it merely to obtain a few components.

## Chakra UI

Eligible only when its styling/runtime model fits the current project. Its flexibility increases the need for strict local variants and token rules.

## shadcn-style local components and Radix primitives

Eligible for branded React products where the project should own component source and preserve a custom visual language. Keep components behind the local UI boundary and prevent copy-pasted variants from diverging.

## Existing local system

Often the safest choice. Normalize naming, tokens, variants, accessibility, and tests before considering replacement.

## No new component library

A valid outcome. Native semantic elements, shared DS styles, and local DS components may be more appropriate for static, small, or non-React prototypes. Browser-default control presentation is not an acceptable fallback.

## Public-boundary rule

Prefer the project's existing stable public import boundary; add adapters where migration or product variants justify them. For example:

```ts
import { Button, Dialog, Stack, SearchIcon } from "@/ui";
```

Enforce the DS public boundary within each application. The selected library can supply accessible behavior internally, but product features consume the fully themed DS API. Independent applications may own separate design systems. Follow `references/geometry-and-ds-acceptance.md` for exhaustive control ownership and opened-state acceptance.
