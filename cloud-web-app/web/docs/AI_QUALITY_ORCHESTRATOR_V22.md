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

## MOBA / LoL-like Vertical Slice

`moba-vertical-slice:v1` is a safe template for a League-style game direction. It is not a full game claim.

It scopes the first pass to:

- One small lane arena.
- Two champions.
- Minion waves.
- One tower/objective loop.
- Locked isometric camera.
- Mouse/keyboard baseline input.
- Bot playtest graph.
- Performance graph.
- Release graph held by human approval.

This is the right shape for fast quality: playable vertical slice first, then expand champions, map systems, networking, matchmaking, balance, VFX, audio, and ranked progression after telemetry exists.

## Product Rule

Aethel should say: `Generate playable prototypes and vertical slices faster with evidence-backed agents.`

Aethel should not say: `Generate Unreal-grade AAA games alone.`