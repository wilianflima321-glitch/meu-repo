# AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_BACKLOG
Date: 2026-05-04
Status: READY_FOR_LINEAR_CREATION
Source: docs/master/107_AETHEL_BEST_IN_MARKET_BENCHMARK_2026-05-04.md

## Connection Status
Linear was referenced by the user, but callable Linear project/issue tools are not exposed in this Codex session. This backlog is therefore prepared as the source of truth for a later Linear creation pass once a Linear team/project is available.

Required before creation:
- Linear workspace access
- Linear team ID or team key
- Permission to create project, labels, and issues
- Optional existing project ID if the project already exists

## Suggested Project
Name: Aethel Best-In-Market 2026-2027

Mission: Turn Aethel into a mission-first production Studio that unifies IDE, agents, repository cartography, browser operator, viewport, game/film pipelines, cloud/local runtime, and evidence-first release.

## Labels
- `benchmark`: Benchmark docs, gates, source reconciliation, and no-overclaim controls.
- `studio-home`: Mission-first web entry, Studio Home, onboarding, and first artifact.
- `agent-fleet`: Parallel agents, isolation, ownership, handoff, evidence, cost, and rollback.
- `repository-cartography`: Large-repo maps, indexing, source mirrors, manifests, and anti-duplication context.
- `game-film`: Game, film, animation, storytelling, asset and validation pipelines.
- `viewport`: 3D viewport, outliner, inspector, timeline, render/playtest preview.
- `browser-operator`: Agentic web navigation with plan, approval, replay, and user takeover.
- `enterprise`: Trust, audit, billing, procurement, compliance, reliability, and margin governance.
- `performance`: Monorepo scale, worker lanes, local/cloud runtime, non-blocking heavy jobs.
- `mobile`: Mobile companion for review, approvals, evidence, pause/stop, and lightweight oversight.
- `design-system`: Premium UX density, spacing, visual cohesion, design canvas and Figma MCP patterns.

## Epics And Issues
### BIM-EPIC-00 - Benchmark V14 Canonical Audit
Priority: P0
Labels: `benchmark`

Rationale: Keep the product pointed at factual market-quality execution instead of stale aspiration.

Acceptance criteria:
- Canonical V14 doc exists and is active.
- Gate prevents stale V13 metrics from being copied as current truth.
- Required competitors, categories, visual references, and red lines are covered.
- Every opportunity is mapped to an epic or an explicit not-now decision.

Issues:
- BIM-001 [P0] Maintain V14 benchmark gate as a release blocker (2 pts): qa:best-in-market-benchmark runs in qa:product-quality-progress; Gate fails if required competitors/categories/red lines are removed
- BIM-002 [P1] Refresh benchmark source snapshots before major market claims (3 pts): Official source URLs are checked before claims change; Historical/outdated inputs are explicitly marked

### BIM-EPIC-01 - Agent Fleet + Repository Cartography
Priority: P0
Labels: `agent-fleet`, `repository-cartography`, `performance`

Rationale: Aethel wins if agents can understand and work inside huge apps, games, films, assets, and repos without inventing or duplicating work.

Acceptance criteria:
- Agent sessions show owner, scope, repo map, changed files, evidence, cost, rollback, and next action.
- Repository Cartography supports incremental indexing, source mirrors, file manifests, asset maps, dependency maps, and stale-context warnings.
- Agents must cite cartography or search evidence before large edits.
- Large repo work does not block the UI thread.

Issues:
- BIM-010 [P0] Expose Repository Cartography map in Studio and IDE context (5 pts): User can see repo map summary, hotspots, domains, asset folders, and unknown areas; Agents can attach repo-map evidence to Mission Ledger entries
- BIM-011 [P0] Add isolated Agent Fleet sessions with scope and ownership (8 pts): Each agent has a visible task, file scope, status, cost, output, and merge/review state; Agents cannot silently edit outside declared scope
- BIM-012 [P0] Add anti-duplication and anti-invention guardrails from cartography (5 pts): Before creating new modules, agent checks similar files and existing contracts; Mission Ledger records why new work is not duplicate
- BIM-013 [P1] Support external source mirrors for very large repos and asset packs (8 pts): Mirror metadata includes source, revision, license/provenance, size, and sync status; Large mirrors can be indexed incrementally
- BIM-014 [P1] Create agent handoff packets for long-running work (5 pts): Handoff includes goal, current state, repo evidence, decisions, blockers, next commands, validation status; A new agent can resume without reading the entire repo blindly

### BIM-EPIC-02 - Studio Home Mission-First Experience
Priority: P0
Labels: `studio-home`, `design-system`, `mobile`

Rationale: The first screen must feel like Firebase/Gemini/Manus-level calm: one mission card, preview, agents, evidence, and next action without clutter.

Acceptance criteria:
- First logged-in screen has one dominant mission card.
- Project Brain, Mission Ledger, preview, agent status, device policy, and next action are visible but compact.
- Advanced IDE depth is one click away, not forced on beginners.
- Mobile companion can approve, pause, review evidence, and stop risky work.

Issues:
- BIM-020 [P0] Refine Studio Home around one dominant mission card (5 pts): No dashboard clutter on first view; Primary CTA starts/resumes mission; Preview and evidence are secondary but visible
- BIM-021 [P0] Add compact Project Brain and Mission Ledger modules to Studio Home (5 pts): User can inspect goal, constraints, decisions, risks, latest evidence, and next action; No long text walls by default
- BIM-022 [P1] Add device/runtime policy card for cloud/local/NPU/GPU routing (5 pts): UI explains whether work is cloud, local, hybrid, throttled, or paused; Heavy jobs do not surprise the user
- BIM-023 [P1] Define Mobile Companion approval-only MVP (3 pts): MVP scope is review, approve, pause, stop, evidence, status; No heavy editing promises on mobile

### BIM-EPIC-03 - Game/Film Viewport Authority
Priority: P1
Labels: `game-film`, `viewport`, `repository-cartography`

Rationale: Aethel should not claim Unreal parity; it should make game/film work understandable, validated, and agent-operable in browser-first workflows.

Acceptance criteria:
- Game/film mode makes viewport the protagonist.
- Outliner, inspector, timeline, asset provenance, playtest/render evidence, and performance budget are accessible.
- Every generated asset/scene/shot links to source, license, dependency, usage, validation, and approval status.

Issues:
- BIM-030 [P1] Promote viewport layout for game/film missions (8 pts): Viewport has primary visual weight; Outliner/inspector/timeline/chat are progressive panels, not dashboard clutter
- BIM-031 [P1] Add Asset Graph provenance and approval surface (8 pts): Asset records source, license, quality, size, LOD, material, animation, dependencies, scene usage, and approval
- BIM-032 [P1] Add Scene/World Graph review surface (8 pts): Scenes show levels, shots, cameras, lighting, characters, triggers, streaming, and performance budgets
- BIM-033 [P1] Add Gameplay Graph validation packets (8 pts): Combat, powers, input, camera, enemies, quests, physics, progression, difficulty, and playtest criteria are tracked
- BIM-034 [P2] Add Shot/Film Graph validation packets (8 pts): Script, storyboard, continuity, camera, timeline, audio, subtitles, render queue, review, and export are tracked

### BIM-EPIC-04 - Design Canvas + Figma MCP Parity
Priority: P1
Labels: `design-system`

Rationale: Aethel should learn from Replit/Figma design-to-code without turning into a separate design app.

Acceptance criteria:
- Design references can be attached to a mission.
- Figma context can map components/tokens/intent to implementation tasks when configured.
- Design canvas remains progressive depth, not first-screen clutter.

Issues:
- BIM-040 [P1] Define design reference attachment model for missions (3 pts): Mission can reference images, Figma nodes, competitor screenshots, and notes with source labels
- BIM-041 [P1] Create Figma MCP mapping contract for components and tokens (5 pts): Contract explains design context, component mapping, token mapping, limitations, and review evidence
- BIM-042 [P2] Add design-canvas not-now boundaries (2 pts): Doc states what Aethel will not build until core mission/viewport/agent spine is mature

### BIM-EPIC-05 - Browser Operator Manus-Style Approvals
Priority: P1
Labels: `browser-operator`, `enterprise`

Rationale: Aethel can safely help users configure domains, clouds, platforms, research, and accounts only if actions are governed and replayable.

Acceptance criteria:
- Operator work has plan, permissions, replay, pause/takeover, risk labels, and Mission Ledger evidence.
- Logged-in, financial, cloud, domain, deploy, and destructive actions require explicit approval.
- Mission Ledger records the approved action, evidence, risk, and rollback or recovery path.

Issues:
- BIM-050 [P1] Add Browser Operator permission manifest per mission (5 pts): Manifest lists allowed sites, actions, credentials boundaries, approval requirements, and stop conditions
- BIM-051 [P1] Add Browser Operator replay and evidence ledger (8 pts): Each step stores screenshot/log/action/result/risk/approval state
- BIM-052 [P1] Add pause and takeover semantics to operator UX (5 pts): User can pause, reject, approve, or take over before risky steps

### BIM-EPIC-06 - Realtime Collaboration + Versioning
Priority: P1
Labels: `agent-fleet`, `repository-cartography`

Rationale: Aethel needs collaboration that includes humans and agents: presence, ownership, conflicts, worktrees, merge review, and rollback.

Acceptance criteria:
- Remote cursors and file presence are visible and tested.
- Agent worktrees or isolated sessions expose diff, conflicts, owner, and merge review.
- Rollback is visible from Mission Ledger evidence.

Issues:
- BIM-060 [P1] Expose remote cursors and file presence in IDE (8 pts): Two-browser e2e sees cursor and file presence; Presence is not rendered for stale users
- BIM-061 [P1] Add agent worktree/diff review model (8 pts): Agent outputs are reviewable before merge; Conflict state is explicit
- BIM-062 [P1] Tie merge/rollback actions to Mission Ledger (5 pts): Every merge records evidence, validation, and rollback route

### BIM-EPIC-07 - Adobe-Style Creative Media Pipeline
Priority: P2
Labels: `game-film`, `design-system`

Rationale: Creative media needs variants, rights, timeline, color/export discipline, and review instead of loose generated media.

Acceptance criteria:
- Media generation creates reviewable variants.
- Timeline/render queue/color/export basics are tracked before professional claims.
- Rights/provenance are attached to generated/imported media.

Issues:
- BIM-070 [P2] Add creative variant review model (5 pts): Variants include prompt, source, rights, quality notes, approval, and use target
- BIM-071 [P2] Define render queue MVP for film/game previews (5 pts): Queue stores job settings, output URL/status, logs, cost, and review evidence
- BIM-072 [P2] Add media rights/provenance gate (5 pts): Generated/imported media cannot be marked release-ready without provenance status

### BIM-EPIC-08 - Enterprise Trust/Billing Readiness
Priority: P2
Labels: `enterprise`

Rationale: Enterprise readiness is trust plus evidence: billing transparency, audit, reliability, procurement, incident history, and factual claims.

Acceptance criteria:
- Trust, billing, audit, margin, incident posture, and procurement docs remain factual and linked.
- Users can see cost, usage, risk, and release evidence without hunting through admin pages.
- Marketing and sales claims are blocked when evidence, source doc, or certification status is missing.

Issues:
- BIM-080 [P2] Create procurement-ready trust packet index (3 pts): Index links security disclosure, reliability, billing, audit log, data policy, and incident docs
- BIM-081 [P2] Expose mission-level cost and margin evidence (5 pts): Mission shows AI usage/cost budget and heavy job cost signals
- BIM-082 [P2] Add factual certification/claim registry (3 pts): Marketing claims map to evidence or are blocked as not-yet-supported

### BIM-EPIC-09 - Performance, Monorepo, Local Runtime Scale
Priority: P2
Labels: `performance`, `repository-cartography`, `mobile`

Rationale: To work with GB-scale repos, games, assets, and films, Aethel must index incrementally, route heavy work, and avoid freezing user devices.

Acceptance criteria:
- Huge repo scans use incremental cartography, source mirrors, caching, workers, and local/cloud routing.
- Device capabilities and runtime lanes are visible.
- Weak devices fall back safely to cloud or throttled jobs.

Issues:
- BIM-090 [P2] Add runtime lane policy for UI, AI, build, render, browser, and indexing jobs (8 pts): Heavy jobs run in separate workers/queues where possible; UI thread remains responsive under long jobs
- BIM-091 [P2] Add device capability profile for GPU/NPU/CPU/RAM and cloud fallback (5 pts): Profile records capability, recommended lane, fallback reason, and user-facing status
- BIM-092 [P2] Add GB-scale repository fixture and performance validation plan (5 pts): Fixture plan covers huge codebase, asset pack, game scene, film timeline, and weak-device simulation
- BIM-093 [P2] Create cache and crash-recovery policy for Studio Local (5 pts): Local cache, offline behavior, crash recovery, and cloud sync conflict rules are documented and testable

## Creation Workflow For Linear
1. Run `npm run linear:best-in-market:dry-run` to refresh the creation plan and JSONL payload.
2. Create or locate project `Aethel Best-In-Market 2026-2027`.
3. Export `LINEAR_API_KEY` or `LINEAR_ACCESS_TOKEN`.
4. Export `LINEAR_TEAM_ID` or `LINEAR_TEAM_KEY`.
5. Optionally export `LINEAR_PROJECT_ID` to attach all issues to an existing Linear project.
6. Run `npm run linear:best-in-market:create` to create missing labels plus epic/child issues.
7. Link created Linear URLs back into this file or generate a synced creation report.

Dry-run report: `docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_CREATE_PLAN.md`

Creation payload: `docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_CREATE_PAYLOAD.jsonl`

## Red Lines
- Do not claim Nanite, Lumen, Unreal parity, Premiere parity, Figma parity, Cursor parity, Manus parity, or autonomous AAA completion until acceptance evidence exists.
- Do not create a separate product shell for every domain; use progressive depth from Web Light to Studio Home to Studio Cloud/Local.
- Do not let chat become the product spine; mission, artifact, evidence, approval, and rollback are the spine.
- Do not allow logged-in browser actions without explicit approval, replay, pause/takeover, and risk labels.
- Do not treat external assets as safe until provenance, license, size, dependency, LOD, and scene usage are recorded.

## Machine-Readable Source
Use `docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_BACKLOG.linear.json` for scripted creation.
