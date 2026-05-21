# Game Scope Orchestrator V22

Status: implemented as a planning contract. It does not execute paid generation, heavy sidecar work, Cloud Stream sessions, or release publishing.

## Why This Exists

Users should decide the ambition level before agents start work:

- `prototype`: fastest playable loop with enough story, world, characters, art direction, audio direction, and playtest evidence to avoid a throwaway demo.
- `demo`: a polished vertical slice with broader story/world/character/gameplay/audio/VFX/performance/release evidence.
- `complete-game-plan`: a complete production plan, milestone roadmap, content backlog, budget, and evidence spine. It is not a fake finished game.

This keeps the interface low-noise: one scope choice, one creative brief, one evidence path. Agents do the graph expansion behind the scenes.

## Creative Work Happens Before Heavy Generation

The orchestrator requires planning artifacts before asset generation can look final:

- `story-bible`: premise, tone, story arc, continuity rules.
- `world-bible`: biomes, factions, landmarks, traversal, navigation constraints.
- `character-bible`: roster, silhouettes, motivations, animation needs.
- `gameplay-loop`: input, mechanics, core loop, fail states.
- `visual-style-guide`: references, materials, lighting/camera, readability.
- `audio-direction`: music pillars, SFX coverage, voice direction.
- `quest-dialogue-map`: dependency map and continuity receipts.
- `level-flow`: beats, pacing, navmesh, encounter plan.
- `effects-vfx-plan`: readability, accessibility, performance budget.
- `playtest-plan`: bot scenarios, human review, bug ledger, feel notes.
- `release-plan`: build artifact, rollback, platform checklist, approval.
- `content-roadmap`: milestone plan, backlog, dependency map.
- `production-budget`: provider limits, runtime costs, approval thresholds.

## Genre Is a Preset, Not a Cage

The generic contract supports MOBA, RPG, action adventure, platformer, shooter, racing, puzzle, visual novel, sandbox, strategy, and custom briefs.

The MOBA / LoL-like preset remains useful as an example because it exercises camera, minions, towers, bots, performance, VFX clarity, and combat balance. It must not become the product's default path.

## Honest Completion Rules

- A prototype can be playable, but it is not a final product.
- A demo can be polished, but it is not the whole game.
- A complete-game-plan can be comprehensive, but it is not a finished game until milestone builds, evidence, playtests, performance traces, provenance, rollback, and human approval exist.
- Browser is preview/review. Studio Local handles heavy processing. Cloud Stream is cost-visible final review when configured.

## Agent Alignment

The Producer/Director agent owns scope selection. Specialist agents only execute inside the approved graph:

- Narrative Designer: story bible, quest/dialogue map, continuity.
- World Architect: world bible, map flow, navmesh/streaming constraints.
- Character Director: roster, silhouettes, animation needs.
- Gameplay Systems: core loop, abilities, state, camera/input contracts.
- Art Direction: style guide, asset quality, VFX readability.
- Audio Composer: music/SFX/voice direction.
- QA Playtest: bot and human review paths.
- Cost Governor: budget, runtime target, expensive generation thresholds.
- Release Producer: build, rollback, approval, platform readiness.

The rule is simple: agents can accelerate the work, but evidence decides whether the work can claim progress.
