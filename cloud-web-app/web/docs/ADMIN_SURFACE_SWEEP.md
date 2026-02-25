# Admin Surface Sweep

- Generated at: `2026-02-25T00:03:46.422Z`
- Files scanned: `45`
- Missing `AdminPageShell`: `0`
- Direct `fetch(...)` without `adminJsonFetch`: `0`
- Mojibake candidates: `0`

## Detailed Matrix

| File | Missing shell | Missing admin auth fetch | Missing table state row | Missing status banner | Mojibake candidate |
| --- | --- | --- | --- | --- | --- |
| `app/admin/ai/page.tsx` | no | no | no | no | no |
| `app/admin/ai-agents/page.tsx` | no | no | no | no | no |
| `app/admin/ai-enhancements/page.tsx` | no | no | no | no | no |
| `app/admin/ai-monitor/page.tsx` | no | no | no | no | no |
| `app/admin/ai-training/page.tsx` | no | no | no | no | no |
| `app/admin/ai-upgrades/page.tsx` | no | no | no | no | no |
| `app/admin/analytics/page.tsx` | no | no | no | no | no |
| `app/admin/apis/page.tsx` | no | no | no | no | no |
| `app/admin/arpu-churn/page.tsx` | no | no | no | no | no |
| `app/admin/audit-logs/page.tsx` | no | no | no | no | no |
| `app/admin/automation/page.tsx` | no | no | no | no | no |
| `app/admin/backup/page.tsx` | no | no | no | no | no |
| `app/admin/bias-detection/page.tsx` | no | no | no | no | no |
| `app/admin/chat/page.tsx` | no | no | no | no | no |
| `app/admin/collaboration/page.tsx` | no | no | no | no | no |
| `app/admin/compliance/page.tsx` | no | no | no | no | no |
| `app/admin/cost-optimization/page.tsx` | no | no | no | no | no |
| `app/admin/deploy/page.tsx` | no | no | no | no | no |
| `app/admin/emergency/page.tsx` | no | no | no | no | no |
| `app/admin/feature-flags/page.tsx` | no | no | no | no | no |
| `app/admin/feedback/page.tsx` | no | no | no | no | no |
| `app/admin/finance/page.tsx` | no | no | no | no | no |
| `app/admin/fine-tuning/page.tsx` | no | no | no | no | no |
| `app/admin/god-view/page.tsx` | no | no | no | no | no |
| `app/admin/ide-settings/page.tsx` | no | no | no | no | no |
| `app/admin/indexing/page.tsx` | no | no | no | no | no |
| `app/admin/infrastructure/page.tsx` | no | no | no | no | no |
| `app/admin/ip-registry/page.tsx` | no | no | no | no | no |
| `app/admin/marketplace/page.tsx` | no | no | no | no | no |
| `app/admin/moderation/page.tsx` | no | no | no | no | no |
| `app/admin/multi-tenancy/page.tsx` | no | no | no | no | no |
| `app/admin/notifications/page.tsx` | no | no | no | no | no |
| `app/admin/onboarding/page.tsx` | no | no | no | no | no |
| `app/admin/page.tsx` | no | no | no | no | no |
| `app/admin/payments/page.tsx` | no | no | no | no | no |
| `app/admin/promotions/page.tsx` | no | no | no | no | no |
| `app/admin/rate-limiting/page.tsx` | no | no | no | no | no |
| `app/admin/real-time/page.tsx` | no | no | no | no | no |
| `app/admin/roles/page.tsx` | no | no | no | no | no |
| `app/admin/scalability/page.tsx` | no | no | no | no | no |
| `app/admin/security/page.tsx` | no | no | no | no | no |
| `app/admin/subscriptions/page.tsx` | no | no | no | no | no |
| `app/admin/support/page.tsx` | no | no | no | no | no |
| `app/admin/updates/page.tsx` | no | no | no | no | no |
| `app/admin/users/page.tsx` | no | no | no | no | no |

## Policy

- Critical admin surfaces should converge to `AdminPageShell` + `adminJsonFetch` + explicit state rows.
- Pages marked as mojibake candidates must be reviewed and normalized before freeze.
- This report is advisory and does not block CI by default.

