/**
 * J.9 — Auto viewport VisualEvidence attach after apply.
 * Honest: never IMPLEMENTED with empty blob; WebM HELD in Node → PNG/patch-hash OK.
 */

import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  captureCanvasPngFrames,
  captureViewportVisualEvidenceAuto,
  captureWebmEvidence,
  resolveVisualEvidenceCascade,
  resolveWebmCaptureCapability,
} from '@/lib/production/visual-evidence-capture'
import { autoAttachViewportVisualEvidenceAfterApply } from '@/lib/production/visual-evidence-auto-attach'
import { createTaskEvidenceLedger } from '@/lib/production/task-evidence-ledger'
import { buildNexusMissionUiPayload } from '@/lib/production/nexus-mission-ui'
import { buildApexMissionEvidenceLedger } from '@/lib/production/apex-mission-evidence'
import { createNexusPhaseEvent, resolveTerminalPhase } from '@/lib/production/nexus-mission-phases'
import type { ApexMissionResult } from '@/lib/production/apex-mission-orchestrator'

function stubApplyMission(): ApexMissionResult {
  return {
    missionId: 'mission-j9-1',
    plan: {
      missionId: 'mission-j9-1',
      maestroModelId: 'test-model',
      criticalTask: {
        taskId: 'task_0_code',
        domain: 'code',
        intent: 'implement',
        allowedPaths: ['src/a.ts'],
        successCriteria: ['L.5 PASS'],
        riskScore: 55,
        generatorWidth: 1,
      },
      peripheralTasks: [],
      projectMemoryDigestId: 'mem',
      lawsPackId: 'laws',
      contextPackId: 'ctx',
      trivialBypass: true,
    },
    estimatedSpendTokens: 100,
    cells: [
      {
        taskId: 'task_0_code',
        role: 'critical',
        moa: {
          generatorWidth: 1,
          proposals: [],
          supremePatch: 'export const x = 1\n',
          verdict: 'CANDIDATE',
        },
        heal: { verdict: 'APPLY', finalPatch: 'export const x = 1\n', turns: [{ round: 1, ok: true }] },
        finalPatch: 'export const x = 1\n',
      },
    ],
    verdict: 'APPLY',
    supremePatch: 'export const x = 1\n',
    liveProvider: true,
    phases: [
      createNexusPhaseEvent('maestro_planning'),
      createNexusPhaseEvent(resolveTerminalPhase('APPLY')),
    ],
  } as ApexMissionResult
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('J.9 VisualEvidence auto-attach', () => {
  it('Node runtime: WebM capability HELD; auto-attach falls back to patch-hash with refs', async () => {
    expect(resolveWebmCaptureCapability().status).toBe('HELD')
    const attach = await autoAttachViewportVisualEvidenceAfterApply({
      afterPatch: 'export const ok = true',
      label: 'j9-node',
      ledger: createTaskEvidenceLedger({
        taskId: 't1',
        projectId: 'p1',
        mission: 'm',
        ownerAgent: 'maestro',
      }),
    })
    expect(attach.visual.status).toBe('HELD')
    expect(attach.visual.kind).toBe('patch_hash')
    expect(attach.visual.refs.length).toBeGreaterThan(0)
    expect(attach.visual.webmHeld).toBe(true)
    expect(attach.attachedImplemented).toBe(false)
    expect(attach.ledger?.events.some((e) => e.kind === 'screenshot')).toBe(true)
  })

  it('refuses IMPLEMENTED when canvas PNG blob is empty (Law XVI)', async () => {
    const result = await captureCanvasPngFrames({
      canvas: {
        width: 8,
        height: 8,
        convertToBlob: async () => new Blob([], { type: 'image/png' }),
      },
      webmHeld: true,
    })
    expect(result.status).toBe('HELD')
    expect(result.refs).toEqual([])
    expect(result.message).toMatch(/empty/i)
  })

  it('PNG capture with toDataURL attaches IMPLEMENTED + webmHeld when WebM skipped', async () => {
    const tinyPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const result = await captureViewportVisualEvidenceAuto({
      preferWebm: false,
      resolveCanvas: () =>
        ({
          width: 1,
          height: 1,
          toDataURL: () => tinyPng,
        }) as unknown as HTMLCanvasElement,
    })
    expect(result.status).toBe('IMPLEMENTED')
    expect(result.kind).toBe('png_frames')
    expect(result.refs.length).toBeGreaterThan(0)
    expect(result.mimeType).toBe('image/png')
    expect(result.webmHeld).toBe(true)
    expect(result.byteLength).toBeGreaterThan(0)
  })

  it('cascade prefers browser PNG/WebM over patch-hash; empty browser refs do not win', () => {
    const withPng = resolveVisualEvidenceCascade({
      afterPatch: 'patch',
      browserCapture: {
        status: 'IMPLEMENTED',
        kind: 'png_frames',
        refs: ['frame:0:120'],
        message: 'png',
        contentHash: 'abc',
        webmHeld: true,
        byteLength: 120,
      },
    })
    expect(withPng.kind).toBe('png_frames')
    expect(withPng.status).toBe('IMPLEMENTED')

    const emptyBrowser = resolveVisualEvidenceCascade({
      afterPatch: 'patch',
      browserCapture: {
        status: 'IMPLEMENTED',
        kind: 'webm',
        refs: [],
        message: 'empty',
        contentHash: 'x',
        byteLength: 0,
      },
    })
    expect(emptyBrowser.kind).toBe('patch_hash')
    expect(emptyBrowser.status).toBe('HELD')
  })

  it('Nexus + ledger prefer browser capture when provided on APPLY', () => {
    const mission = stubApplyMission()
    const nexus = buildNexusMissionUiPayload(mission, mission.phases, {
      fusionTransactionId: 'tx-j9',
      snapshotHashBefore: 'b',
      snapshotHashAfter: 'a',
      browserVisualEvidence: {
        status: 'IMPLEMENTED',
        kind: 'png_frames',
        refs: ['frame:0:64'],
        message: 'Captured 1 PNG previz frame(s); WebM HELD on this runtime.',
        contentHash: 'pnghash',
        webmHeld: true,
        mimeType: 'image/png',
        byteLength: 64,
      },
    })
    expect(nexus.visualEvidence?.status).toBe('IMPLEMENTED')
    expect(nexus.visualEvidence?.kind).toBe('png_frames')

    const ledger = buildApexMissionEvidenceLedger({ mission, projectId: 'p1', nexus })
    const visualEvt = ledger.events.find((e) => e.kind === 'screenshot')
    expect(visualEvt?.title).toMatch(/VisualEvidence \(png_frames\)/)
    expect(visualEvt?.title).not.toMatch(/HELD/)
  })

  it('captureWebmEvidence returns HELD without MediaRecorder (no fake success)', async () => {
    const result = await captureWebmEvidence({
      canvas: { captureStream: () => ({ getTracks: () => [] }) } as unknown as HTMLCanvasElement,
      durationMs: 10,
    })
    expect(result.status).toBe('HELD')
    expect(result.kind).toBe('webm')
    expect(result.refs).toEqual([])
    expect(result.webmHeld).toBe(true)
  })
})
