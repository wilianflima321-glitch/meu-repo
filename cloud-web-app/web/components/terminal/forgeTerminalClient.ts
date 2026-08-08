'use client'

/**
 * L.4 client adapter — IDE xterm ↔ Forge sandbox duplex stream (not host PTY).
 * Agents and Forge panes use this; human local shells keep terminalWebSocket/Tauri PTY.
 *
 * Transport: NDJSON attach stream (stdout/stderr/ready/exit) + POST stdin/resize/detach.
 * Connected is only true after a live `ready` event (zero-MVP — no fake connected).
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
 * Used by agents / one-shot probes — never opens host PTY.
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

type ForgeDuplexEvent = {
  type: string
  data?: string
  duplexId?: string
  ok?: boolean
  exitCode?: number | null
  message?: string
  mode?: string
  pty?: boolean
  held?: string
  command?: string
  cols?: number
  rows?: number
  ptyApplied?: boolean
}

/**
 * Drop-in transport for Forge sandbox panes — same surface as TerminalWebSocket
 * but never touches host/Tauri PTY. `connected` flips only after live `ready`.
 */
export class ForgeTerminalSocket {
  private abort: AbortController | null = null
  private duplexId: string | null = null
  private sessionId = ''
  private isConnected = false
  private messageQueue: string[] = []
  private cols = 80
  private rows = 24
  /** Set from live `ready` — never invent pty:true before ready. */
  lastReady: { mode?: string; pty?: boolean; held?: string | null } | null = null

  onData: ((data: string) => void) | null = null
  onConnect: (() => void) | null = null
  onDisconnect: (() => void) | null = null
  onError: ((error: Event | string) => void) | null = null

  connect(sessionId: string): void {
    if (this.isConnected || this.abort) return
    this.sessionId = sessionId
    void this.attachDuplex(sessionId)
  }

  private async attachDuplex(sessionId: string): Promise<void> {
    this.abort = new AbortController()
    try {
      const response = await fetch('/api/terminal/forge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
          'x-aethel-caller': 'user',
        },
        body: JSON.stringify({
          action: 'attach',
          sessionId,
          command: 'node',
          args: ['-i'],
          cols: this.cols,
          rows: this.rows,
        }),
        signal: this.abort.signal,
      })

      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => '')
        const message =
          errText || `Forge duplex attach failed (HTTP ${response.status}) — fail-closed`
        log.warn('forge_terminal_attach_http_fail', { status: response.status, errText })
        this.onError?.(message)
        this.isConnected = false
        this.onDisconnect?.()
        this.abort = null
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          this.handleEventLine(line)
        }
      }

      if (this.isConnected) {
        this.isConnected = false
        this.onDisconnect?.()
      }
    } catch (err) {
      if (this.abort?.signal.aborted) return
      const message = err instanceof Error ? err.message : String(err)
      log.warn('forge_terminal_attach_stream_fail', { message })
      this.onError?.(message)
      this.isConnected = false
      this.onDisconnect?.()
    } finally {
      this.abort = null
      this.duplexId = null
    }
  }

  private handleEventLine(line: string): void {
    if (!line.trim()) return
    let event: ForgeDuplexEvent
    try {
      event = JSON.parse(line) as ForgeDuplexEvent
    } catch {
      log.warn('forge_terminal_duplex_ndjson_parse_fail', { line: line.slice(0, 120) })
      return
    }

    if (event.type === 'ready' && event.duplexId) {
      this.duplexId = event.duplexId
      this.isConnected = true
      this.lastReady = {
        mode: event.mode,
        pty: event.pty === true,
        held: event.held ?? null,
      }
      this.onConnect?.()
      while (this.messageQueue.length > 0) {
        const queued = this.messageQueue.shift()
        if (queued) this.send(queued)
      }
      return
    }

    if (event.type === 'stdout' && event.data) {
      this.onData?.(event.data)
      return
    }

    if (event.type === 'stderr' && event.data) {
      this.onData?.(`\x1b[31m${event.data}\x1b[0m`)
      return
    }

    if (event.type === 'exit') {
      this.isConnected = false
      this.onDisconnect?.()
      return
    }

    if (event.type === 'error') {
      this.onError?.(event.message || 'Forge duplex error')
    }
  }

  send(data: string): void {
    if (!this.duplexId || !this.isConnected) {
      this.messageQueue.push(data)
      return
    }
    void fetch('/api/terminal/forge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        'x-aethel-caller': 'user',
      },
      body: JSON.stringify({
        action: 'stdin',
        duplexId: this.duplexId,
        data,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        log.warn('forge_terminal_stdin_fail', { status: res.status, body: body.slice(0, 160) })
        this.onError?.('Forge stdin write failed — duplex may be closed')
      }
    })
  }

  resize(cols: number, rows: number): void {
    this.cols = cols
    this.rows = rows
    if (!this.duplexId || !this.isConnected) return
    void fetch('/api/terminal/forge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        'x-aethel-caller': 'user',
      },
      body: JSON.stringify({
        action: 'resize',
        duplexId: this.duplexId,
        cols,
        rows,
      }),
    }).catch((err: unknown) => {
      log.warn('forge_terminal_resize_fail', { error: err })
    })
  }

  disconnect(): void {
    const duplexId = this.duplexId
    this.abort?.abort()
    this.abort = null
    this.isConnected = false
    this.messageQueue = []
    this.duplexId = null
    if (duplexId) {
      void fetch('/api/terminal/forge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
          'x-aethel-caller': 'user',
        },
        body: JSON.stringify({ action: 'detach', duplexId }),
      }).catch(() => {
        /* best-effort teardown */
      })
    }
  }

  get connected(): boolean {
    return this.isConnected
  }
}
