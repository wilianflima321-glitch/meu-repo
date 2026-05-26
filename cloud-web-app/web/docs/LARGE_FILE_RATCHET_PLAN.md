# Large File Ratchet Plan

Generated: deterministic local scan

- Watch line limit: 800
- Files above watch limit: 115 / 115
- Max file lines: 997 / 1000
- Low-import large modules: 65 / 65
- Low-import threshold: <= 1 import hint
- Failures: 0

## Category Counts
- `runtime`: 76
- `ui`: 27
- `server`: 6
- `production-spine`: 3
- `other`: 2
- `route`: 1

## Top Refactor Queue

| File | Lines | Import hints | Category | Next action |
| --- | ---: | ---: | --- | --- |
| `lib/ray-tracing.ts` | 997 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/commands/command-handlers.tsx` | 995 | 0 | runtime | Choose one outcome before growth: wire through a visible adapter, archive, or mark held with owner/evidence. |
| `lib/ai/behavior-tree-system.tsx` | 994 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/particle-system-real.ts` | 993 | 3 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/server/websocket-server.ts` | 992 | 4 | server | Continue extracting protocol-specific handlers; event bus, transport, auth, rooms, and presence are already split. |
| `lib/nanite-virtualized-geometry.ts` | 990 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/hooks/useTheiaSystemsHooks.ts` | 989 | 0 | runtime | Choose one outcome before growth: wire through a visible adapter, archive, or mark held with owner/evidence. |
| `lib/ai/agent-mode.ts` | 988 | 2 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/control-rig-system.ts` | 986 | 3 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/dialogue/dialogue-system.tsx` | 986 | 0 | runtime | Choose one outcome before growth: wire through a visible adapter, archive, or mark held with owner/evidence. |
| `lib/server/build-runtime.ts` | 986 | 0 | server | Assign owner and extract one cohesive subsystem before feature growth. |
| `server/workers/build-queue-worker.ts` | 986 | 0 | server | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/events/event-bus-system.tsx` | 985 | 0 | runtime | Choose one outcome before growth: wire through a visible adapter, archive, or mark held with owner/evidence. |
| `lib/workspace/workspace-service.ts` | 985 | 0 | runtime | Choose one outcome before growth: wire through a visible adapter, archive, or mark held with owner/evidence. |
| `lib/assets/asset-importer.ts` | 984 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/volumetric-clouds.ts` | 984 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/webxr-vr-system.ts` | 982 | 0 | runtime | Choose one outcome before growth: wire through a visible adapter, archive, or mark held with owner/evidence. |
| `lib/video-encoder-real.ts` | 981 | 3 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/motion-matching-system.ts` | 980 | 0 | runtime | Choose one outcome before growth: wire through a visible adapter, archive, or mark held with owner/evidence. |
| `lib/server/git-service.ts` | 978 | 2 | server | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/cloth-simulation.ts` | 977 | 2 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/input/haptics-system.tsx` | 974 | 0 | runtime | Choose one outcome before growth: wire through a visible adapter, archive, or mark held with owner/evidence. |
| `lib/physics/physics-system.ts` | 973 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/terrain/terrain-system.ts` | 973 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `components/animation/KeyframeSystem.tsx` | 970 | 3 | ui | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/engine/audio-manager.ts` | 970 | 4 | runtime | Assign owner and extract one cohesive subsystem before feature growth. |
| `lib/engine/physics-engine.ts` | 970 | 0 | runtime | Choose one outcome before growth: wire through a visible adapter, archive, or mark held with owner/evidence. |
| `lib/environment/weather-system.tsx` | 970 | 0 | runtime | Choose one outcome before growth: wire through a visible adapter, archive, or mark held with owner/evidence. |
| `lib/health-check.ts` | 970 | 0 | runtime | Choose one outcome before growth: wire through a visible adapter, archive, or mark held with owner/evidence. |
| `lib/camera/camera-system.tsx` | 969 | 0 | runtime | Choose one outcome before growth: wire through a visible adapter, archive, or mark held with owner/evidence. |

## Low-Import Large Modules

These are the most suspicious modules: large enough to affect maintainability, but with little evidence that product surfaces depend on them directly.

| File | Lines | Import hints | Category | Required decision |
| --- | ---: | ---: | --- | --- |
| `lib/commands/command-handlers.tsx` | 995 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/hooks/useTheiaSystemsHooks.ts` | 989 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/dialogue/dialogue-system.tsx` | 986 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/events/event-bus-system.tsx` | 985 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/workspace/workspace-service.ts` | 985 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/webxr-vr-system.ts` | 982 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/motion-matching-system.ts` | 980 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/input/haptics-system.tsx` | 974 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/engine/physics-engine.ts` | 970 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/environment/weather-system.tsx` | 970 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/health-check.ts` | 970 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/camera/camera-system.tsx` | 969 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/quest-mission-system.ts` | 963 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/ecs-dots-system.ts` | 960 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/streaming/level-streaming-system.tsx` | 959 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/networking-multiplayer.ts` | 958 | 1 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `components/dashboard/useDashboardActions.ts` | 948 | 0 | ui | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/foliage-system.ts` | 947 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/debug/profiler-system.tsx` | 946 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/virtual-texture-system.ts` | 926 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/debug/object-inspector.tsx` | 925 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `hooks/useAethelGateway.ts` | 918 | 1 | other | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/aaa-render-system.ts` | 916 | 1 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/plugins/plugin-system.tsx` | 909 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `components/dashboard/SecurityDashboard.tsx` | 902 | 1 | ui | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/localization/localization-system.tsx` | 902 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/feature-flags.ts` | 901 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/sandbox/script-sandbox.ts` | 900 | 1 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `lib/ai-audio-engine.ts` | 899 | 0 | runtime | Wire visibly, archive, or keep held with owner/evidence. |
| `components/debug/AdvancedDebug.tsx` | 896 | 1 | ui | Wire visibly, archive, or keep held with owner/evidence. |

## Ratchet Policy

- Do not add new files above 800 lines.
- Do not let any file exceed 1000 lines without an explicit ratchet update.
- Do not increase low-import large modules above 65; new large modules need product wiring, adapter evidence, or archive decision.
- Split UI surfaces before adding features.
- Runtime kernels may stay large only with an owner, adapter strategy, and dedicated gate.

## Failures
- none
