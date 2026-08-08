import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ensureTauriLspFarmSession,
  resetTauriLspFarmClientCache,
  tauriLspDefinition,
  tauriLspHover,
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
})
