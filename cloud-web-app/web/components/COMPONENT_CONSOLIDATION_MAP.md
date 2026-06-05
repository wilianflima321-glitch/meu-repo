# Component Consolidation Map
Date: 2026-04-11
Source: docs/master/76_AUDITORIA_DEFINITIVA_BENCHMARK_2026-04-11.md

## Canonical Components (USE THESE)
| Component | Path | Purpose |
|---|---|---|
| Button | `@/components/ui/Button` | All buttons |
| Input | `@/components/ui/Input` | All text inputs |
| Modal | `@/components/ui/Modal` | All modals/dialogs |
| Card | `@/components/ui/Card` | All card containers |
| Badge | `@/components/ui/Badge` | All badges |
| Tooltip | `@/components/ui/Tooltip` | All tooltips |
| Toast | `@/components/ui/Toast` | All notifications |
| Select | `@/components/ui/Select` | All dropdowns |
| Tabs | `@/components/ui/Tabs` | All tab navigation |
| primitives | `@/components/ui/primitives` | Low-level shared primitives |

## Deprecated Components (MIGRATE AWAY)
| Component | Path | Migrate To |
|---|---|---|
| Button (legacy) | `@/components/Button.tsx` | `@/components/ui/Button` |
| Breadcrumbs (legacy) | `@/components/Breadcrumbs.tsx` | Create canonical in ui/ |
| NotificationCenter | removed | `@/components/ui/Toast` |
| NotificationSystem | removed | `@/components/ui/Toast` |
| LivePreview (root) | `@/components/LivePreview.tsx` | `@/components/preview/CanonicalPreviewSurface` |
| OutputPanel (legacy) | removed | `WorkbenchOutputPane` inside IDE shell |
| QuickOpen (legacy) | removed | `CommandPalette` |
| IDELayout (legacy) | removed | `FullscreenIDE` + `ModernIDEShell` |
| PreviewPanel (ide) | `@/components/ide/PreviewPanel.tsx` | `WorkbenchPreviewPane` + `CanonicalPreviewSurface` |

## Admin Components - Needs Migration to Canonical
| Component | Current Issue | Action |
|---|---|---|
| AdminDashboardPro | Removed as unused legacy shell | Use `app/admin/page.tsx` + `AdminCommandCenterSections` |
| AdminMetricCard | Inconsistent with Studio cards | Use canonical Card + spacing |
| AdminPageHeader | Different layout than Studio | Align with StudioGlobalNav |
| AdminSummaryGrid | Custom grid system | Use canonical gap/padding |

## Rules
1. New components MUST use canonical primitives
2. New surfaces MUST NOT introduce new aethel-* classes
3. Legacy components can keep aethel-* temporarily if marked deprecated
4. Test every migration before removing legacy imports
