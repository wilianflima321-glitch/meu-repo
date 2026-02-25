# 34_WEB_VS_LOCAL_STUDIO_EXECUTION_MODEL_2026-02-22
Status: DECISION-COMPLETE EXECUTION MODEL (NO OVERCLAIM)
Date: 2026-02-22
Owner: Arquiteto-Chefe + Infra Lead + Frontend IDE Lead + AAA Analyst

## 0) Objective
1. Define clear separation between Web Studio and Local Studio execution.
2. Keep one product, one workflow (`/dashboard` -> `/ide`), two runtime targets.
3. Avoid overclaim: current production target is Web; Local is planned/hybrid.

## 1) Current factual state
1. Web target is active and canonical.
2. Local target is planned and now explicit in UI as execution profile.
3. Current contracts and capability gates remain unchanged.

## 2) Runtime model (factual and target)
| Dimension | Web Studio (current) | Local Studio (target) | Gap to close |
|---|---|---|---|
| Entry UX | `/dashboard` | same | none |
| Advanced shell | `/ide` | same | none |
| File operations | `/api/files/*` | local bridge + same contract | local bridge |
| Preview runtime | browser sandbox | browser + native acceleration path | native adapter |
| Build/export | cloud controlled | local/hybrid pipeline | local build worker |
| AI orchestration | cloud session | cloud + local tool execution | safe local tool runner |
| Cost control | usage entitlement + budget caps | same + device-aware policy | dual metering policy |
| Security boundary | server-side controls | server + local capability sandbox | local permission model |
| Performance ceiling | browser/GPU limits | user hardware dependent | compatibility matrix |
| Offline tolerance | partial | stronger with local cache/worker | offline sync design |
| Debug depth | web constraints | deeper host-level tooling | debug adapter integration |
| Media heavy workloads | partial/gated | better potential on high-end devices | deterministic fallback rules |

## 3) Product policy lock
1. Web remains primary production path.
2. Local does not bypass capability contracts.
3. Any local-only feature must expose fallback/gate in web mode.
4. No claim of Unreal desktop parity until objective benchmarks are published.

## 4) Engineering closure plan for local target
## L0 - Contract foundation
1. Keep unified query/session contract in `/dashboard` and `/ide`.
2. Introduce runtime target metadata in status/ops surfaces (done in this wave).

## L1 - Local bridge
1. Add file/terminal bridge with same API semantics used in web.
2. Add strict permission scopes per project/session.

## L2 - Build/preview acceleration
1. Add optional local build worker for heavy jobs.
2. Add controlled native acceleration path for media/3D preview.

## L3 - Reliability and safety
1. Add local sandbox audit logs.
2. Add policy-based hard stop for unsafe/high-cost operations.

## L4 - Promotion gate
1. Publish benchmark matrix (`web vs local`) across representative workloads.
2. Promote local claim only after reproducible pass criteria.

## 5) Acceptance criteria for “studio-grade dual target”
1. Same mission and handoff flow works in both targets.
2. Capability envelopes remain explicit across targets.
3. No silent behavior drift between web and local for core tasks.
4. Cost and entitlement behavior remains deterministic in both targets.
5. Benchmarks and limits are documented before promotion claims.

## 6) Explicit non-claims
1. “Local target already complete and production-ready.”
2. “Web and local have identical unlimited performance.”
3. “AAA parity with desktop tools is already achieved.”
