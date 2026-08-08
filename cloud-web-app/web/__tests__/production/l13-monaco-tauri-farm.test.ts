import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ensureTauriLspFarmSession,
  parseTauriLspDiagnosticsEvent,
  resetTauriLspFarmClientCache,
  tauriLspCompletion,
  tauriLspDefinition,
  tauriLspDidChange,
  tauriLspHover,
  tauriLspPollDiagnostics,
} from '@/lib/lsp/monaco-lsp-tauri-farm'

vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('L.13 Monaco ↔ Tauri lsp_farm client', () => {
  beforeEach(() => {
    resetTauriLspFarmClientCache()
  })

  it('fail-closes ensure when binary held (no fabricated session)', async () => {
    const invoke = vi.fn(async () => {
      throw new Error('LSP_BINARY_HELD: typescript-language-server not found')
    })
    const session = await ensureTauriLspFarmSession('typescript', {
      invoke,
      forceInvoke: true,
    })
    expect(session).toBeNull()
    expect(invoke).toHaveBeenCalledWith('lsp_farm_ensure_session', {
      args: { language: 'typescript', rootUri: null },
    })
  })

  it('returns null hover when farm ensure fails — never invents tooltip text', async () => {
    const invoke = vi.fn(async () => {
      throw new Error('LSP_BINARY_HELD')
    })
    const hover = await tauriLspHover(
      'typescript',
      'file:///workspace/a.ts',
      'const x = 1\n',
      1,
      { line: 0, character: 6 },
      { invoke, forceInvoke: true },
    )
    expect(hover).toBeNull()
  })

  it('opens document then returns real hover payload from farm request', async () => {
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === 'lsp_farm_ensure_session') {
        return {
          sessionId: 'lsp-typescript-1',
          language: 'typescript',
          binaryPath: '/bin/typescript-language-server',
          alive: true,
          initialized: true,
        }
      }
      if (cmd === 'lsp_farm_did_open') {
        return {
          sessionId: 'lsp-typescript-1',
          ok: true,
          processAlive: true,
          result: null,
          message: 'didOpen sent',
        }
      }
      if (cmd === 'lsp_farm_request') {
        return {
          sessionId: 'lsp-typescript-1',
          ok: true,
          processAlive: true,
          result: {
            contents: { kind: 'markdown', value: '```ts\nconst x: number\n```' },
          },
          message: 'textDocument/hover response from live language server',
        }
      }
      throw new Error(`unexpected command ${cmd}`)
    })

    const hover = await tauriLspHover(
      'typescriptreact',
      'file:///workspace/a.tsx',
      'const x = 1\n',
      1,
      { line: 0, character: 6 },
      { invoke, forceInvoke: true },
    )
    expect(hover).toEqual({
      contents: { kind: 'markdown', value: '```ts\nconst x: number\n```' },
    })
    expect(invoke).toHaveBeenCalledWith(
      'lsp_farm_request',
      expect.objectContaining({
        args: expect.objectContaining({
          method: 'textDocument/hover',
          sessionId: 'lsp-typescript-1',
        }),
      }),
    )
  })

  it('continuous didChange uses did_change after first open', async () => {
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === 'lsp_farm_ensure_session') {
        return {
          sessionId: 'lsp-typescript-sync',
          language: 'typescript',
          binaryPath: '/bin/tls',
          alive: true,
          initialized: true,
        }
      }
      if (cmd === 'lsp_farm_did_open') {
        return {
          sessionId: 'lsp-typescript-sync',
          ok: true,
          processAlive: true,
          message: 'didOpen',
        }
      }
      if (cmd === 'lsp_farm_did_change') {
        return {
          sessionId: 'lsp-typescript-sync',
          ok: true,
          processAlive: true,
          message: 'didChange (full text)',
        }
      }
      throw new Error(`unexpected ${cmd}`)
    })

    const opened = await tauriLspDidChange(
      'typescript',
      'file:///workspace/a.ts',
      'const x = 1\n',
      1,
      { invoke, forceInvoke: true },
    )
    expect(opened).toBe(true)
    expect(invoke).toHaveBeenCalledWith(
      'lsp_farm_did_open',
      expect.objectContaining({
        args: expect.objectContaining({ uri: 'file:///workspace/a.ts', version: 1 }),
      }),
    )

    const changed = await tauriLspDidChange(
      'typescript',
      'file:///workspace/a.ts',
      'const x = 2\n',
      2,
      { invoke, forceInvoke: true },
    )
    expect(changed).toBe(true)
    expect(invoke).toHaveBeenCalledWith(
      'lsp_farm_did_change',
      expect.objectContaining({
        args: expect.objectContaining({
          uri: 'file:///workspace/a.ts',
          version: 2,
          text: 'const x = 2\n',
        }),
      }),
    )
  })

  it('poll diagnostics returns real server events and clear flag; rejects non-array', async () => {
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === 'lsp_farm_ensure_session') {
        return {
          sessionId: 'lsp-typescript-diag',
          language: 'typescript',
          binaryPath: '/bin/tls',
          alive: true,
          initialized: true,
        }
      }
      if (cmd === 'lsp_farm_did_open') {
        return { sessionId: 'lsp-typescript-diag', ok: true, processAlive: true, message: 'ok' }
      }
      if (cmd === 'lsp_farm_poll_diagnostics') {
        return {
          sessionId: 'lsp-typescript-diag',
          processAlive: true,
          events: [
            {
              sessionId: 'lsp-typescript-diag',
              uri: 'file:///workspace/a.ts',
              diagnostics: [
                {
                  message: 'Cannot find name x',
                  severity: 1,
                  range: {
                    start: { line: 0, character: 6 },
                    end: { line: 0, character: 7 },
                  },
                },
              ],
              clear: false,
            },
          ],
          message: '1 diagnostics event(s)',
        }
      }
      throw new Error(cmd)
    })

    await tauriLspDidChange(
      'typescript',
      'file:///workspace/a.ts',
      'const x = y\n',
      1,
      { invoke, forceInvoke: true },
    )
    const events = await tauriLspPollDiagnostics('typescript', {
      invoke,
      forceInvoke: true,
    })
    expect(events).toHaveLength(1)
    expect(events[0]?.diagnostics[0]?.message).toBe('Cannot find name x')
    expect(events[0]?.clear).toBe(false)

    // Never accept fabricated non-array diagnostics payloads.
    expect(
      parseTauriLspDiagnosticsEvent({
        sessionId: 'x',
        uri: 'file:///a.ts',
        diagnostics: 'fake',
        clear: false,
      })?.diagnostics,
    ).toEqual([])
  })

  it('returns real completion items from farm request', async () => {
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === 'lsp_farm_ensure_session') {
        return {
          sessionId: 'lsp-typescript-comp',
          language: 'typescript',
          binaryPath: '/bin/tls',
          alive: true,
          initialized: true,
        }
      }
      if (cmd === 'lsp_farm_did_open') {
        return { sessionId: 'lsp-typescript-comp', ok: true, processAlive: true, message: 'ok' }
      }
      if (cmd === 'lsp_farm_request') {
        return {
          sessionId: 'lsp-typescript-comp',
          ok: true,
          processAlive: true,
          result: {
            isIncomplete: false,
            items: [{ label: 'console', kind: 6 }],
          },
          message: 'completion',
        }
      }
      throw new Error(cmd)
    })

    const result = await tauriLspCompletion(
      'typescript',
      'file:///workspace/a.ts',
      'cons',
      1,
      { line: 0, character: 4 },
      { invoke, forceInvoke: true },
    )
    expect(result).toEqual({
      isIncomplete: false,
      items: [{ label: 'console', kind: 6 }],
    })
  })

  it('returns real definition locations from farm request', async () => {
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === 'lsp_farm_ensure_session') {
        return {
          sessionId: 'lsp-typescript-2',
          language: 'typescript',
          binaryPath: '/bin/tls',
          alive: true,
          initialized: true,
        }
      }
      if (cmd === 'lsp_farm_did_open') {
        return {
          sessionId: 'lsp-typescript-2',
          ok: true,
          processAlive: true,
          message: 'didOpen',
        }
      }
      if (cmd === 'lsp_farm_request') {
        return {
          sessionId: 'lsp-typescript-2',
          ok: true,
          processAlive: true,
          result: {
            uri: 'file:///workspace/a.ts',
            range: {
              start: { line: 0, character: 6 },
              end: { line: 0, character: 7 },
            },
          },
          message: 'definition',
        }
      }
      throw new Error(`unexpected ${cmd}`)
    })

    const def = await tauriLspDefinition(
      'typescript',
      'file:///workspace/a.ts',
      'const x = 1\n',
      1,
      { line: 0, character: 6 },
      { invoke, forceInvoke: true },
    )
    expect(def).toEqual({
      uri: 'file:///workspace/a.ts',
      range: {
        start: { line: 0, character: 6 },
        end: { line: 0, character: 7 },
      },
    })
  })

  it('unsupported language (python) fail-closes on desktop farm', async () => {
    const invoke = vi.fn()
    const session = await ensureTauriLspFarmSession('python', {
      invoke,
      forceInvoke: true,
    })
    expect(session).toBeNull()
    expect(invoke).not.toHaveBeenCalled()
  })

  it('null result from live server stays null (no fabricated hover)', async () => {
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === 'lsp_farm_ensure_session') {
        return {
          sessionId: 'lsp-typescript-3',
          language: 'typescript',
          binaryPath: '/bin/tls',
          alive: true,
          initialized: true,
        }
      }
      if (cmd === 'lsp_farm_did_open') {
        return { sessionId: 'lsp-typescript-3', ok: true, processAlive: true, message: 'ok' }
      }
      if (cmd === 'lsp_farm_request') {
        return {
          sessionId: 'lsp-typescript-3',
          ok: true,
          processAlive: true,
          result: null,
          message: 'no hover',
        }
      }
      throw new Error(cmd)
    })
    const hover = await tauriLspHover(
      'typescript',
      'file:///x.ts',
      'x',
      1,
      { line: 0, character: 0 },
      { invoke, forceInvoke: true },
    )
    expect(hover).toBeNull()
  })

  it('session-dead clear event is parsed for fail-closed marker wipe', () => {
    const event = parseTauriLspDiagnosticsEvent({
      sessionId: 'lsp-typescript-dead',
      uri: '',
      diagnostics: [],
      clear: true,
    })
    expect(event?.clear).toBe(true)
    expect(event?.diagnostics).toEqual([])
  })
})
