# 19_RUNTIME_ENV_WARNING_RUNBOOK_2026-02-17
Status: OPERATIONAL RUNBOOK
Date: 2026-02-17
Owner: Infra + Backend + Critical Agent

## 0. Scope
This runbook tracks known non-blocking runtime warnings and the minimum environment checklist required for predictable local/CI behavior.

This document does not change product scope.

## 1. Current Warning Inventory (Observed)
1. Missing Upstash variables:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
2. Docker unavailable fallback:
- sandbox/local runtime falls back to direct execution.
3. Next runtime noise during build finalization:
- `TypeError: Failed to parse URL from http://localhost:undefined?...revalidateTag...`

## 2. Risk Classification
1. Upstash missing vars:
- Risk: medium
- Impact: queue/cache-backed features may degrade to fallback paths
- Gate impact: none (currently non-blocking)
2. Docker missing:
- Risk: medium
- Impact: reduced execution isolation in local dev/sandbox modes
- Gate impact: none (fallback explicit)
3. `revalidateTag` invalid URL warning:
- Risk: medium
- Impact: build log noise and runtime uncertainty around internal incremental cache IPC
- Gate impact: none (build exits successfully)

## 3. Minimum Local Environment Checklist
1. Node and npm installed and aligned with project lockfile.
2. `JWT_SECRET` set for protected route validation.
3. Optional but recommended:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
4. Optional:
- Docker daemon available if container-backed execution is needed.
5. Proxy/cert configuration stable for git and external API calls.

## 4. CI Environment Checklist
1. Keep mandatory quality gates:
- `lint`
- `typecheck`
- `build`
- `qa:interface-gate`
- `qa:canonical-components`
- `qa:route-contracts`
- `qa:no-fake-success`
- `qa:mojibake`
- `qa:enterprise-gate`
2. Preserve explicit fallback behavior for optional infrastructure dependencies.
3. Do not silently bypass failing checks.

## 5. Mitigation Actions (No Scope Change)
1. Continue forcing runtime-sensitive ops routes to dynamic execution where needed.
2. Keep explicit capability/degradation responses (no fake success).
3. Track the `revalidateTag` warning as unresolved framework/runtime item until root cause is isolated without weakening gates.
4. Keep this runbook aligned with deltas in:
- `10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md`
- `13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13.md`
- `14_MULTI_AGENT_ENTERPRISE_TRIAGE_2026-02-13.md`

## 5.1 Upstash Operational Verification (P0 reliability)
Use admin diagnostics to verify real backend mode for the active limiter:
1. Call `GET /api/admin/rate-limits` as admin.
2. Inspect `diagnostics` payload:
- `hasUpstashConfig=true` means env is configured for distributed limiter.
- `configuredBackend=upstash` is expected in production.
- `runtime.memoryFallbackHits` must remain `0` in normal operation.
3. If `memoryFallbackHits > 0`, investigate network/auth to Upstash and treat as reliability incident.
4. Record result in contract delta (`10`) with timestamp and environment.

## 6. Exit Criteria for Closing This Runbook
1. No unresolved runtime warning in build logs for `revalidateTag` invalid URL path.
2. Environment prerequisites documented and reproducible for local + CI.
3. No regression in explicit capability/error contracts.
