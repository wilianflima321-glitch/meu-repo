# 41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25
Status: GENERATED ACTIVE LARGE FILE PRESSURE SWEEP
Generated: 2026-02-25T18:04:27.877Z

## Summary
- Scanned files: 1172
- Line threshold: 900
- Files above threshold: 71
- Hard limit: 136

## Top Large Files
| File | Lines |
| --- | ---: |
| `cloud-web-app/web/lib/ecs/prefab-component-system.tsx` | 1045 |
| `cloud-web-app/web/lib/state/game-state-manager.tsx` | 1042 |
| `cloud-web-app/web/lib/assets/asset-importer.ts` | 1039 |
| `cloud-web-app/web/lib/settings/settings-system.tsx` | 1038 |
| `cloud-web-app/web/lib/particles/advanced-particle-system.ts` | 1036 |
| `cloud-web-app/web/lib/ray-tracing.ts` | 1035 |
| `cloud-web-app/web/lib/aethel-sdk.ts` | 1033 |
| `cloud-web-app/web/lib/level-serialization.ts` | 1031 |
| `cloud-web-app/web/lib/terrain/terrain-system.ts` | 1030 |
| `cloud-web-app/web/lib/events/event-bus-system.tsx` | 1028 |
| `cloud-web-app/web/lib/advanced-input-system.ts` | 1027 |
| `cloud-web-app/web/lib/pixel-streaming.ts` | 1025 |
| `cloud-web-app/web/lib/mcp/aethel-mcp-server.ts` | 1024 |
| `cloud-web-app/web/lib/quest-mission-system.ts` | 1016 |
| `cloud-web-app/web/lib/facial-animation-system.ts` | 1015 |
| `cloud-web-app/web/lib/skeletal-animation.ts` | 1015 |
| `cloud-web-app/web/components/character/ControlRigEditor.tsx` | 1011 |
| `cloud-web-app/web/lib/extensions/extension-system.ts` | 1010 |
| `cloud-web-app/web/lib/audio/spatial-audio-system.ts` | 1006 |
| `cloud-web-app/web/lib/ai-audio-engine.ts` | 1005 |
| `cloud-web-app/web/lib/sequencer-cinematics.ts` | 1003 |
| `cloud-web-app/web/lib/debug/object-inspector.tsx` | 1001 |
| `cloud-web-app/web/lib/debug/profiler-system.tsx` | 1001 |
| `cloud-web-app/web/lib/server/build-runtime.ts` | 1001 |
| `cloud-web-app/web/lib/particle-system-real.ts` | 1000 |
| `cloud-web-app/web/lib/volumetric-clouds.ts` | 1000 |
| `cloud-web-app/web/lib/animation/animation-system.ts` | 995 |
| `cloud-web-app/web/lib/networking/multiplayer-system.tsx` | 993 |
| `cloud-web-app/web/components/editors/SpriteEditor.tsx` | 990 |
| `cloud-web-app/web/lib/hooks/useTheiaSystemsHooks.ts` | 989 |
| `cloud-web-app/web/lib/vfx-graph-editor.ts` | 987 |
| `cloud-web-app/web/lib/commands/command-handlers.tsx` | 986 |
| `cloud-web-app/web/lib/control-rig-system.ts` | 985 |
| `cloud-web-app/web/lib/workspace/workspace-service.ts` | 984 |
| `cloud-web-app/web/lib/server/git-service.ts` | 978 |
| `cloud-web-app/web/components/physics/DestructionEditor.tsx` | 975 |
| `cloud-web-app/web/components/ui/DesignSystem.tsx` | 975 |
| `cloud-web-app/web/components/debug/AdvancedDebug.tsx` | 974 |
| `cloud-web-app/web/lib/input/haptics-system.tsx` | 973 |
| `cloud-web-app/web/lib/environment/weather-system.tsx` | 970 |
| `cloud-web-app/web/lib/store/workspace-store.ts` | 970 |
| `cloud-web-app/web/app/api/ai/chat-advanced/route.ts` | 969 |
| `cloud-web-app/web/lib/camera/camera-system.tsx` | 969 |
| `cloud-web-app/web/components/environment/WaterEditor.tsx` | 965 |
| `cloud-web-app/web/lib/health-check.ts` | 965 |
| `cloud-web-app/web/lib/webxr-vr-system.ts` | 964 |
| `cloud-web-app/web/lib/engine/scene-graph.ts` | 963 |
| `cloud-web-app/web/lib/inventory/inventory-system.tsx` | 963 |
| `cloud-web-app/web/lib/rate-limiting.ts` | 962 |
| `cloud-web-app/web/lib/streaming/level-streaming-system.tsx` | 959 |
| `cloud-web-app/web/lib/gameplay-ability-system.ts` | 957 |
| `cloud-web-app/web/lib/navigation-mesh.ts` | 949 |
| `cloud-web-app/web/lib/foliage-system.ts` | 945 |
| `cloud-web-app/web/lib/input/controller-mapper.tsx` | 945 |
| `cloud-web-app/web/lib/scene/scene-serializer.ts` | 945 |
| `cloud-web-app/web/lib/commands/command-registry.tsx` | 940 |
| `cloud-web-app/web/lib/engine/particle-system.ts` | 938 |
| `cloud-web-app/web/lib/hot-reload-system.ts` | 938 |
| `cloud-web-app/web/components/engine/DetailsPanel.tsx` | 933 |
| `cloud-web-app/web/lib/a11y/accessibility.tsx` | 929 |
| `cloud-web-app/web/components/animation/KeyframeSystem.tsx` | 928 |
| `cloud-web-app/web/hooks/useAethelGateway.ts` | 928 |
| `cloud-web-app/web/lib/ai/agent-mode.ts` | 927 |
| `cloud-web-app/web/lib/virtual-texture-system.ts` | 925 |
| `cloud-web-app/web/lib/ai-tools-registry.ts` | 920 |
| `cloud-web-app/web/lib/server/search-runtime.ts` | 920 |
| `cloud-web-app/web/lib/debug/devtools-provider.tsx` | 914 |
| `cloud-web-app/web/lib/destruction-system.ts` | 907 |
| `cloud-web-app/web/lib/plugins/plugin-system.tsx` | 905 |
| `cloud-web-app/web/lib/ecs-dots-system.ts` | 900 |
| `cloud-web-app/web/lib/feature-flags.ts` | 900 |

## Policy
1. This metric tracks maintainability pressure in active product surfaces.
2. If `--max-files` is configured, count growth above the baseline is blocking.
3. Reductions should be delivered by modular decomposition, not by disabling checks.
