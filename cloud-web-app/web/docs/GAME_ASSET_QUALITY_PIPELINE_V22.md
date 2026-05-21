# Game Asset Quality Pipeline V22

Status: implemented as a governed contract, not a marketing claim.
Source of truth: `lib/production/game-asset-quality-pipeline.ts`.

## Why This Exists

Aethel should not pretend that raw text-to-3D output is production-grade. A 10k polygon AI output is draft-only: useful for ideation, blockout, thumbnails, quick prop exploration, and gameplay placeholders. Final or premium-facing game work needs a production lane: art direction, provenance, curated source assets, retopology or mesh upgrade, PBR materials, LODs, collision/navmesh proxies, rig/animation validation, performance traces, and human art-direction approval.

The product direction is therefore not "generate a flagship AAA game with one prompt". The honest moat is: Aethel orchestrates AI agents, curated assets, Studio Local sidecars, Cloud Stream/final review, and human approval so a small team can build playable prototypes, evidence-backed demos, and complete game production plans much faster.

## Four Quality Lanes

| Lane | Use | Geometry Budget | Runtime | Honest Limit |
| --- | --- | ---: | --- | --- |
| AI draft mesh | Blockout, prop ideation, fast sketches | 10k-25k tris | Browser preview | Not a final hero asset. |
| Curated marketplace/library asset | Hero props, characters, environments | 250k-750k tris | Browser + Studio Local | Quality depends on license and source topology. |
| Studio Local optimized asset | Premium indie / vertical slice production | 500k-2M tris | Local native sidecars | Requires mesh/material/LOD/perf evidence. |
| Cloud render grade asset | Cinematic review, client demo, final shots | 1M-10M tris | Cloud Stream/render lane | Optional and cost-visible; not default editing. |

## Required Evidence Before Premium Claims

- Art direction board.
- License/provenance receipt.
- Source asset manifest.
- Retopology or curated mesh receipt.
- UV/material validation.
- PBR texture compression report.
- LOD0/LOD1/LOD2/LOD3 manifest.
- Collision/navmesh proxy report.
- Rig/animation validation for characters and creatures.
- Viewport performance trace.
- Human art-direction approval.

## Tooling and Dependencies the Agents Need

The agents need a toolbelt, not just a model prompt:

- Curated acquisition lane: internal marketplace review, license/provenance scanner, source hash, usage rights, rollback metadata.
- Geometry lane: Blender/Assimp import, meshoptimizer/gltfpack simplification, retopology receipt, normals/tangents validation.
- Material lane: PBR validation, KTX2/Basis compression, texture budget by runtime target.
- Gameplay lane: Rapier collision proxies, navmesh/collision reports, hitbox/camera fit evidence.
- Animation lane: rig validation, blend tree checks, root-motion/IK/facial/cloth budgets.
- Runtime lane: Browser preview for iteration, Studio Local for heavy processing, Cloud Stream for final/high-cost review.
- Review lane: FFmpeg capture, replay evidence, performance trace, human approval before public or client-facing claims.

## Genre-Agnostic Game from Zero

For any serious game direction, Aethel should split the job into production graphs instead of one giant generation. A MOBA or LoL-like idea is only one example preset, not the default product direction:

1. Design Bible: scope choice, fantasy, roles, objectives, camera, input, economy, pacing, and scope cuts.
2. Story/World Graph: premise, tone, lore, biomes, factions, landmarks, navmesh, streaming budget, and continuity rules.
3. Character Graph: characters start from curated or Studio Local optimized assets, not raw 10k meshes; each gets rig, animations, VFX, SFX and gameplay hitboxes.
4. Gameplay Graph: ability system, cooldowns, projectiles, targeting, status effects, minions, towers, scoreboard, replay events.
5. Asset Pipeline Graph: every asset carries provenance, LODs, material budget, collision proxy and runtime target.
6. Bot/Playtest Graph: simulated matches, telemetry, win-rate deltas, frame budget, feel review and regression bugs.
7. Release Graph: playable build, rollback plan, human approval and cost summary.

This is how Aethel gets quality: not by asking one AI to hallucinate an entire game, but by letting specialized agents build, verify, and improve each graph with evidence.

## What To Build Next

- V22.4 connected this pipeline to the viewport inspector through `ViewportAssetQualityCard`, so imported assets now show their lane, missing evidence, license state, runtime lane, and upgrade path.
- Add a governed `Quality upgrade` action: AI draft -> curated marketplace -> Studio Local optimized -> Cloud render grade.
- Add per-asset cost estimates before generation, retopology, texture compression, or Cloud Stream review.
- Add a sidecar capability check for meshoptimizer/gltfpack/KTX2/Rapier/FFmpeg before enabling heavy upgrade buttons.
- Add visual badges in Studio: `Draft`, `Curated`, `Optimized`, `Render grade`, and `Blocked by provenance`.
