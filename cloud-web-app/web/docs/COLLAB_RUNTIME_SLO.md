# Collaboration Runtime SLO (P1 Readiness Gate)

## Scope
Applies to collaborative editing and presence paths that use:
1. Yjs document sync
2. WebSocket transport (`/api/multiplayer/*`)
3. shared editor/session state in `/ide`

## Current readiness status
1. `IMPLEMENTED`: baseline sync plumbing and presence signals.
2. `PARTIAL`: reconnect/concurrency guarantees under sustained load.
3. `NOT_IMPLEMENTED`: production claim for enterprise-grade collaborative debugging.

## Minimum SLO targets (promotion gate)
1. `Availability`: 99.5% for collaboration session join/sync endpoints.
2. `Latency`: P95 <= 250ms for remote cursor/update propagation (same region).
3. `Reconnect`: successful state resume <= 5s after transient disconnect.
4. `Conflict safety`: zero data loss in concurrent edit conflict harness.
5. `Error budget`: collaboration transport error rate <= 1% per 30min session.

## Required evidence before claim upgrade
1. Synthetic concurrency tests with at least 10 concurrent editors.
2. Reconnect tests with forced socket interruption and state verification.
3. Conflict replay tests proving deterministic merge/no-loss behavior.
4. Audit logs for join/leave/reconnect/error events.
5. Evidence events persisted via:
- `POST /api/admin/collaboration/evidence` (audit trail),
- `POST /api/admin/collaboration/evidence/stress-proof` (external stress report attachment),
- `GET /api/admin/collaboration/readiness` (aggregated readiness view + latest evidence history).

## Failure policy
1. If SLO is not met, collaboration claim stays `PARTIAL`.
2. If transport unavailable, expose explicit gate and degrade to single-user editing.
3. No "real-time ready" marketing claim without reproducible evidence bundle.
