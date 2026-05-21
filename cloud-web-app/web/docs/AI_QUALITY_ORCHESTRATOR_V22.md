# AI Quality Orchestrator V22

Status: implemented as a planning contract. It does not execute heavy work, generate paid assets, or claim final quality automatically.

## Purpose

Aethel agents need a shared quality brain. A raw 10k mesh can be useful for blockout, but the agents must know when to stop, when to acquire curated sources, when to route work to Studio Local sidecars, and when Cloud Stream/final review costs apply.

The AI Quality Orchestrator answers one question: what is the safest, fastest, highest-quality next lane for this asset, scene, character, world, gameplay system, or cinematic?

## Lanes

- `ai-draft`: fast browser-safe draft. Draft assets are not final.
- `curated-marketplace`: license/provenance checked source asset or source pack.
- `studio-local-optimized`: Studio Local required for mesh processing, texture compression, collision/navmesh, rig/animation validation, and traces.
- `cloud-render-grade`: Cloud Stream cost applies; use for final shots, client demo, or expensive review only.

## Required Decision Inputs

- Goal and domain: asset, character, scene, world, gameplay, or cinematic.
- Target quality lane.
- Budget in USD.
- Runtime capabilities: meshoptimizer, gltfpack, KTX2/Basis, Rapier, FFmpeg, Blender/Assimp, license/provenance scanner, Pixel Stream URL, Studio Local.
- Evidence refs: license, source manifest, PBR, LOD, collision/navmesh, rig, performance trace, and human approval.
- Asset metadata: license state, current quality tier, and approximate triangle budget.

## Output Contract

Every plan returns a `QualityOrchestrationPlan` with:

- `recommendedLane`
- `status`: `available`, `held`, `blocked`, or `needs-review`
- `blockers`
- `requiredCapabilities`
- `requiredEvidence`
- `missingEvidence`
- `estimatedCostUsd`
- `estimatedMinutes`
- `runtimeTarget`
- `nextAction`
- `humanReviewRequired: true`

There is intentionally no `ready` state. Premium/public claims must pass through human review.

## Game Scope Orchestrator

Users choose the production depth first: `prototype`, `demo`, or `complete-game-plan`. Agents must not silently force every mission into a MOBA, shooter, RPG, or any other preset.

The scope orchestrator plans the creative work before heavy generation:

- `story-bible`: premise, tone, arc, continuity rules.
- `world-bible`: biomes, factions, traversal, navigation constraints.
- `character-bible`: roster, silhouettes, motivations, animation needs.
- `gameplay-loop`: controls, mechanics, core loop, fail states.
- `visual-style-guide`: references, materials, camera, readability.
- `audio-direction`: music pillars, SFX coverage, voice direction.
- `playtest-plan`: bot/human review, bug ledger, feel notes.
- `release-plan`: build, rollback, platform checklist, human approval.

`complete-game-plan` means a complete production plan and milestone spine. It does not mean Aethel claims a finished full game without builds, evidence, playtests, performance traces, provenance, and human review.

## Example Presets

`moba-vertical-slice:v1` remains one safe example preset for a MOBA-style direction. It is not the default product direction and not a full game claim. The same generic contract supports RPGs, action adventures, platformers, shooters, racing games, puzzle games, visual novels, sandbox games, strategy games, and custom briefs.

## Product Rule

Aethel should say: `Generate playable prototypes, evidence-backed demos, and complete game production plans with governed agents.`

Aethel should not say: `Generate Unreal-grade AAA games alone.`
