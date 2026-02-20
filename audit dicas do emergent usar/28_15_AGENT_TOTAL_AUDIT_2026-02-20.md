# 28_15_AGENT_TOTAL_AUDIT_2026-02-20
Status: DECISION-COMPLETE EXECUTION TRIAGE  
Date: 2026-02-20  
Owner: 15-Agent Internal Orchestration (Product + Platform + Critical)

## 1. Mission
Close real gaps with zero scope expansion, keeping:
1. `/dashboard` as entry UX.
2. `/ide` as advanced shell.
3. Explicit capability/deprecation contracts.
4. Anti-fake-success in all critical journeys.

## 2. Factual baseline used in this audit
1. Repository connectivity sweep (`25`):
- `requiredMissing=0`
- `optionalMissing=0`
- `deadScriptReferences=0`
- `markdownTotal=3634`
- `markdownCanonical=32`
- `markdownHistorical=3602`
2. Workflow governance sweep (`26`):
- `totalWorkflows=14`
- `activeAuthority=5`
- `legacyCandidate=1`
- `staleTriggerPaths=0`
- `issues=0`
3. Secret hygiene sweep (`27`):
- `findings=0`
4. Canonical doc governance sweep (`29`):
- `missingListedCanonicalDocs=0`
- `canonicalNameConflictsOutside=0`
- `unindexedCanonicalMarkdown=3` (informational)
5. Interface critical sweep (`cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`):
- `legacy-accent-tokens=0`
- `admin-light-theme-tokens=0`
- `admin-status-light-tokens=0`
- `blocking-browser-dialogs=0`
- `not-implemented-ui=6`
- `not-implemented-noncritical=2`
6. Architecture critical triage (`cloud-web-app/web/docs/ARCHITECTURE_CRITICAL_TRIAGE.md`):
- `oversizedFiles>=1200 = 0`
- `duplicateBasenames = 0`
- `apiNotImplementedMarkers = 8`
- `fileApiCompatibilityWrappers = 8`

## 3. What is strong (keep unchanged)
1. Governance gates are now materially reliable (connectivity/workflow/secret scan all green).
2. Studio Home and IDE are both modularized enough to keep iterating without monolith regressions.
3. Critical visual drift metrics are at zero.
4. Capability/deprecation contracts are explicit and machine-readable in critical APIs.

## 4. What is still weak (real residual risk)
1. Canonical-vs-historical markdown volume remains high (`3602` historical files), increasing decision noise risk.
2. `NOT_IMPLEMENTED` remains visible in API surface (`8`) and must stay hard-gated in UX to avoid false expectations.
3. `8` compatibility wrappers in `/api/files/*` remain intentional debt and need telemetry-driven cutoff planning.
4. One workflow is still `LEGACY_CANDIDATE` (`merge-unrelated-histories.yml`) and needs final owner decision.
5. `/ide` route orchestration is still a large convergence point; it is better now but remains a high-change file.
6. Three markdown files inside canonical folder remain intentionally unindexed (`00`, `11`, `12`) and require explicit archival/indexing decision.

## 5. 15-agent execution board (owner-locked)
| Agent | Current verdict | Mandatory next action |
|---|---|---|
| Arquiteto-Chefe | PARTIAL | Publish module-boundary map with explicit allowed imports between `studio/ide/admin/api` |
| Eng. Chefe Plataforma | IMPLEMENTED | Keep connectivity scan mandatory and block new broken script chains |
| PM Tecnico | PARTIAL | Keep `10/13/14/17/18/20/22/28` synchronized in every wave |
| Designer Principal | PARTIAL | Close remaining critical-journey copy/state ambiguity in Studio Home and `/ide` |
| UX Lead | PARTIAL | Enforce one canonical empty/error/loading language set for Home+IDE+Admin |
| Frontend Lead IDE | PARTIAL | Continue splitting orchestration helpers from `app/ide/page.tsx` without behavior drift |
| Frontend Lead Studio Home | PARTIAL | Keep CTA policy strict for gated features (no clickable dead-end actions) |
| Backend Lead API | PARTIAL | Time-box compatibility wrappers and publish wrapper-level usage trend |
| Arquiteto IA | PARTIAL | Lock L1-L3 claim table with route-level evidence; block L4/L5 marketing drift |
| Infra/Performance Lead | PARTIAL | Add objective session SLOs for latency and long-session stability |
| Security Lead | PARTIAL | Keep hard gates and ensure endpoint-level abuse controls remain non-regressive |
| Billing/Entitlement Lead | PARTIAL | Finalize dual entitlement behavior under credit-zero with explicit user messaging |
| Colab/DX Lead | PARTIAL | Publish real-time readiness matrix (`IMPLEMENTED/PARTIAL/NOT_IMPLEMENTED`) with limits |
| Competitive Intel | PARTIAL | Keep benchmark absorption factual (`EXTERNAL_BENCHMARK_ASSUMPTION` when not internal) |
| AAA Analyst | PARTIAL | Maintain web-runtime limits in claims for games/films/apps and avoid parity overpromise |

## 6. P0 closure set (no scope expansion)
1. Finalize `/ide` modular decomposition already started:
- `WorkbenchDialogs.tsx`
- `workbench-utils.tsx`
- `workbench-context.ts`
- `WorkbenchPanels.tsx`
- `WorkbenchContextBanner.tsx`
2. Preserve zero-regression governance baseline in `25/26/27`.
3. Keep `NOT_IMPLEMENTED` surfaces explicit and non-clickable in critical UX paths.
4. Keep `/dashboard -> /ide` handoff deterministic with `projectId`, `file`, `entry`, `sessionId`, `taskId`.
5. Keep first-minute `/ide` usability explicit (actionable empty state + status clarity) for non-expert users.

## 7. P1 residual backlog (frozen for next wave)
1. Compatibility wrapper reduction strategy for `/api/files/*` (usage-based, non-breaking).
2. Legacy workflow owner decision (`merge-unrelated-histories.yml`: restrict or archive).
3. Historical markdown archival policy to reduce operational ambiguity.
4. Collaboration readiness SLOs and stress criteria publication.
5. Cost telemetry normalization across Studio Home live runs (agent/tool granularity).

## 8. Claims policy (hard lock)
1. Do not claim full studio parity with desktop engines/tools.
2. Do not claim L4/L5 IA readiness without reproducible production evidence.
3. Do not claim enterprise real-time collaboration readiness without SLO-backed load evidence.

## 9. Acceptance criteria for this audit package
1. All referenced scanners/reports are green and timestamped.
2. Canonical docs reflect current numbers without contradiction.
3. Critical journey remains usable even when capability is gated.
4. No fake-success path in API or UI.
