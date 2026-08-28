/**
 * Top-8 deepen — Mini-IA allowlist dispatch + J.9 film/previz success barrier.
 * No Meshy/UE/Tripo claims. J.12 OrchestratorProd STOPPED.
 */

import { describe, expect, it } from 'vitest'

import {
  evaluateGovernedAgentToolJob,
} from '@/lib/production/agent-tool-job-runner'
import {
  evaluateMiniIaToolDispatch,
  mapAgentToolToMiniIaName,
  probeMiniIaToolDispatchReadiness,
  MINI_IA_TOOL_DISPATCH_WIRED,
} from '@/lib/production/mini-ia-tool-dispatch'
import {
  evaluateJ9FilmPrevizSuccessBarrier,
  gateFilmPrevizMissionSuccess,
  probeJ9FilmPrevizBarrierReadiness,
  J9_FILM_PREVIZ_BARRIER_WIRED,
  VEO_DEFAULT_PATH,
  FINAL_FOOTAGE_READY,
} from '@/lib/production/j9-film-previz-barrier'
import { attachCinematicVisualEvidenceAfterShoot } from '@/lib/production/cinematic-visual-evidence'
import { createTaskEvidenceLedger } from '@/lib/production/task-evidence-ledger'
import type { VisualEvidenceCaptureResult } from '@/lib/production/visual-evidence-capture'

const NOW = '2026-08-10T18:00:00.000Z'

describe('Mini-IA tool dispatch allowlist', () => {
  it('wires constants and probe readiness', () => {
    expect(MINI_IA_TOOL_DISPATCH_WIRED).toBe(true)
    const probe = probeMiniIaToolDispatchReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.orchestratorProdShipped).toBe(false)
    expect(probe.j12Stopped).toBe(true)
  })

  it('allows Mini-IA allowlisted tools and refuses host PTY', () => {
    const ok = evaluateMiniIaToolDispatch({
      projectId: 'p1',
      toolName: 'quality.tier.read',
      callerSurface: 'mini-ia',
      now: NOW,
    })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.value.maestroOwnsOrchestration).toBe(true)
      expect(ok.value.evidence.fingerprint.length).toBeGreaterThanOrEqual(16)
    }

    const pty = evaluateMiniIaToolDispatch({
      projectId: 'p1',
      toolName: 'run_command',
      callerSurface: 'mini-ia',
      now: NOW,
    })
    expect(pty.ok).toBe(false)
    if (!pty.ok) {
      expect(pty.code).toBe('host_pty_forbidden')
      expect(pty.evidence.fingerprint.length).toBeGreaterThanOrEqual(16)
    }
  })

  it('refuses non-allowlisted Mini-IA tools and OrchestratorProd', () => {
    const blocked = evaluateMiniIaToolDispatch({
      projectId: 'p1',
      toolName: 'generate_image',
      callerSurface: 'mini-ia',
      now: NOW,
    })
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.code).toBe('tool_not_allowlisted')

    const orch = evaluateMiniIaToolDispatch({
      projectId: 'p1',
      toolName: 'x',
      callerSurface: 'agent',
      requestOrchestratorProd: true,
      now: NOW,
    })
    expect(orch.ok).toBe(false)
    if (!orch.ok) expect(orch.code).toBe('orchestrator_prod_stopped')
  })

  it('maps agent apply/run_command onto host.pty for Mini-IA surface jobs', () => {
    expect(mapAgentToolToMiniIaName('run_command')).toBe('host.pty')
    expect(mapAgentToolToMiniIaName('apply-write')).toBe('host.pty')

    const decision = evaluateGovernedAgentToolJob({
      toolId: 'apply-write',
      mode: 'Creative',
      projectId: 'p1',
      agent: 'Mini-IA Creative',
      mission: 'shell',
      intent: 'run',
      now: NOW,
      miniIaSurface: true,
      enforcement: 'enforced',
    })
    expect(decision.ready).toBe(false)
    expect(decision.allowed).toBe(false)
    expect(decision.blockers.some((b) => /pty|Mini-IA|host|allowlist/i.test(b))).toBe(true)
    expect(decision.ledger.events.some((e) => /Mini-IA allowlist/i.test(e.title))).toBe(true)
  })
})

describe('J.9 film/previz success barrier', () => {
  it('wires constants and probe readiness', () => {
    expect(J9_FILM_PREVIZ_BARRIER_WIRED).toBe(true)
    expect(VEO_DEFAULT_PATH).toBe(false)
    expect(FINAL_FOOTAGE_READY).toBe(false)
    expect(probeJ9FilmPrevizBarrierReadiness().ready).toBe(true)
  })

  it('refuses success without visual fingerprint / theater', () => {
    const missing = evaluateJ9FilmPrevizSuccessBarrier({
      projectId: 'p1',
      visual: null,
      claimedSuccess: true,
    })
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.code).toBe('missing_visual_evidence')

    const theater = gateFilmPrevizMissionSuccess({
      projectId: 'p1',
      proposedSuccess: true,
      sceneId: 'mock',
      visual: {
        status: 'HELD',
        kind: 'patch_hash',
        refs: ['sha256:abcdef0123456789'],
        message: 'x',
        contentHash: 'abcdef0123456789abcdef',
        webmHeld: true,
      },
    })
    expect(theater.success).toBe(false)
    expect(theater.barrierCode).toBe('theater_payload')
  })

  it('allows success only with durable VisualEvidence fingerprint', () => {
    const visual: VisualEvidenceCaptureResult = {
      status: 'HELD',
      kind: 'patch_hash',
      refs: ['sha256:abcdef0123456789'],
      message: 'previz',
      contentHash: 'abcdef0123456789abcdef0123456789',
      webmHeld: true,
    }
    const pass = gateFilmPrevizMissionSuccess({
      projectId: 'p1',
      proposedSuccess: true,
      visual,
      source: 'sequencer-play-end',
    })
    expect(pass.success).toBe(true)
    expect(pass.verdict?.fingerprint.length).toBeGreaterThanOrEqual(16)
    expect(pass.verdict?.veoDefault).toBe(false)
    expect(pass.verdict?.finalFootageHeld).toBe(true)
  })

  it('cinematic attach stamps filmPrevizSuccess via J.9 barrier', async () => {
    const ledger = createTaskEvidenceLedger({
      taskId: 'cin-j9',
      projectId: 'p1',
      mission: 'Director shoot',
      ownerAgent: 'cinematic-director',
    })
    const result = await attachCinematicVisualEvidenceAfterShoot({
      intent: 'establishing',
      timelineId: 'director-establishing',
      source: 'sequencer-play-end',
      ledger,
    })
    expect(typeof result.filmPrevizSuccess).toBe('boolean')
    expect(result.veoDefault).toBe(false)
    expect(result.finalFootageHeld).toBe(true)
    if (result.filmPrevizSuccess) {
      expect(result.previzBarrier?.fingerprint.length).toBeGreaterThanOrEqual(16)
      expect(result.visual.refs.length).toBeGreaterThan(0)
      expect(result.visual.contentHash?.length).toBeGreaterThanOrEqual(8)
    } else {
      expect(result.blockedReason).toBeTruthy()
    }
  })
})
