/**
 * L.4 ForgeTerminalBridge — sandbox duplex stream; agents never host PTY.
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
import { __resetForgeSandboxDuplexForTests } from '@/lib/production/forge-sandbox-duplex'
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

  afterEach(() => {
    __resetForgeSandboxDuplexForTests()
    fs.rmSync(root, { recursive: true, force: true })
  })

  it('documents human-host-pty vs forge-sandbox lane split (Law #48)', () => {
    const split = describeTerminalLaneSplit()
    expect(split.humanHostPty.agentAllowed).toBe(false)
    expect(split.forgeSandbox.agentAllowed).toBe(true)
    expect(split.law).toBe(48)
  })

  it('documents duplex honesty — pipes real, sandbox PTY HELD', () => {
    const honesty = describeForgeTerminalDuplexHonesty()
    expect(honesty.pty).toBe(false)
    expect(honesty.stdinStdoutPipes).toBe(true)
    expect(honesty.resizeDeliversSigwinch).toBe(false)
    expect(honesty.mode).toBe('sandbox-exec-duplex')
    expect(honesty.held).toMatch(/sandbox_pty_unavailable/)
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

  it('ready event never claims pty:true (zero-MVP)', async () => {
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
    expect(ready.pty).toBe(false)
    expect(ready.mode).toBe('sandbox-exec-duplex')
    expect(ready.lane).toBe('forge-sandbox')
    expect(ready.held).toMatch(/sandbox_pty_unavailable/)

    detachForgeTerminalDuplex(attached.handle.duplexId)
    await closeForgeTerminalSession(opened.session.sessionId)
  })

  it('duplex stdin→stdout round-trip over sandbox pipes (not host PTY)', async () => {
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

    const attached = await attachForgeTerminalDuplex({
      sessionId: opened.session.sessionId,
      callerKind: 'user',
      command: 'node',
      args: [
        '-e',
        "process.stdin.once('data',c=>{process.stdout.write('ECHO:'+String(c).trim());process.exit(0)});",
      ],
    })
    expect(attached.ok).toBe(true)
    if (!attached.ok) return

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

  it('resize is recorded but ptyApplied stays false (HELD honesty)', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const opened = await openForgeTerminalSession({
      userId: 'u1',
      projectId: 'proj-l4-resize',
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
    })
    expect(attached.ok).toBe(true)
    if (!attached.ok) return

    const resized = resizeForgeTerminalDuplex(attached.handle.duplexId, 100, 30)
    expect(resized.ok).toBe(true)
    expect(resized.ptyApplied).toBe(false)
    expect(resized.held).toMatch(/sandbox_pty_unavailable/)
    expect(resized.cols).toBe(100)
    expect(resized.rows).toBe(30)

    detachForgeTerminalDuplex(attached.handle.duplexId)
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
})
