/**
 * AI-v1-e — J.5 GraphOperator + J.6 VideoToMechanic scaffold + J.7 USD honesty.
 * J-ACC-06 / J-ACC-07 / J-ACC-08 core contracts.
 */

import { describe, expect, it, beforeEach } from 'vitest'

import {
  __resetCreativeCostGuardForTests,
  createMemoryCostGuardLedger,
} from '@/lib/production/creative-cost-guard'
import {
  __resetCreativeFusionTransactionsForTests,
  createMemoryFusionScopeStore,
} from '@/lib/production/creative-fusion-transaction'
import { handleFusionUndoShortcut as fusionUndo } from '@/lib/production/fusion-undo-bridge'
import {
  evaluateGraphOperatorCritic,
  proposeGraphNodes,
  runGraphOperator,
} from '@/lib/production/graph-operator'
import {
  buildClipsFromVideoJob,
  runVideoToMechanicOperator,
  VIDEO_TO_MECHANIC_HONESTY,
} from '@/lib/production/video-to-mechanic-operator'
import {
  evaluateUsdCharacterShipGate,
  resolveUsdImportViewerStatus,
  runUsdIntegrator,
  USD_BROWSER_VIEWER_SHIP_STATUS,
  USD_INTEGRATOR_HONESTY,
} from '@/lib/production/usd-integrator'
import {
  dispatchNexusSquad,
  resolveNexusCreativeOperatorHint,
} from '@/lib/production/nexus-squad-dispatch'
import { buildViewportImportedObject } from '@/lib/viewport/viewport-asset-import'

describe('AI-v1-e J.5 GraphOperator', () => {
  beforeEach(() => {
    __resetCreativeCostGuardForTests()
    __resetCreativeFusionTransactionsForTests()
  })

  it('J-ACC-06 commits SoundCue/VS nodes inside FusionTx with evidence', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const store = createMemoryFusionScopeStore()

    const result = await runGraphOperator({
      projectId: 'proj-j5',
      userId: 'u1',
      prompt: 'Wire a footstep SoundCue into the quest beat',
      target: 'sound-cue',
      planId: 'pro',
      adapter,
      store,
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.graph.physicsAutoWired).toBe(false)
    expect(result.graph.nodes.length).toBeGreaterThan(0)
    expect(result.fusionTransactionId).toBeTruthy()
    expect(result.snapshotHashBefore).not.toBe(result.snapshotHashAfter)
    expect(result.ledger.events.some((e) => e.kind === 'artifact')).toBe(true)
    expect(result.ledger.events.some((e) => e.kind === 'cost')).toBe(true)

    const snap = JSON.parse(store.getSnapshot('proj-j5', 'sound-cue'))
    expect(snap.graphs[0].graphId).toBe(result.graph.graphId)
  })

  it('fail-closed on CostGuard free tier without BYOK', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const store = createMemoryFusionScopeStore()

    const result = await runGraphOperator({
      projectId: 'proj-j5',
      userId: 'u1',
      prompt: 'Add VFX burst nodes',
      target: 'vfx',
      planId: 'free',
      adapter,
      store,
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.blockedReason).toBe('cost_guard')
  })

  it('Critic rejects auto-physics / GTA marketing claims', () => {
    const proposed = proposeGraphNodes({
      prompt: 'Make playable AAA GTA combat',
      target: 'visual-script',
    })
    const critic = evaluateGraphOperatorCritic({
      prompt: 'Make playable AAA GTA combat',
      nodes: proposed.nodes,
      edges: proposed.edges,
    })
    expect(critic.verdict).toBe('REJECT')
  })

  it('Nexus dispatch routes graph missions to GraphOperator hint', () => {
    const hint = resolveNexusCreativeOperatorHint('Add SoundCue nodes for the boss sting')
    expect(hint.kind).toBe('graph-operator')
    if (hint.kind === 'graph-operator') expect(hint.target).toBe('sound-cue')

    const squad = dispatchNexusSquad({
      missionId: 'm-j5',
      maestroModelId: 'test',
      planId: 'pro',
      userPrompt: 'Wire behavior tree action stubs for patrol',
      targetFilePath: 'graphs/patrol.json',
    })
    expect(squad.creativeOperator.kind).toBe('graph-operator')
    expect(squad.maestro.criticalTask.successCriteria).toContain('FusionTx commit')
  })
})

describe('AI-v1-e J.6 VideoToMechanic scaffold', () => {
  beforeEach(() => {
    __resetCreativeCostGuardForTests()
    __resetCreativeFusionTransactionsForTests()
  })

  it('J-ACC-07 extracts BT+SM scaffold via Bridge+Fusion — no Rapier wire', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const store = createMemoryFusionScopeStore()

    const result = await runVideoToMechanicOperator({
      projectId: 'proj-j6',
      userId: 'u1',
      clips: [
        { clipId: 'c1', durationMs: 1000, label: 'Idle' },
        { clipId: 'c2', durationMs: 1200, label: 'Dash' },
      ],
      missionLabel: 'Stealth beat scaffold',
      planId: 'pro',
      adapter,
      store,
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.scaffold.autoPhysics).toBe(false)
    expect(result.scaffold.physicsWiringRequired).toBe(true)
    expect(result.scaffold.behaviorTree.root.children.every((c) => c.stub)).toBe(true)
    expect(result.visualScriptStubs.every((s) => s.stub)).toBe(true)
    expect(result.honesty.productLabel).toBe(VIDEO_TO_MECHANIC_HONESTY.productLabel)
    expect(result.fusionTransactionId).toBeTruthy()

    const bt = JSON.parse(store.getSnapshot('proj-j6', 'behavior-tree'))
    expect(bt.scaffold.scaffoldId).toBe(result.scaffold.scaffoldId)
    expect(bt.autoPhysics).toBe(false)

    // Ctrl+Z path: post-commit revert restores beforePayload on the same store (P2f #3)
    const undo = await fusionUndo({
      projectId: 'proj-j6',
      yDocScope: 'behavior-tree',
      store,
    })
    expect(undo.ok).toBe(true)
    if (undo.ok) expect(undo.action).toBe('reverted_committed')
    const afterUndo = JSON.parse(store.getSnapshot('proj-j6', 'behavior-tree'))
    expect(afterUndo.scaffold).toBeUndefined()
  })

  it('rejects video→GTA marketing and exposes honesty copy', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const store = createMemoryFusionScopeStore()

    const denied = await runVideoToMechanicOperator({
      projectId: 'proj-j6',
      userId: 'u1',
      clips: [{ clipId: 'c1', durationMs: 500 }],
      missionLabel: 'Make it playable AAA GTA',
      planId: 'pro',
      adapter,
      store,
    })
    expect(denied.success).toBe(false)
    if (denied.success) return
    expect(denied.blockedReason).toBe('marketing_claim_rejected')
    expect(denied.honesty.marketingForbidden).toMatch(/forbidden forever/i)
  })

  it('buildClipsFromVideoJob maps generate/video task → scaffold beats', () => {
    const clips = buildClipsFromVideoJob({
      taskId: 'vid_abc',
      durationSeconds: 6,
      beatLabels: ['Windup', 'Impact'],
    })
    expect(clips).toHaveLength(2)
    expect(clips[0].clipId).toContain('vid_abc')
  })
})

describe('AI-v1-e J.7 USD / character content honesty', () => {
  beforeEach(() => {
    __resetCreativeCostGuardForTests()
    __resetCreativeFusionTransactionsForTests()
  })

  it('J-ACC-08 rejects proxy capsule as shipped character', () => {
    const gate = evaluateUsdCharacterShipGate({
      shipKind: 'character',
      geometryProxy: 'capsule',
    })
    expect(gate.allowed).toBe(false)
    expect(gate.reason).toBe('proxy_capsule_forbidden')
    expect(gate.message).toBe(USD_INTEGRATOR_HONESTY.noProxyCapsule)
  })

  it('rejects Tripo-only amorphous as shipped AAA character without USD cook', () => {
    const gate = evaluateUsdCharacterShipGate({
      shipKind: 'character',
      source: 'tripo',
    })
    expect(gate.allowed).toBe(false)
    expect(gate.reason).toBe('tripo_only_amorphous_forbidden')
  })

  it('USD browser viewer is PARTIAL — USDZ preview live; USDA/USD HELD', () => {
    expect(USD_BROWSER_VIEWER_SHIP_STATUS).toBe('PARTIAL')
    expect(resolveUsdImportViewerStatus('usdz')).toBe('live')
    expect(resolveUsdImportViewerStatus('usd')).toBe('held')
    expect(resolveUsdImportViewerStatus('glb')).toBe('live')

    const usdz = buildViewportImportedObject({
      existingCount: 0,
      importedAt: '2026-07-11T18:00:00.000Z',
      index: 0,
      file: {
        fileName: 'Hero.usdz',
        sizeBytes: 100,
        meshUrl: 'blob:hero-usdz',
        viewerStatus: 'live',
      },
    })
    expect(usdz?.asset?.viewerStatus).toBe('live')
    expect(usdz?.meshUrl).toBe('blob:hero-usdz')

    const usda = buildViewportImportedObject({
      existingCount: 0,
      importedAt: '2026-07-11T18:00:00.000Z',
      index: 1,
      file: { fileName: 'Stage.usda', sizeBytes: 100 },
    })
    expect(usda?.asset?.viewerStatus).toBe('held')
    expect(usda?.meshUrl).toBeUndefined()
  })

  it('library placement commits via FusionTx — no capsule stand-in', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const store = createMemoryFusionScopeStore()

    const result = await runUsdIntegrator({
      projectId: 'proj-j7',
      userId: 'u1',
      prompt: 'Place Megascans rock near the cliff',
      libraryAssets: [
        { assetId: 'rock_01', libraryPath: 'library/rocks/rock_01.glb', label: 'Cliff Rock' },
      ],
      shipKind: 'environment',
      planId: 'pro',
      adapter,
      store,
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.placements).toHaveLength(1)
    expect(result.viewerStatus).toBe('live')
    expect(result.usdCookStatus).toBe('library-placed')

    const deniedCapsule = await runUsdIntegrator({
      projectId: 'proj-j7',
      userId: 'u1',
      prompt: 'Ship capsule hero',
      libraryAssets: [{ assetId: 'x', libraryPath: 'x.glb', label: 'x' }],
      claimCapsuleCharacterShipped: true,
      planId: 'pro',
      adapter,
      store,
    })
    expect(deniedCapsule.success).toBe(false)
    if (deniedCapsule.success) return
    expect(deniedCapsule.blockedReason).toBe('proxy_capsule_forbidden')
  })
})
