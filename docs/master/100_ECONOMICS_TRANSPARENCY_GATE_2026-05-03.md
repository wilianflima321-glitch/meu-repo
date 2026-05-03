# 100_ECONOMICS_TRANSPARENCY_GATE_2026-05-03
Date: 2026-05-03
Status: ACTIVE
Role: executable guardrail for chat cost transparency, trial state, and billing self-service truth

## Why This Exists

Audit V12 called out that Aethel had real billing, wallet, budget, and usage foundations, but the user-facing AI loop still hid too much economic truth behind advanced panels. That creates two product risks:

- users cannot tell whether an agent wave is cheap, expensive, safe, or blocked,
- the business cannot defend paid plans if the product does not show why costly work is costly.

This gate keeps cost transparency compact and operational. It is not a finance dashboard in the chat. It is a small trust rail that lets users see run estimate, wallet, monthly budget pressure, and the current model before they launch or continue agent work.

## Product Contract

Aethel should expose economics in three layers:

1. `AIChatCostMeter`: always-visible, compact, one-line economics rail inside the chat.
2. `AIChatEconomicsPanel`: deeper wallet, hourly/daily/monthly budget, billing readiness, policy, and guidance.
3. Billing portal/API routes: factual subscription, invoice, payment method, and trial state for self-service.

This matches the product direction from `66_AI_OPERATIONAL_EXPERIENCE_BLUEPRINT_2026-03-24.md`: cost, risk, evidence, and approvals must be visible as compact rails, not long explanatory text.

## Current Enforced Surface

The gate verifies:

- `AIChatCostMeter` calls the real Studio cost live API.
- `AIChatPanelPro` renders the cost meter with `estimatedCost`, selected model name, running state, and economics handoff.
- the deeper `AIChatEconomicsPanel` remains available from the compact rail.
- `/api/auth/me` exposes factual trial state and days remaining.
- `/api/billing/portal` uses structured logging and typed Stripe config handling.
- `TrialBanner` remains short, factual, and free of corrupted copy.
- focused component tests cover live cost rendering and the economics handoff.
- product quality progress includes this gate.

## Executable Gate

Run:

```bash
npm run qa:economics-transparency
```

The broader product-progress gate now includes it:

```bash
npm run qa:product-quality-progress
```

## UX Rule

Cost transparency must stay visible but quiet:

- no large pricing copy in the primary chat loop,
- no fake green budget states when live cost cannot load,
- no hidden expensive agent waves,
- no forced billing detour before first value,
- no noisy finance dashboard unless the user opens economics details.

## Remaining Work

This gate closes the first user-facing economics gap. Still open:

1. token margin dashboard for admins,
2. per-agent cost attribution,
3. cost forecast before multi-agent web research,
4. trial-expiration email and notification cadence,
5. pricing simplification research around Free, Pro, Studio/Team, Enterprise.

## Verdict

Aethel now has a factual cost transparency rail inside the AI chat loop. This directly supports the market goal: a powerful multi-agent IDE that feels trustworthy instead of mysterious when agents spend tokens, use budgets, or need billing readiness.
