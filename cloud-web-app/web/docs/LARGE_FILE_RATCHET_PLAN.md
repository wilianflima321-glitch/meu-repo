# Large File Ratchet Plan

Generated: deterministic local scan

- Watch line limit: 800
- Files above watch limit: 132 / 132
- Max file lines: 1171 / 1171
- Failures: 0

## Category Counts
- `runtime`: 95
- `ui`: 28
- `server`: 5
- `other`: 3
- `route`: 1

## Top Refactor Queue

| File | Lines | Category | Next action |
| --- | ---: | --- | --- |
| `lib/networking/multiplayer-system.tsx` | 1171 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/advanced-input-system.ts` | 1164 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/state/game-state-manager.tsx` | 1161 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/world/world-streaming.tsx` | 1161 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/quests/quest-system.tsx` | 1153 | runtime | Split data model, runtime, persistence, and editor adapter. |
| `lib/animation/animation-system.ts` | 1151 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/server/websocket-server.ts` | 1150 | server | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/scene/scene-serializer.ts` | 1149 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/aaa-asset-pipeline.ts` | 1148 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/input/controller-mapper.tsx` | 1146 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/save/save-manager.tsx` | 1144 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/particles/advanced-particle-system.ts` | 1132 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `server/workers/build-queue-worker.ts` | 1111 | other | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/input/input-manager.ts` | 1098 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/terrain-engine.ts` | 1094 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/engine/asset-pipeline.ts` | 1092 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/materials/material-editor.ts` | 1091 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/visual-script/runtime.ts` | 1088 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/ai-tools-registry.ts` | 1085 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/ai/behavior-tree-system.tsx` | 1084 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/fluid-simulation-system.ts` | 1077 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/debug/real-debug-adapter.ts` | 1074 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/nanite-virtualized-geometry.ts` | 1067 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/video-encoder-real.ts` | 1067 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/motion-matching-system.ts` | 1066 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/engine/scene-graph.ts` | 1065 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/engine/audio-manager.ts` | 1063 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/webxr-vr-system.ts` | 1061 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/ecs-dots-system.ts` | 1056 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/dialogue/dialogue-system.tsx` | 1054 | runtime | Split planning, timeline, playback, and serialization before adding film features. |

## Ratchet Policy

- Do not add new files above 800 lines.
- Do not let any file exceed 1,200 lines.
- Split UI surfaces before adding features.
- Runtime kernels may stay large only with an owner, adapter strategy, and dedicated gate.

## Failures
- none
