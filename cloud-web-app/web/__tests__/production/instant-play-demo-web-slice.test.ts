import { describe, expect, it } from 'vitest'
import path from 'node:path'

import {
  DEMO_WEB_SLICE_HOST_HELD_REASON,
  DEMO_WEB_SLICE_SHIPPED_STAGES,
  DEMO_WEB_SLICE_STAGE_CATALOG,
  DEMO_WEB_SLICE_UNHOLD_BLOCKERS,
  evaluateDemoWebSliceStage,
  isInstantPlayHtmlUrl,
  resolveDemoPlayUrlFromExportEvidence,
} from '@/lib/production/demo-web-slice'
import { emitGameScriptsRegistry } from '@/lib/production/instant-play/game-scripts-registry'
import { emitInstantPlayHtml } from '@/lib/production/instant-play/html-emitter'
import { packInstantPlayBrowserBundle } from '@/lib/production/instant-play/browser-packer'
import {
  buildInstantPlayPublicUrl,
  hostInstantPlaySlice,
  readInstantPlayHostedAsset,
} from '@/lib/production/instant-play/html-host'
import { buildInstantPlaySlice } from '@/lib/production/instant-play/build-instant-play-slice'
import { buildPublishPipelinePlan } from '@/lib/production/publish-pipeline-orchestrator'
import { transpileProjectScripts } from '@/lib/production/visual-script-transpile-stage'
import type { VisualScript } from '@aethel/visual-scripting/VisualScriptEditor'

function sampleVisualScript(name: string): VisualScript {
  return {
    id: `script-${name}`,
    name,
    variables: [],
    nodes: [
      {
        id: 'n1',
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
          definition: {
            type: 'event_start',
            category: 'event',
            label: 'On Start',
            inputs: [],
            outputs: [{ id: 'exec', label: '' }],
          },
          values: {},
        },
      },
      {
        id: 'n2',
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
          definition: {
            type: 'action_log',
            category: 'action',
            label: 'Log',
            inputs: [{ id: 'message', default: 'hi' }],
            outputs: [{ id: 'exec', label: '' }],
          },
          values: { message: `Hello ${name}` },
        },
      },
    ] as unknown as VisualScript['nodes'],
    edges: [
      {
        id: 'e1',
        source: 'n1',
        sourceHandle: 'exec',
        target: 'n2',
        targetHandle: 'exec',
      },
    ] as unknown as VisualScript['edges'],
  }
}

describe('Instant Play demo-web-slice stages', () => {
  it('marks code path shipped (blockers empty) while catalog still lists all four stages', () => {
    expect(DEMO_WEB_SLICE_STAGE_CATALOG.map((b) => b.id)).toEqual([
      'browser-packer',
      'game-scripts-registry',
      'html-emitter',
      'html-host',
    ])
    expect(DEMO_WEB_SLICE_UNHOLD_BLOCKERS).toEqual([])
    expect([...DEMO_WEB_SLICE_SHIPPED_STAGES].sort()).toEqual(
      ['browser-packer', 'game-scripts-registry', 'html-emitter', 'html-host'].sort(),
    )
  })

  it('holds Instant Play when any stage evidence is missing (zip-only / unstamped)', () => {
    const held = evaluateDemoWebSliceStage({ target: 'web-static' })
    expect(held.allowed).toBe(false)
    // No export evidence at all → missing; zip-only → held. Both refuse demoPlayUrl.
    expect(['held', 'missing']).toContain(held.status)
    expect(held.demoPlayUrl).toBeNull()
    expect(held.reason).toBe(DEMO_WEB_SLICE_HOST_HELD_REASON)

    const zipRejected = resolveDemoPlayUrlFromExportEvidence({
      webExportDownloadUrl: 'https://cdn.example/exports/job.zip',
      demoWebSliceReady: false,
    })
    expect(zipRejected.demoPlayUrl).toBeNull()
    expect(zipRejected.status).toBe('held')

    const unstampedHtml = resolveDemoPlayUrlFromExportEvidence({
      explicitDemoPlayUrl: 'https://app.example/api/hub/instant-play/p1/j1/index.html',
      demoWebSliceReady: false,
    })
    expect(unstampedHtml.demoPlayUrl).toBeNull()
    expect(unstampedHtml.status).toBe('held')
  })

  it('accepts Arcade Instant Play URL shape as text/html host path', () => {
    const url = buildInstantPlayPublicUrl({
      projectId: 'proj_1',
      jobId: 'job_1',
      publicBaseUrl: 'https://app.aethel.dev',
    })
    expect(url).toBe('https://app.aethel.dev/api/hub/instant-play/proj_1/job_1/index.html')
    expect(isInstantPlayHtmlUrl(url)).toBe(true)
    expect(isInstantPlayHtmlUrl('https://cdn.example/export.zip')).toBe(false)
  })

  it('emits game-scripts-registry with GeneratedGameManifest constructors', () => {
    const transpile = transpileProjectScripts([
      {
        assetId: 'asset-boot',
        assetName: 'Boot Log',
        kind: 'visual-script',
        graph: sampleVisualScript('BootLog'),
      },
    ])
    expect(transpile.files.length).toBeGreaterThan(0)

    const registry = emitGameScriptsRegistry({
      projectId: 'proj_registry',
      files: transpile.files,
      network: { enabled: false },
      monetization: { enabled: false },
    })
    expect(registry.path).toBe('generated/game-scripts.ts')
    expect(registry.content).toContain('buildGeneratedGameManifest')
    expect(registry.content).toContain('scriptConstructors')
    expect(registry.entityCount).toBeGreaterThanOrEqual(1)
    expect(registry.scriptClassNames.length).toBeGreaterThanOrEqual(1)
  })

  it('html-emitter writes bootable Instant Play index.html (not web-template theater)', () => {
    const html = emitInstantPlayHtml({
      projectId: 'proj_html',
      jobId: 'job_html',
    })
    expect(html.bootsRuntime).toBe(true)
    expect(html.content).toContain('id="aethel-root"')
    expect(html.content).toContain('type="module"')
    expect(html.content).toContain('runtime.bundle.js')
    expect(html.content).not.toMatch(/Runtime Web exportado/i)
    expect(html.content).not.toMatch(/coming soon/i)
  })

  it('browser-packer emits non-empty JS that references bootAethelRuntime', async () => {
    const transpile = transpileProjectScripts([
      {
        assetId: 'asset-pack',
        assetName: 'Pack Log',
        kind: 'visual-script',
        graph: sampleVisualScript('PackLog'),
      },
    ])
    const registry = emitGameScriptsRegistry({
      projectId: 'proj_pack',
      files: transpile.files,
      network: { enabled: false },
      monetization: { enabled: false },
    })
    const engineRoot = path.resolve(process.cwd(), '../packages/engine')
    const packed = await packInstantPlayBrowserBundle({
      projectId: 'proj_pack',
      registry,
      scriptFiles: transpile.files,
      engineRoot,
    })
    expect(packed.ok, !packed.ok ? packed.reason : 'ok').toBe(true)
    if (!packed.ok) return
    expect(packed.byteLength).toBeGreaterThan(100)
    expect(packed.content).toMatch(/bootAethelRuntime|mountInstantPlay/)
    expect(packed.contentType).toContain('javascript')
  }, 60_000)

  it('html-host stores real bytes and serves text/html for Arcade URL', async () => {
    const html = emitInstantPlayHtml({ projectId: 'proj_host', jobId: 'job_host' })
    const hosted = await hostInstantPlaySlice({
      projectId: 'proj_host',
      jobId: 'job_host',
      publicBaseUrl: 'http://localhost:3000',
      assets: [
        {
          relativePath: 'index.html',
          body: html.content,
          contentType: html.contentType,
        },
        {
          relativePath: 'runtime.bundle.js',
          body: 'export function mountInstantPlay(){ return "bootAethelRuntime"; }\n',
          contentType: 'text/javascript; charset=utf-8',
        },
      ],
    })
    expect(hosted.ok).toBe(true)
    if (!hosted.ok) return
    expect(isInstantPlayHtmlUrl(hosted.demoPlayUrl)).toBe(true)
    expect(hosted.demoPlayUrl).toContain('/instant-play/')
    expect(hosted.demoPlayUrl).toMatch(/index\.html$/)

    const loaded = await readInstantPlayHostedAsset({
      projectId: 'proj_host',
      jobId: 'job_host',
      relativePath: 'index.html',
    })
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.contentType).toContain('text/html')
    expect(loaded.body.toString('utf8')).toContain('aethel-root')
  })

  it('end-to-end buildInstantPlaySlice is ready only with HTML+runtime+manifest present', async () => {
    const plan = buildPublishPipelinePlan({
      projectId: 'proj_e2e',
      target: 'web-static',
      quality: 'studio-local-optimized',
      requestedByUserId: 'user-1',
      multiplayer: { enabled: false },
      monetization: { enabled: false },
    })
    const transpile = transpileProjectScripts([
      {
        assetId: 'asset-e2e',
        assetName: 'E2E Log',
        kind: 'visual-script',
        graph: sampleVisualScript('E2ELog'),
      },
    ])
    const engineRoot = path.resolve(process.cwd(), '../packages/engine')
    const slice = await buildInstantPlaySlice({
      jobId: 'job_e2e',
      projectId: 'proj_e2e',
      plan,
      transpile,
      publicBaseUrl: 'https://app.aethel.dev',
      engineRoot,
    })

    expect(slice.remainingBlockers).toEqual([])
    expect(slice.completedStages.sort()).toEqual(
      ['browser-packer', 'game-scripts-registry', 'html-emitter', 'html-host'].sort(),
    )
    expect(slice.demoWebSlice.status).toBe('ready')
    expect(slice.demoWebSlice.demoPlayUrl).toBeTruthy()
    expect(isInstantPlayHtmlUrl(slice.demoWebSlice.demoPlayUrl)).toBe(true)
    expect(slice.files.some((f) => f.path.endsWith('index.html'))).toBe(true)
    expect(slice.files.some((f) => f.path.endsWith('runtime.bundle.js'))).toBe(true)
    expect(slice.files.some((f) => f.path.includes('game-scripts'))).toBe(true)

    const readyGate = evaluateDemoWebSliceStage({
      target: 'web-static',
      demoWebSliceReady: true,
      instantPlayHtmlUrl: slice.demoWebSlice.demoPlayUrl,
    })
    expect(readyGate.allowed).toBe(true)
    expect(readyGate.shipStatus).toBe('IMPLEMENTED')
  }, 60_000)

  it('does not mark ready for empty theater HTML without packer/host', () => {
    const theater = evaluateDemoWebSliceStage({
      target: 'web-static',
      demoWebSliceReady: true,
      instantPlayHtmlUrl: null,
    })
    expect(theater.allowed).toBe(false)
    expect(theater.demoPlayUrl).toBeNull()
  })
})
