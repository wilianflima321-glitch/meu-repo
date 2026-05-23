# Large File Risk Audit

Generated: deterministic local scan

This audit tracks source files with at least 1000 lines. The goal is not to blindly split working systems; it is to stop silent god-file regression, identify low-import aspirational modules, and force extraction plans before future growth.

## Executive Summary

- Large source files: 34
- P0 files: 0
- P1 low-import large modules: 23
- P1 modules with explicit triage: 23
- Retired runtime entrypoints forbidden: 4
- Hard ceiling: 1800 lines
- UI ceiling: 1200 lines
- API route ceiling: 1200 lines

## Categories

- `foundation-runtime`: 22
- `creative-runtime`: 9
- `server-runtime`: 3

## Owner Decisions

- Keep large runtime kernels only when they are protocol-heavy and covered by gates.
- UI surfaces above 1200 lines must be split before new feature work.
- API routes above 1200 lines must move business logic to `lib/**` modules.
- Low-import creative/runtime modules must be wired into visible editors or archived; they cannot remain ambiguous forever.
- Every P1 low-import module must have an explicit `wire`, `archive`, `held`, or `adapter-needed` decision in this report.
- Retired runtime entrypoints cannot return without a typed adapter, owner surface, and tests.
- Engine-spine modules must state a load strategy and limitation so hidden systems do not slow public/product routes by accident.
- New files over 1000 lines are allowed only with a test, category, and explicit extraction plan.

## Retired Runtime Entrypoints

| File | Status | Re-entry rule |
| --- | --- | --- |
| `lib/aethel-sdk.ts` | retired-confirmed | Must stay out of the live tree; recover from Git history only if a typed adapter and tests are added first. |
| `lib/engine/aethel-engine.tsx` | retired-confirmed | Must stay out of the live tree; recover from Git history only if a typed adapter and tests are added first. |
| `lib/ui/ui-framework.tsx` | retired-confirmed | Must stay out of the live tree; recover from Git history only if a typed adapter and tests are added first. |
| `lib/debug/debug-console.tsx` | retired-confirmed | Must stay out of the live tree; recover from Git history only if a typed adapter and tests are added first. |

## Highest-Risk Files

| File | Lines | Category | Risk | Import hints | Recommendation |
| --- | ---: | --- | --- | ---: | --- |
| `lib/debug/real-debug-adapter.ts` | 1074 | foundation-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/nanite-virtualized-geometry.ts` | 1067 | foundation-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/motion-matching-system.ts` | 1066 | foundation-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/engine/scene-graph.ts` | 1065 | creative-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/engine/audio-manager.ts` | 1063 | creative-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/webxr-vr-system.ts` | 1061 | foundation-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/ecs-dots-system.ts` | 1056 | foundation-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/dialogue/dialogue-system.tsx` | 1054 | creative-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/aaa-render-system.ts` | 1053 | foundation-runtime | P1 low-import large module | 1 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/hot-reload/hot-reload-server.ts` | 1049 | foundation-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/quest-mission-system.ts` | 1046 | foundation-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/assets/asset-importer.ts` | 1041 | foundation-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/pbr-shader-pipeline.ts` | 1037 | foundation-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/ray-tracing.ts` | 1035 | foundation-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/ai-audio-engine.ts` | 1034 | foundation-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/events/event-bus-system.tsx` | 1032 | creative-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/terrain/terrain-system.ts` | 1030 | creative-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/extensions/extension-system.ts` | 1021 | foundation-runtime | P1 low-import large module | 1 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/audio/spatial-audio-system.ts` | 1007 | creative-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/debug/object-inspector.tsx` | 1001 | foundation-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/debug/profiler-system.tsx` | 1001 | foundation-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/physics/physics-system.ts` | 1001 | creative-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/volumetric-clouds.ts` | 1000 | foundation-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |

## P1 Triage Decisions

| File | Decision | Target surface | Load strategy | Rationale |
| --- | --- | --- | --- | --- |
| `lib/debug/real-debug-adapter.ts` | held | Runtime/toolchain evidence | worker-or-sidecar | Needs capability, cost, license, and safety evidence before runtime activation. |
| `lib/nanite-virtualized-geometry.ts` | adapter-needed | Studio engine adapter | dynamic-client-only or worker/sidecar | Expose as read-only capability evidence before enabling writes or heavy execution. |
| `lib/motion-matching-system.ts` | held | Runtime/toolchain evidence | worker-or-sidecar | Needs capability, cost, license, and safety evidence before runtime activation. |
| `lib/engine/scene-graph.ts` | adapter-needed | Studio engine adapter | dynamic-client-only or worker/sidecar | Expose as read-only capability evidence before enabling writes or heavy execution. |
| `lib/engine/audio-manager.ts` | adapter-needed | Studio engine adapter | dynamic-client-only or worker/sidecar | Expose as read-only capability evidence before enabling writes or heavy execution. |
| `lib/webxr-vr-system.ts` | held | Runtime/toolchain evidence | worker-or-sidecar | Needs capability, cost, license, and safety evidence before runtime activation. |
| `lib/ecs-dots-system.ts` | adapter-needed | Studio engine adapter | dynamic-client-only or worker/sidecar | Expose as read-only capability evidence before enabling writes or heavy execution. |
| `lib/dialogue/dialogue-system.tsx` | adapter-needed | Studio engine adapter | dynamic-client-only or worker/sidecar | Expose as read-only capability evidence before enabling writes or heavy execution. |
| `lib/aaa-render-system.ts` | held | Runtime/toolchain evidence | worker-or-sidecar | Needs capability, cost, license, and safety evidence before runtime activation. |
| `lib/hot-reload/hot-reload-server.ts` | held | Runtime/toolchain evidence | worker-or-sidecar | Needs capability, cost, license, and safety evidence before runtime activation. |
| `lib/quest-mission-system.ts` | adapter-needed | Studio engine adapter | dynamic-client-only or worker/sidecar | Expose as read-only capability evidence before enabling writes or heavy execution. |
| `lib/assets/asset-importer.ts` | adapter-needed | Studio engine adapter | dynamic-client-only or worker/sidecar | Expose as read-only capability evidence before enabling writes or heavy execution. |
| `lib/pbr-shader-pipeline.ts` | held | Runtime/toolchain evidence | worker-or-sidecar | Needs capability, cost, license, and safety evidence before runtime activation. |
| `lib/ray-tracing.ts` | held | Runtime/toolchain evidence | worker-or-sidecar | Needs capability, cost, license, and safety evidence before runtime activation. |
| `lib/ai-audio-engine.ts` | adapter-needed | Studio engine adapter | dynamic-client-only or worker/sidecar | Expose as read-only capability evidence before enabling writes or heavy execution. |
| `lib/events/event-bus-system.tsx` | adapter-needed | Studio engine adapter | dynamic-client-only or worker/sidecar | Expose as read-only capability evidence before enabling writes or heavy execution. |
| `lib/terrain/terrain-system.ts` | adapter-needed | Studio engine adapter | dynamic-client-only or worker/sidecar | Expose as read-only capability evidence before enabling writes or heavy execution. |
| `lib/extensions/extension-system.ts` | adapter-needed | Studio engine adapter | dynamic-client-only or worker/sidecar | Expose as read-only capability evidence before enabling writes or heavy execution. |
| `lib/audio/spatial-audio-system.ts` | adapter-needed | Studio engine adapter | dynamic-client-only or worker/sidecar | Expose as read-only capability evidence before enabling writes or heavy execution. |
| `lib/debug/object-inspector.tsx` | held | Runtime/toolchain evidence | worker-or-sidecar | Needs capability, cost, license, and safety evidence before runtime activation. |
| `lib/debug/profiler-system.tsx` | held | Runtime/toolchain evidence | worker-or-sidecar | Needs capability, cost, license, and safety evidence before runtime activation. |
| `lib/physics/physics-system.ts` | adapter-needed | Studio engine adapter | dynamic-client-only or worker/sidecar | Expose as read-only capability evidence before enabling writes or heavy execution. |
| `lib/volumetric-clouds.ts` | adapter-needed | Studio engine adapter | dynamic-client-only or worker/sidecar | Expose as read-only capability evidence before enabling writes or heavy execution. |

## Full Inventory

| File | Lines | Category | Risk | Import hints |
| --- | ---: | --- | --- | ---: |
| `lib/server/websocket-server.ts` | 1129 | server-runtime | P2 tracked large module | 4 |
| `server/workers/build-queue-worker.ts` | 1111 | server-runtime | P2 tracked large module | 0 |
| `lib/ai-tools-registry.ts` | 1085 | foundation-runtime | P2 tracked large module | 5 |
| `lib/ai/behavior-tree-system.tsx` | 1085 | creative-runtime | P2 tracked large module | 4 |
| `lib/debug/real-debug-adapter.ts` | 1074 | foundation-runtime | P1 low-import large module | 0 |
| `lib/nanite-virtualized-geometry.ts` | 1067 | foundation-runtime | P1 low-import large module | 0 |
| `lib/video-encoder-real.ts` | 1067 | foundation-runtime | P2 tracked large module | 3 |
| `lib/motion-matching-system.ts` | 1066 | foundation-runtime | P1 low-import large module | 0 |
| `lib/engine/scene-graph.ts` | 1065 | creative-runtime | P1 low-import large module | 0 |
| `lib/engine/audio-manager.ts` | 1063 | creative-runtime | P1 low-import large module | 0 |
| `lib/webxr-vr-system.ts` | 1061 | foundation-runtime | P1 low-import large module | 0 |
| `lib/ecs-dots-system.ts` | 1056 | foundation-runtime | P1 low-import large module | 0 |
| `lib/dialogue/dialogue-system.tsx` | 1054 | creative-runtime | P1 low-import large module | 0 |
| `lib/aaa-render-system.ts` | 1053 | foundation-runtime | P1 low-import large module | 1 |
| `lib/hot-reload/hot-reload-server.ts` | 1049 | foundation-runtime | P1 low-import large module | 0 |
| `lib/quest-mission-system.ts` | 1046 | foundation-runtime | P1 low-import large module | 0 |
| `lib/assets/asset-importer.ts` | 1041 | foundation-runtime | P1 low-import large module | 0 |
| `lib/pbr-shader-pipeline.ts` | 1037 | foundation-runtime | P1 low-import large module | 0 |
| `lib/ray-tracing.ts` | 1035 | foundation-runtime | P1 low-import large module | 0 |
| `lib/ai-audio-engine.ts` | 1034 | foundation-runtime | P1 low-import large module | 0 |
| `lib/events/event-bus-system.tsx` | 1032 | creative-runtime | P1 low-import large module | 0 |
| `lib/terrain/terrain-system.ts` | 1030 | creative-runtime | P1 low-import large module | 0 |
| `lib/particles/advanced-particle-system.ts` | 1023 | creative-runtime | P2 tracked large module | 3 |
| `lib/extensions/extension-system.ts` | 1021 | foundation-runtime | P1 low-import large module | 1 |
| `lib/cloth-simulation.ts` | 1018 | foundation-runtime | P2 tracked large module | 2 |
| `lib/facial-animation-system.ts` | 1015 | foundation-runtime | P2 tracked large module | 3 |
| `lib/yjs-collaboration.ts` | 1013 | foundation-runtime | P2 tracked large module | 8 |
| `lib/audio/spatial-audio-system.ts` | 1007 | creative-runtime | P1 low-import large module | 0 |
| `lib/debug/object-inspector.tsx` | 1001 | foundation-runtime | P1 low-import large module | 0 |
| `lib/debug/profiler-system.tsx` | 1001 | foundation-runtime | P1 low-import large module | 0 |
| `lib/physics/physics-system.ts` | 1001 | creative-runtime | P1 low-import large module | 0 |
| `lib/server/build-runtime.ts` | 1001 | server-runtime | P2 tracked large module | 0 |
| `lib/particle-system-real.ts` | 1000 | foundation-runtime | P2 tracked large module | 3 |
| `lib/volumetric-clouds.ts` | 1000 | foundation-runtime | P1 low-import large module | 0 |

## Next Refactor Queue

1. `lib/server/ai-chat-advanced/**` and `lib/server/ai-change-apply/**`: keep critical AI route orchestration split and enforced by `qa:ai-route-split`.
2. `lib/level-serialization/**`: keep the canonical serializer/format/manager/history split enforced by `qa:level-serialization-split`.
3. `lib/mcp/aethel/**`: keep the tool definitions, auth policy, handlers, response schemas, resources, and prompts split enforced by `qa:mcp-server-split`.
4. `lib/server/extension-host/**`: keep the runtime/API/types split enforced by `qa:extension-host-split`.
5. `lib/pixel-streaming/**`: keep the new signaling/session/codec/cost split enforced by `qa:pixel-streaming-split`.
6. `lib/server/websocket/**`: keep the transport/auth/rooms/presence split enforced by `qa:websocket-runtime-split`.

## Validation

Run `npm run qa:large-file-risk` to fail on unbounded file growth, retired runtime re-entry, or new untracked monoliths.
Run `npm run qa:engine-spine-modules` to ensure V18-V20 engine assets have explicit load strategies before wiring.
