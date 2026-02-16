# AI Runtime SLO (P0/P1)

## Scope
Applies to:
- `/api/ai/chat`
- `/api/ai/complete`
- `/api/ai/action`
- `/api/ai/inline-edit`
- `/api/ai/inline-completion`
- `/api/ai/change/validate`

## Required telemetry dimensions
1. `latencyMs` by endpoint.
2. `tokensUsed` (where generation occurs).
3. `error.code` frequency (`NOT_IMPLEMENTED`, `RATE_LIMIT`, `AI_ERROR`, etc.).
4. `capabilityStatus` distribution (`IMPLEMENTED`, `PARTIAL`, `NOT_IMPLEMENTED`).

## Minimum SLO targets (release gate)
1. `AI_CHANGE_VALIDATE` availability >= 99.5% (excluding auth failures).
2. P95 latency:
- inline completion <= 900ms (provider configured).
- chat/action/inline-edit <= 3500ms (provider configured).
3. Capability-truth compliance:
- 100% of unavailable capability responses include explicit capability metadata.

## Failure policy
1. If provider is not configured:
- return `501 NOT_IMPLEMENTED` (never fallback with fake content).
2. If validation fails:
- block apply and return deterministic checks.
3. If endpoint contract regresses:
- block release via `qa:route-contracts`.
