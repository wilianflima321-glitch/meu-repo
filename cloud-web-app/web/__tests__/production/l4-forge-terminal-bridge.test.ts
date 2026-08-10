/**
 * L.4 ForgeTerminalBridge — sandbox duplex / PTY honesty; agents never host PTY.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  createMemoryCostGuardLedger,
  __resetCreativeCostGuardForTests,
} from '@/lib/production/creative-cost-guard'
import { __resetForgeSandboxExecutorForTests } from '@/lib/production/forge-sandbox-executor'
import {
  __openForgeSandboxDuplexPipesOnlyForTests,
  __resetForgeSandboxDuplexForTests,
  probeForgeSandboxPtyAvailability,
} from '@/lib/production/forge-sandbox-duplex'
import {
  attachForgeTerminalDuplex,
  buildForgeTerminalDuplexReadyEvent,
  closeForgeTerminalSession,
  describeForgeTerminalDuplexHonesty,
  describeTerminalLaneSplit,
  detachForgeTerminalDuplex,
  openForgeTerminalSession,
  resizeForgeTerminalDuplex,
  streamForgeTerminalCommand,
  writeForgeTerminalDuplexStdin,
} from '@/lib/server/forge-terminal-bridge'

describe('L.4 ForgeTerminalBridge', () => {
  let root: string

  beforeEach(() => {
    __resetCreativeCostGuardForTests()
    __resetForgeSandboxExecutorForTests()
    __resetForgeSandboxDuplexForTests()
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-term-'))
  })

  afterEach(async () => {
    __resetForgeSandboxDuplexForTests()
    // Windows ConPTY may briefly hold the cwd — retry delete.
    for (let i = 0; i < 5; i++) {
      try {
        fs.rmSync(root, { recursive: true, force: true })
        break
      } catch {
        await new Promise((r) => setTimeout(r, 50))
      }
    }
  })

  it('documents human-host-pty vs forge-sandbox lane split (Law #48)', () => {
    const split = describeTerminalLaneSplit()
    expect(split.humanHostPty.agentAllowed).toBe(false)
    expect(split.forgeSandbox.agentAllowed).toBe(true)
    expect(split.law).toBe(48)
  })

  it('documents duplex honesty — pty flag matches host probe (never fake)', async () => {
    const probe = probeForgeSandboxPtyAvailability()
    const { probeE2BRemotePtySdk } = await import('@/lib/production/e2b-remote-pty')
    const e2bProbe = await probeE2BRemotePtySdk()
    const honesty = describeForgeTerminalDuplexHonesty(e2bProbe)
    expect(honesty.e2bRemotePtyMessage.length).toBeGreaterThan(0)
    if (e2bProbe.canAttemptLive) {
      expect(honesty.e2bRemotePty).toBe('ready')
    } else {
      expect(honesty.e2bRemotePty).not.toBe('ready')
    }
    expect(honesty.pty).toBe(probe.canAttempt)
    expect(honesty.ptyModuleAvailable).toBe(probe.moduleAvailable || probe.canAttempt)
    if (probe.canAttempt) {
      expect(honesty.mode).toBe('sandbox-pty')
      expect(honesty.resizeDeliversSigwinch).toBe(true)
      expect(honesty.held).toBeNull()
    } else {
      expect(honesty.mode).toBe('sandbox-exec-duplex')
      expect(honesty.stdinStdoutPipes).toBe(true)
      expect(honesty.resizeDeliversSigwinch).toBe(false)
      expect(honesty.held).toMatch(/sandbox_pty_/)
    }
  })

  it('opens a forge sandbox session for agents and streams stdout', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)

    const opened = await openForgeTerminalSession({
      userId: 'u1',
      projectId: 'proj-l4',
      projectRootPath: root,
      callerKind: 'agent',
      costAdapter: adapter,
      planId: 'pro',
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return

    const chunks: string[] = []
    const streamed = await streamForgeTerminalCommand({
      sessionId: opened.session.sessionId,
      command: 'node',
      args: ['-e', "console.log('l4-bridge-ok')"],
      callerKind: 'agent',
      onStdout: (c) => chunks.push(c),
    })

    expect(streamed.ok).toBe(true)
    expect(streamed.lane).toBe('forge-sandbox')
    expect(chunks.join('')).toContain('l4-bridge-ok')
    expect(streamed.evidenceEventCount).toBeGreaterThan(0)

    const closed = await closeForgeTerminalSession(opened.session.sessionId)
    expect(closed).toBe(true)
  })

  it('ready event pty flag matches live handle (zero-MVP)', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)

    const opened = await openForgeTerminalSession({
      userId: 'u1',
      projectId: 'proj-l4-ready',
      projectRootPath: root,
      callerKind: 'agent',
      costAdapter: adapter,
      planId: 'pro',
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return

    const attached = await attachForgeTerminalDuplex({
      sessionId: opened.session.sessionId,
      callerKind: 'agent',
      command: 'node',
      args: ['-e', 'setTimeout(()=>{}, 60_000)'],
    })
    expect(attached.ok).toBe(true)
    if (!attached.ok) return

    const ready = buildForgeTerminalDuplexReadyEvent(attached.handle)
    expect(ready.type).toBe('ready')
    if (ready.type !== 'ready') return
    expect(ready.pty).toBe(attached.handle.pty)
    expect(ready.mode).toBe(attached.handle.mode)
    expect(ready.lane).toBe('forge-sandbox')
    if (attached.handle.pty) {
      expect(ready.mode).toBe('sandbox-pty')
      expect(ready.held).toBeNull()
    } else {
      expect(ready.mode).toBe('sandbox-exec-duplex')
      expect(ready.held).toMatch(/sandbox_pty_/)
    }

    detachForgeTerminalDuplex(attached.handle.duplexId)
    await closeForgeTerminalSession(opened.session.sessionId)
  })

  it('sandbox PTY first-light: ptyApplied true only when live IPty', async () => {
    const probe = probeForgeSandboxPtyAvailability()
    if (!probe.canAttempt) {
      // Host cannot load node-pty — honesty still covered by pipe path tests.
      expect(probe.canAttempt).toBe(false)
      return
    }

    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const opened = await openForgeTerminalSession({
      userId: 'u1',
      projectId: 'proj-l4-pty',
      projectRootPath: root,
      callerKind: 'user',
      costAdapter: adapter,
      planId: 'pro',
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return

    const attached = await attachForgeTerminalDuplex({
      sessionId: opened.session.sessionId,
      callerKind: 'user',
      command: 'node',
      args: ['-e', 'setInterval(()=>{}, 1000)'],
      preferPty: true,
    })
    expect(attached.ok).toBe(true)
    if (!attached.ok) return

    expect(attached.handle.pty).toBe(true)
    expect(attached.handle.mode).toBe('sandbox-pty')
    expect(attached.handle.held).toBeNull()

    const resized = resizeForgeTerminalDuplex(attached.handle.duplexId, 100, 30)
    expect(resized.ok).toBe(true)
    expect(resized.ptyApplied).toBe(true)
    expect(resized.held).toBeNull()
    expect(resized.cols).toBe(100)
    expect(resized.rows).toBe(30)

    detachForgeTerminalDuplex(attached.handle.duplexId)
    await closeForgeTerminalSession(opened.session.sessionId)
  })

  it('pipe fallback: preferPty=false keeps ptyApplied false', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const opened = await openForgeTerminalSession({
      userId: 'u1',
      projectId: 'proj-l4-pipes',
      projectRootPath: root,
      callerKind: 'user',
      costAdapter: adapter,
      planId: 'pro',
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return

    const attached = await attachForgeTerminalDuplex({
      sessionId: opened.session.sessionId,
      callerKind: 'user',
      command: 'node',
      args: ['-e', 'setInterval(()=>{}, 1000)'],
      preferPty: false,
    })
    expect(attached.ok).toBe(true)
    if (!attached.ok) return

    expect(attached.handle.pty).toBe(false)
    expect(attached.handle.mode).toBe('sandbox-exec-duplex')
    expect(attached.handle.held).toMatch(/sandbox_pty_/)

    const ready = buildForgeTerminalDuplexReadyEvent(attached.handle)
    if (ready.type === 'ready') {
      expect(ready.pty).toBe(false)
    }

    const resized = resizeForgeTerminalDuplex(attached.handle.duplexId, 100, 30)
    expect(resized.ok).toBe(true)
    expect(resized.ptyApplied).toBe(false)
    expect(resized.held).toMatch(/sandbox_pty_/)

    detachForgeTerminalDuplex(attached.handle.duplexId)
    await closeForgeTerminalSession(opened.session.sessionId)
  })

  it('duplex stdin→stdout round-trip over sandbox (PTY or pipes)', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)

    const opened = await openForgeTerminalSession({
      userId: 'u1',
      projectId: 'proj-l4-echo',
      projectRootPath: root,
      callerKind: 'user',
      costAdapter: adapter,
      planId: 'pro',
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return

    // Prefer pipes for deterministic stdin once('data') echo (PTY may buffer/line-edit).
    const attached = await attachForgeTerminalDuplex({
      sessionId: opened.session.sessionId,
      callerKind: 'user',
      command: 'node',
      args: [
        '-e',
        "process.stdin.once('data',c=>{process.stdout.write('ECHO:'+String(c).trim());process.exit(0)});",
      ],
      preferPty: false,
    })
    expect(attached.ok).toBe(true)
    if (!attached.ok) return
    expect(attached.handle.pty).toBe(false)

    const out: string[] = []
    const done = new Promise<number | null>((resolve) => {
      attached.handle.onStdout = (c) => out.push(c)
      attached.handle.onExit = (code) => resolve(code)
    })

    expect(writeForgeTerminalDuplexStdin(attached.handle.duplexId, 'hello-forge-duplex\n').ok).toBe(
      true,
    )

    const code = await Promise.race([
      done,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ])
    expect(out.join('')).toContain('ECHO:hello-forge-duplex')
    expect(code).toBe(0)

    await closeForgeTerminalSession(opened.session.sessionId)
  })

  it('fails closed for agents when reusing a missing sandbox session (no host PTY fallback)', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)

    const opened = await openForgeTerminalSession({
      userId: 'u1',
      projectId: 'proj-l4',
      projectRootPath: root,
      callerKind: 'agent',
      costAdapter: adapter,
      planId: 'pro',
      existingSandboxSessionId: 'forge-sbx-does-not-exist',
    })

    expect(opened.ok).toBe(false)
    if (opened.ok) return
    expect(opened.reason).toBe('session_not_found')
    expect(opened.policy.executionLane).not.toBe('user-terminal')
  })

  it('denies agent stream for unknown session without inventing host PTY success', async () => {
    const streamed = await streamForgeTerminalCommand({
      sessionId: 'missing-session',
      command: 'node',
      args: ['-e', '1'],
      callerKind: 'agent',
    })
    expect(streamed.ok).toBe(false)
    expect(streamed.lane).toBe('forge-sandbox')
    expect(streamed.deniedReason || streamed.exitCode === null).toBeTruthy()
  })

  it('attach duplex fails closed for missing session (no fake ready)', async () => {
    const attached = await attachForgeTerminalDuplex({
      sessionId: 'missing-session',
      callerKind: 'agent',
      command: 'node',
      args: ['-e', '1'],
    })
    expect(attached.ok).toBe(false)
    if (attached.ok) return
    expect(attached.lane).toBe('forge-sandbox')
    expect(attached.reason).toBeTruthy()
  })

  it('stdin/resize fail closed when duplex id is unknown', () => {
    expect(writeForgeTerminalDuplexStdin('duplex-missing', 'x').ok).toBe(false)
    const resized = resizeForgeTerminalDuplex('duplex-missing', 80, 24)
    expect(resized.ok).toBe(false)
    expect(resized.ptyApplied).toBe(false)
  })

  it('pipes-only helper never claims pty', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const opened = await openForgeTerminalSession({
      userId: 'u1',
      projectId: 'proj-l4-helper',
      projectRootPath: root,
      callerKind: 'user',
      costAdapter: adapter,
      planId: 'pro',
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return

    const openedDuplex = await __openForgeSandboxDuplexPipesOnlyForTests({
      sessionId: opened.session.sessionId,
      command: 'node',
      args: ['-e', 'setTimeout(()=>{}, 1000)'],
    })
    expect(openedDuplex.ok).toBe(true)
    if (!openedDuplex.ok) return
    expect(openedDuplex.handle.pty).toBe(false)
    expect(openedDuplex.handle.resize(40, 12).ptyApplied).toBe(false)

    detachForgeTerminalDuplex(openedDuplex.handle.duplexId)
    await closeForgeTerminalSession(opened.session.sessionId)
  })
})
