/**
 * L.4 ForgeTerminalBridge — sandbox stream only; agents never host PTY.
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
  closeForgeTerminalSession,
  describeTerminalLaneSplit,
  openForgeTerminalSession,
  streamForgeTerminalCommand,
} from '@/lib/server/forge-terminal-bridge'

describe('L.4 ForgeTerminalBridge', () => {
  let root: string

  beforeEach(() => {
    __resetCreativeCostGuardForTests()
    __resetForgeSandboxExecutorForTests()
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-term-'))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  it('documents human-host-pty vs forge-sandbox lane split (Law #48)', () => {
    const split = describeTerminalLaneSplit()
    expect(split.humanHostPty.agentAllowed).toBe(false)
    expect(split.forgeSandbox.agentAllowed).toBe(true)
    expect(split.law).toBe(48)
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
})
