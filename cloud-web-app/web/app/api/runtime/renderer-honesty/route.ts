import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { evaluateRendererHonesty } from '@/lib/production/renderer-honesty-capability'
import {
  buildHardwareStaticProfile,
  withCapabilityScore,
} from '@aethel/engine/render/hardware-profile'
import { buildScalableRenderGraphReport } from '@aethel/engine/render/scalable-render-graph'
import { proveGpuDeviceSoakReadiness } from '@aethel/engine/render/gpu-device-soak'
import { evaluateFrameParityHarnessReadiness } from '@/lib/production/frame-parity-harness-3b2'
import { evaluateGfMesh001Readiness } from '@/lib/production/gf-mesh-001-visibility-fixture'
import { evaluateGfMesh001PbrReadiness } from '@/lib/production/gf-mesh-001-material-pbr-fixture'
import { evaluateHizOcclusionWinReadiness } from '@/lib/production/hiz-occlusion-win-harness'
import {
  evaluateG3Band15To30CriticChecklist,
  refuseG3ProgressPercentBump,
} from '@/lib/production/g3-band-15-to-30-critic-checklist'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/renderer-honesty/route')

export const dynamic = 'force-dynamic'

/**
 * Focus 2A + 3B.1 + CW3 — honest renderer capability + Law XV score + present root.
 * Query: webgpu=1|0, webgl2=1|0, desktopWgpu=1|0, webgpuAdapterAcquired=1|0,
 *        webgpuDeviceReady=1|0, claimsWebGpuPresent=1|0,
 *        desktopPresented=1|0, desktopSubmitted=1|0, desktopBackend, desktopSurfaceKind,
 *        score=0-100, cores, memGb
 *        (desktop* mirror Tauri renderer_present_probe — never invent presented/submitted)
 */
export async function GET(req: NextRequest) {
  try {
    requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const parseBool = (key: string): boolean | undefined => {
    const v = sp.get(key)
    if (v === null) return undefined
    if (v === '1' || v === 'true') return true
    if (v === '0' || v === 'false') return false
    return undefined
  }

  const scoreRaw = sp.get('score')
  const capabilityScoreParam =
    scoreRaw !== null && Number.isFinite(Number(scoreRaw)) ? Number(scoreRaw) : undefined

  const coresRaw = sp.get('cores')
  const memRaw = sp.get('memGb')
  const profile = buildHardwareStaticProfile({
    webgpuAvailable: parseBool('webgpu'),
    webgl2Available: parseBool('webgl2'),
    hardwareConcurrency: coresRaw && Number.isFinite(Number(coresRaw)) ? Number(coresRaw) : undefined,
    deviceMemoryGb: memRaw && Number.isFinite(Number(memRaw)) ? Number(memRaw) : undefined,
  })
  const capabilityScore = capabilityScoreParam ?? profile.capabilityScore
  const gatedProfile = withCapabilityScore(profile, capabilityScore)
  const srg = buildScalableRenderGraphReport(gatedProfile)
  const gpuSoak = proveGpuDeviceSoakReadiness({
    limits: {
      maxTextureDimension2D: Number(sp.get('maxTex')) || 8192,
      maxBufferSize: Number(sp.get('maxBuffer')) || 268_435_456,
    },
  })
  const frameParity = evaluateFrameParityHarnessReadiness({
    engineDesktop: (() => {
      const contentHash = sp.get('desktopFrameHash') ?? sp.get('engineFrameHash')
      if (!contentHash) return null
      const w = Number(sp.get('desktopFrameW') ?? sp.get('engineFrameW'))
      const h = Number(sp.get('desktopFrameH') ?? sp.get('engineFrameH'))
      const frameIndex = Number(sp.get('desktopFrameIndex') ?? sp.get('engineFrameIndex'))
      return {
        contentHash,
        width: Number.isFinite(w) ? w : undefined,
        height: Number.isFinite(h) ? h : undefined,
        sceneId: sp.get('desktopSceneId') ?? sp.get('engineSceneId') ?? undefined,
        frameIndex: Number.isFinite(frameIndex) ? frameIndex : undefined,
        evidenceFingerprint: sp.get('desktopEvidenceFp') ?? undefined,
      }
    })(),
  })
  const gfMesh001 = evaluateGfMesh001Readiness()
  const gfMeshPbr = evaluateGfMesh001PbrReadiness()
  const hizWin = evaluateHizOcclusionWinReadiness()
  const g3Band1530 = evaluateG3Band15To30CriticChecklist({
    pp03PersistentLoopProven: parseBool('pp03PersistentLoop'),
    sessionOwnedByProduct: parseBool('sessionOwnedByProduct'),
    soak60sNoPassDrop: parseBool('soak60sNoPassDrop'),
    soakDurationSec: (() => {
      const n = Number(sp.get('soakDurationSec'))
      return Number.isFinite(n) ? n : undefined
    })(),
    soakEvidenceFingerprint: sp.get('soakEvidenceFp') ?? undefined,
    productPresentReady: parseBool('productPresentReady'),
    cargoCheckGreen: parseBool('cargoCheckGreen'),
    cargoClippyGreen: parseBool('cargoClippyGreen'),
    changelogIndexSynced: parseBool('changelogIndexSynced'),
    criticCitationSha: sp.get('criticCitationSha') ?? undefined,
  })
  const bumpRefuse = refuseG3ProgressPercentBump({
    proposedPercent: Number(sp.get('proposeG3Percent') ?? 30),
    checklist: g3Band1530,
  })

  // Desktop present evidence — only from explicit probe params (never invent).
  // Fail-closed: presented without submitted must not flip live_present.
  const desktopPresented = parseBool('desktopPresented')
  const desktopSubmitted = parseBool('desktopSubmitted')
  const desktopPresentProbe =
    desktopPresented === undefined && desktopSubmitted === undefined
      ? undefined
      : {
          presented: desktopPresented === true,
          submitted: desktopSubmitted === true,
          backend: sp.get('desktopBackend') ?? undefined,
          surfaceKind: sp.get('desktopSurfaceKind') ?? undefined,
          webviewExclusivePresentHeld: true,
          unrealRhiParityReady: false,
        }

  const report = evaluateRendererHonesty({
    webgpuAvailable: parseBool('webgpu'),
    webgpuAdapterAcquired: parseBool('webgpuAdapterAcquired'),
    webgpuDeviceReady: parseBool('webgpuDeviceReady'),
    claimsWebGpuPresent: parseBool('claimsWebGpuPresent') === true,
    webgl2Available: parseBool('webgl2'),
    desktopWgpuAvailable: parseBool('desktopWgpu'),
    desktopPresentProbe,
    forceWebHeld: parseBool('forceWebHeld'),
    forceDesktopHeld: parseBool('forceDesktopHeld'),
    capabilityScore,
  })

  report.renderTier = gatedProfile.tier
  report.scalableRenderGraphClaim = srg.claim

  log.info('renderer_honesty_api', {
    web: report.web.activePath,
    desktop: report.desktop.activePath,
    marketingAllowed: report.marketingAllowed,
    presentRoot: report.presentRoot?.canonicalPresentId,
    webgpuPresentAllowed: Boolean(report.webgpuPresentClaim?.allowed),
    capabilityScore,
    tier: gatedProfile.tier,
    planAllowed: srg.planAllowed,
    gpuSoakReady: gpuSoak.ready,
    frameParityHarnessExists: frameParity.harnessExists,
    g3Band15To30Passed: frameParity.g3Band15To30Passed,
    gfMesh001Ready: gfMesh001.ready,
    gfMeshPbrReady: gfMeshPbr.ready,
    hizWinReady: hizWin.ready,
    g3Band1530Ready: g3Band1530.ready,
  })

  return NextResponse.json({
    mock: false,
    focus: '2A+3B.1+ci+cw3+xv-capscore+3b2-parity+gf-mesh-001+pbr+hiz-win+g3-critic-15-30',
    report,
    /** CW3 — operator present root mirrored at top level for Studio/IDE chrome. */
    presentRoot: report.presentRoot ?? null,
    scalableRenderGraph: srg,
    gpuDeviceSoak: {
      letter: gpuSoak.letter,
      ready: gpuSoak.ready,
      status: gpuSoak.status,
      evidenceFingerprint: gpuSoak.evidenceFingerprint,
      aaaReady: false,
      marketingAllowed: false,
      reason: gpuSoak.reason,
    },
    /** G.% ladder 15→30 gate #4 — harness exists; optional engine desktop fingerprint ingest. */
    frameParity3b2: {
      letter: frameParity.letter,
      fixtureId: frameParity.fixtureId,
      harnessExists: frameParity.harnessExists,
      ready: frameParity.ready,
      status: frameParity.status,
      evidenceFingerprint: frameParity.evidenceFingerprint,
      frameGraphLive: false,
      g3CodeDepthPercent: frameParity.g3CodeDepthPercent,
      g3Band15To30Passed: false,
      band15To30HeldReason: frameParity.band15To30HeldReason,
      naniteMarketingAllowed: false,
      lumenMarketingAllowed: false,
      webgpuProductPresentReady: false,
      reason: frameParity.reason,
    },
    /** G.% ladder 15→30 Critic checklist — machine-readable; band NOT passed; % bump refused. */
    g3Band15To30Critic: {
      letter: g3Band1530.letter,
      checklistId: g3Band1530.checklistId,
      ready: g3Band1530.ready,
      status: g3Band1530.status,
      passCount: g3Band1530.passCount,
      heldCount: g3Band1530.heldCount,
      failCount: g3Band1530.failCount,
      gates: g3Band1530.gates,
      evidenceFingerprint: g3Band1530.evidenceFingerprint,
      g3CodeDepthPercent: g3Band1530.g3CodeDepthPercent,
      g3Band15To30Passed: false,
      naniteReady: false,
      lumenReady: false,
      progressPercentBump: bumpRefuse,
      reason: g3Band1530.reason,
    },
    /** G.% ladder 30→50 prep — GF-MESH-001 on disk + golden visibility; band HELD. */
    gfMesh001: {
      letter: gfMesh001.letter,
      fixtureId: gfMesh001.fixtureId,
      ready: gfMesh001.ready,
      status: gfMesh001.status,
      fixtureOnDisk: gfMesh001.fixtureOnDisk,
      meshletCount: gfMesh001.meshletCount,
      goldenVisibilityHash: gfMesh001.goldenVisibilityHash,
      evidenceFingerprint: gfMesh001.evidenceFingerprint,
      naniteReady: false,
      openUsdStageReady: false,
      g3CodeDepthPercent: gfMesh001.g3CodeDepthPercent,
      g3Band30To50Passed: false,
      band30To50HeldReason: gfMesh001.band30To50HeldReason,
      reason: gfMesh001.reason,
    },
    /** G.% ladder 30→50 — golden PBR maps (refuse ID-color-only). */
    gfMesh001Pbr: {
      letter: gfMeshPbr.letter,
      fixtureId: gfMeshPbr.fixtureId,
      ready: gfMeshPbr.ready,
      status: gfMeshPbr.status,
      evidenceFingerprint: gfMeshPbr.evidenceFingerprint,
      goldenPbrFingerprint: gfMeshPbr.goldenPbrFingerprint,
      idColorOnly: false,
      naniteReady: false,
      lumenReady: false,
      g3CodeDepthPercent: gfMeshPbr.g3CodeDepthPercent,
      g3Band30To50Passed: false,
      reason: gfMeshPbr.reason,
    },
    /** G.% ladder 30→50 — Hi-Z occlusion win measurement harness. */
    hizOcclusionWin: {
      letter: hizWin.letter,
      fixtureId: hizWin.fixtureId,
      ready: hizWin.ready,
      status: hizWin.status,
      evidenceFingerprint: hizWin.evidenceFingerprint,
      occlusionWinRatio: hizWin.occlusionWinRatio,
      meetsBandThreshold: hizWin.meetsBandThreshold,
      hizReady: false,
      naniteReady: false,
      g3CodeDepthPercent: hizWin.g3CodeDepthPercent,
      g3Band30To50Passed: false,
      reason: hizWin.reason,
    },
    fsrSrg: {
      letter: 'ci',
      fsrExecutorLive: srg.fsrExecutorLive,
      executableNodeCount: srg.executableNodeCount,
      frameGraphLive: false,
      dlssNativeWebAllowed: false,
      planAllowed: srg.planAllowed,
      g3CodeDepthPercent: srg.g3CodeDepthPercent,
      scalableRenderGraphAaaReady: false,
    },
  })
}
