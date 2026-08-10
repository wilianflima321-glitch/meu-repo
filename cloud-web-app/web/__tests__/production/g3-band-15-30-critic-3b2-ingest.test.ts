/**
 * Critic 15→30 checklist + 3B.2 engine fingerprint ingest (G.% ladder).
 * Band stays HELD; Progress % bump refused; G.3% locked 15.
 */

import { describe, expect, it } from 'vitest'

import { G3_CODE_DEPTH_PERCENT_LOCKED } from '@aethel/engine/render/scalable-render-graph'
import {
  G3_BAND_15_TO_30_CHECKLIST_ID,
  G3_BAND_15_TO_30_PASSED_FROM_CHECKLIST,
  evaluateG3Band15To30CriticChecklist,
  refuseG3ProgressPercentBump,
} from '@/lib/production/g3-band-15-to-30-critic-checklist'
import {
  evaluateFrameParityHarnessReadiness,
  ingestDesktopFrameFingerprintFromEngine,
  proveFrameParityHarnessSoak,
} from '@/lib/production/frame-parity-harness-3b2'

describe('G.% Critic 15→30 checklist', () => {
  it('marks 3B.2 + CapScore lock pass; PP-03/session/60s held; band never passed', () => {
    const c = evaluateG3Band15To30CriticChecklist()
    expect(c.checklistId).toBe(G3_BAND_15_TO_30_CHECKLIST_ID)
    expect(c.g3Band15To30Passed).toBe(false)
    expect(G3_BAND_15_TO_30_PASSED_FROM_CHECKLIST).toBe(false)
    expect(c.g3CodeDepthPercent).toBe(G3_CODE_DEPTH_PERCENT_LOCKED)
    expect(c.proposedG3CodeDepthPercent).toBe(15)
    expect(c.naniteReady).toBe(false)
    expect(c.lumenReady).toBe(false)
    expect(c.allGatesPass).toBe(false)

    const byId = Object.fromEntries(c.gates.map((g) => [g.id, g]))
    expect(byId.parity_3b2_harness.status).toBe('pass')
    expect(byId.capscore_lock.status).toBe('pass')
    expect(byId.pp03_persistent_loop.status).toBe('held')
    expect(byId.session_ownership.status).toBe('held')
    expect(byId.soak_60s_frame_graph.status).toBe('held')
    expect(c.failCount).toBe(0)
    expect(c.passCount).toBeGreaterThanOrEqual(2)
    expect(c.evidenceFingerprint).toMatch(/^[a-f0-9]{16}$/)
  })

  it('fail-closes theater soak fingerprint; refuses Progress % bump always', () => {
    const theater = evaluateG3Band15To30CriticChecklist({
      soak60sNoPassDrop: true,
      soakDurationSec: 60,
      soakEvidenceFingerprint: 'mock',
    })
    const soak = theater.gates.find((g) => g.id === 'soak_60s_frame_graph')
    expect(soak?.status).toBe('fail')

    const bump30 = refuseG3ProgressPercentBump({
      proposedPercent: 30,
      checklist: theater,
    })
    expect(bump30.allowed).toBe(false)
    expect(bump30.lockedAt).toBe(15)
    expect(bump30.g3Band15To30Passed).toBe(false)
    expect(bump30.reason).toMatch(/refused/i)

    const bump15 = refuseG3ProgressPercentBump({ proposedPercent: 15 })
    expect(bump15.allowed).toBe(false)
  })
})

describe('3B.2 optional engine desktop fingerprint ingest', () => {
  it('ingests hex fingerprint; refuses theater; fail-open when absent', () => {
    const bad = ingestDesktopFrameFingerprintFromEngine({
      contentHash: 'mock_fingerprint_xx',
      sceneId: 'GF-PARITY-3B2-001',
    })
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.code).toBe('theater_payload')

    const short = ingestDesktopFrameFingerprintFromEngine({
      contentHash: 'abcd',
    })
    expect(short.ok).toBe(false)

    const hash = 'a'.repeat(64)
    const ok = ingestDesktopFrameFingerprintFromEngine({
      contentHash: hash,
      width: 64,
      height: 64,
      sceneId: 'GF-PARITY-3B2-001',
      frameIndex: 1,
    })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    expect(ok.fingerprint.surface).toBe('desktop_present')
    expect(ok.fingerprint.contentHash).toBe(hash)

    const absent = evaluateFrameParityHarnessReadiness()
    expect(absent.ready).toBe(true)
    expect(absent.g3Band15To30Passed).toBe(false)
    expect(absent.reason).toMatch(/fail-open measured/i)

    const withEngine = evaluateFrameParityHarnessReadiness({
      engineDesktop: {
        contentHash: hash,
        width: 64,
        height: 64,
        sceneId: 'GF-PARITY-3B2-001',
      },
    })
    expect(withEngine.ready).toBe(true)
    expect(withEngine.g3Band15To30Passed).toBe(false)
    expect(withEngine.reason).toMatch(/engine desktop fingerprint ingested/i)
    expect(withEngine.g3CodeDepthPercent).toBe(15)

    const soak = proveFrameParityHarnessSoak({
      engineDesktop: { contentHash: hash, width: 64, height: 64 },
      mode: 'fail_open_measured',
    })
    expect(soak.ok).toBe(true)
    if (!soak.ok) return
    expect(soak.desktopHash).toBe(hash)
    expect(soak.match).toBe(false)
    expect(soak.g3Band15To30Passed).toBe(false)
  })
})
