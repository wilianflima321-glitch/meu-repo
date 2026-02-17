# Interface Critical Sweep

- Generated at: `2026-02-17T15:49:49.662Z`
- Scope: `app/`, `components/`
- Files scanned: `547`

## Summary

- `legacy-accent-tokens` (high): 0
- `admin-light-theme-tokens` (high): 0
- `admin-status-light-tokens` (high): 0
- `blocking-browser-dialogs` (medium): 0
- `not-implemented-ui` (info): 6
- `deprecated-surface-usage` (medium): 0
- `frontend-workspace-route-usage` (high): 0
- `legacy-editor-shell-usage` (high): 0

## Legacy accent tokens (violet/purple/indigo/pink)

- Metric ID: `legacy-accent-tokens`
- Severity: `high`
- Total matches: `0`

- No matches

## Admin light-theme tokens (bg-white/text-gray/border-gray)

- Metric ID: `admin-light-theme-tokens`
- Severity: `high`
- Total matches: `0`

- No matches

## Admin light status tokens (100-level bg/text + light borders)

- Metric ID: `admin-status-light-tokens`
- Severity: `high`
- Total matches: `0`

- No matches

## Blocking browser dialogs (window.prompt/window.confirm)

- Metric ID: `blocking-browser-dialogs`
- Severity: `medium`
- Total matches: `0`

- No matches

## Explicit NOT_IMPLEMENTED UI states

- Metric ID: `not-implemented-ui`
- Severity: `info`
- Total matches: `6`

| File | Matches |
| --- | ---: |
| `app/api/ai/action/route.ts` | 1 |
| `app/api/ai/chat/route.ts` | 1 |
| `app/api/ai/complete/route.ts` | 1 |
| `app/api/ai/inline-completion/route.ts` | 1 |
| `app/api/ai/inline-edit/route.ts` | 1 |
| `app/api/render/jobs/[jobId]/cancel/route.ts` | 1 |

## Deprecated surface references (_deprecated)

- Metric ID: `deprecated-surface-usage`
- Severity: `medium`
- Total matches: `0`

- No matches

## Frontend usage of deprecated workspace routes (/api/workspace/*)

- Metric ID: `frontend-workspace-route-usage`
- Severity: `high`
- Total matches: `0`

- No matches

## Legacy editor shell route usage (/editor?file=)

- Metric ID: `legacy-editor-shell-usage`
- Severity: `high`
- Total matches: `0`

- No matches

## Execution Policy

- High severity metrics must be reduced before release candidates.
- Medium severity metrics must have owner + ETA in the execution contract.
- INFO metrics remain explicit but must stay accurate to runtime behavior.

