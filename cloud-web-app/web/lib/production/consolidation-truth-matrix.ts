/**
 * CW1 — Product truth matrix (executable, not cartório).
 * Imports live honesty probes and exports machine-readable claim × status rows.
 * Marketing stays fail-closed for HELD AAA names.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { evaluateHubHonesty } from '@/lib/hub/hub-honesty-capability'
import { probeKernelRustFoundationHonesty } from '@/lib/kernel/kernel-rust-foundation-honesty'
import {
  evaluateEvidenceReceiptCompleteness,
  evaluateNexusTaskGraphCompleteness,
} from '@/lib/production/agents-receipt-completeness'
import {
  CW4_EXCEPTION_COUNT_AFTER,
  CW4_EXCEPTION_ONLY_STATUS,
  CW4_LEGACY_MIRROR_STATUS,
  CW4_LWW_STATUS,
  CW4_OVERALL_STATUS,
  listCw4CriticalPathBlockers,
  listCw4OpenExceptionAllowlist,
} from '@/lib/storage/ui-persistence-critical-inventory'
import {
  RENDER_PATH_CATALOG,
  resolveLiveRenderPathHonesty,
  type LiveRenderPathInput,
} from '@/lib/production/render-path-honesty'
import {
  evaluateRendererHonesty,
  type RendererHonestyInput,
} from '@/lib/production/renderer-honesty-capability'
import {
  buildMasterUxHeroPanelBench,
  formatMasterUxHeroBenchEvidence,
} from '@/lib/production/master-ux-hero-panel-bench'
import { describeForgeSandboxHonestySync } from '@/lib/production/forge-sandbox-honesty'
import { probeDiskAusterityHonesty } from '@/lib/production/disk-austerity-honesty'
import { probeKernelLoadScaleHonesty } from '@/lib/production/kernel-load-scale-honesty'
import { describeQuantFinanceHonestySync } from '@/lib/production/quant-finance-honesty'
import {
  SWARM_MAX_HEAL_ROUNDS,
  SWARM_MAX_PARALLEL_CELLS,
} from '@/lib/production/multi-file-apply-swarm'

const log = createComponentLogger('consolidation-truth-matrix')

export type ConsolidationTruthStatus =
  | 'IMPLEMENTED'
  | 'PARTIAL'
  | 'HELD'
  | 'NOT_IMPLEMENTED'

export type ConsolidationTruthRow = {
  id: string
  claim: string
  path: string
  status: ConsolidationTruthStatus
  marketingAllowed: boolean
  lastEvidence: string
  gatedNames: string[]
  /** Fail-closed gate id when marketing is blocked by law / Founder STOP. */
  heldReason?: string
  /** Operator-facing honesty note (not marketing copy). */
  note?: string
}

export type ConsolidationTruthMatrix = {
  generatedAt: string
  wave: 'CW1'
  marketingAaaAllowed: false
  rows: ConsolidationTruthRow[]
  summary: {
    implemented: number
    partial: number
    held: number
    notImplemented: number
    marketingBlockedRows: number
  }
}

export type ConsolidationTruthInput = {
  renderer?: RendererHonestyInput
  renderPath?: LiveRenderPathInput
  hub?: Parameters<typeof evaluateHubHonesty>[0]
}

const AAA_GATED = [
  'Nanite',
  'Lumen',
  'Ray Tracing',
  'Path Tracing',
  'Coins',
  'Agones',
  'Chaos',
  'MetaHuman',
  'Niagara AAA',
] as const

/** Gates that block supremacy / AI-native marketing per CLAUDE.md + .cursorrules. */
const SUPREMACY_MARKETING_GATES = [
  'AI-native IDE',
  'J.11 ACP',
  'J.12 OrchestratorProd',
  'Cursor Composer surpass',
  'VisualEvidence',
  'VisualEvidence WebM',
  'parity exceeded',
] as const

/** Row ids that must never flip marketing true from static defaults alone. */
const FAIL_CLOSED_MARKETING_ROW_IDS = new Set<string>([
  'agents.receipt.completeness',
  'agents.nexus.task-graph',
  'ui.persistence.spine',
  'master-ux.hero-panels',
])

function rowTouchesSupremacyMarketingGate(gatedNames: readonly string[]): boolean {
  return gatedNames.some((name) =>
    SUPREMACY_MARKETING_GATES.some(
      (gate) => name === gate || name.includes(gate) || gate.includes(name),
    ),
  )
}

/** Apply fail-closed marketing gates — root cause guard after row assembly. */
export function applyConsolidationMarketingFailClosed(rows: ConsolidationTruthRow[]): void {
  for (const row of rows) {
    if (row.status !== 'IMPLEMENTED') {
      row.marketingAllowed = false
    }
    if (row.heldReason) {
      row.marketingAllowed = false
    }
    if (FAIL_CLOSED_MARKETING_ROW_IDS.has(row.id)) {
      row.marketingAllowed = false
    }
    if (row.gatedNames.some((name) => AAA_GATED.includes(name as (typeof AAA_GATED)[number]))) {
      row.marketingAllowed = false
    }
    if (rowTouchesSupremacyMarketingGate(row.gatedNames)) {
      row.marketingAllowed = false
    }
  }
}

function mapRendererStatus(
  status: 'live' | 'held' | 'fallback',
  capability: 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED',
): ConsolidationTruthStatus {
  if (status === 'held' || capability === 'NOT_IMPLEMENTED') return 'HELD'
  if (capability === 'PARTIAL' || status === 'fallback') return 'PARTIAL'
  return 'IMPLEMENTED'
}

/**
 * Build the live consolidation truth matrix from probe contracts.
 * Never invents green AAA marketing from PARTIAL/HELD probes.
 */
export function buildConsolidationTruthMatrix(
  input: ConsolidationTruthInput = {},
): ConsolidationTruthMatrix {
  const renderer = evaluateRendererHonesty(input.renderer ?? {})
  const livePath = resolveLiveRenderPathHonesty(input.renderPath ?? {
    webgpuAvailable: input.renderer?.webgpuAvailable,
    webgl2Available: input.renderer?.webgl2Available,
    desktopWgpuMounted: input.renderer?.desktopWgpuAvailable,
    forceHeld: input.renderer?.forceWebHeld,
  })
  const hub = evaluateHubHonesty(input.hub ?? {})
  const kernel = probeKernelRustFoundationHonesty()
  const emptyReceipt = evaluateEvidenceReceiptCompleteness(null)
  const emptyNexus = evaluateNexusTaskGraphCompleteness(null)
  const cw4CriticalBlockers = listCw4CriticalPathBlockers()
  const cw4LwwDone = CW4_LWW_STATUS === 'DONE'
  const cw4ExceptionAllowlist = listCw4OpenExceptionAllowlist()
  const cw4SpineStatus: ConsolidationTruthStatus =
    cw4CriticalBlockers.length > 0 || CW4_OVERALL_STATUS !== 'DONE'
      ? 'PARTIAL'
      : 'IMPLEMENTED'
  const forgeSandbox = describeForgeSandboxHonestySync()
  const cw7 = probeDiskAusterityHonesty()
  const cw2 = probeKernelLoadScaleHonesty()
  const quantFinance = describeQuantFinanceHonestySync()

  const rows: ConsolidationTruthRow[] = [
    {
      id: 'renderer.web.present',
      claim: renderer.claim,
      path: 'lib/production/renderer-honesty-capability.ts',
      status: mapRendererStatus(renderer.web.status, renderer.web.capabilityStatus),
      marketingAllowed: false,
      lastEvidence: `${renderer.web.activePath}:${renderer.web.status}:${renderer.web.pathClass ?? 'n/a'}`,
      gatedNames: [...renderer.gatedMarketingNames],
    },
    {
      id: 'renderer.desktop.present',
      claim: renderer.desktop.notes.join(' ') || 'Desktop wgpu present loop',
      path: 'lib/production/renderer-honesty-capability.ts',
      status: mapRendererStatus(renderer.desktop.status, renderer.desktop.capabilityStatus),
      marketingAllowed: false,
      lastEvidence: `${renderer.desktop.activePath}:${renderer.desktop.status}`,
      gatedNames: ['desktop AAA present', 'Nanite', 'DLSS'],
    },
    {
      id: 'render.path.live',
      claim: livePath.claim,
      path: 'lib/production/render-path-honesty.ts',
      status:
        livePath.classification === 'held'
          ? 'HELD'
          : livePath.classification === 'canonical' && livePath.presentsFrames
            ? 'PARTIAL'
            : 'HELD',
      marketingAllowed: false,
      lastEvidence: `${livePath.livePathId}|apiGpu=${livePath.webgpuAdapterAvailable}|adapterAcquired=${livePath.webgpuAdapterAcquired}|webgl2=${livePath.webgl2Available}`,
      gatedNames: [...AAA_GATED],
    },
    {
      id: 'render.path.catalog',
      claim: `Catalog ${RENDER_PATH_CATALOG.length} paths — canonical vs experimental vs condemned`,
      path: 'lib/production/render-path-honesty.ts',
      status: RENDER_PATH_CATALOG.some((e) => e.classification === 'canonical')
        ? 'PARTIAL'
        : 'HELD',
      marketingAllowed: false,
      lastEvidence: RENDER_PATH_CATALOG.map((e) => `${e.id}:${e.classification}`).join(','),
      gatedNames: ['dual renderer', 'WebGPU present'],
    },
    {
      id: 'render.path.present-root',
      claim: livePath.presentRoot.operatorSummary,
      path: 'lib/production/render-path-honesty.ts',
      status: 'PARTIAL',
      marketingAllowed: false,
      lastEvidence: `${livePath.presentRoot.version}|${livePath.presentRoot.canonicalPresentId}|webgpu=${livePath.presentRoot.webgpuRole}|desktop=${livePath.presentRoot.desktopWgpuRole}|condemned=${livePath.presentRoot.condemnedPathIds.join('+')}`,
      gatedNames: ['Nanite', 'Lumen', 'WebGPU present', 'UE single pipeline'],
    },
    {
      id: 'render.parity.3b2',
      claim:
        '3B.2 screenshot/hash parity harness EXISTS (GF-PARITY-3B2-001) — optional engine desktop fingerprint ingest; frameGraphLive HELD; G.3% locked 15; band 15→30 HELD pending PP-01/03',
      path: 'lib/production/frame-parity-harness-3b2.ts',
      status: 'PARTIAL',
      marketingAllowed: false,
      lastEvidence: 'harnessExists=true|g3Band15To30Passed=false|frameGraphLive=false|fixture=GF-PARITY-3B2-001|engineIngest=optional',
      gatedNames: ['Nanite', 'Lumen', 'frameGraphLive', 'WebGPU present', 'G.3% uplift'],
    },
    {
      id: 'render.g3-band-15-30-critic',
      claim:
        'Critic 15→30 checklist machine-readable (PP-03/session/60s/3B.2/CapScore) — g3Band15To30Passed=false; Progress % bump refused; G.3% locked 15',
      path: 'lib/production/g3-band-15-to-30-critic-checklist.ts',
      status: 'PARTIAL',
      marketingAllowed: false,
      lastEvidence: 'checklist=G3-BAND-15-30-CHECKLIST|g3Band15To30Passed=false|bumpAllowed=false',
      gatedNames: ['Nanite', 'Lumen', 'G.3% uplift', '15→30 band pass'],
    },
    {
      id: 'render.gf-mesh-001',
      claim:
        'GF-MESH-001 dogfood mesh on disk + golden visibility hash — Nanite/OpenUSD false; band 30→50 HELD; G.3% locked 15',
      path: 'lib/production/gf-mesh-001-visibility-fixture.ts',
      status: 'PARTIAL',
      marketingAllowed: false,
      lastEvidence: 'fixture=GF-MESH-001|onDisk=true|naniteReady=false|g3Band30To50Passed=false',
      gatedNames: ['Nanite', 'Lumen', 'OpenUSD', 'G.3% uplift', 'capsule character'],
    },
    {
      id: 'render.gf-mesh-001-pbr',
      claim:
        'GF-MESH-001-PBR golden albedo/rough/metal/normal — ID-color-only refused; Nanite/Lumen false; band 30→50 HELD',
      path: 'lib/production/gf-mesh-001-material-pbr-fixture.ts',
      status: 'PARTIAL',
      marketingAllowed: false,
      lastEvidence: 'fixture=GF-MESH-001-PBR|idColorOnly=false|naniteReady=false',
      gatedNames: ['Nanite', 'Lumen', 'ID-color materials', 'G.3% uplift'],
    },
    {
      id: 'render.hiz-occlusion-win',
      claim:
        'Hi-Z occlusion win harness measures frustum vs Hi-Z draw reduction — hiz_ready false; band 30→50 HELD; G.3% locked 15',
      path: 'lib/production/hiz-occlusion-win-harness.ts',
      status: 'PARTIAL',
      marketingAllowed: false,
      lastEvidence: 'fixture=GF-HIZ-WIN-001|hizReady=false|g3Band30To50Passed=false',
      gatedNames: ['Nanite', 'hiz_ready', 'G.3% uplift'],
    },
    {
      id: 'hub.rtv1',
      claim: hub.claim,
      path: 'lib/hub/hub-honesty-capability.ts',
      status:
        hub.taxonomy.status === 'IMPLEMENTED' && hub.showcase.status === 'IMPLEMENTED'
          ? 'PARTIAL'
          : hub.taxonomy.status === 'HELD'
            ? 'HELD'
            : 'PARTIAL',
      marketingAllowed: false,
      lastEvidence: `discovery=${hub.discovery.status};checkout=${hub.hubCheckout.status};coins=${hub.marketingCoinsAllowed}`,
      gatedNames: ['Coins', 'verified reviews', 'cross-play', 'discovery 2k'],
    },
    {
      id: 'kernel.rust.foundation',
      claim: `Kernel Rust foundation ${kernel.stamp} (ready=${kernel.kernelRustFoundationReady})`,
      path: 'lib/kernel/kernel-rust-foundation-honesty.ts',
      status: kernel.kernelRustFoundationReady ? 'IMPLEMENTED' : 'HELD',
      marketingAllowed: false,
      lastEvidence: `wire=${kernel.kernelRustFoundationWebWireReady};source=${kernel.evidenceSource};stamp=${kernel.stamp}`,
      gatedNames: ['Chaos', 'Nanite', 'Coins', 'Agones', 'DLSS'],
    },
    {
      id: 'agents.receipt.completeness',
      claim:
        'Agents receipt completeness — apply-deny wired; VisualEvidence WebM [HELD per J.9]',
      path: 'lib/production/agents-receipt-completeness.ts',
      status:
        emptyReceipt.heldCount > 0 || !emptyReceipt.complete ? 'PARTIAL' : 'PARTIAL',
      marketingAllowed: emptyReceipt.marketingAllowed,
      heldReason: 'j9_visual_evidence_webm_held',
      note: 'Patch-hash receipt only — WebM visual diff not shipped (J.9 HELD)',
      lastEvidence: `emptyFailClosed=${!emptyReceipt.complete};held=${emptyReceipt.heldCount};j9WebM=HELD;marketing=false`,
      gatedNames: ['AI-native IDE', 'VisualEvidence WebM'],
    },
    {
      id: 'agents.nexus.task-graph',
      claim:
        'Nexus task-graph + governed apply receipts — J.11/J.12 [STOPPED Founder Pacto 2026-07-11ak]',
      path: 'lib/production/multi-file-apply-swarm.ts',
      status: 'PARTIAL',
      marketingAllowed: emptyNexus.marketingAllowed,
      heldReason: 'j11_j12_founder_stop',
      note: `AI-native IDE marketing blocked until J.1+J.2+J.12 or Founder lifts STOP; swarm cap=${SWARM_MAX_PARALLEL_CELLS} cells, heal≤${SWARM_MAX_HEAL_ROUNDS}`,
      lastEvidence: `emptyFailClosed=${!emptyNexus.complete};j11j12=STOPPED;composerSurpass=HELD;swarmMax=${SWARM_MAX_PARALLEL_CELLS};healMax=${SWARM_MAX_HEAL_ROUNDS};marketing=false`,
      gatedNames: ['J.11 ACP', 'J.12 OrchestratorProd', 'Cursor Composer surpass', 'AI-native IDE'],
    },
    {
      id: 'forge.sandbox.providers',
      claim:
        'Forge sandbox providers — local-isolated DONE; e2b env-gated; Firecracker microVM HELD',
      path: 'lib/production/forge-sandbox-honesty.ts',
      status: forgeSandbox.localIsolatedReady ? 'PARTIAL' : 'HELD',
      marketingAllowed: false,
      heldReason: 'firecracker_not_implemented',
      note: 'No Firecracker/KVM host binary in repo; runtime-provision uses e2b/custom-endpoint only.',
      lastEvidence: `localIsolated=${forgeSandbox.localIsolatedReady};firecracker=${forgeSandbox.firecrackerMicroVmReady};runtimeProvisionFc=${forgeSandbox.runtimeProvisionFirecrackerSupported}`,
      gatedNames: ['Firecracker', 'KVM microVM', 'AI-native IDE'],
    },
    {
      id: 'kernel.load-scale.cw2',
      claim: `CW2 kernel load-scale micro-soaks N≥${cw2.minPeerN} — Chaos/Unreal AAA HELD`,
      path: 'lib/production/kernel-load-scale-honesty.ts',
      status: 'PARTIAL',
      marketingAllowed: false,
      heldReason: cw2.heldReason,
      note: `Peers: ${cw2.peers.map((p) => `${p.id}@${p.soakN}`).join(', ')}; GPU memory matrix OPEN.`,
      lastEvidence: `minN=${cw2.minPeerN};wallSec=${cw2.wallBudgetSec};chaosAaa=${cw2.chaosDestructionAaaReady};gpuMatrix=${cw2.gpuMemoryMatrixReady};webChaosOk=${cw2.webChaosEvidenceOk};webChaosFp=${cw2.webChaosEvidenceFingerprint ?? 'none'}`,
      gatedNames: ['Chaos', 'DualSPHysics', 'Unreal Mass', 'Nanite'],
    },
    {
      id: 'disk.austerity.cw7',
      claim: 'CW7 disk austerity — single-target CI gate + orphan gate + weight gate; prune/CAS real (manual ops)',
      path: 'lib/production/disk-austerity-honesty.ts',
      status: 'IMPLEMENTED',
      marketingAllowed: false,
      heldReason: cw7.heldReason,
      note: cw7.notes[2],
      lastEvidence: `status=${cw7.overallStatus};cargoTargetDir=${cw7.cargoTargetDirEnv ?? 'unset'};example=${cw7.artifacts.some((a) => a.id === 'studio-local-cargo-example' && a.exists)};orphanPruneScript=${cw7.orphanPruneScriptPresent};cargoTargetCheckScript=${cw7.cargoTargetCheckScriptPresent};orphanPrune=${cw7.orphanPruneEnforced};casCook=${cw7.casCookEnforced};ciSingle=${cw7.ciSingleTargetEnforced}`,
      gatedNames: ['CAS cook', 'orphan prune'],
    },
    {
      id: 'quant.finance.onda-n',
      claim:
        'Onda N Vanguard Quant — N1–N3 P0 cores PARTIAL; investment-grade HELD (no broker/L2/Rust risk)',
      path: 'lib/server/quant/',
      status: 'PARTIAL',
      marketingAllowed: false,
      heldReason: quantFinance.heldReason,
      note: `vanguardQuantReady=${quantFinance.vanguardQuantReady}; ondaNCores=${quantFinance.ondaNCores.filter((c) => c.ready).length}/${quantFinance.ondaNCores.length}; investmentGrade=${quantFinance.investmentGrade}; legacy cli PaperExchange dead code.`,
      lastEvidence: `letter=${quantFinance.letter};stamp=${quantFinance.stamp};held=${quantFinance.heldReason}`,
      gatedNames: ['Vanguard Quant', 'HFT', 'Wall Street', 'investment-grade'],
    },
    {
      id: 'ui.persistence.spine',
      claim:
        'CW4 UI persistence spine — LWW WebLocks + exception-only allowlist + expired one-way legacy mirror',
      path: 'lib/storage/ui-persistence-critical-inventory.ts',
      status: cw4SpineStatus,
      marketingAllowed: false,
      heldReason: 'cw4_secret_domain_allowlist',
      note: `Critical path + LWW + chrome migrate DONE; legacy mirror expired; remaining raw localStorage = ${CW4_EXCEPTION_COUNT_AFTER.secret} secrets + ${CW4_EXCEPTION_COUNT_AFTER.domain} domain (intentional). CW1 15-panel bench is CW1 scope.`,
      lastEvidence: `criticalPath=DONE;blockers=${cw4CriticalBlockers.length};lockLWW=${cw4LwwDone ? 'DONE' : 'HELD'};legacyMirror=${CW4_LEGACY_MIRROR_STATUS};exceptionOnly=${CW4_EXCEPTION_ONLY_STATUS};allowlist=${cw4ExceptionAllowlist.length};openChromeDebt=${CW4_EXCEPTION_COUNT_AFTER.openChromeDebt}`,
      gatedNames: ['BYOK', 'token vault'],
    },
    {
      id: 'world.foliage.brush',
      claim: 'Foliage brush falloff placement — in-memory InstancedMesh; landscape/HISM ship HELD',
      path: 'lib/environment/foliage-brush-placement.ts',
      status: 'PARTIAL',
      marketingAllowed: false,
      lastEvidence: 'falloff→sampleBrushStrokeOffset;not landscape authority',
      gatedNames: ['Nanite', 'HISM', 'UE landscape'],
    },
    {
      id: 'film.director.sequencer',
      claim: 'DirectorMode → SequencerIdePanel + J.9 cinematic VisualEvidence previz; final footage / GPU soak HELD',
      path: 'components/nexus/DirectorMode.tsx',
      status: 'PARTIAL',
      marketingAllowed: false,
      lastEvidence: 'play-end→cinematic-visual-evidence;engine_sequencer;veoDemoted;finalFootage=HELD',
      gatedNames: ['final offline render', 'Lumen', 'Veo default'],
    },
    (() => {
      const heroBench = buildMasterUxHeroPanelBench()
      return {
        id: 'master-ux.hero-panels',
        claim:
          'Master UX Spec 15-slot hero bench CLOSED — real surfaces only; product depth PARTIAL (not 15/15 ship)',
        path: 'lib/production/master-ux-hero-panel-bench.ts',
        status: 'PARTIAL' as ConsolidationTruthStatus,
        marketingAllowed: false,
        heldReason: heroBench.heldReason,
        note: `Bench columns CLOSED (${heroBench.specSlotCount}/${heroBench.specSlotCount}); dockRegistered=${heroBench.summary.dockRegistered}; mockHeroPresent=${heroBench.summary.mockHeroFilesPresent}; CW0 freeze — no Spec-named hero invent.`,
        lastEvidence: formatMasterUxHeroBenchEvidence(heroBench),
        gatedNames: [...AAA_GATED, 'parity exceeded'],
      }
    })(),
  ]

  applyConsolidationMarketingFailClosed(rows)

  const summary = {
    implemented: rows.filter((r) => r.status === 'IMPLEMENTED').length,
    partial: rows.filter((r) => r.status === 'PARTIAL').length,
    held: rows.filter((r) => r.status === 'HELD').length,
    notImplemented: rows.filter((r) => r.status === 'NOT_IMPLEMENTED').length,
    marketingBlockedRows: rows.filter((r) => !r.marketingAllowed).length,
  }

  log.info('consolidation_truth_matrix_built', {
    rows: rows.length,
    held: summary.held,
    partial: summary.partial,
  })

  return {
    generatedAt: new Date().toISOString(),
    wave: 'CW1',
    marketingAaaAllowed: false,
    rows,
    summary,
  }
}

/** Fail-closed: never allow marketing for named AAA claims from the matrix alone. */
export function isConsolidationMarketingAllowedForClaim(claimName: string): false {
  void claimName
  return false
}
