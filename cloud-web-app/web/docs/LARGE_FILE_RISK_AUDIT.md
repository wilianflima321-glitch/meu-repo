# Large File Risk Audit

Generated: deterministic local scan

This audit tracks source files with at least 1000 lines. The goal is not to blindly split working systems; it is to stop silent god-file regression, identify low-import aspirational modules, and force extraction plans before future growth.

## Executive Summary

- Large source files: 7
- P0 files: 0
- P1 low-import large modules: 2
- P1 modules with explicit triage: 2
- Retired runtime entrypoints forbidden: 4
- Hard ceiling: 1800 lines
- UI ceiling: 1200 lines
- API route ceiling: 1200 lines

## Categories

- `foundation-runtime`: 4
- `server-runtime`: 2
- `creative-runtime`: 1

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
| `lib/engine/scene-graph.ts` | 1065 | creative-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |
| `lib/hot-reload/hot-reload-server.ts` | 1049 | foundation-runtime | P1 low-import large module | 0 | Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter. |

## P1 Triage Decisions

| File | Decision | Target surface | Load strategy | Rationale |
| --- | --- | --- | --- | --- |
| `lib/engine/scene-graph.ts` | adapter-needed | Studio engine adapter | dynamic-client-only or worker/sidecar | Expose as read-only capability evidence before enabling writes or heavy execution. |
| `lib/hot-reload/hot-reload-server.ts` | held | Runtime/toolchain evidence | worker-or-sidecar | Needs capability, cost, license, and safety evidence before runtime activation. |

## Full Inventory

| File | Lines | Category | Risk | Import hints |
| --- | ---: | --- | --- | ---: |
| `lib/server/websocket-server.ts` | 1092 | server-runtime | P2 tracked large module | 4 |
| `lib/engine/scene-graph.ts` | 1065 | creative-runtime | P1 low-import large module | 0 |
| `lib/hot-reload/hot-reload-server.ts` | 1049 | foundation-runtime | P1 low-import large module | 0 |
| `server/workers/build-queue-worker.ts` | 1033 | server-runtime | P2 tracked large module | 0 |
| `lib/cloth-simulation.ts` | 1018 | foundation-runtime | P2 tracked large module | 2 |
| `lib/facial-animation-system.ts` | 1015 | foundation-runtime | P2 tracked large module | 3 |
| `lib/yjs-collaboration.ts` | 1013 | foundation-runtime | P2 tracked large module | 8 |

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
