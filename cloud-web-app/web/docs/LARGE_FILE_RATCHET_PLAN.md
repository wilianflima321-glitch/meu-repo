# Large File Ratchet Plan

Generated: deterministic local scan

- Watch line limit: 800
- Files above watch limit: 115 / 117
- Max file lines: 1092 / 1092
- Failures: 0

## Category Counts
- `runtime`: 79
- `ui`: 27
- `server`: 5
- `other`: 3
- `route`: 1

## Top Refactor Queue

| File | Lines | Category | Next action |
| --- | ---: | --- | --- |
| `lib/server/websocket-server.ts` | 1092 | server | Continue extracting protocol-specific handlers; event bus, transport, auth, rooms, and presence are already split. |
| `lib/engine/scene-graph.ts` | 1065 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/hot-reload/hot-reload-server.ts` | 1049 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `server/workers/build-queue-worker.ts` | 1033 | other | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/cloth-simulation.ts` | 1018 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/facial-animation-system.ts` | 1015 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/yjs-collaboration.ts` | 1013 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/ray-tracing.ts` | 997 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/commands/command-handlers.tsx` | 995 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/ai/behavior-tree-system.tsx` | 994 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/particle-system-real.ts` | 993 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/nanite-virtualized-geometry.ts` | 990 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/hooks/useTheiaSystemsHooks.ts` | 989 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/ai/agent-mode.ts` | 988 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/control-rig-system.ts` | 986 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/dialogue/dialogue-system.tsx` | 986 | runtime | Split planning, timeline, playback, and serialization before adding film features. |
| `lib/server/build-runtime.ts` | 986 | server | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/events/event-bus-system.tsx` | 985 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/workspace/workspace-service.ts` | 985 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/assets/asset-importer.ts` | 984 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/volumetric-clouds.ts` | 984 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/webxr-vr-system.ts` | 982 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/video-encoder-real.ts` | 981 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/motion-matching-system.ts` | 980 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/server/git-service.ts` | 978 | server | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/input/haptics-system.tsx` | 974 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/physics/physics-system.ts` | 973 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/terrain/terrain-system.ts` | 973 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `components/animation/KeyframeSystem.tsx` | 970 | ui | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/engine/audio-manager.ts` | 970 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |

## Ratchet Policy

- Do not add new files above 800 lines.
- Do not let any file exceed 1092 lines without an explicit ratchet update.
- Split UI surfaces before adding features.
- Runtime kernels may stay large only with an owner, adapter strategy, and dedicated gate.

## Failures
- none
