# 93_UNREAL_AGENTIC_PRODUCT_GAP_MAP_2026-05-01
Date: 2026-05-01
Status: ACTIVE
Role: market-grade gap map for Aethel as unified AI workbench, web product, local IDE, and AAA-aware production OS

## Purpose
This document translates the user intent into an execution contract without claiming impossible parity.

Aethel should not claim to be "Unreal in the browser" today. The stronger and more honest goal is:

Aethel becomes the AI production operating system that can plan, generate, inspect, edit, validate, package, and operate apps, sites, platforms, games, films, and large creative/code projects across cloud and local environments.

The web experience stays clean and novice-friendly. The internal/local IDE carries the depth. The AI system must bridge both without exposing complexity unless the user asks for it.

## Current External Benchmarks Checked
Sources used for this benchmark pass:
- Unreal Nanite virtualized geometry: https://dev.epicgames.com/documentation/unreal-engine/nanite-virtualized-geometry-in-unreal-engine
- Unreal Lumen global illumination and reflections: https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-global-illumination-and-reflections-in-unreal-engine
- Unreal World Partition: https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine
- Unreal Sequencer/cinematics: https://dev.epicgames.com/documentation/unreal-engine/cinematics-and-movie-making-in-unreal-engine
- Unreal Niagara VFX: https://dev.epicgames.com/documentation/unreal-engine/creating-visual-effects-in-niagara-for-unreal-engine
- MetaHuman documentation: https://dev.epicgames.com/documentation/en-us/metahuman/metahuman-documentation
- Firebase Studio App Prototyping agent: https://firebase.google.com/docs/studio/get-started-ai
- Cursor codebase/agent docs: https://cursor.com/docs
- Manus Browser Operator: https://manus.im/docs/features/browser-operator
- Manus Agent Skills: https://manus.im/features/agent-skills

## Market Reality
### Unreal-level AAA creation needs these systems
- Virtualized/high-volume geometry and LOD/streaming strategy.
- Dynamic lighting/reflection pipeline.
- Large-world partitioning and actor-level source-control friendliness.
- Cinematic sequencing with cameras, lights, characters, keyframes, playback, and export.
- VFX authoring with emitters, modules, simulation, debugging, and performance tools.
- Character pipeline with rigging, facial animation, retargeting, animation state machines, and high-quality humans.
- Physics, collision, cloth, hair, fluids, destruction, vehicles, and gameplay feel tooling.
- Gameplay systems for combat, abilities, AI behavior, quests, save/load, inventory, networking, and telemetry.
- Asset pipeline for import, validation, thumbnails, metadata, dependency graph, compression, provenance, licensing, and packaging.
- Build/cook/package/distribute workflows for multiple platforms.
- Profilers, automated tests, visual validation, crash reporting, and regression gates.

### AI-agent products need these systems
- Project memory that survives context-window limits.
- Codebase indexing and retrieval that can scale to GB-sized repositories.
- Durable missions with checkpoints, rollback, approvals, cost controls, and evidence.
- Browser/local-computer operation for authenticated sites, but with explicit user permission.
- Skills/playbooks that standardize repeatable workflows.
- Tool contracts that force agents to validate against the real app, filesystem, tests, docs, and APIs.
- Multi-agent orchestration with ownership boundaries, no duplicate edits, no silent destructive changes, and merge/review gates.

## Aethel Non-Negotiable Product Thesis
Aethel wins by combining three layers:

1. Web Mission Layer
- Clean Firebase/Gemini/Manus-like entry.
- User says what they want.
- Aethel triages intent, risk, cost, domain, required accounts, and expected artifact.
- The user sees preview, chat, approvals, budget, evidence, and next actions without IDE clutter.

2. Studio Workbench Layer
- Firebase Studio-like code/preview/chat split.
- IDE remains inside the web product for cloud workflows.
- Same project can open in local IDE for device/GPU/filesystem-heavy work.
- Preview can become web app preview, browser operator, game viewport, cinematic review, or evidence board depending on mission.

3. Local + Cloud Agent Runtime
- Cloud agents handle planning, web research, indexing, CI, deploys, reviews, and scalable workers.
- Local agents handle logged-in browser sessions, local files, GPU previews, large assets, native builds, desktop/mobile devices, and user-private accounts.
- Both share one project identity, one mission ledger, one evidence graph, and one permissions model.

## Core Limitation: Why AI Loses Quality Today
AI fails on large games/apps because it tries to hold too much in a prompt and guesses the rest.

Aethel must replace guessing with systems:
- Mission graph instead of one long prompt.
- Asset graph instead of loose folders.
- Code graph instead of raw file dumps.
- Scene graph instead of textual descriptions only.
- Test graph instead of manual QA.
- Evidence graph instead of trust-me outputs.
- Memory graph instead of chat history only.
- Approval graph instead of silent automation.

## AAA Capability Gap Matrix
| Domain | Market benchmark | Aethel current posture | Gap | Required system |
|---|---|---|---|---|
| Geometry | Nanite-like detail/streaming | Web viewport and editors exist, but not virtualized geometry | Major | Asset LOD pipeline, mesh budgets, BVH/culling, streaming manifests |
| Lighting | Lumen-like dynamic GI/reflections | HDR/post-process pieces exist, not full GI parity | Major | Lighting presets, baked/probe fallback, ray/path preview optional, honest renderer tiers |
| Worlds | World Partition/Data Layers | Scene/terrain tools exist, no robust world cells | Major | World cell graph, actor ownership, streaming preview, one-file-per-actor export |
| Cinematics | Sequencer | Timeline/video editors exist, still being split/wired | Medium-major | Camera tracks, shots, keyframes, render queue, review states |
| VFX | Niagara | NiagaraVFX surface exists, still large and not fully tool-contracted | Major | Emitter/module graph, presets, GPU budget, preview/debug, reusable VFX skills |
| Characters | MetaHuman/Control Rig | Facial/control rig editors exist, large and not unified | Major | Rig schema, retargeting, facial capture import, emotion/viseme QA |
| Gameplay feel | Commercial engines + hand tuning | Tools exist but no unified combat/ability validation loop | Major | Ability graph, animation notify graph, hitbox/hurtbox tests, feel clips, bot playtests |
| Physics | Chaos/Rapier-grade authoring | Physics editors exist, large and isolated | Major | Deterministic sim scenarios, collision authoring, cloth/fluid budgets, regression captures |
| Assets | Fab/Quixel/content browser pipelines | ContentBrowser exists and is now split; pipeline still partial | Major | Import validators, thumbnails, dependencies, licenses, compression, provenance |
| AI coding | Cursor/Codex-style code agents | Strong direction, but `: any`, E2E, migrations gaps remain | Medium-major | Code graph, ownership map, tests-first tasks, agent review gates |
| Agent operation | Manus-like browser/local/cloud action | Browser/operator direction exists in docs, implementation incomplete | Major | Local connector, permission UX, session replay, rollback, secret-safe tools |

## Product UX Rules For This Ambition
- Never show every AAA tool on the first screen.
- Start with one mission card, preview, chat, and clear approval actions.
- Expose depth progressively: Mission -> Studio -> Workbench -> Domain Room -> Advanced Tools.
- Keep novice language outcome-first: "Build my game prototype", not "Open Niagara/Sequencer/LOD graph".
- Keep expert escape hatches: command palette, direct files, graph editors, logs, traces, diffs.
- Every agent action should produce visible evidence: changed files, screenshots, tests, preview link, cost, risk, confidence.
- Every risky operation should require approval: purchases, domain changes, deploys, account login, cloud billing, destructive file changes.

## Required Unified Architecture
### 1. Project Brain
The project brain is the canonical memory package for every large project.

It must include:
- Product brief and target user.
- Domain type: web app, SaaS, game, film, mobile, automation, research, mixed.
- Architecture graph.
- File graph.
- Asset graph.
- Scene graph.
- Test graph.
- Design-system graph.
- Agent rules and owner boundaries.
- Build/deploy targets.
- Known limitations and accepted tradeoffs.

### 2. Mission Ledger
Every request becomes a mission with:
- Goal.
- Constraints.
- Required tools/accounts.
- Budget estimate.
- Risk level.
- Steps.
- Evidence.
- Rollback point.
- Human approvals.
- Final acceptance checklist.

### 3. Local Agent Bridge
Needed to exceed browser-only tools.

It should provide:
- Local filesystem workspace sync.
- Native IDE install/update channel.
- Local browser operator with permission prompts.
- GPU/viewport acceleration.
- Device testing hooks.
- Local secret isolation.
- Cloud mission sync.
- Offline cache and conflict handling.

### 4. Domain Tool Rooms
Aethel should avoid one giant IDE screen. Instead, the Workbench opens focused rooms:
- Web/App Room: routes, components, API, database, deploy, auth, billing.
- Game Room: scene, gameplay, abilities, physics, animation, AI behavior, packaging.
- Film Room: script, storyboard, shots, timeline, cameras, audio, subtitles, render queue.
- Ops Room: domains, cloud accounts, monitoring, incidents, costs, security.
- Evidence Room: research, claims, screenshots, citations, decisions.

## Execution Priority From Here
P0: Keep current gates green while reducing structural debt.
- Current measured `component files over 1000 lines`: 0 after the 2026-05-01 god-component closure pass.
- Current measured `: any`: 390 after typing the level serializer, VS Code language/workspace/window APIs, extension host/runtime/loader, chat/complete routes, unified SDK, AI tools registry, DAP, LSP, debug integration/adapter, SWR, API integration, gateway, websocket, queue, and agent-mode boundaries.
- Current measured E2E specs: 15, target 15.
- Current measured Prisma migrations: 0, target at least 1 after baseline decision.

P1: Keep editor split ratchets closed.
- Reachable editor splits are now closed for the measured `>1000` TSX component scope.
- Future work should wire/classify domain rooms, not re-expand extracted TSX surfaces.

P1: Add device-native runtime governance before promising Unreal-scale local work.
- Studio Home now has a device guard that classifies WebNN/WebGPU/CPU/RAM/storage/network signals.
- The web app can adapt agent count, viewport quality, local model policy, memory persistence, and browser operator throttling.
- The local Studio still needs a native probe for Windows ML, DirectML, GPU, NPU, storage, and process isolation before claiming full local acceleration.
- Keep each extracted module under 800 lines where possible.

P2: Expand the Project Brain minimal implementation.
- Studio Home now has a compact read model and card.
- The compact card now includes continuity rails for checkpoint, evidence, and permission state.
- Next step is `project.brain.json` or database-backed equivalent.
- Derive from existing `.aethelrules`, package metadata, docs, routes, assets, tests.
- Keep the Project Brain compact in Studio/IDE and move deeper detail into mission/evidence rooms.

P3: Add Mission Ledger minimal implementation.
- Durable mission states: planned, running, needs_approval, blocked, complete, failed.
- Evidence attachments: files, screenshots, logs, test output, links.
- Required before trusting long autonomous runs.
- Current pass adds the compact Studio Home skeleton; next pass should back it with durable mission records.

P4: Local Agent Bridge design and MVP.
- Do not let cloud agents touch local logged-in accounts directly.
- User grants local operation per mission.
- Session replay and revocation must be visible.

P5: AAA Domain contracts.
- Add explicit contracts for combat, cinematics, VFX, asset import, animation, physics, world partition, and packaging.
- AI agents must write against these contracts instead of improvising game systems from scratch.

## Red Lines
- Do not market the web viewport as equal to Unreal's renderer.
- Do not claim fully autonomous AAA game generation without tool validation, asset validation, playtest loops, and human approvals.
- Do not let agents buy, deploy, modify DNS, or use logged-in accounts without permission.
- Do not add more disconnected editors. Wire or classify existing editors first.
- Do not expand large TSX surfaces. Split and contract them.
- Do not solve GB-scale projects with chat history. Use project brain, indexing, manifests, and resumable missions.

## Product Options
Option A: Aethel as AI App Studio first.
- Fastest to monetize.
- Beats Firebase Studio by adding local bridge, richer IDE, and account/browser operation.
- AAA tools remain advanced domain rooms.

Option B: Aethel as AI Creative/Game Studio first.
- Strongest differentiation.
- Higher execution risk.
- Requires asset/viewport/physics/cinematic contracts before marketing.

Option C: Hybrid path, recommended.
- Default web onboarding is app/site/platform friendly.
- Studio has domain modes.
- Game/film workflows are introduced as mission templates once contracts and validation are real.

## Recommended Next Implementation Blocks
1. Reduce `: any` debt so stricter TypeScript can become realistic.
2. Expand Project Brain from the Studio Home read model into durable mission memory backed by project files/database.
3. Add a `Mission Ledger` UI skeleton using existing mission/dashboard language.
4. Deepen E2E beyond the now-green public-route contracts into authenticated first mission, preview/review, deploy approval, Studio navigation, and theme persistence.
5. Write safe local bridge spec before implementing local account/browser control.

## Final Rule
Aethel should be ambitious like Unreal, usable like Firebase Studio, operational like Manus, code-aware like Cursor/Codex, and safer than all of them.

But every claim must be backed by a working system, a test, an evidence artifact, or an explicit limitation.
