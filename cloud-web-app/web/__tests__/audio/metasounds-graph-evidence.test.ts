/**
 * Law IV — MetaSounds graph evidence (not play-log theater).
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { installMockAudioContext } from '../production/mock-audio-context'
import {
  METASOUNDS_AAA_MARKETING_ALLOWED,
  METASOUNDS_AAA_READY,
  PLAY_LOG_SHIP_EVIDENCE_FORBIDDEN,
  claimMetaSoundsAaa,
  claimPlayLogOnlyAsShipEvidence,
  probeMetaSoundsGraphEvidenceReadiness,
  recordMetaSoundsGraphEvidence,
} from '@/lib/audio/metasounds-graph-evidence'
import { evaluateAudioHonesty } from '@/lib/production/audio-honesty-capability'

beforeAll(() => {
  installMockAudioContext()
})

describe('MetaSounds graph evidence', () => {
  it('seals compile + Web Audio schedule evidence', async () => {
    const sealed = await recordMetaSoundsGraphEvidence()
    if (!sealed.ok) {
      throw new Error(`expected ok: ${sealed.code} — ${sealed.message}`)
    }
    expect(sealed.value.dagHash).toMatch(/^ms-/)
    expect(sealed.value.webAudioScheduled).toBe(true)
    expect(sealed.value.playLogOnly).toBe(false)
    expect(sealed.value.scheduledSourceNodes).toBeGreaterThan(0)
    expect(sealed.value.fingerprint.length).toBeGreaterThanOrEqual(8)
    expect(sealed.value.metasoundsAaaReady).toBe(false)
  })

  it('refuses empty/play-log graphs and AAA marketing', async () => {
    const empty = await recordMetaSoundsGraphEvidence({
      cue: { id: 'empty', name: 'empty', nodes: [], connections: [] },
    })
    expect(empty.ok).toBe(false)
    expect(empty.ok === false && empty.code).toBe('play_log_forbidden')
    expect(claimPlayLogOnlyAsShipEvidence().ok).toBe(false)
    expect(claimMetaSoundsAaa().ok).toBe(false)
    expect(METASOUNDS_AAA_READY).toBe(false)
    expect(METASOUNDS_AAA_MARKETING_ALLOWED).toBe(false)
    expect(PLAY_LOG_SHIP_EVIDENCE_FORBIDDEN).toBe(true)
  })

  it('audio honesty reports graph evidence PARTIAL and AAA false', async () => {
    const probe = await probeMetaSoundsGraphEvidenceReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    const honesty = await evaluateAudioHonesty()
    expect(honesty.metasoundsGraphEvidence.status).toBe('PARTIAL')
    expect(honesty.marketingMetaSoundsAaaAllowed).toBe(false)
    expect(honesty.playLogOnly.status).toBe('HELD')
  })
})
