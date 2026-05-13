# Large File Risk Audit

Generated: 2026-05-13

This audit tracks source files with at least 1000 lines. The goal is not to blindly split working systems; it is to stop silent god-file regression, identify low-import aspirational modules, and force extraction plans before future growth.

## Executive Summary

- Large source files: 70
- P0 files: 0
- P1 low-import large modules: 57
- Hard ceiling: 1800 lines
- UI ceiling: 1200 lines
- API route ceiling: 1200 lines

## Categories

- `foundation-runtime`: 37
- `creative-runtime`: 24
- `server-runtime`: 4
- `api-route`: 2
- `agent-spine`: 1
- `mcp-tooling`: 1
- `ui-runtime`: 1

## Owner Decisions

- Keep large runtime kernels only when they are protocol-heavy and covered by gates.
- UI surfaces above 1200 lines must be split before new feature work.
- API routes above 1200 lines must move business logic to `lib/**` modules.
- Low-import creative/runtime modules must be wired into visible editors or archived; they cannot remain ambiguous forever.
- New files over 1000 lines are allowed only with a test, category, and explicit extraction plan.

## Highest-Risk Files

| File | Lines | Category | Risk | Import hints | Recommendation |
| --- | ---: | --- | --- | ---: | --- |
| `lib/level-serialization.ts` | 1227 | foundation-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/dialogue-cutscene-system.ts` | 1201 | foundation-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/cutscene/cutscene-system.tsx` | 1195 | creative-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/ui/ui-framework.tsx` | 1195 | ui-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/capture/capture-system.tsx` | 1193 | creative-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/inventory/inventory-system.tsx` | 1191 | foundation-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/ecs/prefab-component-system.tsx` | 1190 | creative-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/translations.ts` | 1190 | foundation-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/aethel-sdk.ts` | 1181 | foundation-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/postprocessing/post-processing-system.ts` | 1181 | creative-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/networking/multiplayer-system.tsx` | 1171 | creative-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/hot-reload-system.ts` | 1166 | foundation-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/advanced-input-system.ts` | 1164 | foundation-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/state/game-state-manager.tsx` | 1161 | creative-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/world/world-streaming.tsx` | 1161 | creative-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/quests/quest-system.tsx` | 1153 | foundation-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/settings/settings-system.tsx` | 1153 | foundation-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/animation/animation-system.ts` | 1151 | creative-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/scene/scene-serializer.ts` | 1149 | creative-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/aaa-asset-pipeline.ts` | 1148 | foundation-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/input/controller-mapper.tsx` | 1146 | creative-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/save/save-manager.tsx` | 1144 | creative-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/onboarding-system.ts` | 1137 | foundation-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/particles/advanced-particle-system.ts` | 1132 | creative-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |
| `lib/debug/debug-console.tsx` | 1112 | foundation-runtime | P1 low-import large module | 0 | Decide: wire visibly into editor/runtime or archive behind an explicit legacy boundary. |

## Full Inventory

| File | Lines | Category | Risk | Import hints |
| --- | ---: | --- | --- | ---: |
| `lib/server/websocket-server.ts` | 1444 | server-runtime | P2 tracked large module | 3 |
| `lib/server/extension-host-runtime.ts` | 1306 | server-runtime | P2 tracked large module | 1 |
| `lib/pixel-streaming.ts` | 1245 | foundation-runtime | P2 tracked large module | 2 |
| `lib/level-serialization.ts` | 1227 | foundation-runtime | P1 low-import large module | 0 |
| `lib/mcp/aethel-mcp-server.ts` | 1227 | mcp-tooling | P2 tracked large module | 2 |
| `lib/production/repository-cartography.ts` | 1220 | agent-spine | P2 tracked large module | 33 |
| `lib/dialogue-cutscene-system.ts` | 1201 | foundation-runtime | P1 low-import large module | 0 |
| `lib/cutscene/cutscene-system.tsx` | 1195 | creative-runtime | P1 low-import large module | 0 |
| `lib/ui/ui-framework.tsx` | 1195 | ui-runtime | P1 low-import large module | 0 |
| `lib/capture/capture-system.tsx` | 1193 | creative-runtime | P1 low-import large module | 0 |
| `lib/inventory/inventory-system.tsx` | 1191 | foundation-runtime | P1 low-import large module | 0 |
| `lib/ecs/prefab-component-system.tsx` | 1190 | creative-runtime | P1 low-import large module | 0 |
| `lib/translations.ts` | 1190 | foundation-runtime | P1 low-import large module | 0 |
| `lib/aethel-sdk.ts` | 1181 | foundation-runtime | P1 low-import large module | 0 |
| `lib/postprocessing/post-processing-system.ts` | 1181 | creative-runtime | P1 low-import large module | 0 |
| `lib/networking/multiplayer-system.tsx` | 1171 | creative-runtime | P1 low-import large module | 0 |
| `lib/hot-reload-system.ts` | 1166 | foundation-runtime | P1 low-import large module | 0 |
| `lib/advanced-input-system.ts` | 1164 | foundation-runtime | P1 low-import large module | 0 |
| `lib/state/game-state-manager.tsx` | 1161 | creative-runtime | P1 low-import large module | 0 |
| `lib/world/world-streaming.tsx` | 1161 | creative-runtime | P1 low-import large module | 0 |
| `lib/quests/quest-system.tsx` | 1153 | foundation-runtime | P1 low-import large module | 0 |
| `lib/settings/settings-system.tsx` | 1153 | foundation-runtime | P1 low-import large module | 0 |
| `lib/animation/animation-system.ts` | 1151 | creative-runtime | P1 low-import large module | 0 |
| `lib/scene/scene-serializer.ts` | 1149 | creative-runtime | P1 low-import large module | 0 |
| `lib/aaa-asset-pipeline.ts` | 1148 | foundation-runtime | P1 low-import large module | 0 |
| `lib/input/controller-mapper.tsx` | 1146 | creative-runtime | P1 low-import large module | 0 |
| `lib/save/save-manager.tsx` | 1144 | creative-runtime | P1 low-import large module | 0 |
| `lib/onboarding-system.ts` | 1137 | foundation-runtime | P1 low-import large module | 0 |
| `lib/particles/advanced-particle-system.ts` | 1132 | creative-runtime | P1 low-import large module | 0 |
| `lib/debug/debug-console.tsx` | 1112 | foundation-runtime | P1 low-import large module | 0 |
| `server/workers/build-queue-worker.ts` | 1111 | server-runtime | P2 tracked large module | 0 |
| `lib/input/input-manager.ts` | 1098 | creative-runtime | P1 low-import large module | 0 |
| `lib/cache-system.ts` | 1095 | foundation-runtime | P1 low-import large module | 0 |
| `lib/terrain-engine.ts` | 1094 | foundation-runtime | P1 low-import large module | 0 |
| `lib/engine/asset-pipeline.ts` | 1092 | creative-runtime | P1 low-import large module | 0 |
| `lib/materials/material-editor.ts` | 1091 | creative-runtime | P1 low-import large module | 0 |
| `lib/visual-script/runtime.ts` | 1088 | creative-runtime | P1 low-import large module | 0 |
| `lib/ai-tools-registry.ts` | 1085 | foundation-runtime | P2 tracked large module | 3 |
| `lib/ai/behavior-tree-system.tsx` | 1084 | creative-runtime | P2 tracked large module | 2 |
| `lib/fluid-simulation-system.ts` | 1077 | foundation-runtime | P1 low-import large module | 0 |
| `lib/debug/real-debug-adapter.ts` | 1074 | foundation-runtime | P1 low-import large module | 0 |
| `lib/nanite-virtualized-geometry.ts` | 1067 | foundation-runtime | P1 low-import large module | 0 |
| `lib/video-encoder-real.ts` | 1067 | foundation-runtime | P2 tracked large module | 3 |
| `lib/motion-matching-system.ts` | 1066 | foundation-runtime | P1 low-import large module | 0 |
| `lib/engine/scene-graph.ts` | 1065 | creative-runtime | P1 low-import large module | 0 |
| `lib/engine/audio-manager.ts` | 1063 | creative-runtime | P1 low-import large module | 0 |
| `app/api/ai/chat-advanced/route.ts` | 1062 | api-route | P2 tracked large module | 2 |
| `lib/webxr-vr-system.ts` | 1061 | foundation-runtime | P1 low-import large module | 0 |
| `lib/ecs-dots-system.ts` | 1056 | foundation-runtime | P1 low-import large module | 0 |
| `lib/dialogue/dialogue-system.tsx` | 1054 | creative-runtime | P1 low-import large module | 0 |
| `lib/aaa-render-system.ts` | 1052 | foundation-runtime | P1 low-import large module | 0 |
| `lib/hot-reload/hot-reload-server.ts` | 1049 | foundation-runtime | P1 low-import large module | 0 |
| `lib/quest-mission-system.ts` | 1046 | foundation-runtime | P1 low-import large module | 0 |
| `app/api/ai/change/apply/route.ts` | 1043 | api-route | P2 tracked large module | 5 |
| `lib/assets/asset-importer.ts` | 1040 | foundation-runtime | P1 low-import large module | 0 |
| `lib/pbr-shader-pipeline.ts` | 1037 | foundation-runtime | P1 low-import large module | 0 |
| `lib/ray-tracing.ts` | 1035 | foundation-runtime | P1 low-import large module | 0 |
| `lib/ai-audio-engine.ts` | 1034 | foundation-runtime | P1 low-import large module | 0 |
| `lib/events/event-bus-system.tsx` | 1032 | creative-runtime | P1 low-import large module | 0 |
| `lib/terrain/terrain-system.ts` | 1030 | creative-runtime | P1 low-import large module | 0 |
| `lib/extensions/extension-system.ts` | 1021 | foundation-runtime | P1 low-import large module | 1 |
| `lib/cloth-simulation.ts` | 1017 | foundation-runtime | P2 tracked large module | 2 |
| `lib/facial-animation-system.ts` | 1015 | foundation-runtime | P1 low-import large module | 0 |
| `lib/audio/spatial-audio-system.ts` | 1007 | creative-runtime | P1 low-import large module | 0 |
| `lib/debug/object-inspector.tsx` | 1001 | foundation-runtime | P1 low-import large module | 0 |
| `lib/debug/profiler-system.tsx` | 1001 | foundation-runtime | P1 low-import large module | 0 |
| `lib/physics/physics-system.ts` | 1001 | creative-runtime | P1 low-import large module | 0 |
| `lib/server/build-runtime.ts` | 1001 | server-runtime | P2 tracked large module | 0 |
| `lib/particle-system-real.ts` | 1000 | foundation-runtime | P1 low-import large module | 0 |
| `lib/volumetric-clouds.ts` | 1000 | foundation-runtime | P1 low-import large module | 0 |

## Next Refactor Queue

1. `lib/server/websocket-server.ts`: split transport, auth, room registry, presence, and telemetry.
2. `lib/server/extension-host-runtime.ts`: split manifest validation, sandbox lifecycle, capability resolution, and process supervision.
3. `lib/pixel-streaming.ts`: split signaling, session lifecycle, codec policy, and cloud GPU provider adapters.
4. `lib/mcp/aethel-mcp-server.ts`: split tool definitions, auth policy, handlers, and response schemas.
5. `components/viewport/AethelViewport3D.tsx`: keep as the viewport orchestrator; next extraction should target inspector/outliner only if they cross the UI ceiling.
6. `app/api/ai/chat-advanced/route.ts` and `app/api/ai/change/apply/route.ts`: move policy and apply orchestration into tested production modules.

## Validation

Run `npm run qa:large-file-risk` to fail on unbounded file growth or new untracked monoliths.
