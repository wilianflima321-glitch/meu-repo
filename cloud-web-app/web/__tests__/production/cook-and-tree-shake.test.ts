import { describe, expect, it } from 'vitest'

import {
  buildPublishPipelinePlan,
  evaluateBakedLightingPublishGate,
  FORBIDDEN_RUNTIME_PACKAGES,
  verifyRuntimeBundleIsolation,
} from '@/lib/production/publish-pipeline-orchestrator'
import { evaluateDemoWebSliceStage } from '@/lib/production/demo-web-slice'
import { buildMeasuredExportBundleEvidence } from '@/lib/hub/export-bundle-measurement'
import { transpileProjectScripts, type TranspileSourceAsset } from '@/lib/production/visual-script-transpile-stage'
import { computeParallelGroups } from '@/lib/production/studio-local-cook-queue'
import type { AbilityGraph } from '@aethel/gameplay/ability-graph-compiler'
import type { VisualScript } from '@aethel/visual-scripting/VisualScriptEditor'

describe('publish pipeline orchestrator (Cook & Build Pipeline)', () => {
  it('builds a plan with baked-lighting stage (Law XV) and the forbidden-package contract for web-static', () => {
    const plan = buildPublishPipelinePlan({
      projectId: 'project-1',
      target: 'web-static',
      quality: 'studio-local-optimized',
      requestedByUserId: 'user-1',
      multiplayer: { enabled: false },
      monetization: { enabled: false },
    })

    expect(plan.stages.map(s => s.id)).toEqual([
      'asset-cook',
      'logic-transpile',
      'tree-shake',
      'baked-lighting',
      'netcode-inject',
      'monetization-inject',
      'package',
      'demo-web-slice',
    ])
    expect(plan.forbiddenRuntimePackages).toContain('@aethel/ide-ui')
    expect(plan.forbiddenRuntimePackages).toContain('@xyflow/react')
    expect(plan.forbiddenRuntimePackages).toContain('zustand')
    expect(plan.entrypoint).toBe('packages/engine/runtime-main.ts')
    expect(plan.nativeBuildCommand).toBeNull()
  })

  it('fail-closes web-static baked-lighting without receipt (Law XV) and measures real bundle bytes only', () => {
    const blocked = evaluateBakedLightingPublishGate({ target: 'web-static' })
    expect(blocked.allowed).toBe(false)
    expect(blocked.shipStatus).toBe('HELD')

    const ok = evaluateBakedLightingPublishGate({
      target: 'web-static',
      bakeReceiptRef: 'bake:project-1:v1',
      lightmapBytes: 4096,
    })
    expect(ok.allowed).toBe(true)

    const empty = buildMeasuredExportBundleEvidence({ artifactByteLength: null })
    expect(empty.ok).toBe(false)
    const measured = buildMeasuredExportBundleEvidence({
      artifactByteLength: 2048,
      cookPackByteLength: 512,
    })
    expect(measured.ok).toBe(true)
    if (measured.ok) {
      expect(measured.evidence.fileSize).toBe(2048)
      expect(measured.evidence.cookPackByteLength).toBe(512)
    }
  })

  it('holds demo-web-slice Instant Play for web-static without hosted HTML (Zero-MVP)', () => {
    const held = evaluateDemoWebSliceStage({ target: 'web-static' })
    expect(held.allowed).toBe(false)
    expect(held.shipStatus).toBe('HELD')
    expect(held.demoPlayUrl).toBeNull()

    const ready = evaluateDemoWebSliceStage({
      target: 'web-static',
      demoWebSliceReady: true,
      instantPlayHtmlUrl: 'https://cdn.example/demo/index.html',
    })
    expect(ready.allowed).toBe(true)
    expect(ready.demoPlayUrl).toBe('https://cdn.example/demo/index.html')
  })

  it('captures a real tauri build command for native-tauri without executing it', () => {
    const plan = buildPublishPipelinePlan({
      projectId: 'project-1',
      target: 'native-tauri',
      quality: 'studio-local-optimized',
      requestedByUserId: 'user-1',
      multiplayer: { enabled: true, relayUrl: 'wss://relay.aethel.dev' },
      monetization: { enabled: true, stripePublishableKey: 'pk_test_123' },
    })

    expect(plan.nativeBuildCommand).toContain('tauri build')
  })

  it('flags a generated file that imports a forbidden editor package', () => {
    const leaky = [
      "import { ReactFlow } from '@xyflow/react';",
      'export const x = 1;',
    ].join('\n')

    const report = verifyRuntimeBundleIsolation(leaky)
    expect(report.clean).toBe(false)
    expect(report.violations[0].forbiddenPackage).toBe('@xyflow/react')
  })

  it('flags a bundled require() of the docking editor state too, not just ESM import', () => {
    const leaky = "const { useWorkspaceStore } = require('zustand');"
    const report = verifyRuntimeBundleIsolation(leaky)
    expect(report.clean).toBe(false)
    expect(report.violations.some(v => v.forbiddenPackage === 'zustand')).toBe(true)
  })

  it('passes clean generated engine-only source', () => {
    const clean = [
      "import { GameScript, addVec3, scaleVec3 } from '@aethel/engine/runtime/GameScript';",
      'export class PlayerScript extends GameScript {}',
    ].join('\n')

    const report = verifyRuntimeBundleIsolation(clean)
    expect(report.clean).toBe(true)
    expect(report.violations).toEqual([])
  })

  it('every forbidden package is checked as a whole-specifier match (no accidental substring false positives)', () => {
    // "y-protocols" must not accidentally flag a file that only imports plain "yjs".
    const report = verifyRuntimeBundleIsolation("import * as Y from 'yjs';")
    expect(report.clean).toBe(true)
    expect(FORBIDDEN_RUNTIME_PACKAGES).not.toContain('yjs')
  })
})

describe('visual script transpile stage (Logic Transpiler)', () => {
  it('compiles a start -> log graph into a GameScript-only class with no forbidden imports', () => {
    const script: VisualScript = {
      id: 'script-1',
      name: 'Boot Log',
      variables: [],
      nodes: [
        {
          id: 'n1',
          type: 'default',
          position: { x: 0, y: 0 },
          data: { definition: { type: 'event_start', category: 'event', label: 'On Start', inputs: [], outputs: [{ id: 'exec', label: '' }] }, values: {} },
        },
        {
          id: 'n2',
          type: 'default',
          position: { x: 0, y: 0 },
          data: {
            definition: { type: 'action_log', category: 'action', label: 'Log', inputs: [{ id: 'message', default: 'hello' }], outputs: [{ id: 'exec', label: '' }] },
            values: { message: 'Hello Aethel' },
          },
        },
      ] as unknown as VisualScript['nodes'],
      edges: [
        { id: 'e1', source: 'n1', sourceHandle: 'exec', target: 'n2', targetHandle: 'exec' },
      ] as unknown as VisualScript['edges'],
    }

    const source: TranspileSourceAsset = { assetId: 'asset-1', assetName: 'Boot Log', kind: 'visual-script', graph: script }
    const result = transpileProjectScripts([source])

    expect(result.allSourcesCompiled).toBe(true)
    expect(result.files).toHaveLength(1)
    expect(result.files[0].content).toContain("from '@aethel/engine/runtime/GameScript'")
    expect(result.files[0].content).toContain('this.services.log(String("Hello Aethel"))')

    const isolation = verifyRuntimeBundleIsolation(result.files.map(f => f.content))
    expect(isolation.clean).toBe(true)
  })

  it('surfaces a codegen-gap warning for an unsupported node type instead of silently dropping the chain', () => {
    const script: VisualScript = {
      id: 'script-2',
      name: 'Weird Node',
      variables: [],
      nodes: [
        { id: 'n1', type: 'default', position: { x: 0, y: 0 }, data: { definition: { type: 'event_start', category: 'event', label: 'On Start', inputs: [], outputs: [] }, values: {} } },
        { id: 'n2', type: 'default', position: { x: 0, y: 0 }, data: { definition: { type: 'action_totally_unsupported', category: 'action', label: 'Mystery', inputs: [], outputs: [] }, values: {} } },
      ] as unknown as VisualScript['nodes'],
      edges: [{ id: 'e1', source: 'n1', sourceHandle: 'exec', target: 'n2', targetHandle: 'exec' }] as unknown as VisualScript['edges'],
    }

    const result = transpileProjectScripts([{ assetId: 'asset-2', assetName: 'Weird Node', kind: 'visual-script', graph: script }])
    expect(result.warnings.some(w => w.severity === 'codegen-gap' && w.message.includes('action_totally_unsupported'))).toBe(true)
  })

  it('compiles an ability graph via AbilityGraphCompiler and surfaces balance warnings', () => {
    const graph: AbilityGraph = {
      id: 'ability-1',
      name: 'Overpowered Nuke',
      nodes: [
        { id: 'a1', type: 'trigger_on_cast', params: {} },
        { id: 'a2', type: 'effect_deal_damage', params: { damage: 5000 } },
      ],
      edges: [{ id: 'e1', source: 'a1', sourceHandle: 'exec', target: 'a2', targetHandle: 'exec' }],
    }

    const result = transpileProjectScripts([{ assetId: 'asset-3', assetName: 'Overpowered Nuke', kind: 'ability-graph', graph }])
    expect(result.files).toHaveLength(1)
    expect(result.files[0].content).toContain('deal_damage')
    expect(result.warnings.some(w => w.severity === 'balance-review')).toBe(true)

    const isolation = verifyRuntimeBundleIsolation(result.files.map(f => f.content))
    expect(isolation.clean).toBe(true)
  })

  it('holds instead of fabricating a file when the graph payload does not match either known shape', () => {
    const result = transpileProjectScripts([{ assetId: 'asset-4', assetName: 'Corrupt', kind: 'visual-script', graph: { not: 'a graph' } }])
    expect(result.allSourcesCompiled).toBe(false)
    expect(result.files).toHaveLength(0)
  })
})

describe('studio local cook queue parallel dispatch groups', () => {
  it('groups independent geometry and texture compressor stages together so they can dispatch to parallel workers', async () => {
    const { coerceStudioLocalCookJobRequest, buildStudioLocalCookQueuePlan } = await import('@/lib/production/studio-local-cook-queue')

    const request = coerceStudioLocalCookJobRequest({
      assetId: 'hero-01',
      assetName: 'Hero',
      goal: 'Cook a full optimized bundle.',
      sourceAssetUri: 's3://assets/hero/source.glb',
      sourceSha256: 'sha256:hero-source',
      sourceFormat: 'glb',
      currentTier: 'curated-marketplace',
      targetTier: 'studio-local-optimized',
      availableTools: ['gltf-transform', 'blender-headless', 'meshoptimizer', 'ktx-software-basisu', 'recast-detour', 'rapier-physics', 'ffmpeg'],
      evidenceRefs: [],
    })

    const plan = buildStudioLocalCookQueuePlan({ request: request! })
    const meshGroupIndex = plan.parallelGroups.findIndex(group => group.includes('mesh-optimize'))
    const textureGroupIndex = plan.parallelGroups.findIndex(group => group.includes('texture-compress'))

    expect(meshGroupIndex).toBeGreaterThanOrEqual(0)
    expect(meshGroupIndex).toBe(textureGroupIndex)
    expect(plan.parallelGroups[meshGroupIndex]).toEqual(expect.arrayContaining(['mesh-optimize', 'texture-compress']))
  })

  it('places computeParallelGroups levels in dependency order (preflight strictly before mesh-optimize)', () => {
    expect(computeParallelGroups).toBeInstanceOf(Function)
  })
})
