/**
 * Block 2A.3 — Collab sync LED state machine (Critique #10).
 * Never silent save fail: local_only | buffering | syncing | synced | error.
 */

export type CollabSyncLedState =
  | 'local_only'
  | 'buffering'
  | 'syncing'
  | 'synced'
  | 'error'

export type CollabSyncLedTone = 'neutral' | 'success' | 'warning' | 'danger'

export interface CollabSyncLedSnapshot {
  state: CollabSyncLedState
  tone: CollabSyncLedTone
  label: string
  detail: string
  /** ● synced / ⚠️ buffering / pulse syncing */
  glyph: 'dot' | 'warn' | 'pulse' | 'offline'
}

export interface CollabSyncInputs {
  collaborationEnabled: boolean
  isConnected: boolean
  isSynced: boolean
  isPersistenceSynced: boolean
  isConnecting?: boolean
  errorMessage?: string | null
  pendingEmergencyUpdates?: number
}

export function resolveCollabSyncLed(input: CollabSyncInputs): CollabSyncLedSnapshot {
  if (!input.collaborationEnabled) {
    return {
      state: 'local_only',
      tone: 'neutral',
      label: 'Solo',
      detail: 'Collaboration off — edits stay local to this session.',
      glyph: 'offline',
    }
  }

  if (input.errorMessage?.trim()) {
    return {
      state: 'error',
      tone: 'danger',
      label: 'Sync error',
      detail: input.errorMessage.trim(),
      glyph: 'warn',
    }
  }

  if (input.isConnecting && !input.isConnected) {
    return {
      state: 'syncing',
      tone: 'warning',
      label: 'Connecting…',
      detail: 'Opening collaboration channel.',
      glyph: 'pulse',
    }
  }

  if (!input.isConnected) {
    const pending = input.pendingEmergencyUpdates ?? 0
    if (input.isPersistenceSynced || pending > 0) {
      return {
        state: 'buffering',
        tone: 'warning',
        label: 'Offline buffer',
        detail:
          pending > 0
            ? `${pending} update(s) queued locally — will flush on reconnect.`
            : 'IndexedDB cache active — reconnect to sync peers.',
        glyph: 'warn',
      }
    }
    return {
      state: 'buffering',
      tone: 'warning',
      label: 'Reconnect pending',
      detail: 'Disconnected — edits buffered locally when persistence is on.',
      glyph: 'warn',
    }
  }

  if (!input.isSynced) {
    return {
      state: 'syncing',
      tone: 'warning',
      label: 'Syncing…',
      detail: 'Connected — waiting for peer state vector exchange.',
      glyph: 'pulse',
    }
  }

  return {
    state: 'synced',
    tone: 'success',
    label: 'Synced',
    detail: input.isPersistenceSynced
      ? 'Live with peers · offline cache ready.'
      : 'Live with peers.',
    glyph: 'dot',
  }
}
