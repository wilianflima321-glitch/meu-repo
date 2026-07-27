/**
 * L.1 ForgeSandboxExecutor — real local-isolated execution + policy/cost/evidence wiring.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createMemoryCostGuardLedger, __resetCreativeCostGuardForTests } from '@/lib/production/creative-cost-guard'
import { evaluateAgentShellPolicy } from '@/lib/production/agent-shell-policy'
import {
  createForgeSandboxSession,
  execInForgeSandbox,
  teardownForgeSandboxSession,
  getForgeSandboxLedger,
  resolveForgeSandboxAvailability,
  describeForgeSandboxNetworkHonesty,
  __resetForgeSandboxExecutorForTests,
  FORGE_SANDBOX_WEIGHT_PER_MINUTE,
} from '@/lib/production/forge-sandbox-executor'

describe('L.1 ForgeSandboxExecutor', () => {
  let root: string

  beforeEach(() => {
    __resetCreativeCostGuardForTests()
    __resetForgeSandboxExecutorForTests()
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-sandbox-exec-'))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  it('resolves local-isolated as the real, always-available auto-selected provider (no E2B_API_KEY in this env)', async () => {
    const availability = await resolveForgeSandboxAvailability()
    expect(availability.available).toBe(true)
    expect(availability.provider).toBe('local-isolated')
  })

  it('firecracker is honestly HELD, never fakes availability', async () => {
    const availability = await resolveForgeSandboxAvailability('firecracker')
    expect(availability.available).toBe(false)
    expect(availability.reason).toBe('firecracker_not_implemented')
  })

  it('local-isolated network isolation is honestly disclosed as env-scrub only, not kernel-level', () => {
    const honesty = describeForgeSandboxNetworkHonesty('local-isolated')
    expect(honesty.kernelLevelIsolation).toBe(false)
  })

  it('J-ACC L1-01: executes an allowed command inside the sandbox and returns the correct result', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)

    const created = await createForgeSandboxSession({
      userId: 'u1',
      projectId: 'proj-l1',
      agentMode: 'Builder',
      projectRootPath: root,
      costAdapter: adapter,
      planId: 'pro',
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.session.provider).toBe('local-isolated')
    expect(created.session.costGuardReservationId).toBeTruthy()

    const result = await execInForgeSandbox({
      sessionId: created.session.sessionId,
      command: 'node',
      args: ['-e', "console.log('hello-from-sandbox')"],
    })

    expect(result.ok).toBe(true)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('hello-from-sandbox')
    expect(result.deniedReason).toBeUndefined()

    const ledger = getForgeSandboxLedger(created.session.sessionId)
    expect(ledger?.events.some((e) => e.kind === 'command')).toBe(true)
    expect(ledger?.events.some((e) => e.kind === 'cost')).toBe(true)

    const teardown = await teardownForgeSandboxSession(created.session.sessionId, 1)
    expect(teardown?.session.teardownAt).toBeTruthy()
  })

  it('J-ACC L1-02a: denies a command outside the allowlist (real block, not soft warning)', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const created = await createForgeSandboxSession({
      userId: 'u1',
      projectId: 'proj-l1',
      agentMode: 'Builder',
      projectRootPath: root,
      costAdapter: adapter,
      planId: 'pro',
    })
    if (!created.ok) throw new Error('session create failed')

    const result = await execInForgeSandbox({
      sessionId: created.session.sessionId,
      command: 'powershell',
      args: ['-Command', 'Get-Process'],
    })

    expect(result.ok).toBe(false)
    expect(result.deniedReason).toBe('command_not_allowlisted')
    expect(result.exitCode).toBeNull()

    const ledger = getForgeSandboxLedger(created.session.sessionId)
    expect(ledger?.events.some((e) => e.title.includes('denied'))).toBe(true)
  })

  it('J-ACC L1-02b: denies filesystem access outside the sandbox project root (path escape)', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const created = await createForgeSandboxSession({
      userId: 'u1',
      projectId: 'proj-l1',
      agentMode: 'Builder',
      projectRootPath: root,
      costAdapter: adapter,
      planId: 'pro',
    })
    if (!created.ok) throw new Error('session create failed')

    const outsidePath = os.platform() === 'win32' ? 'C:\\Windows' : '/etc'
    const result = await execInForgeSandbox({
      sessionId: created.session.sessionId,
      command: 'node',
      args: ['-e', '1'],
      cwd: outsidePath,
    })

    expect(result.ok).toBe(false)
    expect(result.deniedReason).toBe('path_escape')
  })

  it('J-ACC L1-02c: denies a path-shaped argument that escapes the project root even with an allowed command', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const created = await createForgeSandboxSession({
      userId: 'u1',
      projectId: 'proj-l1',
      agentMode: 'Builder',
      projectRootPath: root,
      costAdapter: adapter,
      planId: 'pro',
    })
    if (!created.ok) throw new Error('session create failed')

    const result = await execInForgeSandbox({
      sessionId: created.session.sessionId,
      command: 'npm',
      args: ['--prefix=../../etc', 'install'],
    })

    expect(result.ok).toBe(false)
    expect(result.deniedReason).toBe('path_escape')
  })

  it('J-ACC L1-03: host PTY remains forbidden — AgentShellPolicy #48 is not bypassed by L.1', () => {
    const decision = evaluateAgentShellPolicy({
      callerKind: 'agent',
      requestedTarget: 'host-pty',
      sandboxAvailable: true,
    })
    expect(decision.allowed).toBe(false)
    expect(decision.status).toBe('blocked')
    expect(decision.law).toBe(48)
  })

  it('J-ACC L1-03b: session creation for an unavailable provider fails closed via the shell policy, never falls back to host PTY', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const created = await createForgeSandboxSession({
      userId: 'u1',
      projectId: 'proj-l1',
      agentMode: 'Builder',
      provider: 'firecracker',
      projectRootPath: root,
      costAdapter: adapter,
      planId: 'pro',
    })
    expect(created.ok).toBe(false)
    if (created.ok) return
    expect(created.reason).toBe('firecracker_not_implemented')
  })

  it('reserves and settles real CostGuard minutes (Trava I) around the session lifecycle', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const balanceBefore = adapter.balances.get('u1') ?? 0

    const created = await createForgeSandboxSession({
      userId: 'u1',
      projectId: 'proj-l1',
      agentMode: 'Builder',
      projectRootPath: root,
      costAdapter: adapter,
      planId: 'pro',
      estimatedMinutes: 3,
    })
    if (!created.ok) throw new Error('session create failed')

    const balanceAfterReserve = adapter.balances.get('u1') ?? 0
    expect(balanceAfterReserve).toBe(balanceBefore - 3 * FORGE_SANDBOX_WEIGHT_PER_MINUTE)

    // Actual usage (1 min) was less than the 3-min estimate — settle should refund the delta.
    await teardownForgeSandboxSession(created.session.sessionId, 1)
    const balanceAfterSettle = adapter.balances.get('u1') ?? 0
    expect(balanceAfterSettle).toBe(balanceBefore - 1 * FORGE_SANDBOX_WEIGHT_PER_MINUTE)
  })

  it('fails closed on CostGuard free tier without BYOK (Trava I) — no session created', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)

    const created = await createForgeSandboxSession({
      userId: 'u1',
      projectId: 'proj-l1',
      agentMode: 'Builder',
      projectRootPath: root,
      costAdapter: adapter,
      planId: 'free',
    })
    expect(created.ok).toBe(false)
    if (created.ok) return
    expect(created.reason).toBe('free_tier_platform_pay_forbidden')
  })

  it('never inherits the full host environment — a fake secret env var does not leak into the sandboxed process', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    process.env.AETHEL_TEST_FAKE_SECRET = 'top-secret-value'
    try {
      const created = await createForgeSandboxSession({
        userId: 'u1',
        projectId: 'proj-l1',
        agentMode: 'Builder',
        projectRootPath: root,
        costAdapter: adapter,
        planId: 'pro',
      })
      if (!created.ok) throw new Error('session create failed')

      const result = await execInForgeSandbox({
        sessionId: created.session.sessionId,
        command: 'node',
        args: ['-e', "process.stdout.write(String(process.env.AETHEL_TEST_FAKE_SECRET || 'MISSING'))"],
      })

      expect(result.ok).toBe(true)
      expect(result.stdout).toBe('MISSING')
    } finally {
      delete process.env.AETHEL_TEST_FAKE_SECRET
    }
  })

  it('denies exec against an unknown/torn-down session id', async () => {
    const result = await execInForgeSandbox({
      sessionId: 'forge-sbx-does-not-exist',
      command: 'node',
      args: ['-e', '1'],
    })
    expect(result.ok).toBe(false)
    expect(result.deniedReason).toBe('session_not_found')
  })
})
