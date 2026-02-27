# Interface Critical Sweep

- Generated at: `2026-02-25T18:05:01.711Z`
- Scope: `app/`, `components/`
- Files scanned: `641`

## Summary

- `legacy-accent-tokens` (high): 0
- `admin-light-theme-tokens` (high): 0
- `admin-status-light-tokens` (high): 0
- `blocking-browser-dialogs` (medium): 0
- `not-implemented-ui` (info): 4
- `not-implemented-noncritical` (info): 0
- `provider-not-configured-ui` (info): 13
- `queue-backend-unavailable-ui` (info): 11
- `deprecated-surface-usage` (medium): 0
- `frontend-workspace-route-usage` (high): 0
- `legacy-editor-shell-usage` (high): 0
- `ui-monolith-files-gte-650` (medium): 77

## UI Monolith Pressure (>= 650 lines)

- Metric ID: `ui-monolith-files`
- Severity: `medium`
- Threshold: `650`
- Files above threshold: `77`

| File | Lines |
| --- | ---: |
| `components/character/ControlRigEditor.tsx` | 1011 |
| `components/editors/SpriteEditor.tsx` | 990 |
| `components/physics/DestructionEditor.tsx` | 975 |
| `components/ui/DesignSystem.tsx` | 975 |
| `components/debug/AdvancedDebug.tsx` | 974 |
| `components/environment/WaterEditor.tsx` | 965 |
| `components/engine/DetailsPanel.tsx` | 933 |
| `components/animation/KeyframeSystem.tsx` | 928 |
| `components/editor/TabBar.tsx` | 893 |
| `components/editor/MonacoEditorPro.tsx` | 891 |
| `components/git/GitPanel.tsx` | 887 |
| `components/marketplace/MarketplaceBrowser.tsx` | 883 |
| `components/onboarding/WelcomeWizard.tsx` | 880 |
| `components/settings/SettingsUI.tsx` | 880 |
| `components/character/FacialAnimationEditor.tsx` | 879 |
| `components/narrative/QuestEditor.tsx` | 879 |
| `components/sequencer/SequencerTimeline.tsx` | 876 |
| `components/extensions/ExtensionManager.tsx` | 862 |
| `components/project/ProjectPersistence.tsx` | 862 |
| `components/environment/FoliagePainter.tsx` | 859 |
| `components/engine/NiagaraVFX.tsx` | 852 |
| `components/ide/AIAgentsPanelPro.tsx` | 850 |
| `components/search/GlobalSearch.tsx` | 849 |
| `components/debug/DebugAttachUI.tsx` | 847 |
| `components/ide/AIChatPanelPro.tsx` | 847 |

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
- Total matches: `4`

| File | Matches |
| --- | ---: |
| `app/api/ai/action/route.ts` | 1 |
| `app/api/ai/chat/route.ts` | 1 |
| `app/api/ai/complete/route.ts` | 1 |
| `app/api/ai/inline-edit/route.ts` | 1 |

## Explicit NOT_IMPLEMENTED non-critical AI surfaces (tracked)

- Metric ID: `not-implemented-noncritical`
- Severity: `info`
- Total matches: `0`

- No matches

## Explicit PROVIDER_NOT_CONFIGURED capability states

- Metric ID: `provider-not-configured-ui`
- Severity: `info`
- Total matches: `13`

| File | Matches |
| --- | ---: |
| `app/api/ai/query/route.ts` | 3 |
| `app/api/ai/inline-completion/route.ts` | 2 |
| `app/api/ai/3d/generate/route.ts` | 1 |
| `app/api/ai/action/route.ts` | 1 |
| `app/api/ai/chat/route.ts` | 1 |
| `app/api/ai/complete/route.ts` | 1 |
| `app/api/ai/image/generate/route.ts` | 1 |
| `app/api/ai/inline-edit/route.ts` | 1 |
| `app/api/ai/music/generate/route.ts` | 1 |
| `app/api/ai/voice/generate/route.ts` | 1 |

## Explicit QUEUE_BACKEND_UNAVAILABLE capability states

- Metric ID: `queue-backend-unavailable-ui`
- Severity: `info`
- Total matches: `11`

| File | Matches |
| --- | ---: |
| `app/api/jobs/route.ts` | 3 |
| `app/api/jobs/start/route.ts` | 2 |
| `app/api/jobs/stats/route.ts` | 1 |
| `app/api/jobs/stop/route.ts` | 1 |
| `app/api/jobs/[id]/cancel/route.ts` | 1 |
| `app/api/jobs/[id]/retry/route.ts` | 1 |
| `app/api/jobs/[id]/route.ts` | 1 |
| `app/api/terminal/sandbox/route.ts` | 1 |

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

