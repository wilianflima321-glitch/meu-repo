/**
 * Block 7B.5 — Playtest console bridge (postMessage).
 * Desktop native IPC remains [HELD] until Tauri/GAS wire exists.
 */

export const PLAYTEST_CONSOLE_MESSAGE_TYPE = 'aethel.playtest.console' as const
export const PLAYTEST_CONSOLE_IPC_STATUS = 'HELD' as const

export type PlaytestConsoleLogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug'

export type PlaytestConsoleMessage = {
  type: typeof PLAYTEST_CONSOLE_MESSAGE_TYPE
  level: PlaytestConsoleLogLevel
  message: string
  timestamp?: number
  source?: string
  stack?: string
}

export type PlaytestConsoleBridgeCapability = {
  postMessage: 'IMPLEMENTED'
  desktopIpc: typeof PLAYTEST_CONSOLE_IPC_STATUS
  note: string
}

export function evaluatePlaytestConsoleBridgeCapability(): PlaytestConsoleBridgeCapability {
  return {
    postMessage: 'IMPLEMENTED',
    desktopIpc: PLAYTEST_CONSOLE_IPC_STATUS,
    note: 'Playtest iframe/console postMessage live; desktop IPC [HELD] — no Tauri/GAS console wire',
  }
}

export function isPlaytestConsoleMessage(data: unknown): data is PlaytestConsoleMessage {
  if (!data || typeof data !== 'object') return false
  const value = data as Partial<PlaytestConsoleMessage>
  if (value.type !== PLAYTEST_CONSOLE_MESSAGE_TYPE) return false
  if (
    value.level !== 'log' &&
    value.level !== 'warn' &&
    value.level !== 'error' &&
    value.level !== 'info' &&
    value.level !== 'debug'
  ) {
    return false
  }
  return typeof value.message === 'string'
}

export function buildPlaytestConsoleMessage(
  level: PlaytestConsoleLogLevel,
  message: string,
  extras?: { source?: string; stack?: string; timestamp?: number },
): PlaytestConsoleMessage {
  return {
    type: PLAYTEST_CONSOLE_MESSAGE_TYPE,
    level,
    message,
    timestamp: extras?.timestamp ?? Date.now(),
    source: extras?.source ?? 'playtest',
    stack: extras?.stack,
  }
}
