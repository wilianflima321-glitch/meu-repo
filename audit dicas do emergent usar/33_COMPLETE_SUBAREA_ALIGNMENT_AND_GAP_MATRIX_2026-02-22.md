# 33_COMPLETE_SUBAREA_ALIGNMENT_AND_GAP_MATRIX_2026-02-22
Status: DECISION-COMPLETE SUBAREA MATRIX (NO SCOPE EXPANSION)
Date: 2026-02-22
Owner: PM Tecnico + Arquiteto-Chefe + 15-Agent Board

## 0) Scope lock
1. Keep Studio Home entry in `/dashboard` and advanced execution in `/ide`.
2. Keep explicit capability contracts and anti-fake-success policy.
3. Keep phased deprecation policy for legacy endpoints.
4. Do not claim desktop parity, L4/L5 maturity, or enterprise collaboration maturity without evidence.

## 1) Factual baseline used by this matrix
Evidence commands executed in this round:
1. `node cloud-web-app/web/scripts/interface-critical-scan.mjs`
2. `node cloud-web-app/web/scripts/architecture-critical-scan.mjs`
3. `node cloud-web-app/web/scripts/admin-surface-scan.mjs`
4. `node cloud-web-app/web/scripts/scan-mojibake.mjs`
5. `node cloud-web-app/web/scripts/generate-routes-inventory.mjs`
6. `node cloud-web-app/web/scripts/check-route-contracts.mjs`
7. `node cloud-web-app/web/scripts/check-no-fake-success.mjs`
8. `node tools/repo-connectivity-scan.mjs`
9. `node tools/workflow-governance-scan.mjs`
10. `node tools/canonical-doc-governance-scan.mjs`
11. `node tools/critical-secret-scan.mjs`

Current factual metrics:
1. Interface critical (`cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`)
- `legacy-accent-tokens=0`
- `admin-light-theme-tokens=0`
- `admin-status-light-tokens=0`
- `blocking-browser-dialogs=0`
- `not-implemented-ui=6`
- `not-implemented-noncritical=2`
- `frontend-workspace-route-usage=0`
- `legacy-editor-shell-usage=0`
2. Architecture (`cloud-web-app/web/docs/ARCHITECTURE_CRITICAL_TRIAGE.md`)
- `apiRoutes=246`
- `apiNotImplemented=8`
- `fileCompatWrappers=8`
- `nearLimitFiles=37`
- `oversizedFiles=0`
3. Routes (`cloud-web-app/web/docs/ROUTES_INVENTORY.md`)
- `totalRoutes=72`
- `adminRoutes=45`
- `NOT_IMPLEMENTED total=10` (`critical=8`, `noncritical=2`)
4. Governance and security (`25`, `26`, `27`, `29`)
- connectivity: `requiredMissing=0`, `deadScriptReferences=0`
- workflows: `issues=0`
- canonical docs: `missingListedCanonicalDocs=0`
- secret scan: `findings=0`

## 2) Full subarea matrix (what is aligned, what is missing)
Status semantics:
1. `IMPLEMENTED`: evidence exists and behavior is in current runtime contract.
2. `PARTIAL`: capability exists but has important gaps or explicit gates.
3. `NOT_IMPLEMENTED`: explicit contractual gate or missing subsystem.
4. `UNVERIFIED`: code exists but operational evidence is not yet promoted.

### 2.1 Product and UX
| Subarea | Status | Current factual state | Main gap | Main limitation | Priority | Owner |
|---|---|---|---|---|---|---|
| Entry journey | PARTIAL | `/dashboard` exists as Studio Home entry | high-density flow still depends on clear guided mission templates | high cognitive load for first-time users | P0 | Product + UX Lead |
| Advanced journey | IMPLEMENTED | `/ide` is stable advanced shell with query contract | N/A | N/A | P0 keep | Frontend IDE Lead |
| Real vs promised flows | PARTIAL | canonical docs define claim boundaries | historical docs volume can still confuse decisions | documentation drift risk | P0 | PM Tecnico |
| Broken journey prevention | PARTIAL | explicit gates and no fake success checks are active | some gated capabilities still visible in adjacent flows | user expectation mismatch if copy is weak | P0 | UX Lead |
| Duplicate path control | IMPLEMENTED | deprecated shell/workspace route usage scans at zero | wrappers and legacy routes still exist by policy | transitional complexity | P1 | Backend Lead |
| Empty/error/loading consistency | PARTIAL | scanner coverage and admin sweep are green | not all surfaces have unified wording and action hints | copy fragmentation over time | P1 | UX Lead |
| Keyboard-first behavior | PARTIAL | policy exists in canonical docs | full scenario evidence for all critical blocks is incomplete | regression risk without focused tests | P1 | Frontend + QA |
| Focus visibility | PARTIAL | no high-severity visual drift markers | complete accessibility evidence set not yet promoted | requires scenario-level validation | P1 | UX Lead |
| Capability gate UX | IMPLEMENTED | blocked capabilities are explicit (`NOT_IMPLEMENTED`, `DEPRECATED_ROUTE`) | clarity of next-best action can improve | unavoidable functional gaps remain | P0 keep | Product + Backend |
| Handoff dashboard -> ide | PARTIAL | contract supports context params | deterministic context continuity still needs more scenario evidence | session recovery complexity | P0 | Frontend Studio + IDE |

### 2.2 Frontend and IDE
| Subarea | Status | Current factual state | Main gap | Main limitation | Priority | Owner |
|---|---|---|---|---|---|---|
| Editor core | IMPLEMENTED | Monaco-based editing surfaces are present and active | N/A | N/A | P0 keep | Frontend IDE |
| Tabs/splits/docking | PARTIAL | IDE layout supports multi-panel workflows | large orchestrator files still near-limit in several modules | maintainability risk | P1 | Frontend IDE |
| Explorer/assets | PARTIAL | file API usage is canonical (`/api/files/*`) | wrapper debt still present (`fileCompatWrappers=8`) | phased migration requirement | P1 | Backend + Frontend |
| Interactive preview | PARTIAL | preview panel supports runtime types and explicit gates | unsupported types still gated by design | browser runtime constraints | P0/P1 | Frontend |
| 2D/3D viewport | PARTIAL | engine/graphics subsystems exist in codebase | studio-grade parity proof is not promoted | web GPU/browser limits | P1/P2 | AAA Analyst + Frontend |
| Timeline/media | PARTIAL | sequencer/media modules exist and were decomposed | full production readiness evidence is limited | runtime/perf constraints | P1/P2 | Media Lead |
| Perceived performance | PARTIAL | architecture gate and modularization improving | near-limit count still high (`37`) | long-session degradation risk | P0/P1 | Infra + Frontend |
| Error surfaces | IMPLEMENTED | route contracts and no-fake-success checks are passing | N/A | N/A | P0 keep | Backend + Frontend |
| Loading surfaces | PARTIAL | most critical surfaces provide state feedback | consistency of messaging across all pages not fully unified | fragmentation risk | P1 | UX |
| Admin visual quality | IMPLEMENTED | critical visual metrics all at zero | N/A | N/A | P0 keep | Design + Frontend |
| Legacy UI drift | IMPLEMENTED | deprecated shell usage metrics at zero | N/A | N/A | P0 keep | Platform |
| Interface governance | IMPLEMENTED | interface scanners are active and reproducible | N/A | N/A | P0 keep | Platform |

### 2.3 Backend and Infra
| Subarea | Status | Current factual state | Main gap | Main limitation | Priority | Owner |
|---|---|---|---|---|---|---|
| Canonical file APIs | IMPLEMENTED | `/api/files/tree` + `/api/files/fs` are canonical | N/A | N/A | P0 keep | Backend |
| Legacy deprecation contract | IMPLEMENTED | `/api/workspace/*` + `/api/auth/sessions*` remain explicit `410` | cutoff completion still telemetry-dependent | transitional coexistence | P0/P1 | Backend |
| Code execution contract | PARTIAL | explicit errors are standardized | some advanced execution paths remain gated | compute/runtime constraints | P1 | Backend + Infra |
| Preview execution timing | PARTIAL | preview works for supported formats | performance SLOs still need tighter published evidence | browser variability | P1 | Infra |
| Graphics processing path | PARTIAL | rendering subsystems exist | full AAA-scale workload proof is not promoted | GPU/browser limits | P2 | AAA Analyst |
| Technical limits documentation | IMPLEMENTED | `LIMITATIONS.md` is canonical and enforced in claims | N/A | N/A | P0 keep | PM + Critical Agent |
| Scalability posture | PARTIAL | governance and reliability gates are stable | explicit concurrency SLO publication remains pending | infra cost/latency tradeoff | P1 | Infra |
| Cost bottlenecks | PARTIAL | billing and capability gates are explicit | full live cost telemetry per feature still evolving | provider-dependent costs | P1 | Billing + Infra |
| Concurrency limits | PARTIAL | documented as constrained in canonical limitations | formal tested thresholds are incomplete | websocket/container bounds | P1/P2 | Infra |
| Queue/runtime unavailability handling | IMPLEMENTED | `QUEUE_BACKEND_UNAVAILABLE` contract exists | N/A | N/A | P0 keep | Backend |

### 2.4 AI and Automation
| Subarea | Status | Current factual state | Main gap | Main limitation | Priority | Owner |
|---|---|---|---|---|---|---|
| Chat APIs | PARTIAL | routes exist with explicit 501 behavior when provider is absent | depends on provider/runtime readiness | provider dependency | P0/P1 | AI Architect |
| Inline completion/edit | PARTIAL | inline endpoints exist with explicit contracts | gated paths still present in core inventory | provider/config dependency | P0 | AI + Frontend |
| Editor integration | PARTIAL | editor-native AI flow exists in design/contracts | full stability evidence for long sessions is limited | context and latency limits | P1 | AI + IDE Lead |
| Preview/error integration | PARTIAL | error envelopes are standardized | richer remediation guidance can improve | limited automated recovery | P1 | AI + UX |
| Multi-agent orchestration | PARTIAL | planner/coder/reviewer policy is defined in canonical specs | production-grade evidence gate still incomplete | parallel cost/coordination limits | P1/P2 | AI Architect |
| L1-L3 claims | PARTIAL | L1-L3 are current factual boundary in docs | evidence must stay continuously updated | regression risk without gates | P0 keep | PM + AI |
| L4-L5 claims | NOT_IMPLEMENTED | promotion is explicitly blocked | requires operational evidence not currently available | autonomy/safety/cost limits | P2 | AI Architect |
| Context management | PARTIAL | limitations are explicitly documented | stronger canon-memory tooling is planned | context-window constraints | P1 | AI Architect |
| Parallel bottleneck handling | PARTIAL | queue/gating strategy is documented | dynamic load balancing with hard budgets still evolving | cost and latency scaling | P1 | Infra + AI |
| Provider failure handling | IMPLEMENTED | explicit `NOT_IMPLEMENTED`/capability envelope on missing provider | N/A | N/A | P0 keep | Backend + AI |

### 2.5 Collaboration and DX
| Subarea | Status | Current factual state | Main gap | Main limitation | Priority | Owner |
|---|---|---|---|---|---|---|
| Multi-user capability | PARTIAL | collaboration subsystems are documented in canonical set | enterprise readiness evidence is not promoted | scale/stability uncertainty | P1/P2 | Collaboration Lead |
| Locks/conflicts/versioning | PARTIAL | policy and backlog exist | objective SLO thresholds remain pending | concurrency complexity | P1 | Collaboration Lead |
| Collaborative debugging | NOT_IMPLEMENTED | no canonical production evidence for this mode | subsystem not delivered as stable capability | tooling complexity | P2 | IDE + Collaboration |
| Reconnect behavior | PARTIAL | readiness gate is planned in docs | scenario coverage not fully promoted | network variability | P1 | Infra + Collaboration |
| Setup friction | PARTIAL | route governance and shell simplification reduced friction | historical repo complexity still high | onboarding noise | P1 | PM + Platform |
| Developer ownership map | IMPLEMENTED | CODEOWNERS and governance matrix exist | N/A | N/A | P0 keep | PM |
| CI gate clarity | IMPLEMENTED | workflow governance issues are zero | N/A | N/A | P0 keep | Platform |
| DX historical noise | PARTIAL | canonical policy is active | `markdownHistorical=3605` still high | high search noise | P1 | PM |

### 2.6 Business, market, and commercial operations
| Subarea | Status | Current factual state | Main gap | Main limitation | Priority | Owner |
|---|---|---|---|---|---|---|
| Real value proposition | IMPLEMENTED | web-native studio workflow with explicit limits is documented | N/A | N/A | P0 keep | PM + Competitive |
| Target audience clarity | PARTIAL | docs define enterprise/studio-grade intent | segment-level packaging still needs hard evidence | market volatility | P1 | PM |
| Where behind market | IMPLEMENTED | non-claims are explicit (desktop parity, L4/L5, collaboration maturity) | N/A | N/A | P0 keep | Competitive |
| Where equal market | PARTIAL | governance, contracts, and route reliability are strong | some feature depth remains below top desktop suites | web constraints | P1 | Competitive |
| Surpass potential | PARTIAL | strengths in integrated web workflow and explicit reliability policy | dependent on closing P1/P2 quality backlog | cost/perf balance challenge | P1/P2 | PM + AI + Infra |
| Real barriers vs marketing | IMPLEMENTED | `LIMITATIONS.md` and claim policy enforce realism | N/A | N/A | P0 keep | Critical Agent |
| Pricing and entitlement model | PARTIAL | dual-entitlement direction is documented | full precision calibration by live telemetry is pending | provider cost variability | P1 | Billing Lead |
| Free-tier sustainability | PARTIAL | daily non-rollover intent is defined | hard validation in production billing cycles pending | abuse risk | P1 | Billing + Security |
| Paid plan continuity | PARTIAL | policy says premium time persists through cycle | full edge-case validation matrix still needed | billing edge cases | P1 | Billing |
| Marketplace/revenue expansion | NOT_IMPLEMENTED | no promoted production evidence for full marketplace maturity | outside current P0 closure | scope and operational cost | P2 | PM |

### 2.7 Cross-cutting governance, security, and repository coherence
| Subarea | Status | Current factual state | Main gap | Main limitation | Priority | Owner |
|---|---|---|---|---|---|---|
| Repo connectivity | IMPLEMENTED | `requiredMissing=0`, `deadScriptReferences=0` | N/A | N/A | P0 keep | Platform |
| Workflow governance | IMPLEMENTED | `issues=0` with authority/supporting split | one legacy candidate still monitored | legacy utility risk | P1 | Platform |
| Canonical docs governance | IMPLEMENTED | listed vs existing canonical docs are synchronized | N/A | N/A | P0 keep | PM |
| Secret hygiene | IMPLEMENTED | critical secret findings are zero | N/A | N/A | P0 keep | Security |
| Route contract governance | IMPLEMENTED | route contracts pass (`checks=38`) | N/A | N/A | P0 keep | Backend |
| No-fake-success governance | IMPLEMENTED | scanner pass (`files=246`) | N/A | N/A | P0 keep | Critical Agent |
| Near-limit structural debt | PARTIAL | `nearLimitFiles=37`, oversized zero | decomposition still needed to reduce maintenance risk | codebase breadth | P1 | Architect + Platform |
| Compatibility wrappers | PARTIAL | wrappers explicit and tracked (`8`) | retirement plan by telemetry still pending full closure | migration window | P1 | Backend |
| Historical docs volume | PARTIAL | canonical policy enforced | historical docs still high (`3605`) | repository cognitive load | P1 | PM |
| Freeze discipline | PARTIAL | full gate suite policy is defined | must keep end-of-wave full rerun discipline | local env variability | P0/P1 | PM + Infra |

## 3) Top lacunas to close first (P0)
1. Keep critical journey free of ambiguous CTA where capability is gated.
2. Keep deterministic dashboard -> ide handoff with full context and stable recovery.
3. Keep API capability/deprecation envelope uniform across all critical endpoints.
4. Continue structural decomposition to lower `nearLimitFiles` from `37` toward internal target (`<=30`).
5. Keep dual entitlement behavior explicit and user-visible under credit-zero scenarios.

## 4) Main limitations that remain even after P0 closure
1. Browser/GPU/runtime limits still block unrestricted desktop-equivalent workloads.
2. AI context, hallucination, and provider failures are reduced by gates but never eliminated.
3. Long-running parallel agent work requires strict budget and queue controls to avoid cost spikes.
4. Collaboration enterprise claims remain blocked until objective load/SLO evidence is published.

## 5) Decision lock for next execution wave
1. Use this document as the subarea reference matrix for all P1/P2 updates.
2. Any new claim must map to one row in this matrix and upgrade status only with evidence.
3. If evidence is missing, status must remain `PARTIAL`, `NOT_IMPLEMENTED`, or `UNVERIFIED`.
