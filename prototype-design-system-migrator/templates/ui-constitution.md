# UI constitution

## Product invariants

- Business behavior:
- Supported routes:
- Supported viewports:
- Supported themes:
- Approved brand assets:
- Copy that must remain unchanged:
- Analytics and test hooks that must remain stable:

## Selected strategy

`preserve`

## Public UI boundary

Path:

## Selected component foundation

- Current incumbent:
- Target decision:
- Evidence:
- Rejected alternatives and reasons:

## Token policy

- Primitive token source:
- Semantic token source:
- Temporary exception file:

## Layout policy

- Breakpoints:
- Containers:
- Page gutters:
- Existing or justified layout primitives:

## Icon policy

- Selected existing or compatible icon system:
- Registry path:
- Approved sizes:
- Accessible-name rule:

## Component catalog

- Storybook or existing equivalent:
- Framework and installed version:
- Configuration and story locations:
- Shared styles, providers, and fixtures:
- Component/state coverage location:
- Build and interaction/accessibility commands:
- Visual validation method:
- Known gaps and justified exclusions:
- Maintenance rule: update stories and docs with each public component change; follow the skill's `references/storybook.md`.

## Geometry and DS acceptance

- Route/component/state coverage location:
- DS content insets and inter-element gap tokens:
- Responsive widths and transition checks:
- Intentional full-bleed/scroll regions:
- Native-control inventory and DS replacements:
- Unavoidable platform surfaces and evidence:
- Opened popup and keyboard verification:

## Required validation

- format
- lint
- typecheck
- tests
- build
- route smoke
- visual regression
- keyboard and accessibility
- reduced motion
- horizontal overflow
- token/spacing/icon/library policy checks
- Storybook build, applicable story checks, and rendered state inspection when catalog work is in scope
