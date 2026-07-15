# MARKETING_CLAIMS_AUDIT.md

Generated: Block 6H.10 (2026-07-11)

## Policy

- Never claim **unlimited AI** on any plan.
- Quota exhaustion → calm 402 / AiQuotaModal; IDE stays open.
- Starter = Fast AI only; Pro/Studio = dual Fast + Premium pools.

## Scan notes (manual + code)

| Claim / surface | Status | Action |
|-----------------|--------|--------|
| LowBalanceModal “unlimited credits” | **Fixed 6H** | Replaced with pools / credits / PAYG honesty |
| Pricing FAQ | **Updated 6H.5** | Explicit “no unlimited AI” |
| `formatAiPools` Starter | **Updated** | “Fast AI only” |
| AiQuotaModal | **Shipped** | Never “suspended” / “banned” |

## Findings remaining

- none known after 6H.10 pass (re-run automated scanner in CI when available).
