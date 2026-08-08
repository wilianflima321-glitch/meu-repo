'use client'

/**
 * L.4 client adapter — IDE xterm ↔ Forge sandbox stream (not host PTY).
 * Agents and Forge panes use this; human local shells keep terminalWebSocket/Tauri PTY.
 */

import { getAuthHeaders } from '@/lib/ai/change-feedback-client'
import { createComponentLogger } from '@/lib/observability/logger'
import type { TerminalSession } from './terminalModels'

const log = createComponentLogger('forgeTerminalClient')

export async function createForgeTerminalSessionRequest(input: {
  projectId: string
  projectRootPath?: string
  existingSandboxSessionId?: string
  sessionCount: number
}): Promise<{ session: TerminalSession }> {
  const response = await fetch('/api/terminal/forge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      // Human-initiated Forge pane (inspect sandbox) — not an agent tool call.
      'x-aethel-caller': 'user',
    },
    body: JSON.stringify({
      action: 'open',
      projectId: input.projectId,
      projectRootPath: input.projectRootPath,
      existingSandboxSessionId: input.existingSandboxSessionId,
    }),
  })

  const data = (await response.json()) as {
    ok?: boolean
    error?: string
    sessionId?: string
    provider?: string
  }

  if (!response.ok || !data.ok || !data.sessionId) {
    throw new Error(data.error || 'Failed to open Forge sandbox terminal')
  }

  return {
    session: {
      id: data.sessionId,
      name: `Forge ${input.sessionCount + 1}`,
      shell: 'forge-sandbox',
      cwd: input.projectRootPath || '~',
      createdAt: new Date(),
      isActive: true,
      executionLane: 'forge-sandbox',
      forgeSessionId: data.sessionId,
      provider: data.provider,
    },
  }
}

export async function closeForgeTerminalSessionRequest(sessionId: string): Promise<void> {
  await fetch(`/api/terminal/forge?sessionId=${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  })
}

/**
 * Streams an allowlisted command into the Forge sandbox and writes chunks via callbacks.
 * Used by IDE Forge panes — never opens host PTY.
 */
export async function execForgeTerminalStream(input: {
  sessionId: string
  command: string
  args?: string[]
  cwd?: string
  /** When true, marks the request as agent-originated (policy-enforced server-side). */
  asAgent?: boolean
  onStdout?: (chunk: string) => void
  onStderr?: (chunk: string) => void
}): Promise<{ ok: boolean; exitCode: number | null; deniedMessage?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    'x-aethel-caller': input.asAgent ? 'agent' : 'user',
  }
  if (input.asAgent) headers['x-aethel-agent-tool'] = '1'

  const response = await fetch('/api/terminal/forge', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'exec',
      sessionId: input.sessionId,
      command: input.command,
      args: input.args,
      cwd: input.cwd,
    }),
  })

  if (!response.ok || !response.body) {
    const errText = await response.text().catch(() => '')
    log.warn('forge_terminal_exec_http_fail', { status: response.status, errText })
    return { ok: false, exitCode: null, deniedMessage: errText || `HTTP ${response.status}` }
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let exitOk = false
  let exitCode: number | null = null
  let deniedMessage: string | undefined

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const event = JSON.parse(line) as {
          type: string
          data?: string
          ok?: boolean
          exitCode?: number | null
          deniedMessage?: string
          message?: string
        }
        if (event.type === 'stdout' && event.data) input.onStdout?.(event.data)
        if (event.type === 'stderr' && event.data) input.onStderr?.(event.data)
        if (event.type === 'exit') {
          exitOk = event.ok === true
          exitCode = event.exitCode ?? null
          deniedMessage = event.deniedMessage
        }
        if (event.type === 'error') {
          deniedMessage = event.message
          exitOk = false
        }
      } catch {
        log.warn('forge_terminal_ndjson_parse_fail', { line: line.slice(0, 120) })
      }
    }
  }

  return { ok: exitOk, exitCode, deniedMessage }
}
