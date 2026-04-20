# Storybook — Aethel Design System

Storybook hosts visual documentation and axe-core a11y checks for every
primitive exported under `components/**`.

## One-time install

Storybook is not listed in `package.json` by default to keep Next.js build
times low. Install the peer set on demand:

```bash
npm --prefix cloud-web-app/web install -D \
  storybook @storybook/react @storybook/nextjs \
  @storybook/addon-essentials @storybook/addon-a11y \
  @storybook/addon-interactions @storybook/addon-links
```

## Running

```bash
cd cloud-web-app/web
npx storybook dev -p 6006
```

Open http://localhost:6006 — the sidebar groups stories by domain
(`Collaboration/*`, `UI/*`, `Design System/*`).

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
