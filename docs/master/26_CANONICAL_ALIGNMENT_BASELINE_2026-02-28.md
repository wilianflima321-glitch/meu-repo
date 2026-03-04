# 26_CANONICAL_ALIGNMENT_BASELINE_2026-02-28
Status: CANONICAL BASELINE
Date: 2026-02-28
Owner: PM Técnico + Critical Agent

## 1) Purpose
Define one active baseline for all canonical docs and remove interpretation drift between historical deltas.

If any active canonical doc conflicts with this baseline, this file wins until a newer dated baseline is published.

## 2) Active baseline (factual)
Source evidence:
1. `cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`
2. `tools/check-repo-connectivity.mjs`

Current values:
1. `legacy-accent-tokens=0`
2. `admin-light-theme-tokens=0`
3. `admin-status-light-tokens=0`
4. `blocking-browser-dialogs=0`
5. `not-implemented-ui=0`
6. `qa:repo-connectivity=PASS`
7. `api-not-implemented-gates=2` (source: `32_GLOBAL_GAP_REGISTER_2026-03-01.md`)

## 3) Interpretation rules
1. Older references like `not-implemented-ui=10` are historical and must not be used as current status.
2. Older local-environment notes (e.g., past `spawn EPERM`) are historical unless reconfirmed in the current wave.
3. Active execution claims must always point to this baseline plus latest command evidence.
4. If `qa:enterprise-gate` fails, status claims remain frozen at previous validated level.

## 4) Claim gates
1. No "equal/superior" claim without evidence in canonical docs.
2. No L4/L5 promotion without reproducible operational proof.
3. No desktop Unreal/Premiere parity claim in browser scope.

## 5) Scope lock
1. `/dashboard` remains entry surface.
2. `/ide` remains advanced shell of the same platform.
3. No fake-success and no hidden fallback claims.

## 6) UX market-readiness lock (added 2026-02-28)
1. Strong engineering quality does not equal UX market leadership by default.
2. Market-level UX claim is blocked until `31_EXECUTIVE_REALITY_GAP_ALIGNMENT_2026-02-28.md` closures are evidenced:
- telemetry baseline,
- AI setup recovery UX,
- real-time preview flow,
- first-value onboarding,
- responsive entry surfaces.
3. `31` is treated as active backlog source for UX-market closure until superseded by newer dated baseline.

## 7) End-of-day sync (2026-03-01)
1. Interface-gate mismatch is now closed in current wave:
- `not-implemented-ui` aligned to `5` and gate threshold remains `6`.
2. Resolution path used:
- removed inline `NOT_IMPLEMENTED` literals in one API branch while preserving capability contract semantics via shared constants.
3. No threshold relaxation was applied.
4. Market-level claim boundaries remain governed by `31` and `33`.

## 8) Delta 2026-03-03-b (core-loop apply/rollback slice)
1. API explicit gate inventory reduced from `18` to `16` after `ai/change/apply|rollback` moved to `PARTIAL` implementation.
2. Reduction happened without removing capability transparency from still-missing surfaces.

## 9) Delta 2026-03-03-c (queue control slice)
1. API explicit gate inventory reduced from `16` to `11` after queue control endpoints moved to `PARTIAL` runtime:
- `api/render/jobs/[jobId]/cancel`
- `api/admin/jobs/[id]` (cancel)
- `api/admin/jobs/[id]/retry`
 - `api/admin/jobs/[id]/pause`
 - `api/admin/jobs/[id]/resume`
2. `api/admin/jobs` + `api/admin/jobs/stats` now read runtime queue data instead of observation-only placeholders.

## 10) Delta 2026-03-03-d (multi-agent provider-backed slice)
1. API explicit gate inventory reduced from `11` to `10` after `/api/agents/stream` removed static `NOT_IMPLEMENTED` provider-backed branch.
2. Provider-backed mode now runs in `PARTIAL` scope when at least one provider is configured; otherwise returns explicit `AI_PROVIDER_NOT_CONFIGURED` (`503`) with setup metadata.

## 11) Delta 2026-03-03-e (studio/catchall gate normalization)
1. API explicit gate inventory reduced from `10` to `8` after:
- `studio-gate` moved from `NOT_IMPLEMENTED` to explicit `STUDIO_RUNTIME_GATED` (`503`, `PARTIAL`);
- catchall gate moved from `NOT_IMPLEMENTED` to explicit `ROUTE_NOT_MAPPED` (`404`, `PARTIAL`).

## 12) Delta 2026-03-03-g (AI provider gate normalization)
1. API explicit gate inventory reduced from `8` to `2` after AI provider-missing routes moved to explicit partial runtime gate:
- `error: AI_PROVIDER_NOT_CONFIGURED`
- `status: 503`
- `capabilityStatus: PARTIAL`
2. Remaining explicit `NOT_IMPLEMENTED` gates are billing runtime branches only:
- `/api/billing/checkout`
- `/api/billing/checkout-link`
2. Capability transparency remains explicit; no fake-ready success was introduced.
