/**
 * Block 9 Desktop native CORE — AgentShellPolicy, PTY honesty, sidecar health,
 * fs-watch latency helper, Electron quarantine claims.
 */

import { describe, expect, it } from 'vitest'

import {
  assertAgentMayNotHostPty,
  detectAgentShellCaller,
  evaluateAgentShellPolicy,
} from '@/lib/production/agent-shell-policy'
import { evaluateDesktopHonesty } from '@/lib/production/desktop-honesty-capability'
import {
  evaluateSidecarAiHealth,
  probeSidecarAiHealth,
} from '@/lib/production/sidecar-ai-health'
import {
  evaluateFsWatchLatency,
  FsWatchLatencyRecorder,
  FS_WATCH_LATENCY_BUDGET_MS,
  measureFsWatchLatencySample,
} from '@/lib/production/fs-watch-latency'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(__dirname, '../../../..')
const desktopManifestPath = path.join(
  repoRoot,
  'apps/studio-local/src/desktop-capability-manifest.ts',
)
const quarantinePath = path.join(repoRoot, 'runtime-templates/QUARANTINED.md')

describe('Block 9 — AgentShellPolicy (#48)', () => {
  it('blocks agent host PTY fail-closed', () => {
    const decision = evaluateAgentShellPolicy({
      callerKind: 'agent',
      requestedTarget: 'host-pty',
    })
    expect(decision.allowed).toBe(false)
    expect(decision.status).toBe('blocked')
    expect(decision.law).toBe(48)
    expect(decision.executionLane).toBe('denied')
  })

  it('blocks agent cloud-container PTY as fake local shell', () => {
    const decision = evaluateAgentShellPolicy({
      callerKind: 'agent',
      requestedTarget: 'cloud-container-pty',
    })
    expect(decision.allowed).toBe(false)
    expect(decision.status).toBe('blocked')
  })

  it('holds agent sandbox when L.1 unavailable — no host fallback', () => {
    const decision = evaluateAgentShellPolicy({
      callerKind: 'agent',
      requestedTarget: 'sandbox',
      sandboxAvailable: false,
    })
    expect(decision.allowed).toBe(false)
    expect(decision.status).toBe('held')
    expect(decision.reason).toMatch(/fail-closed/i)
  })

  it('allows agent sandbox when available', () => {
    const decision = evaluateAgentShellPolicy({
      callerKind: 'agent',
      requestedTarget: 'sandbox',
      sandboxAvailable: true,
    })
    expect(decision.allowed).toBe(true)
    expect(decision.executionLane).toBe('sandbox-only')
  })

  it('allows user terminal', () => {
    const decision = assertAgentMayNotHostPty({ callerKind: 'user' })
    expect(decision.allowed).toBe(true)
    expect(decision.executionLane).toBe('user-terminal')
  })

  it('detects agent callers from headers', () => {
    const headers = new Map([
      ['x-aethel-caller', 'agent'],
    ])
    expect(
      detectAgentShellCaller({
        get: (name) => headers.get(name) ?? null,
      }),
    ).toBe('agent')
  })
})

describe('Block 9 — Live PTY path honesty', () => {
  it('never markets cloud node-pty as local machine shell', () => {
    const report = evaluateDesktopHonesty({
      desktopNativeBridgePresent: false,
      cloudContainerPtyActive: true,
    })
    expect(report.marketingLocalShellAllowed).toBe(false)
    expect(report.activePty.isUserLocalMachine).toBe(false)
    expect(report.activePty.path).toBe('cloud-container-node-pty')
    expect(report.badgeLabel).toMatch(/cloud container/i)
    expect(report.productCopy).toMatch(/not your local OS shell/i)
  })

  it('reports desktop portable-pty as local when bridge present', () => {
    const report = evaluateDesktopHonesty({
      desktopNativeBridgePresent: true,
      cloudContainerPtyActive: false,
    })
    expect(report.marketingLocalShellAllowed).toBe(true)
    expect(report.activePty.path).toBe('desktop-native-portable-pty')
    expect(report.badgeLabel).toMatch(/desktop PTY/i)
  })
})

describe('Block 9 — Sidecar AI health', () => {
  it('stays HELD without ping evidence', () => {
    const report = evaluateSidecarAiHealth({})
    expect(report.releaseReady).toBe(false)
    expect(report.status).toBe('held')
    expect(report.capabilityStatus).toBe('HELD')
  })

  it('refuses healthy claim on probe-without-ping', () => {
    const report = evaluateSidecarAiHealth({ onnxProbeAvailable: true })
    expect(report.status).toBe('held')
    expect(report.claim).toMatch(/HELD/i)
  })

  it('records real ping when pingFn succeeds', async () => {
    const report = await probeSidecarAiHealth({
      onnxProbeAvailable: true,
      pingFn: async () => ({ ok: true, latencyMs: 8 }),
    })
    expect(report.status).toBe('ok')
    expect(report.releaseReady).toBe(false)
    expect(report.ping.ok).toBe(true)
  })
})

describe('Block 9 — FS watch latency helper', () => {
  it('holds evidence when no samples', () => {
    const report = evaluateFsWatchLatency([])
    expect(report.evidenceStatus).toBe('held')
    expect(report.underBudget).toBe(false)
    expect(report.budgetMs).toBe(FS_WATCH_LATENCY_BUDGET_MS)
  })

  it('measures samples under budget', () => {
    const recorder = new FsWatchLatencyRecorder()
    recorder.record({ observedAtMs: 1_000, receivedAtMs: 1_120, path: '/a' })
    recorder.record({ observedAtMs: 2_000, receivedAtMs: 2_080, path: '/b' })
    const report = recorder.report()
    expect(report.evidenceStatus).toBe('measured')
    expect(report.underBudget).toBe(true)
    expect(measureFsWatchLatencySample({ observedAtMs: 0, receivedAtMs: 50 })).toBe(50)
  })

  it('desktop honesty marks latency held without p95', () => {
    const report = evaluateDesktopHonesty({
      desktopNativeBridgePresent: true,
      fsWatchEmitsToUi: true,
      fsWatchLatencyP95Ms: null,
    })
    expect(report.fsWatch.emitsToUi).toBe(true)
    expect(report.fsWatch.latencyEvidenceStatus).toBe('held')
  })
})

describe('Block 9 — Electron quarantine', () => {
  it('desktop manifest quarantines Electron templates from ship path', () => {
    const desktopManifest = fs.readFileSync(desktopManifestPath, 'utf8')
    expect(desktopManifest).toMatch(/target:\s*'tauri-web-shell'/)
    expect(desktopManifest).toMatch(/quarantined-not-ship-path/)
    expect(desktopManifest).toMatch(/electron ship path/)
    expect(desktopManifest).not.toMatch(/absorbed-by-studio-local/)
    expect(desktopManifest).not.toMatch(
      /evidenceRefs:.*runtime-templates\/(?:linux|macos|windows)/s,
    )
  })

  it('QUARANTINED.md exists at runtime-templates/', () => {
    expect(fs.existsSync(quarantinePath)).toBe(true)
    const body = fs.readFileSync(quarantinePath, 'utf8')
    expect(body).toMatch(/NOT a ship path/i)
    expect(body).toMatch(/studio-local/)
  })
})
