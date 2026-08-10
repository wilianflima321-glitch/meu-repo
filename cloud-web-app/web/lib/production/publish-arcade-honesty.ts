/**
 * Block 8 — Publish loop + Arcade honesty (Law XV baked-lighting gate).
 * Never invent fake playable / install success artifacts.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { isTheaterBakeReceipt } from '@/lib/production/baked-lighting-publish-gate'

const log = createComponentLogger('publish-arcade-honesty')

export type PublishArcadeStatus = 'IMPLEMENTED' | 'PARTIAL' | 'HELD' | 'NOT_IMPLEMENTED'

export interface PublishArcadeSurface {
  surface: string
  status: PublishArcadeStatus
  notes: string[]
  heldReason?: string
}

export interface BakedLightingGateResult {
  stageId: 'baked-lighting'
  required: true
  status: 'PASS' | 'HELD'
  allowSuccessArtifact: boolean
  notes: string[]
}

export interface PublishArcadeHonestyReport {
  generatedAt: string
  bakedLighting: PublishArcadeSurface
  arcadePlayable: PublishArcadeSurface
  fakeInstall: PublishArcadeSurface
  cookPlanner: PublishArcadeSurface
  marketingPlayableAllowed: boolean
  claim: string
  productCopy: string
  bakedLightingGate: BakedLightingGateResult
}

/**
 * Law XV — baked lighting is mandatory for success artifacts.
 * Without evidence → HELD (fail closed), never fake PASS.
 */
export function evaluateBakedLightingPublishGate(input: {
  evidencePresent?: boolean
  evidenceRef?: string | null
} = {}): BakedLightingGateResult {
  const ref = input.evidenceRef?.trim() ?? ''
  const present =
    input.evidencePresent === true &&
    Boolean(ref) &&
    !isTheaterBakeReceipt(ref) &&
    ref.length >= 8
  if (present) {
    return {
      stageId: 'baked-lighting',
      required: true,
      status: 'PASS',
      allowSuccessArtifact: true,
      notes: [`Baked-lighting evidence present: ${ref}`],
    }
  }
  const theater = Boolean(ref) && isTheaterBakeReceipt(ref)
  return {
    stageId: 'baked-lighting',
    required: true,
    status: 'HELD',
    allowSuccessArtifact: false,
    notes: [
      'Law XV requires baked-lighting before claiming final publish success',
      theater
        ? 'Theater/placeholder bake receipt refused — no fake success artifact'
        : 'No bake evidence — refuse fake success artifact',
    ],
  }
}

export function evaluatePublishArcadeHonesty(input: {
  webExportDownloadUrl?: string | null
  bakedLightingEvidencePresent?: boolean
  bakedLightingEvidenceRef?: string | null
  cookWorkersLive?: boolean
} = {}): PublishArcadeHonestyReport {
  const playUrl = input.webExportDownloadUrl?.trim() || null
  const gate = evaluateBakedLightingPublishGate({
    evidencePresent: input.bakedLightingEvidencePresent,
    evidenceRef: input.bakedLightingEvidenceRef,
  })
  const cookLive = input.cookWorkersLive === true

  const playable =
    Boolean(playUrl) && gate.status === 'PASS'
      ? ('IMPLEMENTED' as const)
      : Boolean(playUrl)
        ? ('PARTIAL' as const)
        : ('HELD' as const)

  const report: PublishArcadeHonestyReport = {
    generatedAt: new Date().toISOString(),
    bakedLighting: {
      surface: 'Law XV baked-lighting gate',
      status: gate.status === 'PASS' ? 'IMPLEMENTED' : 'HELD',
      notes: gate.notes,
      heldReason: gate.status === 'PASS' ? undefined : 'baked_lighting_evidence_missing',
    },
    arcadePlayable: {
      surface: 'Arcade playable build',
      status: playable,
      notes: playUrl
        ? [
            `Web export URL present`,
            gate.status === 'PASS'
              ? 'Bake gate PASS — playable claim allowed'
              : 'Bake gate HELD — listing may show pending, not fake install',
          ]
        : ['No web export download URL — Arcade shows Build pending / [HELD], not Install'],
      heldReason: playable === 'IMPLEMENTED' ? undefined : 'web_export_or_bake_incomplete',
    },
    fakeInstall: {
      surface: 'Fake install chrome',
      status: 'HELD',
      notes: ['Install CTA forbidden until real playable artifact exists'],
      heldReason: 'no_fake_install',
    },
    cookPlanner: {
      surface: 'Publish pipeline orchestrator',
      status: cookLive ? 'IMPLEMENTED' : 'PARTIAL',
      notes: cookLive
        ? ['Cook workers live']
        : ['Pure planner + isolation gate live; distributed cook workers deepen in S7/Law VI'],
      heldReason: cookLive ? undefined : 'cook_workers_partial',
    },
    marketingPlayableAllowed: playable === 'IMPLEMENTED',
    claim:
      playable === 'IMPLEMENTED'
        ? 'Arcade playable with bake evidence'
        : 'Arcade listing honest — playable / install [HELD] until web export + bake evidence',
    productCopy:
      playable === 'IMPLEMENTED'
        ? 'Play opens the real web export artifact.'
        : 'Published games show Build pending or [HELD] until a real Web export exists. No fake Install.',
    bakedLightingGate: gate,
  }

  log.info('publish_arcade_honesty_evaluated', {
    playable: report.arcadePlayable.status,
    bake: gate.status,
    marketing: report.marketingPlayableAllowed,
  })

  return report
}
