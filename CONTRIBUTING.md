# Contributing to Aethel Engine

Thanks for helping us make Aethel sharper for real users.

## What We Optimize For

- A small set of polished user journeys beats a large set of placeholder screens.
- The product core is `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web`.
- The highest-priority surfaces are dashboard, workbench, auth, billing, preview, and docs.

## Non-Negotiables

- Do not add vendored third-party source trees to the main repo.
- Do not add new redirect-only `page.tsx` files when `next.config.js` redirects or middleware can handle the alias.
- Do not add new `console.log`, `console.info`, or `console.debug` calls. Use `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\lib\observability\logger.ts`.
- Do not create duplicate component names without first defining the canonical home.

## Canonical Frontend Structure

- UI primitives: `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ui`
- Product routes: `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\app`
- Shared logic: `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\lib`
- Agent/project rules: `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\.aethelrules`

## Accessibility

- Every new button must expose an accessible name.
- Respect the design-system gate and token usage already enforced in `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\tools\check-design-system-consistency.mjs`.
- Prefer semantic HTML first, ARIA second.

## Routing

- Route aliases should converge into canonical entry points like `/ide`, `/dashboard`, or `/docs`.
- If a route exists only to redirect, prefer config or middleware over a standalone page file.

## Observability

- Prefer structured logging with request IDs.
- Hook critical user-facing flows into telemetry instead of silent failures.
- New background services should expose `/health` and `/metrics` where practical.

## Before You Open a PR

- Run `npm run qa:design-system-consistency` from `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo`
- Run `npm run typecheck` from `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web`
- Add or update tests for auth, billing, preview, collaboration, or editor state changes
