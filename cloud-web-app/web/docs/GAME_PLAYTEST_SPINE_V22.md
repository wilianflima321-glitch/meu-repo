# Game Playtest Spine V22

Status: implemented as a planning and evidence contract. It does not run autonomous play sessions yet.

## Why This Exists

A generated game is not good because it compiles or looks attractive. It needs replay evidence, telemetry, bug ledgers, performance traces, and human feel review.

The Playtest Spine turns each genre pack into testable scenarios. Agents can draft, generate, and optimize, but they cannot claim playable quality until the playtest spine has evidence.

## Required Evidence

Every scenario requires:

- Replay capture.
- Telemetry.
- Bug ledger.
- Human feel review.
- Performance trace.

Every scenario must prove:

- Player intent is readable.
- Input, camera, and feedback match the genre pack.
- No blocker, softlock, or fake completion signal exists.
- Frame pacing and runtime budget stay within the declared target.

## Examples

- MOBA: bot lane push, tower dive safety, ability readability, snowball/balance smoke.
- RPG: quest branch continuity, save/load recovery, combat difficulty curve.
- Shooter: aim latency, hit confirmation, enemy pressure, motion comfort.
- Racing: cornering feel, lap validity, collision recovery, bot lap baseline.
- Puzzle: solution validity, hint usefulness, softlock prevention.
- Visual novel: branch continuity, save/load at choices, localization overflow.

## Product Rule

No playable/demo/final claim without playtest evidence. If evidence is missing, the state is `held`; if evidence exists, the next state is `needs-review`, never automatic final readiness.
