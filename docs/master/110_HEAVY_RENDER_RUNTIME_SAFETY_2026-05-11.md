# 110 - Heavy Render Runtime Safety

Date: 2026-05-11
Status: canonical runtime safety gate for viewport/game/film render work

## Why This Exists

Aethel cannot treat a 12 second draft viewport preview and a 4K final cinematic export as the same job. Games, films, animation, VFX, and asset-heavy scenes need explicit runtime routing so the IDE remains responsive and agents cannot fake completion.

This contract turns render execution into an evidence-first decision: estimate load, choose the safe lane, block unsafe work, attach reports, and require human approval before release outputs.

## Safety Contract

- No main-thread heavy render: review/final viewport output must never run on the browser main thread.
- Draft work can use `local-worker` only when memory, VRAM, and runtime policy are safe.
- Final media output should use `cloud-sandbox` or Studio Local `local-native` GPU/NPU/native helpers.
- Held device state, stale native probes, thermal pressure, storage pressure, or unsafe route policy must hold or reroute work.
- Every render must attach evidence: manifest, performance report, license report, validation report, and proxy/thumbnail where available.
- No render artifact implies marketplace rights or final release readiness by itself.
- Human approval remains required before promotion or release.

## New Readiness Report

The viewport renderer now writes a readiness report into manifest, performance, validation, and backend result data.

Fields include:

- `severity`: `ready`, `review`, `fallback`, or `held`.
- `estimatedFrames`: derived from duration and FPS.
- `estimatedMemoryMb`: estimated RAM pressure.
- `estimatedVramMb`: estimated GPU/VRAM pressure.
- `sceneComplexity`: derived from object, asset, VFX, and visual script density.
- `riskScore`: normalized risk score for the render contract.
- `recommendedLane`: `local-worker`, `local-native`, `cloud-sandbox`, or `held`.
- `reasons`: why the job is safe, blocked, or rerouted.
- `mitigationSteps`: what the user/agent should do next.

## Product Impact

- Users get safer heavy work without frozen UI.
- Agents get concrete routing evidence before claiming a render is done.
- Studio Local gets a clear place to promote GPU/NPU/native helpers when available.
- Cloud fallback is explicit instead of hidden.
- Review/final outputs remain honest until media backends produce real playback evidence.

## Acceptance Gate

Run:

```bash
npm run qa:heavy-render-runtime-safety
npm run qa:ai-game-film-production
npm run qa:product-quality-progress
```
