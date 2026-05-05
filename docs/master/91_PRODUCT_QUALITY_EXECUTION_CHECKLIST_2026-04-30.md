# 91_PRODUCT_QUALITY_EXECUTION_CHECKLIST_2026-04-30
Date: 2026-04-30
Status: ACTIVE
Role: execution checklist derived from the canonical quality triage

## Purpose
Turn `90_CANONICAL_PRODUCT_QUALITY_TRIAGE_2026-04-30.md` into a practical execution board.

This document is intentionally short.
It should guide improvement of what already exists instead of inventing new product families.

## Source Of Truth
Use this checklist only with:
- `docs/master/90_CANONICAL_PRODUCT_QUALITY_TRIAGE_2026-04-30.md`
- `docs/master/89_WEB_LIGHT_STUDIO_CLOUD_LOCAL_ARCHITECTURE_2026-04-29.md`
- `AETHEL_INTERFACE_BLUEPRINTS/00_INDEX.md`
- `AETHEL_INTERFACE_BLUEPRINTS/19_BEST_IN_MARKET_CLEAN_UX_GUARDRAILS.md`
- `docs/master/92_V10_AUDIT_RECONCILIATION_2026-04-30.md`
- local UX arsenal folder `AETHEL_UX_ARSENAL_2026-04-29/00_ARSENAL_INDEX.md` when present outside the repo

## Current Product Order
The canonical product path is:
1. `Web Light`
2. `Studio Home`
3. `Studio Cloud`
4. `Operator`
5. `Studio Local`

The user should never feel that they moved from one product into another.

## Execution Rules
1. Improve existing surfaces before creating new ones.
2. Preserve `Studio Home` as the initial logged-in Studio shell.
3. Keep each surface to one dominant protagonist.
4. Use images as quality references, not literal design truth.
5. Reduce visible text before adding new explanatory copy.
6. Treat platform confidence as product quality, not only engineering debt.

## P0 Checklist
### Platform Confidence
Goal:
- make the product feel repeatably trustworthy.

Do:
- keep `npm run qa:enterprise-gate` green,
- keep `npm run qa:canonical-doc-alignment` green,
- run `npm run qa:product-quality-progress` before accepting broad audit claims,
- keep `npm run qa:auth-email` green before treating signup, verification, or password reset as production-ready,
- keep `npm run qa:user-audit-log` green before claiming account activity or trust-center readiness,
- keep `npm run qa:public-trust-center` green before claiming buyer/trust continuity,
- keep `npm run qa:security-disclosure` green before inviting researchers or referencing responsible disclosure,
- keep `npm run qa:reliability-incident` green before claiming reliability, incident-response, SLO, or SLA maturity,
- keep `npm run qa:ai-game-film-production` green before claiming game/film agentic production maturity,
- keep `git diff --check` clean,
- continue isolating build/prerender blockers honestly.

Do not:
- claim full platform confidence from UX-only improvements.
- claim certifications, SLO/SLA guarantees, or uptime percentages that do not have live evidence.
- imply a formal bug bounty, guaranteed reward, or broad safe harbor beyond the published policy.
- claim fake uptime, five-nines, guaranteed uptime, or contractual SLA before production evidence and an enterprise agreement.
- claim Unreal parity, autonomous AAA completion, or film-quality final output without asset provenance, validation graph evidence, playtests/renders, and human approval.

### Mojibake And Text Cleanliness
Goal:
- remove visible encoding and copy-quality defects from product-critical docs and UI.

Do:
- reduce the `docs/MOJIBAKE_SCAN.md` finding count,
- prioritize public, Studio Home, AI, preview, and docs surfaces.

Do not:
- rewrite broad content just to make the count look lower.

## P1 Checklist
### Viewport And Review Authority
Goal:
- make the artifact feel like the decision stage.

Do:
- tighten `WorkbenchPreviewPane.tsx`,
- tighten `WorkbenchPreviewRuntimeSurface.tsx`,
- keep trust/readiness visible but compact,
- make live vs proposal states unmistakable.

Do not:
- let preview become a small widget beside chat.

### Operator Inevitability
Goal:
- make internet/browser work feel native and governed.

Do:
- bring operator states into the same Studio grammar,
- expose plan, approvals, evidence, and takeover controls,
- connect operator actions back to mission and artifact review.

Do not:
- present browser automation as hidden magic.

### AI To Artifact Loop
Goal:
- keep AI work tied to visible output, evidence, diff, and approval.

Do:
- continue consolidating `AI -> diff -> review -> apply`,
- keep evidence and economics near the work,
- compress AI telemetry into operational rails.
- keep `AIChatCostMeter` user-facing and `AIMarginSnapshotPanel`/`AIMarginRecommendationsPanel`/`AIMarginDrilldownPanel` operator-facing so token spending is visible without polluting the main flow.

Do not:
- grow a second generic chat product inside the Studio.
- show revenue dashboards without AI margin context.
- let registration succeed as a mock-only email flow without stored verification token, welcome email, and verify-email handoff.
- expose raw admin audit logs, unmasked IPs, or unfiltered metadata to regular users.

## P2 Checklist
### Buyer And Trust Continuity
Goal:
- make serious buyers understand proof, governance, and roadmap without leaving the product story.

Do:
- improve case-study depth,
- improve docs search and procurement path,
- keep claims grounded in real capabilities.
- keep `/trust` as the single public due-diligence map for security, compliance, status, privacy, terms, and responsible disclosure.
- keep `/security-policy` specific about safe harbor, in-scope surfaces, out-of-scope behavior, and AI-agent testing limits.
- keep `/reliability` as the bridge between `/status`, incident response, procurement, and enterprise due diligence.

Do not:
- add fake customer proof or inflated compliance language.
- scatter buyer-proof links across new navigation families when the trust center can stay compact.
- invite destructive security testing, third-party data access, or public disclosure before coordinated triage.

### Studio Local
Goal:
- turn the local Studio blueprint into a concrete implementation contract.

Do:
- define local install, sync, filesystem, runtime, and rollback boundaries,
- preserve the same shell grammar as Studio Cloud.

Do not:
- create a separate desktop-product identity.

### Domain Depth
Goal:
- make apps, research, cloud, games, and media feel specialized without fragmenting the product.

Do:
- use triage to choose default surfaces,
- keep one shared project model,
- add validators and review grammar per domain.
- preserve game/film production as mode-specific depth backed by Project Brain, Mission Ledger, Asset Graph, Scene Graph, Gameplay Graph, Shot Graph, Validation Graph, and Evidence Graph.

Do not:
- create separate navigation families for every domain.

## Visual Reference Rules
### Firebase
Use for:
- first-use clarity,
- mission input,
- low copy.

Never use for:
- lowering Studio depth.

### Vercel / Linear
Use for:
- density discipline,
- scanning,
- consistent product language.

Never use for:
- generic analytics dashboards.

### Aethel cockpit image
Use for:
- integrated professional tooling ambition.

Never use for:
- forcing dense cockpit UI onto first-time users.

### Unreal
Use for:
- viewport authority,
- inspector seriousness,
- advanced domain density.

Never use for:
- beginner Web Light or Studio Home defaults.

## Ready For Implementation Definition
A future implementation wave is aligned when it can answer:
- which canonical surface is being improved,
- which user persona benefits,
- which dominant surface should win,
- which existing files are being improved,
- which validation proves it did not regress,
- and which open gap remains afterward.

## Current Next Best Work
The next implementation waves should prioritize:
1. platform confidence and mojibake cleanup,
2. viewport/review/operator authority,
3. AI-to-artifact consolidation,
4. buyer proof and docs continuity,
5. Studio Local implementation contract.

## 2026-05-04 Durable Production Checklist Update
Done in this wave:
- Project Brain has a durable state model in `Project.settings.aethelProductionState`.
- Mission Ledger entries persist owner agent, acceptance, evidence refs, rollback, cost, and next action.
- Asset, Scene/World, Gameplay, Shot/Film, Validation, Evidence, and Release graphs now share one typed spine.
- Studio Home consumes the durable state compactly through Project Brain and Mission Ledger snapshots.
- `/api/projects/[id]/production-state` provides authenticated GET/PATCH access without creating a new navigation family.

Next required implementation:
- attach asset import/license events to Asset Graph,
- attach viewport screenshots and playtest clips to Evidence Graph,
- attach Browser Operator replays to Mission Ledger evidence,
- attach Studio Local capability probes to runtime policy decisions,
- add e2e coverage for mission -> production-state -> graph evidence -> approval.

## 2026-05-04 Repository Cartography Checklist Update
Done in this wave:
- `cloud-web-app/web/lib/production/repository-cartography.ts` creates a typed repository/project manifest for giant repos, assets, scenes, shots, tests, configs, external sources, and unknown surfaces.
- The manifest produces `mustReadFirst`, `doNotInvent`, `duplicateGroups`, `criticalGaps`, `external-mirror`, and `agentHandoffs` so agents do not rely on chat memory or partial folder scans.
- Hugging Face, GitHub, S3, marketplace, user upload, browser export, local workspace, and git source kinds are represented as metadata contracts before heavy downloads.
- Cartography merges into Project Brain, Mission Ledger, Asset Graph, Scene/World Graph, Gameplay Graph, Shot/Film Graph, Validation Graph, and Evidence Graph.
- `cloud-web-app/web/__tests__/production/repository-cartography.test.ts` covers GB-scale external sources, duplicates, license gaps, no-invention guardrails, and durable production-state merge.

Next required implementation:
- add a real workspace scanner that feeds file tree, size, hash, MIME, symbols, and dependency metadata into Repository Cartography incrementally,
- add external source adapters that mirror Hugging Face, GitHub, S3, and marketplace folder metadata without downloading full GB payloads,
- connect the cartography manifest to agent retrieval so every agent receives Project Brain, Mission Ledger, `mustReadFirst`, and its own handoff before editing,
- add e2e coverage for mission -> repository cartography -> agent plan -> evidence -> approval.

## 2026-05-04 Best-In-Market Benchmark V14 Checklist Update
Done in this wave:
- `docs/master/107_AETHEL_BEST_IN_MARKET_BENCHMARK_2026-05-04.md` reconciles the stale external V13 benchmark with current repo metrics.
- `tools/check-best-in-market-benchmark.mjs` protects required competitors, categories, visual references, Linear backlog, source links, and no-overclaim red lines.
- `cloud-web-app/web/__tests__/docs/best-in-market-benchmark.test.ts` verifies the benchmark stays current and does not revive stale V13 numbers as current truth.
- `qa:best-in-market-benchmark` is wired into product quality progress.

Next required implementation:
- create the Linear project and issues once Linear team/project identifiers are available,
- turn P0 epics into product work: Agent Fleet + Repository Cartography, Studio Home mission-first experience, and benchmark-gated execution.

## 2026-05-04 Linear Backlog Export Checklist Update
Done in this wave:
- `docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_BACKLOG.linear.json` defines the import-ready Linear project, labels, ten epics, and concrete child issues.
- `docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_BACKLOG.md` documents the manual/plugin creation workflow.
- `tools/linear-create-best-in-market-backlog.mjs` provides a safe dry-run by default and only mutates Linear with `--execute`.
- `npm run linear:best-in-market:dry-run` refreshes the creation plan and JSONL payload without remote writes.
- `tools/check-linear-best-in-market-backlog.mjs` validates schema, labels, epics, priorities, issue estimates, acceptance criteria, and no-overclaim red lines.
- `cloud-web-app/web/__tests__/docs/linear-best-in-market-backlog.test.ts` covers the backlog export without pretending remote Linear issue creation happened.
- `qa:linear-best-in-market-backlog` is wired into product quality progress.

Next required implementation:
- begin execution from the first P0/P1 batch: `AET-61`, `AET-62`, `AET-63`, `AET-66`, and `AET-67`,
- keep `AET-49` as the canonical parent for benchmark/report updates,
- keep `docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_SYNC_REPORT.md` updated if Linear identifiers change.

## 2026-05-04 Linear Remote Creation Update
Done after Linear connection:
- Created Linear project `Aethel Best-In-Market 2026-2027` in team `Aethel meu repo`.
- Created missing labels: `benchmark`, `studio-home`, `agent-fleet`, `repository-cartography`, `game-film`, `viewport`, `browser-operator`, and `performance`.
- Reused existing labels: `enterprise`, `mobile`, and `design-system`.
- Created 10 epic parent issues: `AET-49` through `AET-58`.
- Created 35 child issues: `AET-59` through `AET-93`.
- Added the creation report as a comment on `AET-49`.
- Wrote local sync report at `docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_SYNC_REPORT.md`.

## 2026-05-04 Studio Home Cartography + Agent Fleet Checklist Update
Done in this wave:
- Added `cloud-web-app/web/components/dashboard/dashboard-repository-cartography.ts` so Studio Home can read cartography-derived Project Brain, Mission Ledger, graph, evidence, risk, and handoff state.
- Added `cloud-web-app/web/components/dashboard/DashboardRepositoryCartographyCard.tsx` as a compact, low-noise Repository Cartography + Agent Fleet surface.
- Wired the card into `cloud-web-app/web/components/dashboard/DashboardOverviewTab.tsx` after Project Brain and Mission Ledger, preserving the Firebase/Gemini-style mission-first entry instead of turning the dashboard into a wall of tools.
- Fixed `cloud-web-app/web/lib/production/repository-cartography.ts` so root-level folders such as `docs/` classify correctly without a leading slash. This closes a real anti-hallucination gap for story bibles, contracts, and root docs.
- Added `cloud-web-app/web/__tests__/dashboard/dashboard-repository-cartography.test.ts` plus a root-folder regression in `cloud-web-app/web/__tests__/production/repository-cartography.test.ts`.

Validated:
- `npm --prefix cloud-web-app/web test -- --run __tests__/dashboard/dashboard-repository-cartography.test.ts`
- `npm --prefix cloud-web-app/web test -- --run __tests__/production/repository-cartography.test.ts`
- `npm --prefix cloud-web-app/web test -- --run __tests__/dashboard/dashboard-project-brain.test.ts __tests__/dashboard/dashboard-mission-ledger.test.ts __tests__/dashboard/dashboard-repository-cartography.test.ts`
- `npm --prefix cloud-web-app/web run typecheck`

Next required implementation:
- feed the card from a real incremental workspace scanner, not only persisted production state,
- add external metadata adapters for Hugging Face/GitHub/S3/marketplace manifests,
- make agent prompts consume the handoff snapshot before edits,
- add visual/e2e coverage for `mission -> cartography -> agent handoff -> evidence -> approval`.

## 2026-05-04 Repository Cartography Scanner Checklist Update
Done in this wave:
- Added `cloud-web-app/web/lib/production/repository-cartography-scanner.ts` for safe workspace scans using file metadata, size limits, max depth, max file count, ignored heavy folders, symlink skipping, MIME hints, mtime, and bounded hashing.
- Added `cloud-web-app/web/app/api/projects/[id]/production-state/cartography/route.ts` so authorized project owners/editors can scan the scoped workspace, build a Repository Cartography manifest, merge it into Project Brain/Mission Ledger/production graphs, and persist it.
- Wired `Scan context` into `cloud-web-app/web/components/dashboard/DashboardRepositoryCartographyCard.tsx` and `cloud-web-app/web/components/dashboard/DashboardOverviewTab.tsx`.
- Added `cloud-web-app/web/__tests__/production/repository-cartography-scanner.test.ts`, `cloud-web-app/web/__tests__/api/production-state-cartography-route.test.ts`, and `cloud-web-app/web/__tests__/dashboard/DashboardRepositoryCartographyCard.test.tsx`.

Validated:
- `npm --prefix cloud-web-app/web test -- --run __tests__/production/repository-cartography-scanner.test.ts __tests__/api/production-state-cartography-route.test.ts`
- `npm --prefix cloud-web-app/web test -- --run __tests__/dashboard/DashboardRepositoryCartographyCard.test.tsx`

Next required implementation:
- stream scan progress for large repos instead of waiting for one POST response,
- add Hugging Face/GitHub/S3/marketplace metadata mirror adapters,
- make agent generation/apply routes require a fresh cartography manifest for large workspaces.

## 2026-05-04 Agent Handoff Packet Checklist Update
Done in this wave:
- Added latest-manifest persistence via `aethelRepositoryCartographyManifest`.
- Updated `cloud-web-app/web/app/api/projects/[id]/production-state/cartography/route.ts` to persist the manifest alongside Project Brain/Mission Ledger/production graphs.
- Added `cloud-web-app/web/lib/production/agent-handoff-packet.ts` with a scoped, evidence-first handoff packet for long-running agents.
- Added `cloud-web-app/web/app/api/projects/[id]/production-state/agent-handoff/route.ts` so project users can request a packet per agent.
- Added `cloud-web-app/web/__tests__/production/agent-handoff-packet.test.ts` and `cloud-web-app/web/__tests__/api/production-state-agent-handoff-route.test.ts`.

Validated:
- `npm --prefix cloud-web-app/web test -- --run __tests__/production/agent-handoff-packet.test.ts __tests__/api/production-state-agent-handoff-route.test.ts __tests__/production/repository-cartography.test.ts __tests__/api/production-state-cartography-route.test.ts`

Next required implementation:
- require agent handoff packets in AI generation/apply routes for large projects,
- render a compact "handoff ready" state in Agent Mode,
- add stale-manifest warnings when files change after the last scan,
- move manifest storage out of `Project.settings` if real manifests exceed safe JSON size.

## 2026-05-04 AI Route Handoff Enforcement Checklist Update
Done in this wave:
- Added `cloud-web-app/web/lib/production/agent-handoff-context.ts` to load the durable Project Brain, latest Mission Ledger, persisted Repository Cartography manifest, and scoped Agent Handoff Packet for AI requests.
- Wired `/api/ai/chat`, `/api/ai/inline-edit`, and `/api/ai/complete` to inject that handoff context into model messages whenever a project-scoped request can be resolved.
- Added route-kind and prompt/file-path based agent inference so game, film, asset, release, validation, and software work receive the right packet without exposing another menu to the user.
- Added `cloud-web-app/web/__tests__/production/agent-handoff-context.test.ts` and `cloud-web-app/web/__tests__/api/ai-chat-agent-handoff-route.test.ts`.

Validated:
- `npm --prefix cloud-web-app/web test -- --run __tests__/production/agent-handoff-context.test.ts __tests__/api/ai-chat-agent-handoff-route.test.ts`

Next required implementation:
- add a hard fresh-manifest gate for broad multi-file/background-agent edits,
- wire handoff context into `/api/ai/change/apply` and long-running agent run routes,
- render the returned `agentHandoff` metadata in the chat/Agent Mode UI as a compact "grounded by cartography" indicator,
- add e2e coverage for `cartography scan -> AI prompt -> diff proposal -> evidence`.

## 2026-05-04 Parallel Agent Work Contract Checklist Update
Done in this wave:
- Added `cloud-web-app/web/lib/production/parallel-agent-work-contract.ts`.
- Extended Agent Handoff Packets with `workContract` for agent lane, allowed tools, blocked-until rules, scope lock, parallel rules, approval requirements, research policy, Browser Operator policy, required evidence, and allowed parallel peers.
- Updated prompt handoff context so project-scoped AI routes receive a compact parallel-work contract before generation/editing.
- Updated `/api/ai/chat` response metadata with `lane` and `scopeMode` for future compact UI indicators.
- Added `cloud-web-app/web/__tests__/production/parallel-agent-work-contract.test.ts` and expanded handoff/context/route coverage.

Validated:
- `npm --prefix cloud-web-app/web test -- --run __tests__/production/parallel-agent-work-contract.test.ts __tests__/production/agent-handoff-packet.test.ts __tests__/production/agent-handoff-context.test.ts __tests__/api/ai-chat-agent-handoff-route.test.ts`

Next required implementation:
- enforce scope locks inside tool execution and apply routes,
- persist Browser Operator replay evidence and approval results,
- add exclusive-surface locking for parallel agent sessions,
- expose only a small "agent lane + grounded" indicator in chat/Agent Mode, not a noisy dashboard.

## 2026-05-04 Apply-Time Agent Scope Enforcement Checklist Update
Done in this wave:
- Added `cloud-web-app/web/lib/production/agent-scope-enforcement.ts`.
- Wired `/api/ai/change/apply` to load the project handoff packet and block broad/agent-scoped applies without Repository Cartography.
- The apply route now blocks read-only agent packets, blocked handoff packets, and paths outside declared owned surfaces before QA/write execution.
- Added `cloud-web-app/web/__tests__/production/agent-scope-enforcement.test.ts`.
- Added `cloud-web-app/web/__tests__/api/ai-change-apply-agent-scope-route.test.ts`.

Validated:
- `npm --prefix cloud-web-app/web test -- --run __tests__/api/ai-change-apply-agent-scope-route.test.ts __tests__/production/agent-scope-enforcement.test.ts`

Next required implementation:
- store exclusive surface locks per live agent session,
- add stale-manifest gates before high-impact apply,
- extend approval enforcement to Browser Operator irreversible account/cloud actions,
- expose compact UI state only after the backend enforcement path is stable.

## 2026-05-04 Agent Tool Scope Enforcement Checklist Update
Done in this wave:
- Wired `cloud-web-app/web/lib/ai-tools-registry.ts` so explicit agent-scoped `create_file` and `edit_file` executions load the project Agent Handoff Packet before writing.
- Reused `cloud-web-app/web/lib/production/agent-scope-enforcement.ts` so tool writes and apply writes share one safety decision model.
- Agent-scoped tool writes now block on missing Repository Cartography, read-only packets, blocked packets, and paths outside owned surfaces.
- Updated `cloud-web-app/web/lib/ai-agent-system.ts` to forward agent identity and optional `enforceAgentScope` into tool calls.
- Opted project-scoped `/api/ai/chat-advanced` agent runs and `AICommandCenter` runs into scoped tool enforcement.
- Added `cloud-web-app/web/__tests__/production/ai-tools-agent-scope.test.ts`.

Validated:
- `npm --prefix cloud-web-app/web test -- --run __tests__/production/ai-tools-agent-scope.test.ts __tests__/production/agent-scope-enforcement.test.ts __tests__/api/ai-change-apply-agent-scope-route.test.ts`

Next required implementation:
- add exclusive-surface locks so two agents cannot write the same owned path at the same time,
- add stale-manifest detection after file changes and before high-impact agent applies,
- extend this model to delete/move/copy filesystem actions once their agent-scoped call sites are identified,
- add e2e coverage for `cartography scan -> agent tool write -> ledger evidence -> approval`.

## 2026-05-04 Agent Fleet Coordinator UX Checklist Update
Done in this wave:
- Added `cloud-web-app/web/lib/production/agent-fleet-session.ts`.
- Added durable `aethelAgentFleetPreferences` for central coordinator, enabled agents, paused state, and mode.
- Added compact Agent Fleet snapshots with senior coordinator, specialist lanes, scope mode, owned surfaces, blockers, composer modes, switcher hint, and user controls.
- Added `cloud-web-app/web/app/api/projects/[id]/production-state/agent-fleet/route.ts` for `GET` and permissioned `PATCH`.
- Users can promote a specialist agent as the senior coordinator without creating a new top-level UI surface.
- Added `cloud-web-app/web/__tests__/production/agent-fleet-session.test.ts`.
- Added `cloud-web-app/web/__tests__/api/production-state-agent-fleet-route.test.ts`.

Validated:
- `npm --prefix cloud-web-app/web test -- --run __tests__/production/agent-fleet-session.test.ts __tests__/api/production-state-agent-fleet-route.test.ts`

Next required implementation:
- render a compact coordinator/agent switcher in chat and Agent Mode,
- persist live agent session output/cost/review state,
- add exclusive locks under each fleet member,
- add e2e coverage for `choose coordinator -> delegate specialist -> review evidence -> approve`.

## 2026-05-04 Agent Fleet Compact Chat UX Checklist Update
Done in this wave:
- Added `cloud-web-app/web/components/ai/AgentFleetCoordinatorStrip.tsx`.
- Wired the compact fleet strip into `cloud-web-app/web/components/ai/AICommandCenter.tsx` for real project contexts.
- Users can switch senior coordinator, choose coordinator/specialist/review composer mode, pause/resume the fleet, and see lane status without opening another surface.
- Production fleet agents are mapped to existing command-center agents so the current runtime can act on the selected coordinator immediately.
- Fixed suggestion execution so suggested prompts run with the suggestion's intended agent, not the previously selected agent.
- Added `cloud-web-app/web/__tests__/ai/AgentFleetCoordinatorStrip.test.tsx`.

Validated:
- `npm --prefix cloud-web-app/web test -- --run __tests__/ai/AgentFleetCoordinatorStrip.test.tsx`

Next required implementation:
- persist live agent session output, cost, and review state under each fleet member,
- add exclusive live surface locks so two agents cannot write the same asset/file/scene at once,
- add stale-manifest warnings in the compact strip,
- add e2e coverage for coordinator selection, specialist delegation, evidence review, and approval.

## 2026-05-04 Agent Surface Locks + Stale Manifest Checklist Update
Done in this wave:
- Added `cloud-web-app/web/lib/production/agent-surface-locks.ts`.
- Extended Agent Handoff Packets with manifest generation time and surface last-modified data.
- Extended `evaluateAgentApplyScope` with stale-manifest blocking via `AGENT_SCOPE_STALE_MANIFEST`.
- Wired `/api/ai/change/apply` to pass target mtimes and acquire runtime surface locks before scoped writes.
- Wired `cloud-web-app/web/lib/ai-tools-registry.ts` to check DB file `updatedAt`, block stale scoped tools, and acquire runtime surface locks before `create_file` / `edit_file` mutations.
- Added/expanded tests for lock renewal, conflict detection, expiry, nested surface overlap, stale manifest blocking, and scoped tool lock conflicts.

Validated:
- `npm --prefix cloud-web-app/web test -- --run __tests__/production/agent-scope-enforcement.test.ts __tests__/production/agent-surface-locks.test.ts __tests__/production/ai-tools-agent-scope.test.ts __tests__/api/ai-change-apply-agent-scope-route.test.ts`
- `npm --prefix cloud-web-app/web run lint`
- `npm --prefix cloud-web-app/web run typecheck`

Next required implementation:
- persist locks in Redis/DB rather than runtime memory only,
- show locked/stale lane state inside `AgentFleetCoordinatorStrip`,
- add Browser Operator irreversible-action locks/approvals,
- add e2e coverage for stale cartography and agent conflict resolution.

## 2026-05-04 Agent Fleet Lock/Stale Visibility Checklist Update
Done in this wave:
- Added active-lock listing to `cloud-web-app/web/lib/production/agent-surface-locks.ts`.
- Added lock/stale fields to Agent Fleet member snapshots and aggregate snapshot counts.
- Wired active locks into `GET/PATCH /api/projects/[id]/production-state/agent-fleet`.
- Updated `AgentFleetCoordinatorStrip` with compact `locks`, `rescan needed`, `L`, and `S` indicators.
- Expanded focused coverage in `agent-fleet-session`, `production-state-agent-fleet-route`, and `AgentFleetCoordinatorStrip` tests.

Validated:
- `npm --prefix cloud-web-app/web test -- --run __tests__/production/agent-fleet-session.test.ts __tests__/api/production-state-agent-fleet-route.test.ts __tests__/ai/AgentFleetCoordinatorStrip.test.tsx __tests__/production/agent-surface-locks.test.ts`
- `npm --prefix cloud-web-app/web run lint`
- `npm --prefix cloud-web-app/web run typecheck`

Next required implementation:
- make locks durable across deployments,
- add click-through from `rescan needed` to Repository Cartography scan,
- add e2e coverage for lock conflict/rescan/approval,
- extend lock visibility to Browser Operator irreversible actions.

## 2026-05-04 Repository Context Budget Checklist Update
Done in this wave:
- Added `contextBudget` to Repository Cartography manifests.
- Added retrieval batches for direct canonical reads, summarize-first surfaces, heavy indexes, external mirrors, and manual review queues.
- Propagated context budget into Agent Handoff Packets and AI handoff system context.
- Added `context-budget` to the Parallel Agent Work Contract toolbelt and safety rules.
- Expanded focused tests for cartography, handoff packets, handoff context, and work contracts.

Validated:
- `npm --prefix cloud-web-app/web test -- --run __tests__/production/repository-cartography.test.ts __tests__/production/agent-handoff-packet.test.ts __tests__/production/agent-handoff-context.test.ts __tests__/production/parallel-agent-work-contract.test.ts`

Next required implementation:
- persist per-batch execution/retrieval state,
- implement source-specific metadata mirrors for Hugging Face, GitHub, S3, marketplace, and browser exports,
- show compact batch progress inside Repository Cartography and Agent Fleet surfaces,
- add e2e coverage for `scan repo -> build context budget -> delegate agent -> retrieve only approved slices`.

## 2026-05-04 Repository Context Budget UI Checklist Update
Done in this wave:
- Added manifest-backed context budget summary to the Repository Cartography dashboard snapshot.
- Added compact `Reading plan` chips to the Repository Cartography card.
- Wired Dashboard Overview to pass the persisted Repository Cartography manifest into the card snapshot.
- Expanded dashboard cartography and card tests.

Validated:
- `npm --prefix cloud-web-app/web test -- --run __tests__/dashboard/dashboard-repository-cartography.test.ts __tests__/dashboard/DashboardRepositoryCartographyCard.test.tsx __tests__/production/repository-cartography.test.ts __tests__/production/agent-handoff-context.test.ts`

Next required implementation:
- persist retrieval batch execution state,
- make each `Reading plan` chip drill into exact surfaces without adding dashboard clutter,
- add e2e coverage for `scan context -> view reading plan -> open agent handoff`.

## 2026-05-04 Repository Context Budget Execution Checklist Update
Done in this wave:
- Added durable `aethelRepositoryContextBudgetExecution` settings state.
- Added execution statuses: pending, running, complete, blocked.
- Added batch evidence refs, blockers, completed surface counts, and manifest freshness identity.
- Cartography scans now persist initial execution state.
- Added `GET/PATCH /api/projects/[id]/production-state/context-budget`.
- Agent handoff route and AI handoff context now expose execution state.
- Studio Home reads persisted execution state for compact `Reading plan` progress.
- Added focused tests for execution state, route permissions, scan persistence, handoff payloads, AI context, and dashboard snapshots.

Validated:
- `npm --prefix cloud-web-app/web test -- --run __tests__/production/repository-context-budget-execution.test.ts __tests__/api/production-state-context-budget-route.test.ts __tests__/api/production-state-cartography-route.test.ts __tests__/api/production-state-agent-handoff-route.test.ts __tests__/dashboard/dashboard-repository-cartography.test.ts __tests__/dashboard/DashboardRepositoryCartographyCard.test.tsx __tests__/production/agent-handoff-context.test.ts`

Next required implementation:
- add source-specific retrieval workers,
- attach real summaries/thumbnails/indexes/license reports as evidence refs,
- make batch chips drill into the exact surfaces and evidence,
- add e2e coverage for context budget progress through agent handoff and approval.

## 2026-05-04 Viewport Gizmo Operation Contract
Done in this wave:
- Added `cloud-web-app/web/lib/viewport/gizmo-transform-operation.ts` so gizmo moves become durable operation contracts with before/after snapshots, deltas, validation, evidence refs, and rollback targets.
- Wired `cloud-web-app/web/components/viewport/AethelViewport3D.tsx` so direct user drags and AI text-to-action transforms both emit the same contract through `onGizmoTransformOperation`.
- Added `cloud-web-app/web/__tests__/viewport/gizmo-transform-operation.test.ts` to cover safe transforms, unsafe blockers, rollback generation, and evidence-timeline summaries.

Next:
- persist gizmo operations into Mission Ledger and Evidence Graph,
- capture viewport screenshots/playtest clips as evidence refs,
- add approval gates for risky AI transforms,
- add numeric transform input and ghost previews without cluttering the viewport.

## 2026-05-04 Viewport Gizmo Persistence
Done in this wave:
- Added `cloud-web-app/web/lib/production/gizmo-production-state.ts` to merge gizmo transform operations into Mission Ledger, Scene/World Graph, Evidence Graph, and Validation Graph.
- Added `cloud-web-app/web/app/api/projects/[id]/production-state/gizmo-transform/route.ts` so project owners/editors can persist validated gizmo operations into durable production state.
- Extended `cloud-web-app/web/lib/viewport/gizmo-transform-operation.ts` with a safe coercion path for operation payloads.
- Added `cloud-web-app/web/__tests__/production/gizmo-production-state.test.ts` and `cloud-web-app/web/__tests__/api/production-state-gizmo-transform-route.test.ts`.

Next:
- call the persistence route from the viewport when `onGizmoTransformOperation` is provided by the owning Studio shell,
- attach actual screenshot/clip capture refs instead of placeholder evidence ids,
- render the latest gizmo ledger entry as a compact review chip near the viewport,
- add risky-transform approval behavior for AI operations before final application.

## 2026-05-04 Viewport Gizmo Auto-Persistence Bridge
Done in this wave:
- Added `cloud-web-app/web/lib/viewport/gizmo-transform-persistence.ts` to build authenticated persistence requests and avoid fake success for local-only project ids.
- Added `cloud-web-app/web/hooks/useGizmoTransformPersistence.ts` so viewport shells can persist gizmo operations without visual clutter.
- Passed `projectId` through `CanonicalPreviewSurface`, `SceneViewportSurface`, and `SceneViewportStage`.
- Wired `cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewPane.tsx` so the real IDE 3D viewport sends gizmo operations to production memory.
- Added `cloud-web-app/web/__tests__/viewport/gizmo-transform-persistence.test.ts`.

Next:
- add a tiny review chip showing the latest persisted gizmo operation state,
- capture real viewport screenshots/clips before posting evidence refs,
- optionally debounce/queue multiple drag operations into one mission-ledger entry when users perform rapid adjustment passes.

## 2026-05-04 Viewport Gizmo Review Chip
Done in this wave:
- Added `buildGizmoTransformPersistenceChip` in `cloud-web-app/web/lib/viewport/gizmo-transform-persistence.ts`.
- `useGizmoTransformPersistence` now keeps the last operation label for compact review feedback.
- `cloud-web-app/web/components/viewport/AethelViewport3D.tsx` renders a small non-blocking gizmo memory chip for saving/saved/local-only/error states.
- `cloud-web-app/web/components/preview/SceneViewportStage.tsx` passes persistence status, label, error, and capability into the viewport.
- Extended `cloud-web-app/web/__tests__/viewport/gizmo-transform-persistence.test.ts` to cover the chip model.

Next:
- attach real screenshot/clip capture to the evidence refs,
- add optional rollback action from the chip once persisted operations can be fetched back into the current viewport session,
- batch rapid drag passes so small adjustment sequences produce one clean Mission Ledger entry.

## 2026-05-04 Viewport Gizmo Review Packets
Done in this wave:
- Added `cloud-web-app/web/lib/production/gizmo-review-packets.ts` to convert persisted gizmo ledger and graph state into compact review packets.
- Added `GET /api/projects/[id]/production-state/gizmo-transform` so readable project members can fetch recent gizmo review state without mutating settings.
- Extended `POST /api/projects/[id]/production-state/gizmo-transform` to return the latest review packet after persistence.
- Added `cloud-web-app/web/__tests__/production/gizmo-review-packets.test.ts` and extended `cloud-web-app/web/__tests__/api/production-state-gizmo-transform-route.test.ts`.

Next:
- capture real viewport screenshot/clip evidence refs,
- add rollback/replay affordances using the fetched review packet,
- batch rapid drag passes into one clean Mission Ledger entry.

## 2026-05-05 Expensive AI Generation Guard
Done in this wave:
- Added `cloud-web-app/web/lib/server/ai-expensive-generation-guard.ts` for image/3D/music/voice cost estimation, plan-domain checks, metered usage consumption, and quota headers.
- Wired the guard into image, 3D, music, and voice generation routes before provider calls.
- Replaced touched route console failure paths with structured logger errors.
- Added `cloud-web-app/web/__tests__/server/ai-expensive-generation-guard.test.ts`.
- Extended `tools/check-ai-game-film-production-contract.mjs` so the guard cannot be removed silently.

Next:
- add Turnstile/signup abuse checks,
- add BannedIp/BannedDevice enforcement,
- migrate remaining AI routes to one shared metering style instead of mixed legacy quota helpers.

## 2026-05-05 - Auth Abuse Prevention Execution

- [x] Add server-side Turnstile guard for login/register without blocking local development.
- [x] Keep failures explicit: `TURNSTILE_REQUIRED`, `TURNSTILE_FAILED`, `TURNSTILE_NOT_CONFIGURED`, `TURNSTILE_UNAVAILABLE`.
- [x] Remove remaining auth route `console.error` and unsafe role `any` cast.
- [x] Add `qa:auth-abuse-prevention` to the product quality progress gate.
- [x] Add focused tests for token aliases, missing token, provider failure and client IP forwarding.
