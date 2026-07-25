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
  RENDER_PATH_CATALOG,
  resolveLiveRenderPathHonesty,
  type LiveRenderPathInput,
} from '@/lib/production/render-path-honesty'
import {
  evaluateRendererHonesty,
  type RendererHonestyInput,
} from '@/lib/production/renderer-honesty-capability'

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
        'Agents receipt completeness — held fields (VisualEvidence WebM) block complete; apply-deny wired',
      path: 'lib/production/agents-receipt-completeness.ts',
      status: 'PARTIAL',
      marketingAllowed: false,
      lastEvidence: `emptyFailClosed=${!emptyReceipt.complete};marketing=${emptyReceipt.marketingAllowed}`,
      gatedNames: ['AI-native IDE', 'VisualEvidence WebM'],
    },
    {
      id: 'agents.nexus.task-graph',
      claim:
        'Nexus task-graph + governed apply receipts + AST/L.5 multi-file swarm — full Composer editor HELD; J.11/J.12 STOPPED',
      path: 'lib/production/multi-file-apply-swarm.ts',
      status: 'PARTIAL',
      marketingAllowed: false,
      lastEvidence: `emptyFailClosed=${!emptyNexus.complete};swarm=runMultiFileApplySwarm;astEngine=typescript-parser;treeSitterWeb=false;composerSurpass=false;j11j12=STOPPED`,
      gatedNames: ['J.11 ACP', 'J.12 OrchestratorProd', 'Cursor Composer surpass'],
    },
    {
      id: 'ui.persistence.spine',
      claim:
        'CW4 critical IDE/Studio path on spine (preview + dock adapter) — dual-write debt blocks DONE; global exception-only + multi-tab LWW HELD',
      path: 'lib/storage/ui-persistence-critical-inventory.ts',
      status: 'PARTIAL',
      marketingAllowed: false,
      lastEvidence: 'criticalPath=PARTIAL;legacyDualWrite;cross-tab-lite;lockLWW=HELD',
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
      claim: 'DirectorMode → SequencerIdePanel intent wire; final footage / GPU soak HELD',
      path: 'components/nexus/DirectorMode.tsx',
      status: 'PARTIAL',
      marketingAllowed: false,
      lastEvidence: 'intent prop → planCinematicDirectorShoot;finalFootage=HELD',
      gatedNames: ['final offline render', 'Lumen'],
    },
    {
      id: 'master-ux.hero-panels',
      claim: 'Master UX Spec §0 hero *Panel.tsx names are vision — not ship certificate',
      path: 'docs/architecture/AETHEL_MASTER_STUDIO_UX_UI_SPECIFICATION.md',
      status: 'HELD',
      marketingAllowed: false,
      lastEvidence: 'CW0 freeze — deepen existing shells; no new hero panels; 15-panel ship matrix incomplete',
      gatedNames: [...AAA_GATED, 'parity exceeded'],
    },
  ]

  // Hard gate: any AAA gated name on a non-IMPLEMENTED row blocks marketing.
  for (const row of rows) {
    if (row.status !== 'IMPLEMENTED') {
      row.marketingAllowed = false
    }
    if (row.gatedNames.some((name) => AAA_GATED.includes(name as (typeof AAA_GATED)[number]))) {
      row.marketingAllowed = false
    }
  }

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
