# ARCHITECTURE_CRITICAL_TRIAGE

- Generated at: `2026-02-17T18:34:49.116Z`
- Scope: `app/`, `components/`, `lib/`, `hooks/`

## Core Metrics

- API route files: **231**
- Deprecated component files (`components/_deprecated/*`): **10**
- Frontend usage of file compatibility routes (`/api/files/read|write|list|...`): **22**
- Frontend usage of deprecated workspace routes (`/api/workspace/*`): **2**
- Redirect alias pages to `/ide?entry=`: **17**
- API NOT_IMPLEMENTED markers (`app/api/**/route.ts`): **6**
- File API compatibility wrappers (`trackCompatibilityRouteHit` in `app/api/files/*`): **8**

## Top Compatibility Call Sites

### `/api/files/read|write|list|...` usage

| File | Matches |
| --- | ---: |
| `lib/explorer/file-explorer-manager.ts` | 8 |
| `lib/ai/tools-registry.ts` | 4 |
| `lib/workspace/workspace-manager.ts` | 4 |
| `lib/problems/problems-manager.ts` | 2 |
| `lib/search/search-manager.ts` | 2 |
| `lib/ai/ai-enhanced-lsp.ts` | 1 |
| `lib/terminal/task-detector.ts` | 1 |

### `/api/workspace/*` usage outside route handlers

| File | Matches |
| --- | ---: |
| `lib/server/compatibility-route-telemetry.ts` | 2 |

## Unreferenced Candidate Check

| File | Referenced |
| --- | --- |
| `components/ide/WorkbenchRedirect.tsx` | no |
| `components/editor/MonacoEditor.tsx` | yes |

## Notes

- Compatibility routes can be intentional, but should have a time-boxed removal plan.
- Unreferenced candidates should be confirmed and removed or moved to `_deprecated`.
- This report is informational and does not replace enterprise gate checks.

