# Large File Ratchet Plan

Generated: deterministic local scan

- Watch line limit: 800
- Files above watch limit: 117 / 117
- Max file lines: 1150 / 1150
- Failures: 0

## Category Counts
- `runtime`: 81
- `ui`: 27
- `server`: 5
- `other`: 3
- `route`: 1

## Top Refactor Queue

| File | Lines | Category | Next action |
| --- | ---: | --- | --- |
| `lib/server/websocket-server.ts` | 1150 | server | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/particles/advanced-particle-system.ts` | 1132 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `server/workers/build-queue-worker.ts` | 1111 | other | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/ai-tools-registry.ts` | 1085 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/ai/behavior-tree-system.tsx` | 1085 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/debug/real-debug-adapter.ts` | 1074 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/nanite-virtualized-geometry.ts` | 1067 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/video-encoder-real.ts` | 1067 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/motion-matching-system.ts` | 1066 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/engine/scene-graph.ts` | 1065 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/engine/audio-manager.ts` | 1063 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/webxr-vr-system.ts` | 1061 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/ecs-dots-system.ts` | 1056 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/dialogue/dialogue-system.tsx` | 1054 | runtime | Split planning, timeline, playback, and serialization before adding film features. |
| `lib/aaa-render-system.ts` | 1053 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/hot-reload/hot-reload-server.ts` | 1049 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/quest-mission-system.ts` | 1046 | runtime | Split data model, runtime, persistence, and editor adapter. |
| `lib/assets/asset-importer.ts` | 1041 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/pbr-shader-pipeline.ts` | 1037 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/ray-tracing.ts` | 1035 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/ai-audio-engine.ts` | 1034 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/events/event-bus-system.tsx` | 1032 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/terrain/terrain-system.ts` | 1030 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/extensions/extension-system.ts` | 1021 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/cloth-simulation.ts` | 1018 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/facial-animation-system.ts` | 1015 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/yjs-collaboration.ts` | 1013 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/audio/spatial-audio-system.ts` | 1007 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/debug/object-inspector.tsx` | 1001 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/debug/profiler-system.tsx` | 1001 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |

## Ratchet Policy

- Do not add new files above 800 lines.
- Do not let any file exceed 1,200 lines.
- Split UI surfaces before adding features.
- Runtime kernels may stay large only with an owner, adapter strategy, and dedicated gate.

## Failures
- none
