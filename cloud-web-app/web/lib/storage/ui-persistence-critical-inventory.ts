/**
 * CW4 — Critical-path inventory + honest HELD debt.
 * Critical IDE/Studio/session/dock/viewport keys go through the spine.
 * Auth / BYOK / tokens stay exception-only outside the bag.
 *
 * Status stays PARTIAL while LEGACY_WRITE_AUTHORITY dual-write / raw
 * WorkspaceProvider fallbacks remain on critical dock keys.
 */

import type { UiPersistenceNamespace } from '@/lib/storage/ui-persistence-spine'

/** Namespaces that constitute the critical workbench/IDE/session path. */
export const CW4_CRITICAL_SPINE_NAMESPACES: readonly UiPersistenceNamespace[] = [
  'ide.dock',
  'ide.session',
  'ide.workbench.panelState',
  'ide.workbench.bottomPanel',
  'ide.workbench.previewEnabled',
  'studio.session',
  'studio.workbench',
  'workspace.profile',
  'theme.current',
  'theme.icon',
  'agents.opsMemory',
  'agents.opsPrefs',
  'viewport.dock',
  'viewport.fidelity',
  'workbench.lastProjectId',
  'workbench.preview.runtimeUrl',
  'workbench.preview.sandboxId',
  'dashboard.sessionHistory',
  'dashboard.settings',
  'dashboard.activeTab',
  'dashboard.chatHistory',
  'dashboard.firstValueDismissed',
] as const

export type Cw4HeldDebtEntry = {
  keyPattern: string
  reason: string
  criticalIdeStudioPath: boolean
  disposition: 'exception-secret' | 'non-critical-debt' | 'legacy-dual-write'
}

/**
 * Remaining raw localStorage hits outside full exception-only closure.
 * Critical dual-write debt blocks DONE — do not filter it away for Progress.
 */
export const CW4_HELD_RAW_LOCALSTORAGE_DEBT: readonly Cw4HeldDebtEntry[] = [
  {
    keyPattern: 'aethel-token|token',
    reason: 'Auth bearer — must never enter UI persistence bag',
    criticalIdeStudioPath: false,
    disposition: 'exception-secret',
  },
  {
    keyPattern: 'aethel_byok_*|ai.byok.*',
    reason: 'BYOK provider secrets — IDB/local exception',
    criticalIdeStudioPath: false,
    disposition: 'exception-secret',
  },
  {
    keyPattern: 'aethel.ide.dock.v1|aethel.viewport.dock.*.v1',
    reason:
      'LEGACY_WRITE_AUTHORITY dual-write + WorkspaceProvider adapter fallback — spine routes when registered; raw authority window remains',
    criticalIdeStudioPath: true,
    disposition: 'legacy-dual-write',
  },
  {
    keyPattern: 'aethel_level_data',
    reason: 'LevelEditor draft cache — domain content, not chrome session',
    criticalIdeStudioPath: false,
    disposition: 'non-critical-debt',
  },
  {
    keyPattern: 'aethel_command_history|aethel_search_history|aethel_replace_history',
    reason: 'Command palette / search history — non-critical chrome',
    criticalIdeStudioPath: false,
    disposition: 'non-critical-debt',
  },
  {
    keyPattern: 'aethel:notifications|user-settings|workspace-settings',
    reason: 'Settings/notifications systems — separate persistence track',
    criticalIdeStudioPath: false,
    disposition: 'non-critical-debt',
  },
  {
    keyPattern: 'aethel-theme',
    reason: 'ThemeContext legacy id — spine owns theme.current; dual-read remaining',
    criticalIdeStudioPath: false,
    disposition: 'non-critical-debt',
  },
  {
    keyPattern: 'custom themes / HOST_PROJECT_ROOT / local runtime device id',
    reason: 'Tooling prefs outside Studio chrome critical path',
    criticalIdeStudioPath: false,
    disposition: 'non-critical-debt',
  },
  {
    keyPattern: 'aethel.runtime.local-capabilities.v1',
    reason: 'Device hardware-capability probe cache (useLocalRuntimeBridge / StudioLocalRuntimeCapsule) — cross-tab synced via storage events, but a capability cache, not chrome/session state',
    criticalIdeStudioPath: false,
    disposition: 'non-critical-debt',
  },
  {
    keyPattern: 'terminal-profiles / terminal-sessions (TerminalProfileManager)',
    reason: 'Terminal shell profile + session presets — user content, not workbench chrome',
    criticalIdeStudioPath: false,
    disposition: 'non-critical-debt',
  },
  {
    keyPattern: 'controller-mapper custom profiles',
    reason: 'Gamepad/controller input-mapping presets — domain content, not chrome/session',
    criticalIdeStudioPath: false,
    disposition: 'non-critical-debt',
  },
  {
    keyPattern: 'aethel research-handoff payload',
    reason: 'One-shot Deep Research → IDE handoff payload, read once then removed — transient transfer, not persisted chrome state',
    criticalIdeStudioPath: false,
    disposition: 'non-critical-debt',
  },
  {
    keyPattern: 'snippet-manager user snippets',
    reason: 'User-authored code snippet library — domain content, not workbench chrome',
    criticalIdeStudioPath: false,
    disposition: 'non-critical-debt',
  },
  {
    keyPattern: 'multi-tab LWW / lock',
    reason: 'Cross-tab invalidate lite shipped; full lock/LWW HELD',
    criticalIdeStudioPath: false,
    disposition: 'non-critical-debt',
  },
] as const

/**
 * Critical IDE/Studio path — PARTIAL while dual-write / raw fallback remains.
 * Do not claim DONE or global exception-only.
 */
export const CW4_CRITICAL_PATH_STATUS = 'PARTIAL' as const

/** Any critical-path debt blocks DONE (including legacy-dual-write). */
export function listCw4CriticalPathBlockers(): Cw4HeldDebtEntry[] {
  return CW4_HELD_RAW_LOCALSTORAGE_DEBT.filter((entry) => entry.criticalIdeStudioPath)
}
