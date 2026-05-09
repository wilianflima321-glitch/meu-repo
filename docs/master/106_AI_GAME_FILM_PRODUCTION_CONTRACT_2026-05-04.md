# 106_AI_GAME_FILM_PRODUCTION_CONTRACT_2026-05-04
Date: 2026-05-04
Status: ACTIVE
Role: AI Game/Film Production Contract for Aethel's agentic creative pipeline

## Why This Exists
The user request is not for another interface. It is for an end-to-end, bit-by-bit production spine that lets Aethel's AI agents and users create, edit, improve, validate, organize, and ship games or films without losing quality, story continuity, asset provenance, performance, or user trust.

This document is the canonical contract for that spine.

Aethel must not claim Unreal parity in the browser today. The stronger target is an AI production operating system where Web Light stays simple, Studio Home keeps mission continuity, Studio Cloud carries the internal IDE/viewport depth, and Studio Local unlocks heavy native/GPU/device work when the user needs it.

## Existing Anchors We Already Have
These are real anchors, not invented surfaces:
- `docs/master/93_UNREAL_AGENTIC_PRODUCT_GAP_MAP_2026-05-01.md`
- `cloud-web-app/web/docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md`
- `cloud-web-app/web/components/studio/GamesAndFilmsModule.tsx`
- `cloud-web-app/web/components/preview/SceneViewportSurface.tsx`
- `cloud-web-app/web/components/viewport/AethelViewport3D.tsx`
- `cloud-web-app/web/components/assets/ContentBrowserConnected.tsx`
- `cloud-web-app/web/lib/server/asset-quality.ts`
- `cloud-web-app/web/lib/server/asset-source-policy.ts`
- `cloud-web-app/web/lib/device/runtime-execution-router.ts`
- `cloud-web-app/web/lib/production/agentic-production-state.ts`
- `cloud-web-app/web/lib/production/repository-cartography.ts`
- `cloud-web-app/web/app/api/projects/[id]/production-state/route.ts`
- `cloud-web-app/web/components/dashboard/DashboardProjectBrainCard.tsx`
- `cloud-web-app/web/components/dashboard/DashboardMissionLedgerCard.tsx`

The rule is: improve and wire these anchors before inventing new top-level product families.

## Market Reality Without Overclaim
Unreal-grade production is not one feature. It is a stack:
- virtualized geometry and streaming similar in ambition to Nanite,
- dynamic lighting/reflection strategy similar in ambition to Lumen,
- world partitioning and HLOD for large environments,
- Sequencer, Control Rig, camera tracks, keyframes, takes, and render queues,
- Niagara-style VFX authoring and performance/debug views,
- asset import, validation, metadata, provenance, licensing, thumbnails, compression, and dependency graphs,
- gameplay feel loops: animation notifies, hitboxes, camera shake, input latency, ability cooldowns, AI behavior, soft-lock detection,
- film continuity loops: character identity, props, scene geography, temporal coherence, lens/camera grammar, audio/subtitles, color/review states,
- profiling, automated playtests, visual regression, render checks, crash reporting, rollback, and packaging.

Aethel should not pretend the web viewport equals a native AAA engine renderer. Aethel should make AI work safer and more productive by giving agents structured graphs, validation loops, evidence, and local/cloud routing.

## End-To-End Production Spine
Every serious game/film mission should become these artifacts before autonomous work scales:

1. Mission Brief
- Goal, genre, audience, target platform, constraints, budget, risk, references, success criteria.
- Stored in Project Brain and Mission Ledger.

2. Creative Bible
- For games: fantasy, mechanics, progression, combat pillars, world rules, player emotion, reward loop.
- For films: logline, characters, identities, relationships, tone, visual language, scene list, continuity rules.

3. Technical Bible
- Runtime target, browser/local/cloud placement, graphics tier, memory budget, asset budget, frame budget, build target, known limitations.
- Must include whether work routes to `local-native`, `local-worker`, `local-main-safe`, `cloud-sandbox`, or `held`.

4. Asset Graph
- Assets are not loose files. Each asset needs type, source, license/provenance, dependency links, quality score, warnings, size, preview, thumbnail, optimization state, and accepted usage.
- AI may research/download/import assets only when license/provenance and user permission rules are satisfied.

5. Scene Graph / World Graph
- Objects, transforms, hierarchy, materials, lighting, collisions, triggers, zones, cameras, streaming cells, ownership, and references.
- Large worlds need cell/partition strategy before agents generate more content.

6. Gameplay Graph
- Player verbs, abilities, combat feel, AI behaviors, quests, inventory, save/load, input, cameras, objectives, fail states, and telemetry.
- Every mechanic needs test scenarios and playable acceptance clips, not just code.

7. Shot Graph / Film Graph
- Shots, cameras, timeline, character poses, dialogue, audio, subtitles, transitions, continuity state, render quality, and review notes.
- Every shot needs identity/prop/location/time continuity checks before done status.

8. Validation Graph
- Static checks, type/build, runtime smoke, viewport screenshot, asset quality, performance budget, gameplay bot test, cinematic render test, continuity checklist, evidence links, rollback point.
- `done` must mean evidence exists, not that an agent says it is complete.

9. Evidence Graph
- Screenshots, videos, source links, generated files, diffs, logs, test outputs, asset reports, render outputs, cost, risk, and reviewer decision.
- This is how users feel progress, conquest, and confidence instead of reading a giant chat transcript.

10. Release Graph
- Export target, package/cook/build rules, render queue, deploy/distribution, changelog, known issues, rollback, and support plan.

## Repository Cartography For Giant Context
AI agents cannot safely work in GB-scale repos, asset packs, scenes, films, and apps by reading a chat transcript or a random folder sample.

Before deep autonomous work, Aethel must build a repository/project cartography manifest that records:
- file and asset surfaces by domain: app code, API, engine code, game scene, film shot, asset, audio, video, story doc, tests, config, and infra,
- source kind: local workspace, git, GitHub, `huggingface-hub`, S3, marketplace, user upload, or browser export,
- context strategy: `direct-read`, `summarize-first`, `index-only`, `external-mirror`, or `manual-review`,
- duplicate groups by hash or name/size,
- license/provenance gaps,
- `mustReadFirst` files that agents load before planning,
- `doNotInvent` guardrails that prevent demo/prototype drift,
- `agentHandoffs` so Producer, Research, Asset Librarian, Gameplay, Cinematic, QA, Performance, and Release agents know their ownership boundaries.

Large external sources must use `external-mirror` metadata first. The point is to inspect folder trees, hashes, licenses, readmes, manifests, sizes, thumbnails, and summaries before downloading or editing multi-GB payloads. This applies to Hugging Face datasets/repos, GitHub monorepos, S3 buckets, marketplace packs, and user-uploaded asset libraries.

`cloud-web-app/web/lib/production/repository-cartography.ts` is the first typed implementation of this spine. It merges cartography results back into Project Brain, Mission Ledger, Asset Graph, Scene/World Graph, Gameplay Graph, Shot/Film Graph, Validation Graph, and Evidence Graph without adding a new top-level UI family.

## AI Agent Roles
Aethel should not let one generic agent do everything. Multi-agent work needs ownership boundaries:
- Producer Agent: decomposes mission, budget, risks, approvals, schedule.
- Research Agent: benchmarks mechanics, art direction, references, licenses, and technical constraints with citations.
- Story/Continuity Agent: maintains lore, character identity, props, timeline, emotional continuity.
- Asset Librarian Agent: imports, validates, labels, deduplicates, optimizes, and organizes assets.
- Technical Artist Agent: materials, lighting, LOD, VFX, shader constraints, viewport quality.
- Gameplay Engineer Agent: mechanics, abilities, AI behaviors, input, camera, save/load.
- Cinematic Editor Agent: shots, cameras, timeline, audio, subtitles, render queue.
- QA/Playtest Agent: bot playtests, soft-lock checks, runtime smoke, screenshots, acceptance clips.
- Performance Agent: frame budget, memory budget, asset weight, runtime placement, device safety.
- Release Agent: package/render/export/deploy, changelog, rollback, known issues.

Agents must not edit the same ownership area blindly. Handoffs require Mission Ledger state, evidence, and reviewer approval.

## User Experience Rule
No new top-level interface is required for this contract.

The clean user path remains:
- Web Light: one mission prompt.
- Studio Home: mission, Project Brain, evidence, next action, device policy.
- Studio Cloud: IDE, preview, viewport, chat, approvals, logs.
- Domain Room by mode: Game Room or Film Room only when the mission requires it.
- Studio Local: heavy assets, GPU/NPU/native tools, logged-in browser/device testing, local files.

The user should see confidence, not complexity:
- current artifact preview,
- next action,
- risk/cost/permission,
- evidence trail,
- approval/reject/apply,
- rollback.

## Critical Limitations To Keep Visible
1. Browser rendering is not native Unreal rendering.
2. WebGPU/WebGL cannot be assumed to handle AAA-scale Nanite/Lumen-like workloads.
3. GB-scale assets need local/native storage, streaming manifests, compression, and cache policy.
4. AI cannot preserve story/gameplay quality from chat context alone; it needs Project Brain, Mission Ledger, and graphs.
5. Asset sourcing can create licensing risk; provenance is mandatory.
6. Gameplay feel is not proven by code generation; it needs playtest loops and acceptance clips.
7. Film continuity is not proven by pretty frames; it needs identity, prop, shot, camera, and timeline checks.
8. Render/export can be expensive and slow; device/runtime policy must decide local vs cloud-sandbox vs held.
9. Agents must not buy assets, change cloud billing, publish, deploy, or use logged-in accounts without approval.
10. Autonomous AAA creation is not a valid claim until validation graphs, asset graphs, playtests, and render queues are mandatory.

## Quality Bar For AAA-Aware Output
A game/film artifact can be promoted only when it has:
- mission brief and creative bible,
- asset graph with license/provenance and quality score,
- scene/shot/gameplay graph,
- runtime target and performance budgets,
- visual evidence from viewport or render,
- validation checklist with pass/fail details,
- rollback point,
- human approval for publish/export/deploy,
- known limitations documented.

## Immediate Implementation Priorities
P0: Keep this contract executable and anti-drift.
- Add `qa:ai-game-film-production` and keep it inside product quality progress.
- Keep docs 90/91 aligned so future agents do not create new product families.

P1: Turn Project Brain into durable production memory.
- Add persistent project brain records/files for creative bible, technical bible, graphs, constraints, and accepted tradeoffs.
- 2026-05-04 update: Project Brain now has a durable v1 state shape stored under `Project.settings.aethelProductionState` through `cloud-web-app/web/lib/production/agentic-production-state.ts`.

P2: Turn Mission Ledger into durable production state.
- Mission states: planned, researching, sourcing_assets, building, validating, needs_approval, blocked, complete, failed.
- 2026-05-04 update: Mission Ledger entries are part of the same durable production state and preserve owner agent, acceptance checks, evidence refs, rollback plan, cost estimate, and next action.

P3: Asset Graph MVP.
- Extend current asset quality/source policy with license, source URL, creator, dependency, optimization, thumbnail, and accepted-use metadata.
- 2026-05-04 update: the first durable graph spine now includes Asset, Scene/World, Gameplay, Shot/Film, Validation, Evidence, and Release graphs with owner agents, evidence refs, blockers, and readiness summary.

P4: Game validation MVP.
- Objective progression, collision sanity, camera/input smoke, ability/cooldown checks, soft-lock scan, bot playtest transcript, screenshot/video evidence.

P5: Film validation MVP.
- Shot list, character identity checks, prop continuity, camera/lens continuity, audio/subtitle alignment, render sample, timeline export evidence.

P6: Runtime placement enforcement.
- Large asset import, render queue, browser operator, and playtest jobs must respect local/cloud/held routing.
- 2026-05-04 update: the production state includes runtime policy for preferred target, fallback target, local acceleration mode, human approval, and heavy-job concurrency. The API lives at `/api/projects/[id]/production-state`.

P7: Repository Cartography enforcement.
- Generate a repository/project cartography manifest before agents touch giant repos, asset packs, scenes, timelines, or external sources.
- 2026-05-04 update: `repository-cartography.ts` now produces `mustReadFirst`, `doNotInvent`, duplicate detection, license/provenance gaps, `external-mirror` routing for GB-scale sources, and `agentHandoffs`, then merges that evidence into durable production state.

## Red Lines
- Do not add a dense Unreal cockpit to first-time Web Light.
- Do not create separate navigation families for every domain.
- Do not claim Unreal parity, autonomous AAA completion, or film-quality final output without evidence.
- Do not let agents download or use assets without license/provenance policy.
- Do not mark game/film work complete without validation graph evidence.
- Do not hide device limitations; route heavy work to Studio Local or cloud sandbox.

## Final Product Reading
Aethel should go beyond Unreal by not trying to be only an engine.

The advantage is the unified AI production OS:
- it understands the mission,
- researches references,
- organizes assets,
- edits code/scenes/timelines,
- validates gameplay or continuity,
- routes work safely across cloud/local/device,
- and gives the user evidence, approval, rollback, and confidence at every step.

That is the path to best-in-market quality without UI pollution or fake AAA claims.

## 2026-05-05 Expensive Creative Generation Guard
Aethel must not let game/film media routes burn provider cost without plan-aware controls. `cloud-web-app/web/lib/server/ai-expensive-generation-guard.ts` is now the canonical guard for image, 3D, music, and voice generation. It estimates a budget-equivalent cost, requires creative-plan access, consumes metered usage before provider execution, and emits compact cost headers for UI transparency.

Required guarded routes:
- `cloud-web-app/web/app/api/ai/image/generate/route.ts`
- `cloud-web-app/web/app/api/ai/3d/generate/route.ts`
- `cloud-web-app/web/app/api/ai/music/generate/route.ts`
- `cloud-web-app/web/app/api/ai/voice/generate/route.ts`

This does not claim professional media generation is complete; it closes the cost-abuse gap while preserving the larger roadmap for evidence, provenance, render queues, and asset graph approvals.


## 2026-05-09 Parallel Agent Scope Lock Update

Aethel now has a concrete scope-lock primitive for parallel agents in `cloud-web-app/web/lib/production/agent-surface-locks.ts`. This does not make agents autonomous by itself; it prevents low-quality parallel work by forcing every write-capable agent to acquire or preview ownership before touching a file, folder, asset, scene, shot, or test surface.

Current contract:

- `acquireAgentSurfaceLocks` blocks overlapping or nested surfaces with `AGENT_SURFACE_LOCKED` instead of letting two agents silently collide.
- `previewAgentSurfaceLockRequest` lets the Producer/Senior Agent check conflicts before launching another worker.
- `buildAgentSurfaceLockSnapshot` returns a Producer-ready ownership view with active owners, locked paths, expiring locks, arbitration requirement, and next action.
- Agent Fleet snapshots now expose `lockCoordination` so the UI and central agent can keep chat, specialists, and evidence review aligned without adding visual noise.

This is the minimum coordination substrate needed before Aethel can safely run Cursor-style parallel agents on game, film, app, browser, research, and release work. It also supports the product rule that agents must not edit the same ownership area blindly.
