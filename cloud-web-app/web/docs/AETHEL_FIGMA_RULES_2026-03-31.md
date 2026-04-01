# Aethel Figma Rules

Date: 2026-03-31

This document translates the current codebase into design-system rules for Figma-driven work. It exists to reduce drift between product code and future visual exploration.

## 1. Token Definitions

Primary token sources:

- `app/globals.css`
- `tailwind.config.ts`

Rules:

- Treat `--aethel-*` variables as the canonical layer for colors, surfaces, borders, and semantic states.
- Use the compatibility aliases (`--bg-*`, `--text-*`, `--border-*`, `--brand-*`) only to preserve older surfaces while migrating.
- Prefer semantic tokens over palette names.

Core token families:

- Surfaces: `--aethel-surface-primary`, `--aethel-surface-secondary`, `--aethel-surface-tertiary`, `--aethel-surface-quaternary`
- Text: `--aethel-text-primary`, `--aethel-text-secondary`, `--aethel-text-tertiary`, `--aethel-text-quaternary`
- Borders: `--aethel-border-primary`, `--aethel-border-secondary`, `--aethel-border-subtle`, `--aethel-border-focus`
- Semantic: `--aethel-primary`, `--aethel-secondary`, `--aethel-info`, `--aethel-success`, `--aethel-warning`, `--aethel-error`

## 2. Component Library

Key product-facing components:

- Header: `components/AethelHeaderPro.tsx`
- Workbench chat: `components/ide/AIChatPanelPro.tsx`
- Workbench layout: `components/ide/IDELayout.tsx`
- Preview: `components/preview/CanonicalPreviewSurface.tsx`
- Billing surfaces: `components/billing/BillingIntegration.tsx`
- Onboarding: `components/onboarding/OnboardingWizard.tsx`
- Shared cards/buttons/badges: `components/ui/`

Rules:

- Surfaces should feel like one studio, not separate dashboards glued together.
- Cards and panels should use translucent borders and layered depth rather than flat neutral blocks.
- If a component needs a new visual pattern, define it once and reuse it.

## 3. Frameworks and Libraries

- Framework: Next.js App Router + React
- Language: TypeScript
- Styling: Tailwind utilities + CSS variables in `app/globals.css`
- Icons: `lucide-react` plus some VS Code codicons

Rules:

- Keep Figma components mapped to semantic intent, not raw Tailwind classes.
- Build from tokens first, then component anatomy, then motion states.

## 4. Asset Management

Asset roots:

- `public/branding/`
- `public/screenshots/`
- `public/icons/`

Rules:

- Reuse current screenshots for marketing or north-star alignment when they represent the real product.
- Treat static mockups as illustrative only; do not market them as runtime proof.

## 5. Icon System

- Product icons mainly use `lucide-react`
- Code/editor iconography can use codicons via `components/ide/Codicon.tsx`

Rules:

- Keep icon sizing restrained and consistent.
- Use icons to improve scanability, not as decoration overload.

## 6. Styling Approach

- Tailwind for layout and composition
- CSS variables for brand, surface, and semantic consistency
- Gradient and glow usage is allowed, but always secondary to readability

Rules:

- Prefer `color-mix` with Aethel tokens over raw slate/zinc values.
- Focus states must stay visible.
- Avoid dead-flat backgrounds on hero, modal, and studio surfaces.
- Motion should support clarity, not novelty.

## 7. Project Structure

The app is organized by product surface rather than by a single design system package, so consistency must be maintained intentionally.

High-impact routes:

- `app/page.tsx`
- `app/landing-v3.tsx`
- `app/(auth)/login/login-v2.tsx`
- `app/(auth)/register/register-v2.tsx`
- `app/billing/page.tsx`
- `app/dashboard/**`

## 8. Figma-to-Code Translation Rules

When exploring in Figma:

- Use one dark studio theme only unless a specific variant is needed
- Mirror code tokens exactly for surfaces and borders
- Maintain clear state labels for healthy, degraded, failed, and partial flows
- Keep CTA hierarchy sharp: primary action, secondary action, then tertiary links
- Show the workbench as a connected system: navigation, mission input, editor, preview, AI context, and readiness

## 9. Benchmark Notes

Experience targets were aligned against:

- WCAG 2.2 for focus, clarity, and operability
- Stripe guidance for billing clarity and obvious next steps
- Appcues and UXCam guidance for time-to-value and onboarding activation

These references inform the product direction, but the codebase remains the source of truth for what is actually implemented today.

