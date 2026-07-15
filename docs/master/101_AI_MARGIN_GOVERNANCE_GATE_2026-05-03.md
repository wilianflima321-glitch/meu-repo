# 101 AI Margin Governance Gate - 2026-05-03

## Status

Implemented in this execution pass.

## Why This Exists

Audit V12 called out a dangerous blind spot: Aethel can expose powerful AI agents, 3D workflows, marketplace flows, and deploy automation while hiding whether AI usage is profitable per period. That is not acceptable for a market-leading platform. Users need cost transparency, and operators need margin visibility before scale.

This gate turns AI unit economics into a first-class admin contract.

## Product Contract

The admin finance dashboard must show, at a glance:

- Period revenue.
- Period AI cost.
- Gross margin after AI cost.
- AI cost ratio against revenue.
- Average AI cost per call.
- Projected monthly AI run-rate.
- Top risk model and model concentration.
- Health status: `healthy`, `watch`, or `risk`.
- Top users by AI cost, including user revenue, AI cost, margin after AI, calls, tokens, and risk status.
- Top workspaces by AI cost, including cost share, calls, tokens, top model, and unattributed spend risk.
- Operator next actions with priority, scope, rationale, concrete action, and expected impact.

## Files

- `cloud-web-app/web/app/api/admin/finance/metrics/route.ts`
- `cloud-web-app/web/app/admin/finance/page.tsx`
- `cloud-web-app/web/components/admin/AIMarginSnapshotPanel.tsx`
- `cloud-web-app/web/components/admin/AIMarginDrilldownPanel.tsx`
- `cloud-web-app/web/components/admin/AIMarginRecommendationsPanel.tsx`
- `cloud-web-app/web/__tests__/api/admin-finance-metrics-route.test.ts`
- `tools/check-ai-margin-gate.mjs`
- `tools/measure-product-quality.mjs`

## Implementation Notes

- Token pricing now uses per-million model costs instead of an ambiguous per-1K approximation.
- The route includes `ai_chat`, `ai_generation`, and generic `usage` ledger entries so chat runs cannot escape finance visibility.
- Ledger metadata `costUSD` still takes precedence when provider cost is already persisted.
- Unknown metadata is treated as `unknown`, not `any`.
- Finance route errors use structured logging through `createComponentLogger`.
- The drilldown maps AI ledger rows to users and workspaces without exposing a heavy table by default.
- Recommendations translate margin risk into operator actions: budget caps, model routing, metadata repair, and plan review.

## Validation

Run:

```bash
npm run qa:ai-margin-governance
npm run qa:product-quality-progress
npm --prefix cloud-web-app/web test -- __tests__/api/admin-finance-metrics-route.test.ts
```

## Anti-Regression Rules

- Do not remove `aiMarginSnapshot` from `/api/admin/finance/metrics`.
- Do not price AI cost with hardcoded fake totals when token metadata or provider cost is available.
- Do not reintroduce `console.*` or `as any` in the finance metrics route.
- Do not ship finance dashboards that show revenue without AI margin.

## Remaining Work

- Add per-agent attribution inside each user/workspace drilldown.
- Connect recommendations to actual admin actions once budget and model-routing mutations exist.
- Connect usage thresholds to plan entitlements and agent routing.
- Add monthly cohort margin charts.
