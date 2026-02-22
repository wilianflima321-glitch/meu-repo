# ARCHITECTURE_CRITICAL_TRIAGE

- Generated at: `2026-02-22T01:02:49.848Z`
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
- Oversized source files (>=1200 lines): **0**

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

- none

## Notes

- Compatibility routes can be intentional, but should have a time-boxed removal plan.
- Unreferenced candidates should be confirmed and removed or moved to `_deprecated`.
- This report is informational and does not replace enterprise gate checks.

