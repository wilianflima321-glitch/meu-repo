# ARCHITECTURE_CRITICAL_TRIAGE

- Generated at: `2026-02-18T03:32:39.960Z`
- Scope: `app/`, `components/`, `lib/`, `hooks/`

## Core Metrics

- API route files: **231**
- Deprecated component files (`components/_deprecated/*`): **0**
- Frontend usage of file compatibility routes (`/api/files/read|write|list|...`): **0**
- Frontend usage of deprecated workspace routes (`/api/workspace/*`): **0**
- Redirect alias pages to `/ide?entry=`: **0**
- API NOT_IMPLEMENTED markers (`app/api/**/route.ts`): **6**
- File API compatibility wrappers (`trackCompatibilityRouteHit` in `app/api/files/*`): **8**

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

## Notes

- Compatibility routes can be intentional, but should have a time-boxed removal plan.
- Unreferenced candidates should be confirmed and removed or moved to `_deprecated`.
- This report is informational and does not replace enterprise gate checks.

