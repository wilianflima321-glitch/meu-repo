# Large File Ratchet Plan

Generated: deterministic local scan

- Watch line limit: 800
- Files above watch limit: 108 / 108
- Max file lines: 992 / 993
- Low-import large modules: 0 / 0
- Low-import threshold: <= 1 import hint
- Failures: 0

## Category Counts
- `runtime`: 69
- `ui`: 27
- `server`: 6
- `production-spine`: 3
- `other`: 2
- `route`: 1

## Top Refactor Queue

| File | Lines | Import hints | Category | Next action |
| --- | ---: | ---: | --- | --- |
| `lib/server/websocket-server.ts` | 992 | 4 | server | Continue extracting protocol-specific handlers; event bus, transport, auth, rooms, and presence are already split. |
| `lib/control-rig-system.ts` | 986 | 3 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/dialogue/dialogue-system.tsx` | 986 | 4 | runtime | Split planning, timeline, playback, and serialization before adding film features. |
| `lib/server/build-runtime.ts` | 986 | 0 | server | Assign owner and extract one cohesive subsystem before feature growth. |
| `server/workers/build-queue-worker.ts` | 986 | 0 | server | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/events/event-bus-system.tsx` | 985 | 3 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/workspace/workspace-service.ts` | 985 | 3 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/assets/asset-importer.ts` | 984 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/volumetric-clouds.ts` | 984 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/webxr-vr-system.ts` | 982 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/video-encoder-real.ts` | 981 | 3 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/motion-matching-system.ts` | 980 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/server/git-service.ts` | 978 | 2 | server | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/cloth-simulation.ts` | 977 | 2 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/input/haptics-system.tsx` | 974 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/physics/physics-system.ts` | 973 | 5 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/terrain/terrain-system.ts` | 973 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `components/animation/KeyframeSystem.tsx` | 970 | 3 | ui | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/engine/audio-manager.ts` | 970 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/engine/physics-engine.ts` | 970 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/environment/weather-system.tsx` | 970 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/health-check.ts` | 970 | 3 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/camera/camera-system.tsx` | 969 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/rate-limiting.ts` | 967 | 2 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/particles/advanced-particle-system.ts` | 966 | 3 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `components/editor/MonacoEditorPro.tsx` | 965 | 12 | ui | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/quest-mission-system.ts` | 963 | 4 | runtime | Split data model, runtime, persistence, and editor adapter. |
| `lib/ai-tools-registry.ts` | 960 | 5 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/ecs-dots-system.ts` | 960 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/streaming/level-streaming-system.tsx` | 959 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |

## Low-Import Large Modules

These are the most suspicious modules: large enough to affect maintainability, but with little evidence that product surfaces depend on them directly.

| File | Lines | Import hints | Category | Required decision |
| --- | ---: | ---: | --- | --- |

## Ratchet Policy

- Do not add new files above 800 lines.
- Do not let any file exceed 993 lines without an explicit ratchet update.
- Do not increase low-import large modules above 0; new large modules need product wiring, adapter evidence, or archive decision.
- Split UI surfaces before adding features.
- Runtime kernels may stay large only with an owner, adapter strategy, and dedicated gate.

## Failures
- none
