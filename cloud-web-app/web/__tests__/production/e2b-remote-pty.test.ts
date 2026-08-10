/**
 * L.4 — E2B remote PTY SDK probe + forge duplex wiring (fail-closed).
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

import {
  __resetCreativeCostGuardForTests,
  createMemoryCostGuardLedger,
} from '@/lib/production/creative-cost-guard'
import {
  __resetE2BRemotePtyDuplexForTests,
  E2B_REMOTE_PTY_DOCUMENTED_SDK_SURFACE,
  openE2BRemotePtyDuplex,
  probeE2BRemotePtySdk,
} from '@/lib/production/e2b-remote-pty'
import {
  __injectForgeSandboxSessionForTests,
  __resetForgeSandboxExecutorForTests,
} from '@/lib/production/forge-sandbox-executor'
import type { E2BSandboxLike } from '@/lib/server/e2b-runtime'
import { probeForgeSandboxPtyAvailability } from '@/lib/production/forge-sandbox-duplex'
import { describeForgeTerminalDuplexHonesty } from '@/lib/server/forge-terminal-bridge'

describe('e2b-remote-pty', () => {
  afterEach(() => {
    __resetCreativeCostGuardForTests()
    __resetForgeSandboxExecutorForTests()
    __resetE2BRemotePtyDuplexForTests()
    vi.unstubAllEnvs()
  })

  it('documents E2B SDK PTY surface for audits', () => {
    expect(E2B_REMOTE_PTY_DOCUMENTED_SDK_SURFACE.length).toBeGreaterThanOrEqual(4)
    expect(E2B_REMOTE_PTY_DOCUMENTED_SDK_SURFACE.join(' ')).toMatch(/pty\.create/)
  })

  it('probe fail-closed when e2b package not installed', async () => {
    const probe = await probeE2BRemotePtySdk()
    if (probe.moduleLoadable) {
      expect(probe.ptyApiPresent).toBe(true)
      expect(probe.documentedSdkSurface.length).toBeGreaterThan(0)
    } else {
      expect(probe.canAttemptLive).toBe(false)
      expect(['e2b_module_not_installed', 'e2b_module_load_failed', 'e2b_pty_disabled']).toContain(
        probe.reason,
      )
      expect(probe.message.toLowerCase()).toMatch(/e2b|pty|held|not installed|load/)
    }
  })

  it('probe env-gated without E2B_API_KEY when module loadable', async () => {
    const probe = await probeE2BRemotePtySdk()
    if (probe.moduleLoadable && probe.ptyApiPresent) {
      const prev = process.env.E2B_API_KEY
      delete process.env.E2B_API_KEY
      const gated = await probeE2BRemotePtySdk()
      if (prev) process.env.E2B_API_KEY = prev
      expect(gated.apiKeyPresent).toBe(false)
      expect(gated.canAttemptLive).toBe(false)
      expect(gated.reason).toBe('e2b_api_key_missing')
    }
  })

  it('openE2BRemotePtyDuplex fail-closed without live handle', async () => {
    const result = await openE2BRemotePtyDuplex({
      sessionId: 'missing-session',
      provider: 'e2b',
      cols: 80,
      rows: 24,
      appendEvidence: () => {},
      trackKillable: () => {},
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('e2b_handle_missing')
      expect(result.message).toMatch(/e2b_remote_pty_held/)
    }
  })

  it('openE2BRemotePtyDuplex pty true only with live mock PTY handle', async () => {
    const sessionId = 'e2b-pty-test-session'
    const stdout: string[] = []
    let resizeCalled = false

    const mockPtyHandle = {
      pid: 4242,
      wait: vi.fn(
        () =>
          new Promise<{ exitCode: number }>((resolve) => {
            setTimeout(() => resolve({ exitCode: 0 }), 30_000)
          }),
      ),
    }

    const mockE2b: E2BSandboxLike = {
      sandboxId: 'sb-mock',
      files: {
        exists: async () => false,
        write: async () => {},
        writeFiles: async () => {},
      },
      commands: { run: async () => ({}) },
      pty: {
        create: vi.fn(async (opts) => {
          opts.onData?.('mock-pty-ready\n')
          return mockPtyHandle
        }),
        sendInput: vi.fn(async (_pid, data) => {
          stdout.push(new TextDecoder().decode(data))
        }),
        resize: vi.fn(async () => {
          resizeCalled = true
        }),
        kill: vi.fn(async () => true),
      },
      getHost: () => 'https://mock.e2b.dev',
    }

    __injectForgeSandboxSessionForTests({
      session: {
        sessionId,
        provider: 'e2b',
        projectId: 'p1',
        agentMode: 'Builder',
        networkPolicy: 'none',
        costGuardReservationId: 'r1',
        evidenceLedgerId: 'e1',
        createdAt: new Date().toISOString(),
      },
      e2bHandle: mockE2b,
      costAdapter: createMemoryCostGuardLedger(),
    })

    vi.stubEnv('E2B_API_KEY', 'e2b-test-key')

    const opened = await openE2BRemotePtyDuplex({
      sessionId,
      provider: 'e2b',
      cols: 100,
      rows: 30,
      appendEvidence: () => {},
      trackKillable: () => {},
    })

    expect(opened.ok).toBe(true)
    if (opened.ok) {
      expect(opened.handle.pty).toBe(true)
      expect(opened.handle.mode).toBe('sandbox-pty')
      expect(opened.handle.held).toBeNull()
      opened.handle.onStdout = (c) => stdout.push(c)
      expect(opened.handle.writeStdin('echo hi\n')).toBe(true)
      const resized = opened.handle.resize(120, 40)
      expect(resized.ptyApplied).toBe(false)
      expect(resized.held).toMatch(/e2b_pty_resize_async/)
      opened.handle.kill()
    }

    expect(mockE2b.pty?.create).toHaveBeenCalled()
    expect(resizeCalled).toBe(true)
  })

  it('forge terminal honesty reflects E2B probe (never blanket HELD)', async () => {
    const e2bProbe = await probeE2BRemotePtySdk()
    const honesty = describeForgeTerminalDuplexHonesty(e2bProbe)
    const localProbe = probeForgeSandboxPtyAvailability()
    expect(honesty.pty).toBe(localProbe.canAttempt)
    expect(honesty.e2bRemotePtyMessage.length).toBeGreaterThan(0)
    if (e2bProbe.canAttemptLive) {
      expect(honesty.e2bRemotePty).toBe('ready')
    } else {
      expect(honesty.e2bRemotePty).not.toBe('ready')
    }
  })

  it('e2b session never falls back to local spawn (fail-closed attach)', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e2b-duplex-'))
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const sessionId = 'e2b-no-pty-handle'

    __injectForgeSandboxSessionForTests({
      session: {
        sessionId,
        provider: 'e2b',
        projectId: 'p1',
        agentMode: 'Builder',
        networkPolicy: 'none',
        costGuardReservationId: 'r1',
        evidenceLedgerId: 'e1',
        createdAt: new Date().toISOString(),
      },
      projectRootPath: root,
      costAdapter: adapter,
    })

    const { openForgeSandboxDuplex, __resetForgeSandboxDuplexForTests } = await import(
      '@/lib/production/forge-sandbox-duplex'
    )
    __resetForgeSandboxDuplexForTests()
    const opened = await openForgeSandboxDuplex({
      sessionId,
      command: 'npm',
      args: ['--version'],
    })
    expect(opened.ok).toBe(false)
    if (!opened.ok) {
      expect(opened.reason).toBe('e2b_handle_missing')
    }

    fs.rmSync(root, { recursive: true, force: true })
  })
})
