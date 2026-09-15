# Decision matrix

## Evidence hierarchy

Use evidence in this order:

1. explicit user instruction;
2. approved brand assets and documented product constraints;
3. working business behavior;
4. coherent existing system and dominant patterns;
5. accessibility and maintainability;
6. aesthetic preference.

## Strategy selection

| Condition | Strategy |
| --- | --- |
| No explicit redesign request | `preserve` |
| User explicitly accepts a selected open-source visual language | `standardize` |
| Approved visual references or art direction exist | `brand-refresh` may be proposed |
| Evidence is insufficient | `preserve`, record unresolved decisions |

## Component-system selection

| Evidence | Default action |
| --- | --- |
| One coherent system already dominates | Keep it and add a local public boundary |
| Several full systems are mixed | Choose one incumbent based on usage and migration risk; isolate the rest as legacy |
| No full system, strong local components | Normalize the local system |
| No full system, React enterprise/admin product | Ant Design may be proposed, not silently installed |
| Existing Material conventions | MUI may be retained or proposed |
| Existing Carbon conventions | Retain Carbon |
| Branded React product requiring source ownership | shadcn-style local components with Radix primitives may be proposed |
| Non-React stack | Keep native stack; do not convert for a React library |
| Unknown stack | Audit and plan only |

## Tie-breakers

When two candidates remain viable, prefer:

1. lower behavioral migration risk;
2. stronger existing adoption in the product;
3. better accessibility behavior;
4. smaller public API surface;
5. fewer custom overrides;
6. lower bundle/runtime impact;
7. easier rollback.

## Decisions that require explicit approval

- changing product information architecture;
- replacing a brand font or logo;
- adopting `brand-refresh`;
- replacing an already coherent component system;
- changing interaction semantics;
- removing supported responsive states;
- introducing a paid dependency or service.
