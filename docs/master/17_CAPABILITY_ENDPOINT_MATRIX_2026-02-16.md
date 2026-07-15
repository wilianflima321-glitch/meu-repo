# 17_CAPABILITY_ENDPOINT_MATRIX_2026-02-16

Status: EXECUTION MATRIX  

Date: 2026-02-16  

Scope: capability truth map for P0 reliability



## 1) Objective

Provide a single factual map of capability status for high-impact APIs and runtime surfaces used by `/ide`.



## 2) Capability matrix (current implementation)

| Surface | Endpoint/File | Status | Contract |

|---|---|---|---|

| AI chat | `app/api/ai/chat/route.ts` | `PARTIAL` (provider-missing gate) with optional explicit demo fallback | default `503 AI_PROVIDER_NOT_CONFIGURED` + capability metadata; enforced route-level request throttling (`429 AI_RATE_LIMIT_EXCEEDED`); when `AETHEL_AI_DEMO_MODE=1`, returns `demoMode=true` payload with warning + setup metadata + per-user daily demo budget enforcement (`429 AI_DEMO_LIMIT_REACHED`) |

| AI chat advanced | `app/api/ai/chat-advanced/route.ts` | `IMPLEMENTED` with explicit provider gates + quality controls | default `503 AI_PROVIDER_NOT_CONFIGURED` on missing provider/model-provider mismatch; route-level request throttling (`429 AI_RATE_LIMIT_EXCEEDED`); supports `qualityMode` + optional benchmark context; when `AETHEL_AI_DEMO_MODE=1`, returns `demoMode=true` response with explicit warning + per-user budget limit (`429 AI_DEMO_LIMIT_REACHED`) |

| AI chat panel orchestration | `components/ide/AIChatPanelContainer.tsx` | `IMPLEMENTED/PARTIAL` | routes through `/api/ai/chat-advanced`; auto-selects `qualityMode`/`agentCount`; falls back to single-agent when plan gate blocks multi-agent; provider gate is suppressed when demo mode is active to preserve first-value path |
| Editor inline edit apply chain | `components/editor/MonacoEditorPro.tsx` | `PARTIAL` | inline edit executes `validate -> apply` server chain; blocked states surface deterministic feedback including `FULL_ACCESS_GRANT_REQUIRED` and in-editor CTA to activate temporary Full Access; successful/rejected apply now posts LEARN feedback (`accepted`/`needs_work`) with `runId` |

| AI complete | `app/api/ai/complete/route.ts` | `PARTIAL` when provider missing; otherwise active | default `503 AI_PROVIDER_NOT_CONFIGURED`; route-level request throttling (`429 AI_RATE_LIMIT_EXCEEDED`); when demo mode is active returns explicit `demoMode=true` completion payload with per-user budget enforcement (`429 AI_DEMO_LIMIT_REACHED`); response canonical `suggestion` + alias `text` |

| AI action | `app/api/ai/action/route.ts` | `PARTIAL` when provider missing; otherwise active | default `503 AI_PROVIDER_NOT_CONFIGURED`; route-level request throttling (`429 AI_RATE_LIMIT_EXCEEDED`); demo mode can return explicit `demoMode=true` action payload with setup warning and per-user budget enforcement (`429 AI_DEMO_LIMIT_REACHED`) |

| AI inline edit | `app/api/ai/inline-edit/route.ts` | `PARTIAL` when provider missing; otherwise active | default `503 AI_PROVIDER_NOT_CONFIGURED`; route-level request throttling (`429 AI_RATE_LIMIT_EXCEEDED`); demo mode can return explicit `demoMode=true` inline-edit payload with per-user budget enforcement (`429 AI_DEMO_LIMIT_REACHED`) |
| AI provider status | `app/api/ai/provider-status/route.ts` | `IMPLEMENTED` | returns non-secret provider readiness (`configuredProviders`, `missingProviders`) plus `demoModeEnabled` signal and `demoDailyLimit` for onboarding recovery/UI gating |
| Preview runtime health | `app/api/preview/runtime-health/route.ts` | `PARTIAL` | probes local dev-runtime reachability with explicit host allowlist and capability headers |
| Preview runtime discovery | `app/api/preview/runtime-discover/route.ts` | `PARTIAL` | scans default local dev ports (`3000/5173/4173/8080/4200/3001`) or request candidates, returns `preferredRuntimeUrl` + candidate statuses with explicit capability headers |
| Preview runtime provision | `app/api/preview/runtime-provision/route.ts` | `PARTIAL` | authenticated runtime provisioning surface; supports managed backend (`AETHEL_PREVIEW_PROVISION_ENDPOINT`) with health validation and explicit fallback to local discovery when backend is absent |

| AI inline completion (compat) | `app/api/ai/inline-completion/route.ts` | `PARTIAL` when provider missing; otherwise active compat surface | default `503 AI_PROVIDER_NOT_CONFIGURED`; route-level request throttling (`429 AI_RATE_LIMIT_EXCEEDED`); demo mode can return explicit `demoMode=true` with per-user budget enforcement (`429 AI_DEMO_LIMIT_REACHED`); canonical `suggestion` + alias `text` |
| Multi-agent stream runtime | `app/api/agents/stream/route.ts` | `PARTIAL` | SSE stream with auth + entitlement + metering; supports `heuristic` plus experimental `provider-backed` mode when at least one provider is configured; emits explicit capability metadata/disclaimer/coordination policy in `ready` envelope |
| AI agents overview | `app/api/ai/agents/route.ts` | `PARTIAL` | returns deterministic empty baseline + capability metadata |
| AI agents executions | `app/api/ai/agents/executions/route.ts` | `PARTIAL` | returns deterministic empty baseline + capability metadata |
| AI agents metrics | `app/api/ai/agents/metrics/route.ts` | `PARTIAL` | returns deterministic baseline metrics + capability metadata |

| AI deterministic validation | `app/api/ai/change/validate/route.ts` | `IMPLEMENTED` | returns `canApply`, `verdict`, `checks`, dependency impact |
| AI change apply | `app/api/ai/change/apply/route.ts` | `PARTIAL` | deterministic apply runtime with single-file or batch mode (`changes[]`, up to 50), rollback token issuance per change, optional `executionMode=sandbox` simulation mode, high-risk approval gate (`approvedHighRisk`) **plus active full-access requirement** (`FULL_ACCESS_GRANT_REQUIRED`), dependency-fanout approval gate (`localImports>40`), transitive dependency-graph approval gate (`reverseDependents>80`), project-impact metadata (tests/endpoints/depth/risk), best-effort write-failure recovery, response `metadata.runId`, local run-ledger append (`.aethel/change-ledger/*.ndjson`) |
| AI change rollback | `app/api/ai/change/rollback/route.ts` | `PARTIAL` | token-backed restore supports single (`rollbackToken`), batch (`rollbackTokens[]`, up to 50), or run-level lookup (`runId`), ownership/ttl/single-use enforcement, optional hash guard, best-effort restore-failure recovery, response `metadata.runId`, local run-ledger append (`.aethel/change-ledger/*.ndjson`) |
| AI change learn feedback | `app/api/ai/change/feedback/route.ts` | `PARTIAL` | authenticated LEARN ingestion (`feedback=accepted|rejected|needs_work`) bound to `runId`, capped notes payload, stored in append-only run ledger as `learn_feedback` evidence; consumed by IDE inline apply/rollback flow |
| AI change run history | `app/api/ai/change/runs/route.ts` | `PARTIAL` | authenticated ledger query for run evidence (`summary`, `runGroups`, `rows`) scoped by user and time window |
| AI change readiness | `app/api/ai/change/readiness/route.ts` | `PARTIAL` | authenticated readiness snapshot with **promotion policy `production_only_for_promotion`**; exposes `metrics` (production), `metricsAll`, `rehearsalMetrics`, threshold blockers and LEARN payload (`reasonCounts`, `feedbackCounts`, `executionModeCounts`, `riskCounts`, `trend`, `recommendations`, `reasonPlaybook`) |

| Render cancel | `app/api/render/jobs/[jobId]/cancel/route.ts` | `PARTIAL` | queue-backed cancel for non-active jobs; explicit capability envelope for unavailable backend/state conflicts |

| Billing checkout (non-stripe) | `app/api/billing/checkout/route.ts` | `PARTIAL` | `503 PAYMENT_GATEWAY_RUNTIME_UNAVAILABLE` with capability metadata |
| Billing checkout-link (non-stripe) | `app/api/billing/checkout-link/route.ts` | `PARTIAL` | `503 PAYMENT_GATEWAY_RUNTIME_UNAVAILABLE` with capability metadata |
| Wallet purchase intent (package bridge) | `app/api/wallet/purchase/route.ts` | `PARTIAL` | registers pending ledger intent with explicit settlement gate |
| Usage status | `app/api/usage/status/route.ts` | `IMPLEMENTED` | exposes monthly token usage + daily request usage (`requestsToday.used|limit|remaining`) |
| Quotas API | `app/api/quotas/route.ts` | `IMPLEMENTED/PARTIAL` | exposes resource quotas including `ai_requests_daily`; consume path remains restricted to `ai_tokens` |

| File tree | `app/api/files/tree/route.ts` | `IMPLEMENTED` | canonical file authority |

| File fs | `app/api/files/fs/route.ts` | `IMPLEMENTED` | canonical file authority |

| Legacy workspace routes | `app/api/workspace/*` | `DEPRECATED` | `410 DEPRECATED_ROUTE` + cycle metadata |

| Legacy auth sessions | `app/api/auth/sessions*` | `DEPRECATED` | `410 DEPRECATED_ROUTE` + cycle metadata |

| Asset upload validation | `app/api/assets/upload/route.ts` + `lib/server/asset-processor.ts` | `IMPLEMENTED/PARTIAL` by class | explicit validation + warnings + capabilityStatus |
| Multiplayer health | `app/api/multiplayer/health/route.ts` | `PARTIAL/NOT_IMPLEMENTED` by env | explicit runtime gate (configured vs degraded) with capability headers |
| Analytics batch ingest | `app/api/analytics/batch/route.ts` | `IMPLEMENTED` | batched telemetry ingest (`events[]`, `metrics[]`) persisted in `AuditLog` with bounded batch size |
| Admin analytics baseline | `app/api/admin/analytics/baseline/route.ts` | `IMPLEMENTED` | returns 7d baseline for web vitals, AI latency and first-value timing with funnel counters, including first-value milestone conversion (`project -> ai -> ide -> completed`) |
| Admin onboarding stats | `app/api/admin/onboarding/stats/route.ts` | `IMPLEMENTED` | returns onboarding/first-value conversion by stage, median first-value time and action evidence (`onboarding.*` + `analytics:*`) |
| Admin AI core-loop readiness | `app/api/admin/ai/readiness/route.ts` | `PARTIAL` | L4 readiness with **promotion policy `production_only_for_promotion`**; returns `metrics` (production), `metricsAll`, `rehearsalMetrics`, blockers, trend and LEARN payload (`reasonCounts`, `feedbackCounts`, `reasonPlaybook`, `recommendations`) |
| Admin AI core-loop metrics | `app/api/admin/ai/core-loop-metrics/route.ts` | `PARTIAL` | operator diagnostics by windows (`24h/7d/30d`) with production vs rehearsal split (`metrics`, `metricsAll`, `rehearsalMetrics`), reason/feedback/risk counts, impacted API hotspot counters, trend (`7d vs 30d`) and recommendation/playbook payload |
| Admin AI core-loop promotion | `app/api/admin/ai/core-loop-promotion/route.ts` | `PARTIAL` | single promotion verdict surface (`promotionEligible`, `blockers`) using policy `production_only_for_promotion`, plus side-by-side `production` vs `rehearsal` metrics |
| Admin AI ledger integrity | `app/api/admin/ai/ledger-integrity/route.ts` | `PARTIAL` | verifies append-only ledger hash-chain (`eventId`, `prevHash`, `eventHash`), returns integrity status + issue list for ops audit |
| Admin AI core-loop drill | `app/api/admin/ai/core-loop-drill/route.ts` | `PARTIAL` | appends **rehearsal-only** ledger events (`runSource=core_loop_drill`) for operational drills without inflating production promotion evidence |
| Admin AI core-loop production probe | `app/api/admin/ai/core-loop-production-probe/route.ts` | `PARTIAL` | executes authenticated sandbox apply probes with `runSource=production` to generate promotion-eligible evidence without workspace writes |
| Admin full-access audit | `app/api/admin/ai/full-access/route.ts` | `PARTIAL` | operator snapshot for temporary full-access windows (`total/active/revoked/expired`) with scoped grant list evidence |
| Admin collaboration readiness | `app/api/admin/collaboration/readiness/route.ts` | `PARTIAL` | returns realtime-collab readiness score, SLO targets, runtime flags, promotion eligibility, stress-proof attachment state and latest evidence history (claim gate) |
| Admin collaboration evidence ledger | `app/api/admin/collaboration/evidence/route.ts` | `PARTIAL` | audit-backed evidence record/get for synthetic concurrency, reconnect replay and conflict replay checks |
| Admin collaboration stress-proof ledger | `app/api/admin/collaboration/evidence/stress-proof/route.ts` | `PARTIAL` | audit-backed endpoint to attach external load/stress report URL used by promotion gate without inflating capability claims |
| Studio full access grants | `app/api/studio/access/full/route.ts` | `PARTIAL` | audited short-lived full access grant/list (`GET` + `POST`) with scoped payload, TTL clamp and hash-chained local ledger |
| Studio full access revoke | `app/api/studio/access/full/[id]/route.ts` | `PARTIAL` | audited revoke path (`DELETE`) with ownership guard and explicit capability envelope |
| Studio orchestration APIs (remaining gated) | `app/api/studio/*` | `PARTIAL` (explicit gate) | endpoints outside full-access grant/revoke still return explicit `STUDIO_RUNTIME_GATED` (`503`) capability envelope via shared `studio-gate` helper |
| Admin job queue APIs | `app/api/admin/jobs*` | `PARTIAL` | list/stats now read queue runtime; cancel/retry wired; pause/resume now perform queue-level control scoped from job id with explicit metadata |
| Admin security event APIs | `app/api/admin/security/events|rate-limits` | `PARTIAL` | baseline response with explicit capability status for ops surfaces |
| Catch-all compatibility APIs | `app/api/{git,engine,files,health,lsp,marketplace,search,terminal,test,logs,commands,launch,telemetry}/[...path]` | `PARTIAL` (explicit gate) | unmatched legacy paths now return explicit `ROUTE_NOT_MAPPED` (`404`) capability envelope |



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

3. `qa:no-fake-success` also enforces:

- `PAYMENT_GATEWAY_RUNTIME_UNAVAILABLE -> 503`

- `AUTH_NOT_CONFIGURED -> 503`

- `QUEUE_BACKEND_UNAVAILABLE -> 503`



## 3.2 Build/runtime reliability note (2026-02-17)

1. Local config now sanitizes invalid Next IPC env keys to reduce ambiguous build/runtime IPC behavior.

2. Current local baseline: `npm run build` passes; warning inventory is currently bounded to docker sandbox fallback in environments without local daemon.

3. This does not relax API capability/error contracts in this matrix.



## 4) Promotion criteria (P1+)

1. Promote `PARTIAL` to `IMPLEMENTED` only after:

- operational test evidence;

- stable error contract under failure modes;

- explicit cost/latency envelope in admin/runtime telemetry.



## 5) Notes

1. This matrix is contract-aligned with `10`, `13`, `14`, `15`, and `16`.

2. If any endpoint behavior changes, this matrix must be updated in the same wave.


## 6) Delta 2026-02-27 (readiness constraints)
1. Capability contracts permanecem validos, mas readiness de produto depende de baseline estrutural:
- scripts/config sem caminhos quebrados;
- remocao de artefatos locais versionados;
- fluxo `/ide` sem fonte mock no caminho principal.
2. Enquanto essa base nao fechar, status operacional permanece `PARTIAL` para claim enterprise/studio.


## 7) Delta 2026-02-28 (multi-agent reliability hardening)
1. `app/api/agents/stream/route.ts` now enforces:
- `requireAuth` + entitlement check;
- plan-constrained agent count and role filtering;
- concurrency lease + metered usage before SSE start.
2. Plan gate failures now return explicit capability envelope:
- `error=FEATURE_NOT_AVAILABLE`
- `capability=multi_agent_orchestration`
- `capabilityStatus=PARTIAL`
- metadata includes requested roles, plan and allowed limits.
3. `lib/agent-orchestrator.ts` now streams role output in true interleaved parallel mode with explicit cancellation and non-inflated guidance text.



## 8) Delta 2026-02-28 (telemetry + recovery UX)
1. `AIChatPanelContainer` now surfaces an explicit recovery gate for provider-missing scenarios while preserving `501 NOT_IMPLEMENTED` backend contract.
2. `analytics/batch` endpoint now exists and matches the client flush path from `lib/analytics.ts`.
3. No capability contract was relaxed; this wave only closed operational UX/telemetry gaps.

## 9) Delta 2026-02-28 (dashboard + ide UX closure slice)
1. `DashboardAIChatTab` now mirrors provider setup recovery CTA to `/settings?tab=api` when advanced chat hits `NOT_IMPLEMENTED` provider gates.
2. `/ide` now renders split editor + preview path in `FullscreenIDE` with explicit toggle and runtime-gated fallback behavior from `PreviewPanel`.
3. Capability policy remains unchanged: unsupported preview/runtime classes keep explicit gated messaging (no fake-ready state).
4. Landing entry now seeds Studio mission handoff (`/dashboard?mission=...`) so first AI action starts in canonical Studio Home flow before optional `/ide` deep dive.

## 10) Delta 2026-02-28 (route coverage closure)
1. Added explicit route files for typed route coverage and contract clarity:
- `/api/auth/2fa/disable`
- `/api/auth/2fa/validate`
- `/api/auth/2fa/backup-codes`
- `/admin/emergency`
- `/dashboard/legacy`
2. Added explicit capability-gated stubs for `/api/studio/*` and `/api/ai/change/apply|rollback`.
3. Net effect: missing-route ambiguity was removed without relaxing anti-fake-success policy.

## 11) Delta 2026-03-01 (provider setup recovery support)
1. Added `/api/ai/provider-status` as implemented operational support endpoint for setup recovery UX.
2. Endpoint does not expose secrets and does not alter critical `501` contracts on `/api/ai/*` action surfaces.
3. Chat UIs now consume this status through shared setup guide while preserving existing capability/error envelopes.

## 12) Delta 2026-03-01 (preview runtime health probe)
1. Added `/api/preview/runtime-health` to validate external preview runtime availability before relying on dev-server mode.
2. Probe is constrained to local runtime hosts (`localhost`, loopback, `*.localhost`) to avoid broad SSRF surface.
3. Contract returns explicit reachability status (`reachable|unhealthy|unreachable`) and latency for IDE observability.

## 13) Delta 2026-03-04 (full access audited controls)
1. `POST /api/studio/access/full` moved from stub gate to operational `PARTIAL`:
- issues short-lived scoped grants (default 15 min, clamped 5..60);
- requires explicit `reason`;
- stores append-only audit evidence in `.aethel/full-access/ledger.ndjson`.
2. `GET /api/studio/access/full` now returns caller-scoped grants with active/inactive filtering.
3. `DELETE /api/studio/access/full/[id]` now revokes an issued grant with ownership guard.
4. UI hook: Studio Home header now exposes `Full Access` toggle with active-state + expiry indicator.

## 13) Delta 2026-03-01 (provider-gate setup metadata)
1. Critical AI routes now include explicit setup metadata in `501 NOT_IMPLEMENTED` payloads (`setupUrl`, `setupAction`) for no-dead-end recovery UX.
2. Canonical recovery target is `/settings?tab=api` and is consumed by both Studio Home and IDE chat surfaces.
3. Contract codes/status remain unchanged (`NOT_IMPLEMENTED`, HTTP 501) to preserve anti-fake-success policy.

## 14) Delta 2026-03-01 (admin analytics baseline)
1. Added `/api/admin/analytics/baseline` as implemented admin telemetry endpoint.
2. Endpoint provides 7-day baseline summaries for web vitals and AI latency, plus funnel counts for entry-to-first-action checkpoints.

## 15) Delta 2026-03-01 (usage precision + shell guard)
1. Daily request usage is now canonical (`usageBucket window='day'`) and exposed in:
- `/api/usage/status` -> `usage.requestsToday.{used,limit,remaining}`
- `/api/quotas` -> `resource='ai_requests_daily'`
2. Dashboard shell stability is now guarded by `qa:dashboard-shell` to keep shell-level capability UX maintainable (`<=1200` lines + no direct `@xyflow/react` shell coupling).

## 16) Delta 2026-03-01 (global gate inventory sync)
1. Canonical global scan (`npm run qa:global-gap-scan`) is the source of truth for explicit gate inventory.
2. Historical baseline at this checkpoint was `8` explicit API `NOT_IMPLEMENTED` gates; current active baseline moved to `0` after runtime-gate normalization waves.
3. These transitions remain policy-compliant: no fake-ready success path was introduced.
4. Source of truth for current count:
- `docs/master/32_GLOBAL_GAP_REGISTER_2026-03-01.md`

## 19) Delta 2026-03-03 (queue control hardening)
1. `/api/render/jobs/[jobId]/cancel` moved from explicit `NOT_IMPLEMENTED` to `PARTIAL` runtime:
- uses queue backend when available (`QUEUE_BACKEND_UNAVAILABLE -> 503`);
- returns deterministic conflict outcomes (`JOB_ACTIVE_CANNOT_CANCEL -> 409`, `JOB_ALREADY_FINALIZED -> 400`, `JOB_NOT_FOUND -> 404`).
2. `/api/admin/jobs` and `/api/admin/jobs/stats` now read queue runtime instead of static observation payloads.
3. `/api/admin/jobs/[id]` cancel/retry/pause/resume are wired with deterministic capability/error envelopes and no fake success.

## 20) Delta 2026-03-03 (multi-agent provider-backed execution slice)
1. `/api/agents/stream` no longer returns `NOT_IMPLEMENTED` for `executionMode=provider-backed`.
2. Provider-backed mode is now available in `PARTIAL` scope when providers are configured:
- returns per-agent provider/model/tokens/latency payloads in SSE stream;
- preserves deterministic coordination metadata and reviewer-gated apply policy.
3. When providers are not configured, endpoint now returns explicit `AI_PROVIDER_NOT_CONFIGURED` (`503`) with setup metadata (`setupUrl`, `setupAction`) instead of opaque failure.

## 21) Delta 2026-03-03 (studio/catchall explicit partial-gate normalization)
1. `app/api/studio/_lib/studio-gate.ts` now returns `STUDIO_RUNTIME_GATED` (`503`) with `capabilityStatus=PARTIAL` instead of `NOT_IMPLEMENTED`.
2. `app/api/_lib/catchall-gate.ts` now returns `ROUTE_NOT_MAPPED` (`404`) with `capabilityStatus=PARTIAL`.
3. This keeps explicit capability transparency while reducing hard `NOT_IMPLEMENTED` gate inventory.

## 17) Delta 2026-03-01 (multi-agent transparency hardening)
1. `/api/agents/stream` now emits explicit capability metadata in `ready` envelope:
- `capability=multi_agent_orchestration`
- `capabilityStatus=PARTIAL`
- `mode=heuristic`
- advisory `disclaimer` text
2. `/api/agents/stream/status` now exposes the same mode/capability metadata for operational dashboards.
3. UI consumer (`components/nexus/MultiAgentOrchestrator.tsx`) now renders a visible PARTIAL warning banner when stream mode is heuristic, preventing fake parity assumptions.
4. Ready envelope now includes explicit no-overlap coordination metadata so clients can display scope partitioning and reviewer-gated apply policy.

## 18) Delta 2026-03-03 (ai change core-loop unblock slice)
1. `/api/ai/change/apply` moved from explicit `NOT_IMPLEMENTED` gate to `PARTIAL` runtime:
- authenticated + entitlement-gated;
- deterministic validation (`validateAiChange`) required before write;
- single-file atomic write with rollback snapshot token;
- explicit high-risk approval field (`approvedHighRisk`) for auth/billing/admin path changes.
- dependency-impact fanout guard requires approval when `localImports > 40`.
2. `/api/ai/change/rollback` moved to `PARTIAL` runtime:
- token ownership + ttl + single-use enforcement;
- optional hash guard (`expectedCurrentHash`) before restore.
3. Batch expansion in current wave:
- apply accepts `changes[]` (limit 20) with per-file rollback token generation.
- rollback accepts `rollbackTokens[]` (limit 20) with deterministic pre-validation before restore.
4. Promotion cap remains unchanged:
- this slice is not full autonomous apply; status remains `PARTIAL` until sandboxed multi-file apply + evidence loop closes.

## 19) Delta 2026-03-03-b (change-run evidence exposure)
1. Added `/api/ai/change/runs` as authenticated `PARTIAL` evidence endpoint:
- returns per-user run rows and aggregated summary from local run ledger.
2. Extended admin AI metrics (`/api/admin/ai/metrics`) with `changeRuns.summary` + `changeRuns.samples`.
3. `qa:route-contracts` now validates the new change-runs contract.

## 22) Delta 2026-03-03-c (AI provider-gate normalization + gap reduction)
1. AI provider-missing branches now return explicit capability envelope as `PARTIAL`:
- `error: AI_PROVIDER_NOT_CONFIGURED`
- `status: 503`
- `capabilityStatus: PARTIAL`
2. Covered endpoints:
- `/api/ai/chat`
- `/api/ai/chat-advanced`
- `/api/ai/complete`
- `/api/ai/action`
- `/api/ai/inline-edit`
- `/api/ai/inline-completion`
3. Global explicit `NOT_IMPLEMENTED` API inventory reduced from `8` to `2`, now only billing runtime branches.

## 23) Delta 2026-03-03-d (change-apply sandbox execution mode)
1. `/api/ai/change/apply` now supports `executionMode=sandbox` in `PARTIAL` scope.
2. Sandbox mode writes proposed changes into isolated temp workspace and returns deterministic hash/evidence payload without mutating primary workspace files.
3. Contract exposes:
- `metadata.applyMode=sandbox-simulated`
- `metadata.executionMode=sandbox`
- `metadata.sandboxId`
4. Sandbox temp directories now have automatic TTL prune (`6h`) before new runs to avoid local disk buildup.

## 24) Delta 2026-03-03-e (run-evidence grouping)
1. `/api/ai/change/runs` now returns grouped evidence by `metadata.runId`:
- `metadata.runGroups[]` with timestamps, outcome, file set and execution modes.
2. `/api/admin/ai/metrics` now exposes `changeRuns.runGroups` for operator dashboards.
3. Contract remains `PARTIAL`; this improves observability without promoting autonomy claim.

## 25) Delta 2026-03-03-f (run-level rollback)
1. `/api/ai/change/rollback` now supports `runId` lookup in addition to token inputs.
2. When `runId` is provided, rollback tokens are resolved from apply ledger evidence for that run.
3. Missing run evidence returns explicit `ROLLBACK_RUN_NOT_FOUND` (`404`) capability envelope.

## 26) Delta 2026-03-03-g (admin AI readiness gate)
1. Added `/api/admin/ai/readiness` as `PARTIAL` readiness surface for L4 promotion evidence.
2. Endpoint computes and exposes:
- `applySuccessRate`
- `regressionRate`
- `sandboxCoverage`
- `sampleSize`
- `promotionEligible`
3. Admin monitor now renders this readiness card for operator visibility.

## 27) Delta 2026-03-03-h (billing runtime-gate normalization)
1. Billing gateway mismatch branches moved from `NOT_IMPLEMENTED` to explicit `PARTIAL` runtime contract:
- `/api/billing/checkout`
- `/api/billing/checkout-link`
2. Error/status now follow runtime-unavailable semantics:
- `error: PAYMENT_GATEWAY_RUNTIME_UNAVAILABLE`
- `status: 503`
- `capabilityStatus: PARTIAL`
3. Net effect: global API explicit `NOT_IMPLEMENTED` inventory is now `0` in active scope (`32_GLOBAL_GAP_REGISTER_2026-03-01.md`).

## 28) Delta 2026-03-04 (telemetry ingest hardening)
1. Added `/api/telemetry/event` as explicit ingest surface with deterministic capability contract:
- `capability: TELEMETRY_EVENT_INGEST`
- `capabilityStatus: IMPLEMENTED` (on accepted write)
2. Explicit partial-gate errors added for telemetry ingest safety:
- `TELEMETRY_EVENT_TYPE_REQUIRED` (`400`)
- `TELEMETRY_EVENT_TOO_LARGE` (`413`, 32KB metadata cap)
- `TELEMETRY_EVENT_PERSIST_FAILED` (`500`)
3. `lib/consent/consent-manager.ts` now posts consent telemetry to `/api/telemetry/event` with `keepalive` and server-side absolute URL fallback, reducing silent event loss in non-browser execution.

## 29) Delta 2026-03-04 (admin core-loop metrics endpoint)
1. Added `/api/admin/ai/core-loop-metrics` for operator-facing run evidence diagnostics.
2. Contract status:
- `capability: ADMIN_AI_CORE_LOOP_METRICS`
- `capabilityStatus: PARTIAL`
3. Endpoint exposes 24h/7d/30d windows with:
- readiness metrics snapshot;
- `reasonCounts` for blocked/failure reasons;
- `executionModeCounts` for sandbox/workspace apply mix;
- `lastEventAt` to make stale/no-evidence state explicit.

## 30) Delta 2026-03-05 (preview provision failover + warm-up transparency)
1. `/api/preview/runtime-provision` now operates as authenticated `PARTIAL` managed bootstrap with explicit local fallback and operational metadata.
2. Provisioning supports endpoint failover and warm-up polling:
- endpoint candidates can be provided by `AETHEL_PREVIEW_PROVISION_ENDPOINTS` (ordered list);
- warm-up retries are controlled by `AETHEL_PREVIEW_PROVISION_WARMUP_ATTEMPTS` and `AETHEL_PREVIEW_PROVISION_WARMUP_DELAY_MS`.
3. Provision response keeps capability transparency:
- `capabilityStatus=PARTIAL`;
- `mode` (`managed` or `local-discovery-fallback`);
- `usedEndpoint`, `attempts`, and health result metadata for operator diagnostics.
4. No claim upgrade to real managed HMR is allowed from this slice; status remains runtime-bootstrap only.

## 31) Delta 2026-03-06 (research handoff + agent mode controls)
1. `components/nexus/AethelResearch.tsx` now supports explicit `Research -> IDE` handoff:
- stores normalized handoff payload in local storage (`aethel.research.handoff.v1`);
- opens `/ide?entry=ai&source=research` with no hidden side effects.
2. `components/ide/AIChatPanelContainer.tsx` now consumes handoff payload and injects deterministic context messages instead of silent context loss.
3. IDE chat now supports explicit profile mentions in user prompt:
- `@studio`, `@delivery`, `@fast`, `@web`, `@agents:1|2|3`;
- mentions map to `qualityMode`, `agentCount`, `enableWebResearch` via `profileOverride`.
4. `components/nexus/MultiAgentOrchestrator.tsx` now exposes explicit execution mode selector:
- `heuristic` (default);
- `provider-backed` (gated by configured provider availability).
5. Capability claim remains `PARTIAL` for research integration and multi-agent provider-backed reliability; no status promotion implied by this slice.

## 32) Delta 2026-03-06-b (local demo fallback for first-value onboarding)
1. `components/ide/AIChatPanelContainer.tsx` now serves explicit `DEMO LOCAL` responses when provider is not configured and server-side demo mode is off.
2. Local demo keeps anti-fake-success policy:
- banner is visible while provider gate is active;
- every response is explicitly labeled as demo and points to `/settings?tab=api` for real providers.
3. Daily limit is enforced in browser storage (`aethel.ai.local-demo.v1`) with deterministic reset at UTC day boundary.
4. Telemetry now records `status=demo-local`, reason (`preflight_provider_gate` or `provider_setup_error`) and usage counters for onboarding funnel evidence.
5. Capability contract remains unchanged (`AI_PROVIDER_NOT_CONFIGURED` gate is still explicit on provider-backed paths); this slice only removes first-value dead-end UX.
