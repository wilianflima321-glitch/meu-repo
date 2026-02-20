# ARCHITECTURE_CRITICAL_TRIAGE

- Generated at: `2026-02-20T04:40:20.252Z`
- Scope: `app/`, `components/`, `lib/`, `hooks/`

## Core Metrics

- API route files: **246**
- Deprecated component files (`components/_deprecated/*`): **0**
- Frontend usage of file compatibility routes (`/api/files/read|write|list|...`): **0**
- Frontend usage of deprecated workspace routes (`/api/workspace/*`): **0**
- Redirect alias pages to `/ide?entry=`: **0**
- API NOT_IMPLEMENTED markers (`app/api/**/route.ts`): **8**
- File API compatibility wrappers (`trackCompatibilityRouteHit` in `app/api/files/*`): **8**
- Duplicate component basenames: **0**
- Oversized source files (>=1200 lines): **10**

## Top Compatibility Call Sites

### `/api/files/read|write|list|...` usage

| File | Matches |
| --- | ---: |

### `/api/workspace/*` usage outside route handlers

| File | Matches |
| --- | ---: |

## Unreferenced Candidate Check

| File | Referenced |
| --- | --- |
| `components/editor/MonacoEditor.tsx` | yes |

## Duplicate Component Basenames

- none

## Oversized Source Files (>=1200 lines)

| File | Lines |
| --- | ---: |
| `components/AethelDashboard.tsx` | 3528 |
| `lib/ai-audio-engine.ts` | 1653 |
| `components/video/VideoTimelineEditor.tsx` | 1572 |
| `components/physics/FluidSimulationEditor.tsx` | 1570 |
| `lib/vfx-graph-editor.ts` | 1505 |
| `components/media/MediaStudio.tsx` | 1487 |
| `lib/fluid-simulation-system.ts` | 1482 |
| `lib/quest-mission-system.ts` | 1438 |
| `components/engine/LevelEditor.tsx` | 1410 |
| `lib/ai/behavior-tree-system.tsx` | 1400 |

## Notes

- Compatibility routes can be intentional, but should have a time-boxed removal plan.
- Unreferenced candidates should be confirmed and removed or moved to `_deprecated`.
- This report is informational and does not replace enterprise gate checks.

