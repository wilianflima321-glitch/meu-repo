# Storybook — Aethel Design System

Storybook hosts visual documentation and axe-core a11y checks for every
primitive exported under `components/**`.

## Install

Storybook now ships as a first-class dev dependency so stories participate in
local typecheck and the workspace can run the component lab without manual
setup:

```bash
cd cloud-web-app/web
npm install
```

## Running

```bash
cd cloud-web-app/web
npm run storybook
```

Open http://localhost:6006 — the sidebar groups stories by domain
(`Collaboration/*`, `UI/*`, `Design System/*`).

## Runtime model

This setup intentionally uses the Vite-backed React framework
(`@storybook/react-vite`):

- it is faster and more stable than the legacy Webpack path for our current
  stories
- the current stories are component-focused and do not need full Next.js page
  emulation
- Next.js remains the app runtime, while Storybook acts as an isolated UI lab

## Adding a story

Co-locate the story with its component:

```
components/
  collaboration/
    CollaboratorsBar.tsx
    CollaboratorsBar.stories.tsx   <-- picked up automatically
```

Every story file should export:

1. `default` — a `Meta<typeof Component>` with `title`, `component`, `tags`.
2. One `StoryObj` export per meaningful permutation.

## A11y workflow

The `@storybook/addon-a11y` panel runs axe-core on every story. PRs that
introduce new components must land with at least one story **and** a zero
axe-core violation score on the `default` story.

## Benchmark references

Our story catalogue intentionally mirrors the organisation used by:
- **Vercel Geist** — colour tokens + "surface" stack visualisation.
- **Linear Design** — compact list/panel stories with dark-first defaults.
- **Radix Primitives** — every component ships at least `Default` +
  `Disabled` + `WithOverride` stories.
