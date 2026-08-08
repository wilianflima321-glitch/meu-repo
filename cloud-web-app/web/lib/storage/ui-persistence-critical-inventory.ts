/**
 * CW4 — Critical-path inventory + exception-only allowlist.
 * Critical IDE/Studio/session/dock/viewport/chrome keys go through the spine.
 * Auth / BYOK / tokens stay exception-secret outside the bag.
 * Domain content (level drafts, snippets, terminal profiles, …) stays
 * exception-domain — intentional raw localStorage, not chrome dual-write debt.
 */

import type { UiPersistenceNamespace } from '@/lib/storage/ui-persistence-spine'
import {
  isUiPersistenceLegacyMirrorActive,
  UI_PERSISTENCE_LEGACY_MIRROR_EXPIRES_AT,
} from '@/lib/storage/ui-persistence-spine'

/** Namespaces that constitute the critical workbench/IDE/session/chrome path. */
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
  'chrome.commandHistory',
  'chrome.searchHistory',
  'chrome.notifications',
  'settings.user',
  'settings.workspace',
] as const

export type Cw4ExceptionDisposition =
  | 'exception-secret'
  | 'exception-domain'
  | 'resolved-history'

export type Cw4HeldDebtEntry = {
  keyPattern: string
  reason: string
  criticalIdeStudioPath: boolean
  disposition: Cw4ExceptionDisposition
}

/**
 * Permanent secret allowlist — must never enter the UI persistence bag.
 * Count toward exception-only surface; not migratable chrome.
 */
export const CW4_EXCEPTION_SECRET_ALLOWLIST: readonly Cw4HeldDebtEntry[] = [
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
] as const

/**
 * Intentional domain-content exceptions (not Studio chrome/session).
 * Raw localStorage OK; not dual-write debt vs spine.
 */
export const CW4_EXCEPTION_DOMAIN_ALLOWLIST: readonly Cw4HeldDebtEntry[] = [
  {
    keyPattern: 'aethel_level_data',
    reason: 'LevelEditor draft cache — domain content, not chrome session',
    criticalIdeStudioPath: false,
    disposition: 'exception-domain',
  },
  {
    keyPattern: 'custom themes / HOST_PROJECT_ROOT / local runtime device id',
    reason: 'Tooling prefs outside Studio chrome critical path',
    criticalIdeStudioPath: false,
    disposition: 'exception-domain',
  },
  {
    keyPattern: 'aethel.runtime.local-capabilities.v1',
    reason:
      'Device hardware-capability probe cache — capability cache, not chrome/session state',
    criticalIdeStudioPath: false,
    disposition: 'exception-domain',
  },
  {
    keyPattern: 'terminal-profiles / terminal-sessions (TerminalProfileManager)',
    reason: 'Terminal shell profile + session presets — user content, not workbench chrome',
    criticalIdeStudioPath: false,
    disposition: 'exception-domain',
  },
  {
    keyPattern: 'controller-mapper custom profiles',
    reason: 'Gamepad/controller input-mapping presets — domain content, not chrome/session',
    criticalIdeStudioPath: false,
    disposition: 'exception-domain',
  },
  {
    keyPattern: 'aethel research-handoff payload',
    reason:
      'One-shot Deep Research → IDE handoff payload, read once then removed — transient transfer',
    criticalIdeStudioPath: false,
    disposition: 'exception-domain',
  },
  {
    keyPattern: 'snippet-manager user snippets',
    reason: 'User-authored code snippet library — domain content, not workbench chrome',
    criticalIdeStudioPath: false,
    disposition: 'exception-domain',
  },
] as const

/**
 * Resolved-history ledger (not open debt): dock dual-write, LWW, chrome migrations,
 * expired legacy mirror.
 */
export const CW4_RESOLVED_HISTORY: readonly Cw4HeldDebtEntry[] = [
  {
    keyPattern: 'aethel.ide.dock.v1|aethel.viewport.dock.*.v1',
    reason:
      'CLOSED — WorkspaceProvider spine adapter registered at createWorkspaceStore; legacy key was one-way mirrorLegacy() until expiry; never read back into bag after migrate.',
    criticalIdeStudioPath: false,
    disposition: 'resolved-history',
  },
  {
    keyPattern: 'multi-tab LWW / lock',
    reason:
      'CLOSED (2026-08-08) — Web Locks exclusive RMW + entryMeta + durable pending-delta; cross-tab invalidate notify-only (not CRDT).',
    criticalIdeStudioPath: false,
    disposition: 'resolved-history',
  },
  {
    keyPattern: 'aethel_command_history|aethel_search_history|aethel_replace_history',
    reason: 'CLOSED (2026-08-08) — migrated to chrome.commandHistory / chrome.searchHistory spine namespaces',
    criticalIdeStudioPath: false,
    disposition: 'resolved-history',
  },
  {
    keyPattern: 'aethel-theme',
    reason:
      'CLOSED (2026-08-08) — ThemeContext uses theme.current spine; aethel-theme one-shot migrate only',
    criticalIdeStudioPath: false,
    disposition: 'resolved-history',
  },
  {
    keyPattern: 'aethel:notifications|user-settings|workspace-settings',
    reason:
      'CLOSED (2026-08-08) — migrated to chrome.notifications / settings.user / settings.workspace',
    criticalIdeStudioPath: false,
    disposition: 'resolved-history',
  },
  {
    keyPattern: 'legacy mirror compat window',
    reason: `CLOSED (2026-08-08) — write mirror expired at ${UI_PERSISTENCE_LEGACY_MIRROR_EXPIRES_AT}; bag-only writes; migrate remains one-shot read bootstrap`,
    criticalIdeStudioPath: false,
    disposition: 'resolved-history',
  },
] as const

/**
 * Full ledger for tests / Progress — secrets + domain allowlist + resolved history.
 * Open chrome dual-write debt is empty after 2026-08-08 chrome migration.
 */
export const CW4_HELD_RAW_LOCALSTORAGE_DEBT: readonly Cw4HeldDebtEntry[] = [
  ...CW4_EXCEPTION_SECRET_ALLOWLIST,
  ...CW4_EXCEPTION_DOMAIN_ALLOWLIST,
  ...CW4_RESOLVED_HISTORY,
] as const

/** Multi-tab LWW production path (Web Locks + entryMeta + pending delta). */
export const CW4_LWW_STATUS = 'DONE' as const

/** One-way legacy write mirror — expired; read bootstrap migrate only. */
export const CW4_LEGACY_MIRROR_STATUS = 'DONE' as const

/**
 * Exception-only closure: chrome on spine; remaining raw localStorage =
 * secrets (2) + domain allowlist (7) only.
 */
export const CW4_EXCEPTION_ONLY_STATUS = 'DONE' as const

/** Critical IDE/Studio path — zero criticalIdeStudioPath blockers. */
export const CW4_CRITICAL_PATH_STATUS = 'DONE' as const

/**
 * Overall CW4: LWW + critical path + exception-only allowlist + legacy mirror closed.
 * Secrets/domain stay out of bag by design (not open dual-write debt).
 */
export const CW4_OVERALL_STATUS = 'DONE' as const

/** Before 2026-08-08 chrome migrate: 2 secrets + 10 non-critical debt rows (incl. 2 CLOSED history). */
export const CW4_EXCEPTION_COUNT_BEFORE = {
  secret: 2,
  /** Active chrome/domain debt rows in prior ledger (excluding CLOSED dock/LWW history). */
  openNonCriticalDebt: 10,
  resolvedHistory: 2,
} as const

/** After: 2 secrets + 7 domain allowlist + 0 open chrome debt. */
export const CW4_EXCEPTION_COUNT_AFTER = {
  secret: CW4_EXCEPTION_SECRET_ALLOWLIST.length,
  domain: CW4_EXCEPTION_DOMAIN_ALLOWLIST.length,
  openChromeDebt: 0,
  resolvedHistory: CW4_RESOLVED_HISTORY.length,
} as const

export function listCw4CriticalPathBlockers(): Cw4HeldDebtEntry[] {
  return CW4_HELD_RAW_LOCALSTORAGE_DEBT.filter((entry) => entry.criticalIdeStudioPath)
}

export function listCw4OpenExceptionAllowlist(): Cw4HeldDebtEntry[] {
  return [
    ...CW4_EXCEPTION_SECRET_ALLOWLIST,
    ...CW4_EXCEPTION_DOMAIN_ALLOWLIST,
  ]
}

/** Honest mirror probe for tests / truth matrix. */
export function getCw4LegacyMirrorActive(): boolean {
  return isUiPersistenceLegacyMirrorActive()
}
