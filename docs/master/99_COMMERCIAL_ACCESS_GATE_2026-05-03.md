# 99_COMMERCIAL_ACCESS_GATE_2026-05-03
Date: 2026-05-03
Status: ACTIVE
Role: executable guardrail for Free tier, 14-day trial, and non-fake commercial access

## Why This Exists

Audit V12 called out a commercial contradiction: Aethel had pricing, Stripe routes, billing UI, and a strong product funnel, but no factual Free entry and no reliable 14-day trial contract. That means the public CTA could look modern while the real user journey still behaved like a hard paywall.

This gate converts that critique into code-level evidence. The goal is not to make everything free. The goal is to let a new user reach first value without a card while keeping advanced, costly, collaborative, and commercial operations behind explicit plan gates.

## Product Contract

Aethel now treats commercial access as progressive:

1. `Free tier`: no card required, useful enough for first value, intentionally limited.
2. `Starter trial`: 14-day Starter trial at registration for users who create an account.
3. `Paid plans`: unlock deploy, collaboration, marketplace, extensions, deeper runtime, and larger limits.
4. `Enterprise`: remains the path for SSO, audit logs, SLA, and assisted rollout.

The user should never see a fake green success that later disappears behind an unexplained paywall. If a trial expires, the system falls back to Free instead of blocking the core Studio shell.

## Current Enforced Limits

Free is deliberately smaller than paid plans:

- `100K` AI tokens per month in canonical plans.
- `10` lightweight projects.
- `250 MB` storage.
- `1` concurrent session.
- Free OpenRouter models only.
- Core `chat + editor + preview` loop only.
- Deploy, collaboration, marketplace, and extensions require upgrade.

The 14-day registration trial is stored as `trialEndsAt` so the trial is auditable, not inferred from vague copy.

## Executable Gate

Run:

```bash
npm run qa:commercial-access
```

The gate verifies:

- canonical `free` plan exists in `cloud-web-app/web/lib/plans.ts`,
- runtime quotas understand `free`,
- registration creates `trialEndsAt` for a 14-day Starter trial,
- entitlements fall back to Free instead of throwing `PAYMENT_REQUIRED` for core access,
- billing usage normalizes `starter_trial` and unknown plans through `getPlanById`,
- asset intake/source policies understand Free as a stricter trust lane,
- PremiumLock compares Free correctly,
- this document and product quality metrics remain wired.

## Design And UX Rule

Free/trial messaging must stay quiet and compact. It belongs in pricing cards, plan badges, usage meters, and upgrade modals. It must not pollute the mission-first entry screen with long plan explanations.

The best-market benchmark is v0/Replit/Cursor-style low-friction entry, but Aethel should improve it by making the limits honest and visible before costly operations.

## Remaining Work

This gate closes the factual contract, not the full monetization system. Still open:

1. Stripe Customer Portal self-service polish.
2. Trial-expiration email and in-app banner.
3. Cost meter in chat and agent runs.
4. Admin margin dashboard for AI token cost vs revenue.
5. Cleaner pricing tier simplification research: likely Free, Pro, Team/Studio, Enterprise.

## Verdict

Aethel now has a real commercial first-value path instead of a prose-only pricing promise. This makes the V12 distribution critique executable: users can start, trials are explicit, expired trials do not brick the core product, and paid-only capabilities remain properly gated.
