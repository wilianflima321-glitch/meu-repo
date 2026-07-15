# Visual Quality Triage — End-to-End UI (2026-06-19)

**Status:** Living triage. Scope: `cloud-web-app/web`.
**Bar:** best-in-market / AAA — consistent design tokens (`var(--aethel-*)` in `app/globals.css`), high density, accessible focus/contrast, polished states, no visual pollution.
**Canonical source:** `lib/canonical-spacing.ts` (cards `rounded-2xl` / `p-6`, `CANONICAL_FOCUS`, `CANONICAL_MOTION`) + shadow/radius tokens in `app/globals.css` (`--aethel-shadow-md/lg/xl`).
**Reference implementation (closest to canonical):** in-app billing (`BillingPageClient.parts.tsx`).

## Snapshot constraint (read first)
The repo enforces **visual-regression gates** (Playwright). Any change that alters rendered pixels turns those gates red until baselines are regenerated against a built app. This triage therefore separates:
- **Pixel-neutral** fixes (a11y attributes, `focus-visible` rings, focus management) → safe to ship now.
- **Pixel-change** fixes (radius/shadow/color/spacing) → require snapshot regeneration in the same PR.

---

## DONE this round (pixel-neutral + clear defects)

| # | Fix | File(s) | Type |
|---|-----|---------|------|
| V-01 | Empty eyebrow label rendered (was a bare comment) → `Start points` | `app/landing-v3.tsx:93` | Defect (pixel) |
| V-02 | `.has-mobile-nav` CSS rule added — reserves bottom padding so last rows aren't hidden behind the fixed mobile bottom nav (`<md`, safe-area aware) | `app/globals.css` | Defect (mobile pixel) |
| V-03 | Marketplace card buttons: `CANONICAL_FOCUS` rings; install CTA text → `--aethel-text-inverse` | `app/marketplace/MarketplaceCard.tsx` | a11y (neutral) |
| V-04 | Install modal: `CANONICAL_FOCUS` on close/cancel/confirm; backdrop tokenized (`color-mix` surface vs raw rgba); panel → `rounded-2xl` + `--aethel-shadow-xl` (theme-aware) | `app/marketplace/MarketplaceInstallReview.tsx` | a11y + token |
| V-05 | PublicHeader: `focus-visible` rings on primary nav, "More" summary, Sign in, Start free, mobile toggle | `components/ui/PublicHeader.tsx` | a11y (neutral) |
| V-06 | SettingsCommandCenter: `CANONICAL_FOCUS` on all card buttons/links | `app/settings/_components/SettingsCommandCenter.tsx` | a11y (neutral) |

> V-01/V-02 are genuine defects (empty label / hidden mobile content), worth the snapshot regen. V-03..V-06 are predominantly focus-state only and should not affect default-state snapshots.

---

## DONE — P0 token unification (2026-06-19, pixel-change → regen snapshots)

Applied a consistent radius scale (**panels/cards `rounded-2xl`, inner items `rounded-xl`, controls `rounded-lg`, chips `rounded-full`**) and replaced ad-hoc rgba shadows with `--aethel-shadow-md/lg/xl` (theme-aware) across:

| # | Surface | Files | Notes |
|---|---------|-------|-------|
| P0-1/2 | **Marketplace** | `MarketplaceCard/Hero/Filters/EmptyState.tsx` | square corners → `rounded-2xl` containers + rounded controls; token shadows |
| P0-6 | **Pricing** | `PricingPlansGrid/EnterpriseCard/ComparisonTable.tsx` | `24/28px` → `rounded-2xl`; `shadow-xl`/rgba → tokens; matches billing |
| P0-1/2 | **Landing** | `landing-v3.tsx`, `landing-v3-mission-box.tsx` | `34/30/24/20px` → `rounded-2xl`/`xl`/`lg`; token shadows |
| P0-1/2/8 | **Dashboard** | `DashboardWorkspaceLaunch`, `DashboardEntryIntentBanner`, `FirstValueGuide`, `DashboardTopBar`, `DashboardProjectsTab`, `DashboardOverviewTab`, `DashboardMainContent`, `DashboardLoadingScreen`, `AethelDashboardSidebar` | neutral radii/shadows tokenized |
| P0-3 | **Public chrome + Settings hero** | `PublicHeader.tsx`, `SettingsCommandCenter.tsx` | `rgba()`/gradient → `color-mix(var(--aethel-surface-*))` / `var(--aethel-panel)` + token shadows |
| P0-5 | **Auth** | `register-v2.tsx`, `register/page.tsx`, `login-v2.tsx` | register aligned to login shell; fallback dup-shadow fixed; login shadow tokenized |

### Snapshots to regenerate (run in the same PR)
`npm run qa:public-visual-regression`, `qa:authenticated-visual-regression`, marketplace/pricing/landing/auth/dashboard suites — baselines shift because radii/shadows changed (intended).

## BACKLOG — P0 remaining (deferred: colored brand glows / IDE)

| # | Issue | File:line | Fix |
|---|-------|-----------|-----|
| P0-7 | Parallel hex/gradient system in IDE + dashboard brand glows (cyan/indigo) | `lib/design-tokens.ts:204`; `chromeStyles.ts:56,72`; `StudioActionRail.tsx:147`; `DashboardHeader.tsx:59,177` | `var(--aethel-accent)`/`var(--aethel-info)`; needs care (changes brand accent rendering) |
| P0-8b | Dashboard launch `min-h-[460px]` density (radius/shadow already done) | `DashboardWorkspaceLaunch.tsx:97` | drop forced min-height / `min-h-0` |

## BACKLOG — P1 a11y / interaction

| # | Issue | File:line | Fix |
|---|-------|-----------|-----|
| P1-1 | DashboardTopBar buttons missing focus; prose H1 + `min-h-[76px]` waste | `DashboardTopBar.tsx:63,82` | `CANONICAL_FOCUS`; shorten H1; `min-h-14` |
| P1-2 | Low-contrast quaternary text on translucent labels | `PublicFooter.tsx:48`; `landing-v3-mission-box.tsx:131`; `StudioGlobalNav.tsx:56,59` | bump to `text-tertiary` or raise surface opacity |
| P1-3 | Install modal lacks full focus trap (Tab can leave) | `MarketplaceInstallReview.tsx` | add focus trap/tab cycle |
| P1-4 | IDE mobile icon targets `34px` < 44px | `chromeHeaderParts.tsx:98` | `min-h-11 min-w-11` on mobile |
| P1-5 | Motion inconsistency (`transition` vs `CANONICAL_MOTION`) | landing/dashboard/header | standardize on `CANONICAL_MOTION` |

## BACKLOG — P2 states / responsive

| # | Issue | File:line | Fix |
|---|-------|-----------|-----|
| P2-1 | StudioGlobalNav hides primary nav `<md` (no in-header wayfinding) | `StudioGlobalNav.tsx:66,73` | compact scroll nav or drawer for mobile |

---

## Quick reference — token replacements

| Anti-pattern | Replace with |
|--------------|--------------|
| `shadow-[0_24px_80px_rgba(...)]` | `shadow-[var(--aethel-shadow-xl)]` |
| `bg-[rgba(8,10,16,0.86)]` | `bg-[color-mix(in_srgb,var(--aethel-surface-primary)_86%,transparent)]` |
| `rounded-[34px]/[28px]/[24px]` | `rounded-2xl` |
| `linear-gradient(...rgba(15,23,42...))` | `.aethel-panel` / `bg-[var(--aethel-panel)]` |
| Missing focus | `CANONICAL_FOCUS` (`lib/canonical-spacing.ts`) |

## Execution note
Ship the P0 token-unification surface-by-surface (one surface per PR) and run `npm run qa:*-visual-regression` to regenerate baselines in the same change. This keeps the gates green while converging every surface on the canonical system.
