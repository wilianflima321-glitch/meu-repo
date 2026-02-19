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
| AI chat advanced | `app/api/ai/chat-advanced/route.ts` | `IMPLEMENTED` with explicit provider gates + quality controls | `501 NOT_IMPLEMENTED` on missing provider/model-provider mismatch; supports `qualityMode` + optional benchmark context |
| AI chat panel orchestration | `components/ide/AIChatPanelContainer.tsx` | `IMPLEMENTED/PARTIAL` | routes through `/api/ai/chat-advanced`; auto-selects `qualityMode`/`agentCount`; falls back to single-agent when plan gate blocks multi-agent |
| AI complete | `app/api/ai/complete/route.ts` | `NOT_IMPLEMENTED` when provider missing; otherwise active | response canonical `suggestion` + alias `text` |
| AI action | `app/api/ai/action/route.ts` | `NOT_IMPLEMENTED` when provider missing; otherwise active | `501 NOT_IMPLEMENTED` + capability metadata |
| AI inline edit | `app/api/ai/inline-edit/route.ts` | `NOT_IMPLEMENTED` when provider missing; otherwise active | `501 NOT_IMPLEMENTED` + capability metadata |
| AI inline completion (compat) | `app/api/ai/inline-completion/route.ts` | active compat surface | canonical `suggestion` + alias `text` |
| AI image generation | `app/api/ai/image/generate/route.ts` | `IMPLEMENTED/PARTIAL` | `503 PROVIDER_NOT_CONFIGURED` + capability metadata when requested provider is not configured |
| AI voice generation | `app/api/ai/voice/generate/route.ts` | `IMPLEMENTED/PARTIAL` | `503 PROVIDER_NOT_CONFIGURED` + capability metadata when requested provider is not configured |
| AI music generation | `app/api/ai/music/generate/route.ts` | `IMPLEMENTED/PARTIAL` | `503 PROVIDER_NOT_CONFIGURED` + capability metadata when requested provider is not configured |
| AI 3D generation | `app/api/ai/3d/generate/route.ts` | `IMPLEMENTED/PARTIAL` | `503 PROVIDER_NOT_CONFIGURED` + capability metadata when requested provider is not configured |
| AI deterministic validation | `app/api/ai/change/validate/route.ts` | `IMPLEMENTED` | returns `canApply`, `verdict`, `checks`, dependency impact |
| AI deterministic apply | `app/api/ai/change/apply/route.ts` | `IMPLEMENTED` | scoped apply with stale-context guard (`409`) + validation gate (`422`) + rollback token |
| AI deterministic rollback | `app/api/ai/change/rollback/route.ts` | `IMPLEMENTED/PARTIAL` | token-based restore with stale-context guard; partial for distributed multi-instance durability |
| Studio session start | `app/api/studio/session/start/route.ts` | `IMPLEMENTED` | creates mission session with quality mode + budget cap |
| Studio session get | `app/api/studio/session/[id]/route.ts` | `IMPLEMENTED` | returns aggregated session state |
| Studio session stop | `app/api/studio/session/[id]/stop/route.ts` | `IMPLEMENTED` | explicit lifecycle stop contract |
| Studio super plan | `app/api/studio/tasks/plan/route.ts` | `IMPLEMENTED/PARTIAL` | generates baseline plan task set; duplicate plan blocked by default (`409 PLAN_ALREADY_EXISTS`) unless `force=true` |
| Studio task run | `app/api/studio/tasks/[id]/run/route.ts` | `IMPLEMENTED/PARTIAL` | orchestration-only checkpoint run (`executionMode=orchestration_only`) with plan-limit gate + explicit `SESSION_NOT_ACTIVE` (`409`), `TASK_RUN_BLOCKED` (`422`), and `TASK_RUN_NOT_ALLOWED` (`422`) |
| Studio task validate | `app/api/studio/tasks/[id]/validate/route.ts` | `IMPLEMENTED/PARTIAL` | deterministic verdict (`passed` or `failed`) with explicit reviewer-only + readiness gates (`REVIEW_GATE_REQUIRED`, `VALIDATION_NOT_READY`) and inactive-session gate (`409 SESSION_NOT_ACTIVE`) |
| Studio task apply | `app/api/studio/tasks/[id]/apply/route.ts` | `IMPLEMENTED/PARTIAL` | blocked until validation pass (`422 VALIDATION_REQUIRED`), inactive-session gate (`409 SESSION_NOT_ACTIVE`), and replay guard (`409 APPLY_ALREADY_COMPLETED`) |
| Studio task rollback | `app/api/studio/tasks/[id]/rollback/route.ts` | `IMPLEMENTED/PARTIAL` | requires prior apply token/state, inactive-session gate (`409 SESSION_NOT_ACTIVE`), and explicit token mismatch gate (`409 ROLLBACK_TOKEN_MISMATCH`) |
| Studio live cost | `app/api/studio/cost/live/route.ts` | `IMPLEMENTED` | per-session cost summary + budget exceeded flag |
| Studio full access grant | `app/api/studio/access/full/route.ts` | `IMPLEMENTED/PARTIAL` | scoped 30-minute grant with trial/starter gate + inactive-session gate (`409 SESSION_NOT_ACTIVE`) |
| Studio full access revoke | `app/api/studio/access/full/[id]/route.ts` | `IMPLEMENTED` | explicit revoke contract |
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

## 3.1 Capability envelope contract (2026-02-17)
Mandatory fields for gated/unavailable capability responses:
1. `error`
2. `message`
3. `capability`
4. `capabilityStatus`
5. `metadata` (object, may be empty)
6. `milestone` (when applicable)

Headers (when applicable):
1. `x-aethel-capability`
2. `x-aethel-capability-status`
3. `x-aethel-meta-*` (metadata projection for operational tooling)

Validation status:
1. `qa:route-contracts` PASS
2. `qa:no-fake-success` PASS
3. `qa:critical-rate-limit` enforces rate-limit presence on critical abuse-prone routes (`auth` including `2fa setup/verify/validate/disable/backup-codes/status`, `ai core` including `query/stream`, `billing` including `plans/portal/subscription/usage/credits/webhook`, `wallet` + `usage/status`, admin finance/security read-write surfaces, `studio session start`, `studio task mutation routes`, and `studio control-plane routes`).
4. `qa:no-fake-success` also enforces:
- `PAYMENT_GATEWAY_NOT_IMPLEMENTED -> 501`
- `AUTH_NOT_CONFIGURED -> 503`
- `QUEUE_BACKEND_UNAVAILABLE -> 503`
5. `AI_CHANGE_APPLY` and `AI_CHANGE_ROLLBACK` blocked states now use capability envelope helper, including `x-aethel-capability*` headers.
6. Studio route contracts include blocked/inactive-edge checks (`checks=32`).
7. Studio task gating routes now use shared capability envelope helper for header parity (`x-aethel-capability*`).
8. Route contract scanner now includes `/api/auth/2fa` aggregate deprecation contract and explicit gate checks for `/api/ai/query` and `/api/ai/stream`.
9. Critical rate-limit scanner now includes canonical + compatibility file routes to enforce abuse protection on file authority surface.
10. Critical rate-limit scanner now also includes billing lifecycle, wallet, usage status, and admin payments/security endpoints.

## 3.2 Build/runtime reliability note (2026-02-17)
1. Local config now sanitizes invalid Next IPC env keys to reduce ambiguous build/runtime IPC behavior.
2. Current local baseline: `npm run build` passes; residual warning remains from Next internal IPC revalidate URL (`localhost:undefined`) and is tracked separately as non-blocking runtime noise.
3. This does not relax API capability/error contracts in this matrix.
4. Rollback token snapshots are now persisted in local runtime temp storage + memory cache with TTL; still not cross-instance durable in distributed deployments.

## 4) Promotion criteria (P1+)
1. Promote `PARTIAL` to `IMPLEMENTED` only after:
- operational test evidence;
- stable error contract under failure modes;
- explicit cost/latency envelope in admin/runtime telemetry.

## 5) Notes
1. This matrix is contract-aligned with `10`, `13`, `14`, `15`, and `16`.
2. If any endpoint behavior changes, this matrix must be updated in the same wave.
