# 98 - Product Funnel Telemetry Gate (2026-05-03)

Status: canonical execution contract.
Source of truth: V12 audit warning that Aethel had product ambition without enough funnel telemetry.

## Why This Exists

Aethel cannot improve conversion, activation, deploy success, pricing clarity, or onboarding quality if the product does not measure the user's path. The previous state had strong backend and UI surfaces, but too few `analytics.track` calls across the public entry, auth, pricing, mission handoff, and deploy flow.

This gate turns telemetry from an optional library into a product contract.

## Contract

The product must measure these user-facing transitions without adding visual clutter:

- Public route view: `ProductTelemetry` records `performance/page_load` with route surface, source, mission presence, and plan query.
- Public CTAs: `data-analytics-category` and `data-analytics-action` allow delegated click telemetry without bespoke handlers everywhere.
- Landing mission: records mission submit, auth handoff, onboarding start, and real workspace creation.
- Pricing: records pricing view, billing cycle changes, checkout intent, and contact-sales intent.
- Auth: records email login/register success, API failure, and OAuth provider starts.
- Deploy: records deploy click, accepted deployment, and failure paths.
- Analytics persistence: `/api/analytics/batch` must use structured logger, never `console.error`.

## Files

- `cloud-web-app/web/components/telemetry/ProductTelemetry.tsx`
- `cloud-web-app/web/app/layout.tsx`
- `cloud-web-app/web/components/ui/PublicHeader.tsx`
- `cloud-web-app/web/app/landing-v3-mission-box.tsx`
- `cloud-web-app/web/app/pricing/page.tsx`
- `cloud-web-app/web/app/(auth)/login/login-v2.tsx`
- `cloud-web-app/web/app/(auth)/register/register-v2.tsx`
- `cloud-web-app/web/components/deploy/DeployButton.tsx`
- `cloud-web-app/web/app/api/analytics/batch/route.ts`
- `tools/check-product-funnel-telemetry.mjs`

## Gate

Run:

```bash
npm run qa:product-funnel-telemetry
npm run qa:product-quality-progress
```

Expected:

- `qa:product-funnel-telemetry` passes every marker.
- Critical funnel surfaces contain at least 14 real `analytics.track` calls.
- `qa:product-quality-progress` includes `Product funnel telemetry gate configured`.

## Anti-Fake-Success Rule

A telemetry event is only acceptable if it represents a real user action or real route transition. Do not add dummy `analytics.track` calls solely to satisfy call count. If a surface is not wired to a real flow yet, document the gap instead of emitting a fake event.

## Next Closures

- Add event aggregation UI for activation funnel: visit -> mission submit -> auth -> workspace -> IDE -> deploy.
- Add retention metrics D1/D7/D30 from persisted analytics/audit entries.
- Add revenue funnel metrics: pricing view -> plan select -> checkout start -> payment success -> customer portal.
- Add model-cost telemetry in chat and deploy flows so margin risk becomes visible.
