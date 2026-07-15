# Aethel Portal

Aethel Portal is the web surface of the Aethel software studio: landing, auth, dashboard, IDE, AI chat, preview runtime, billing, and readiness flows in one Next.js application.

## Product Focus

- Apps + research in the same operational flow
- Explicit runtime readiness instead of fake-success states
- Shared studio experience across dashboard, workbench, billing, and onboarding
- Canonical visual system based on `--aethel-*` tokens and studio-grade surfaces

## What Lives Here

- `app/`: App Router pages, API routes, public routes, auth, admin, billing, docs
- `components/`: studio UI, AI chat, preview surfaces, billing UI, auth panels, shared UI primitives
- `lib/`: auth, analytics, plan limits, preview runtime, AI providers, server-side orchestration
- `public/`: branding, screenshots, icons, offline assets, static preview artifacts
- `scripts/`: quality gates, readiness checks, scans, route inventory, mojibake scan

## Local Commands

```bash
npm install
npm run dev
npm run dev:full
npm run lint
npm run typecheck
npm run build
```

## Operational QA

These are the checks we use most when touching product surfaces:

```bash
npm run qa:interface-gate
npm run qa:no-fake-success
npm run qa:billing-runtime-readiness
npm run qa:preview-runtime-readiness
npm run qa:wcag-critical
npm run qa:mojibake
```

## North-Star Assets

- `public/screenshots/dashboard.png`
- `public/screenshots/editor.png`
- `public/workbench-preview.html`

Use the static workbench preview when we need a fast, shareable north-star artifact for visual alignment without promising runtime behavior.

## Experience Rules

- Do not present fallback or degraded states as healthy.
- Prefer one clear next step per surface.
- Keep pricing, billing, and plan enforcement aligned with runtime reality.
- Treat accessibility, motion reduction, and focus visibility as product requirements.
- Use `--aethel-*` tokens before introducing new raw palette values.

## Canonical Runtime Surfaces

- Landing: `app/landing-v3.tsx`
- Studio entry: `app/page.tsx`
- Header: `components/AethelHeaderPro.tsx`
- Workbench chat: `components/ide/AIChatPanelPro.tsx`
- Preview runtime: `components/preview/CanonicalPreviewSurface.tsx`
- Billing: `components/billing/BillingIntegration.tsx`
- Onboarding: `components/onboarding/OnboardingWizard.tsx`

## Current Reality

This repo contains strong internal capabilities, but the experience only stays trustworthy when visual polish, runtime readiness, and product copy stay aligned. We actively prefer honest partial states over optimistic placeholders.

## Related Documentation

- `docs/AETHEL_FIGMA_RULES_2026-03-31.md`
- `../docs/master/AI_SYSTEM_SPEC.md`

