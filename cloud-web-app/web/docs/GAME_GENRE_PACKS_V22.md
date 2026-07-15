# Game Genre Packs V22

Status: implemented as planning contracts for agents and UI summaries. They do not execute gameplay, networking, asset generation, or release publishing.

## Why This Exists

Multi-genre support cannot be just a dropdown. Each game type needs a different camera model, input model, core loop, required systems, asset priorities, playtest scenarios, performance budgets, specialist agents, and evidence.

The goal is simple: when the user chooses RPG, MOBA, shooter, puzzle, racing, strategy, visual novel, platformer, sandbox, action adventure, or custom, the agents inherit the right production spine instead of improvising.

## Covered Packs

- `moba`: isometric camera, mouse/keyboard, abilities, minions, towers, bot playtest, VFX readability.
- `rpg`: third-person camera, quests, inventory, save/load, dialogue continuity, world streaming.
- `action-adventure`: traversal, combat, checkpoints, camera rig, cinematic beats.
- `platformer`: jump feel, collision/hazards, checkpoints, side-scroll readability.
- `shooter`: aim latency, hit confirmation, weapon feel, enemy pressure, accessibility.
- `racing`: vehicle handling, track checkpoints, lap telemetry, bot ghost.
- `puzzle`: rule engine, hints, softlock prevention, accessibility/readability.
- `visual-novel`: dialogue branches, relationship state, save-at-choice, localization.
- `sandbox`: persistence, build tools, simulation, permissions, UGC safety.
- `strategy`: unit commands, pathing, AI planner, economy, fog/visibility.
- `custom`: forces a camera/input/core-loop decision before generation.

## Required Evidence Pattern

Every pack includes:

- Scope decision.
- Core loop proof.
- Input/camera capture.
- Playtest replay.
- Performance trace.
- Human review.

Genre packs add specialized evidence, such as quest dependency maps for RPGs, lap telemetry for racing, hit debug traces for shooters, and branch continuity receipts for visual novels.

## Product Rule

Genre packs are not templates that lock the user into a clone. They are guardrails that help the agents ask better questions, choose better tools, and refuse fake completion.
