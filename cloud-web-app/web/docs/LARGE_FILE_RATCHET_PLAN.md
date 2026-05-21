# Large File Ratchet Plan

Generated: deterministic local scan

- Watch line limit: 800
- Files above watch limit: 142 / 142
- Max file lines: 1201 / 1201
- Failures: 0

## Category Counts
- `runtime`: 105
- `ui`: 28
- `server`: 5
- `other`: 3
- `route`: 1

## Top Refactor Queue

| File | Lines | Category | Next action |
| --- | ---: | --- | --- |
| `lib/dialogue-cutscene-system.ts` | 1201 | runtime | Split planning, timeline, playback, and serialization before adding film features. |
| `lib/cutscene/cutscene-system.tsx` | 1195 | runtime | Split planning, timeline, playback, and serialization before adding film features. |
| `lib/ui/ui-framework.tsx` | 1195 | runtime | Split into primitives, tokens, examples, and compatibility barrel. |
| `lib/capture/capture-system.tsx` | 1193 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/inventory/inventory-system.tsx` | 1191 | runtime | Split data model, runtime, persistence, and editor adapter. |
| `lib/ecs/prefab-component-system.tsx` | 1190 | runtime | Split data model, runtime, persistence, and editor adapter. |
| `lib/aethel-sdk.ts` | 1181 | runtime | Split public SDK into auth, projects, agents, assets, and billing clients. |
| `lib/postprocessing/post-processing-system.ts` | 1181 | runtime | Split effects into bloom, tone mapping, AA, color, and runtime adapter. |
| `lib/networking/multiplayer-system.tsx` | 1171 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/advanced-input-system.ts` | 1164 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/state/game-state-manager.tsx` | 1161 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/world/world-streaming.tsx` | 1161 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/quests/quest-system.tsx` | 1153 | runtime | Split data model, runtime, persistence, and editor adapter. |
| `lib/settings/settings-system.tsx` | 1153 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/animation/animation-system.ts` | 1151 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/server/websocket-server.ts` | 1150 | server | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/scene/scene-serializer.ts` | 1149 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/aaa-asset-pipeline.ts` | 1148 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/input/controller-mapper.tsx` | 1146 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/save/save-manager.tsx` | 1144 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/particles/advanced-particle-system.ts` | 1132 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/debug/debug-console.tsx` | 1112 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `server/workers/build-queue-worker.ts` | 1111 | other | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/input/input-manager.ts` | 1098 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/terrain-engine.ts` | 1094 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/engine/asset-pipeline.ts` | 1092 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/materials/material-editor.ts` | 1091 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/visual-script/runtime.ts` | 1088 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/ai-tools-registry.ts` | 1085 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/ai/behavior-tree-system.tsx` | 1084 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |

## Ratchet Policy

- Do not add new files above 800 lines.
- Do not let any file exceed 1,200 lines.
- Split UI surfaces before adding features.
- Runtime kernels may stay large only with an owner, adapter strategy, and dedicated gate.

## Failures
- none
