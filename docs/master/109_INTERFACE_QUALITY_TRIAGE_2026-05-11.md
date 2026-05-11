# 109 - Interface Quality Triage

Date: 2026-05-11
Status: canonical interface-quality gate
Scope: visible product surfaces, spacing, component organization, copy consistency, density, accessibility, and progressive disclosure.

## Factual State

Aethel already has strong structural gates: zero `any` in app code, zero hardcoded hex colors in component TSX, no component above the god-component threshold, Prisma migrations, Deploy UI, Trust Center, Studio Local runtime contracts, Project Brain, Mission Ledger, Repository Cartography, and agent scope enforcement.

This pass focuses on the next layer of quality: whether the user-facing surfaces feel coherent, calm, professional, and benchmark-ready instead of dense, mixed-language, or visually noisy.

## Surface Inventory

- Marketing: keep the first impression simple, mission-led, and concrete. The header must use clear English CTAs, accessible targets, and no mixed PT/EN in primary navigation.
- Studio Home: one mission-first control plane. It should summarize operations, AI, preview, billing, and governance without becoming a dashboard wall.
- IDE/Workbench: deep work stays powerful, but its entry points should be clean, keyboard-safe, and visually consistent.
- Creative Studio: game, film, VFX, material, animation, and audio modes should use progressive depth. The hub should guide, not overwhelm.
- Preview/Viewport: viewport-heavy creation should remain the protagonist in creative modes, with evidence and review close by.
- Trust/Billing: trust, reliability, security, cost, and billing should support confidence without interrupting creation.
- Mobile: mobile is approval, pause, review, and evidence; it should not pretend to be the heavy IDE.
- Admin: admin remains a power surface. It should be consolidated and never define the emotional center of the product.

## Quality Contract

- Progressive disclosure: show the next useful action first; hide expert density until the mission requires it.
- Spacing: use stable padding, equal-height cards, and scrollable rails instead of wrapping controls into noisy second rows.
- Density: avoid dashboard walls. One protagonist per page: mission, preview, evidence, editor, or approval.
- Accessibility: primary controls need visible focus, at least 40px desktop targets, and mobile-friendly 44px intent where possible.
- Copy: no mixed PT/EN in primary surfaces. Use short action labels and avoid internal jargon unless it is attached to evidence.
- Empty states: honest, calm, and action-oriented. They should explain why the surface is empty and offer a single clear next step.
- Loading states: specific and human-readable. No vague spinners when a surface can say what it is preparing.
- Components: reuse canonical primitives; do not create a new visual language for each domain.

## Changes In This Pass

- `Button`: normalized target sizing, reduced-motion-safe transitions, and English loading copy.
- `PremiumEmptyState`: added compact mode, mobile-friendly action stacking, focus rings, text balance, and English project empty-state copy.
- `PublicHeader`: converted primary copy to English, improved focus states, and enforced minimum target sizing.
- `DashboardHeader`: converted visible mixed-language copy to English, clarified Full Access behavior, and improved focus targets.
- `DashboardMainContent`: added `aria-labelledby` to surface frames and made loading/billing status copy clear.
- `CreativeStudioShell`: changed dense wrapping nav rows into horizontal scroll rails with `aria-current` and explicit nav labels.
- `Creative Studio Hub`: made cards equal height, keyboard-visible, and action-oriented with a consistent `Open editor` affordance.
- `qa:interface-quality`: added a gate to keep these interface contracts from silently regressing.

## Remaining Gaps

- Admin still needs a 47-to-6 information architecture consolidation pass.
- Secondary surfaces still need a broader copy audit for legacy Portuguese strings and older microcopy.
- Mobile needs a real visual/a11y pass with screenshots and Lighthouse evidence.
- Marketplace creator flows need checkout, payout, reviews, and asset-quality affordances.
- Visual regression should capture landing, Studio Home, IDE, Creative Studio, trust, billing, and mobile companion.

## Acceptance Gate

Run:

```bash
npm run qa:interface-quality
npm run qa:product-quality-progress
```

The gate requires canonical interface quality artifacts, primary-surface copy consistency, accessible focus affordances, scroll-safe creative navigation, and explicit triage coverage for Marketing, Studio Home, IDE/Workbench, Creative Studio, Trust/Billing, Mobile, Admin, Spacing, Density, Accessibility, and Progressive disclosure.
