/**
 * J.9 / #63 — Cinematic VisualEvidence after Director shoot / Fusion cinematic job.
 * Honest: never IMPLEMENTED with empty refs; Veo demoted; final footage HELD.
 */

import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest'
import {
  attachCinematicVisualEvidenceAfterShoot,
  completeCinematicDirectorShootWithEvidence,
  isCinematicFusionJob,
  CINEMATIC_DOCTRINE_ID,
  CINEMATIC_VISUAL_EVIDENCE_WIRED,
} from '@/lib/production/cinematic-visual-evidence'
import { planCinematicDirectorShoot } from '@/lib/sequencer/cinematic-director-bridge'
import { createTaskEvidenceLedger } from '@/lib/production/task-evidence-ledger'
import { dispatchCreativeArtifact } from '@/lib/production/creative-artifact-bridge'
import {
  createMemoryCostGuardLedger,
  __resetCreativeCostGuardForTests,
} from '@/lib/production/creative-cost-guard'
import {
  beginCreativeFusionTransaction,
  createMemoryFusionScopeStore,
  __resetCreativeFusionTransactionsForTests,
} from '@/lib/production/creative-fusion-transaction'

beforeEach(() => {
  __resetCreativeCostGuardForTests()
  __resetCreativeFusionTransactionsForTests()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('J.9 cinematic VisualEvidence (#63)', () => {
  it('wires doctrine constants and demotes Veo default', () => {
    expect(CINEMATIC_VISUAL_EVIDENCE_WIRED).toBe(true)
    expect(CINEMATIC_DOCTRINE_ID).toBe('#63')
    const plan = planCinematicDirectorShoot({ intent: 'action' })
    expect(plan.shootBackend).toBe('engine_sequencer')
    expect(plan.notes.some((n) => /Veo demoted/i.test(n))).toBe(true)
  })

  it('detects Fusion cinematic jobs without routing pixel-gen defaults', () => {
    expect(isCinematicFusionJob({ prompt: 'Direct an establishing cutscene for the desert RPG' })).toBe(
      true,
    )
    expect(isCinematicFusionJob({ role: 'cinematic-director' })).toBe(true)
    expect(isCinematicFusionJob({ domain: 'cinematic.direct' })).toBe(true)
    expect(isCinematicFusionJob({ prompt: 'Generate a Veo trailer clip' })).toBe(false)
    expect(isCinematicFusionJob({ prompt: 'fix a typo in README' })).toBe(false)
  })

  it('sequencer play-end attach: Node → honest patch-hash / webmHeld, never empty IMPLEMENTED', async () => {
    const ledger = createTaskEvidenceLedger({
      taskId: 'cin-1',
      projectId: 'p1',
      mission: 'Director shoot',
      ownerAgent: 'cinematic-director',
    })
    const result = await attachCinematicVisualEvidenceAfterShoot({
      intent: 'establishing',
      timelineId: 'director-establishing',
      timelineLabel: 'Director · Establishing',
      shootDurationMs: 3000,
      source: 'sequencer-play-end',
      ledger,
    })

    expect(result.shootBackend).toBe('engine_sequencer')
    expect(result.veoDefault).toBe(false)
    expect(result.finalFootageHeld).toBe(true)
    expect(result.doctrine).toBe('#63')
    expect(result.visual.refs.length).toBeGreaterThan(0)
    expect(result.visual.status === 'IMPLEMENTED' ? result.visual.refs.length > 0 : true).toBe(true)
    if (result.visual.status === 'IMPLEMENTED') {
      expect(result.visual.byteLength == null || result.visual.byteLength > 0).toBe(true)
    } else {
      expect(result.visual.webmHeld).toBe(true)
      expect(result.visual.kind).toBe('patch_hash')
    }
    expect(result.evidenceRefs).toEqual(
      expect.arrayContaining([
        'doctrine:#63',
        'shoot:engine_sequencer',
        'veo:demoted',
        'timeline:director-establishing',
        'finalFootage:HELD',
      ]),
    )
    expect(result.ledger?.events.some((e) => e.actor === 'cinematic-director')).toBe(true)
    expect(result.ledger?.events.some((e) => e.kind === 'screenshot' || e.kind === 'artifact')).toBe(
      true,
    )
  })

  it('PNG canvas capture attaches IMPLEMENTED with webmHeld and continuity receipts', async () => {
    const tinyPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const result = await attachCinematicVisualEvidenceAfterShoot({
      intent: 'reveal',
      timelineId: 'director-reveal',
      source: 'director-manual',
      // No captureStream → honest PNG + webmHeld (not fake WebM)
      resolveCanvas: () =>
        ({
          width: 1,
          height: 1,
          toDataURL: () => tinyPng,
        }) as unknown as HTMLCanvasElement,
      ledger: createTaskEvidenceLedger({
        taskId: 'cin-png',
        projectId: 'p1',
        mission: 'png',
        ownerAgent: 'cinematic-director',
      }),
    })

    expect(result.attachedImplemented).toBe(true)
    expect(result.visual.kind).toBe('png_frames')
    expect(result.visual.webmHeld).toBe(true)
    expect(result.evidenceRefs).toContain('engine render or cloud stream capture')
    expect(result.evidenceRefs).toContain('cutscene continuity receipt')
    expect(result.finalFootageHeld).toBe(true)
  })

  it('completeCinematicDirectorShootWithEvidence returns plan + evidence', async () => {
    const { plan, evidence } = await completeCinematicDirectorShootWithEvidence({
      intent: 'dialogue',
      source: 'fusion-cinematic-job',
      jobId: 'job-cin-1',
      ledger: createTaskEvidenceLedger({
        taskId: 'cin-bridge',
        projectId: 'p1',
        mission: 'fusion cinematic',
        ownerAgent: 'maestro',
      }),
    })
    expect(plan.intent).toBe('dialogue')
    expect(plan.shootBackend).toBe('engine_sequencer')
    expect(evidence.source).toBe('fusion-cinematic-job')
    expect(evidence.evidenceRefs).toContain('job:job-cin-1')
    expect(evidence.visual.refs.length).toBeGreaterThan(0)
  })

  it('CreativeBridge cinematic-beat success attaches cinematic VisualEvidence (no empty success)', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 10_000)
    const store = createMemoryFusionScopeStore()
    const tx = await beginCreativeFusionTransaction({
      projectId: 'p1',
      yDocScope: 'manifest',
      store,
    })

    const { result, ledger } = await dispatchCreativeArtifact({
      request: {
        domain: 'cinematic-beat',
        prompt: 'Director establishing beat for desert intro',
        projectId: 'p1',
        userId: 'u1',
        fusionTransactionId: tx.id,
        costGuard: { estimatedTokenWeight: 100, planId: 'pro', usageBucketId: 'bucket-1' },
      },
      adapter,
      provider: async () => ({
        artifactId: 'art-cin-1',
        provider: 'engine-sequencer',
        costUsd: 0,
        actualTokenWeight: 80,
        previewUrl: undefined,
      }),
    })

    expect(result.success).toBe(true)
    expect(result.artifactId).toBe('art-cin-1')
    const cinematicEvt = ledger.events.find(
      (e) => e.actor === 'cinematic-director' || e.title.includes('Cinematic engine shoot'),
    )
    expect(cinematicEvt).toBeTruthy()
    expect(cinematicEvt?.refs).toEqual(
      expect.arrayContaining(['doctrine:#63', 'veo:demoted', 'finalFootage:HELD']),
    )
    for (const e of ledger.events.filter((ev) => ev.kind === 'screenshot')) {
      expect(e.refs.length).toBeGreaterThan(0)
    }
  })
})
