# 17_CAPABILITY_ENDPOINT_MATRIX_2026-02-16
Status: EXECUTION MATRIX  
Date: 2026-02-16  
Scope: capability truth map for P0 reliability

## 1) Objective
Provide a single factual map of capability status for high-impact APIs and runtime surfaces used by `/ide`.

## 2) Capability matrix (current implementation)
| Surface | Endpoint/File | Status | Contract |
|---|---|---|---|
| AI chat | `app/api/ai/chat/route.ts` | `NOT_IMPLEMENTED` when provider missing; otherwise active | `501 NOT_IMPLEMENTED` + capability metadata |
| AI complete | `app/api/ai/complete/route.ts` | `NOT_IMPLEMENTED` when provider missing; otherwise active | response canonical `suggestion` + alias `text` |
| AI action | `app/api/ai/action/route.ts` | `NOT_IMPLEMENTED` when provider missing; otherwise active | `501 NOT_IMPLEMENTED` + capability metadata |
| AI inline edit | `app/api/ai/inline-edit/route.ts` | `NOT_IMPLEMENTED` when provider missing; otherwise active | `501 NOT_IMPLEMENTED` + capability metadata |
| AI inline completion (compat) | `app/api/ai/inline-completion/route.ts` | active compat surface | canonical `suggestion` + alias `text` |
| AI deterministic validation | `app/api/ai/change/validate/route.ts` | `IMPLEMENTED` | returns `canApply`, `verdict`, `checks`, dependency impact |
| Render cancel | `app/api/render/jobs/[jobId]/cancel/route.ts` | `NOT_IMPLEMENTED` | explicit capability gate with metadata |
| Billing checkout (non-stripe) | `app/api/billing/checkout/route.ts` | `NOT_IMPLEMENTED` branch | `PAYMENT_GATEWAY_NOT_IMPLEMENTED` with capability metadata |
| File tree | `app/api/files/tree/route.ts` | `IMPLEMENTED` | canonical file authority |
| File fs | `app/api/files/fs/route.ts` | `IMPLEMENTED` | canonical file authority |
| Legacy workspace routes | `app/api/workspace/*` | `DEPRECATED` | `410 DEPRECATED_ROUTE` + cycle metadata |
| Legacy auth sessions | `app/api/auth/sessions*` | `DEPRECATED` | `410 DEPRECATED_ROUTE` + cycle metadata |
| Asset upload validation | `app/api/assets/upload/route.ts` + `lib/server/asset-processor.ts` | `IMPLEMENTED/PARTIAL` by class | explicit validation + warnings + capabilityStatus |

## 3) P0 guardrails (locked)
1. Any unavailable capability must expose explicit machine-readable status.
2. No capability may claim success if runtime/provider/pipeline is absent.
3. UI must not expose CTA for gated capability in critical user journeys.

## 4) Promotion criteria (P1+)
1. Promote `PARTIAL` to `IMPLEMENTED` only after:
- operational test evidence;
- stable error contract under failure modes;
- explicit cost/latency envelope in admin/runtime telemetry.

## 5) Notes
1. This matrix is contract-aligned with `10`, `13`, `14`, `15`, and `16`.
2. If any endpoint behavior changes, this matrix must be updated in the same wave.
