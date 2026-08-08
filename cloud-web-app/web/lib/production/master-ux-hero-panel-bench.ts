/**
 * CW1 — Master UX Spec 15-slot hero panel bench (executable, not cartório).
 *
 * Acceptance: every Spec §0 slot has claim × path × status × bench × marketing.
 * Does **not** invent `ViewportStudioPanel.tsx`-style hero files (CW0 freeze).
 * Registers only real ship surfaces already wired into Studio/IDE docks.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { createComponentLogger } from '@/lib/observability/logger'
import { STUDIO_TOOLS } from '@/lib/studio/studio-registry'
import { WORKBENCH_REGION_REGISTRY } from '@aethel/ide-ui/modern-shell/types'

const log = createComponentLogger('master-ux-hero-panel-bench')

export const MASTER_UX_HERO_PANEL_SPEC_COUNT = 15 as const
export const CW1_HERO_BENCH_VERSION = 'cw1-hero-bench-v1' as const

export type MasterUxHeroPanelStatus = 'PARTIAL' | 'HELD' | 'NOT_IMPLEMENTED'

export type MasterUxHeroPanelRow = {
  /** Stable slot id (1–15 Spec §2 order). */
  id: string
  /** Spec hero filename (vision name — must not be invented as ship UI). */
  specFile: string
  claim: string
  /** Real ship surface path(s), or null when no honest UI surface exists. */
  shipSurfacePath: string | null
  status: MasterUxHeroPanelStatus
  /** Dock / workbench / studio-tool registration of the real surface. */
  dockRegistered: boolean
  dockIds: readonly string[]
  marketingAllowed: false
  /** Bench column filled for this slot. */
  bench: 'CLOSED'
  note: string
}

export type MasterUxHeroPanelBench = {
  version: typeof CW1_HERO_BENCH_VERSION
  generatedAt: string
  specSlotCount: typeof MASTER_UX_HERO_PANEL_SPEC_COUNT
  /** True when all 15 slots have claim/path/status/bench/marketing filled. */
  benchColumnsClosed: true
  /** Product depth — never full ship until real heroes exist; honest PARTIAL. */
  productStatus: 'PARTIAL'
  marketingAaaAllowed: false
  rows: MasterUxHeroPanelRow[]
  summary: {
    realSurfaces: number
    missingOrHeldHero: number
    partial: number
    held: number
    notImplemented: number
    dockRegistered: number
    mockHeroFilesPresent: number
    marketingBlockedRows: number
  }
  forbiddenMockHeroRelPaths: readonly string[]
  workbenchDockDefaults: {
    creativeSlots: readonly string[]
    ideRegions: readonly string[]
    studioToolCount: number
  }
  heldReason: 'cw1_hero_panel_product_depth'
}

/** CreativeWorkbenchShell prop slots that accept real panel nodes. */
export const CREATIVE_WORKBENCH_DOCK_SLOTS = [
  'viewport',
  'outliner',
  'inspector',
  'timeline',
  'assetBrowser',
  'renderQueue',
] as const

/**
 * Spec §0 / §2 fifteen acceptance slots → real surfaces only.
 * `specFile` names are vision labels; ship paths point at existing modules.
 */
const HERO_PANEL_SLOT_DEFS: readonly Omit<
  MasterUxHeroPanelRow,
  'bench' | 'marketingAllowed' | 'dockRegistered'
>[] = [
  {
    id: 'ux.viewport',
    specFile: 'ViewportStudioPanel.tsx',
    claim: '3D viewport / radiance field studio — R3F SceneViewport + honesty badges',
    shipSurfacePath:
      'components/preview/SceneViewportSurface.tsx + packages/ide-ui ModernIDEShell preview',
    status: 'PARTIAL',
    dockIds: ['viewport', 'preview'],
    note: 'Spec hero file absent (CW0). Live: SceneViewportSurface + RendererHonestyBadge; Nanite/Lumen/3DGS HELD.',
  },
  {
    id: 'ux.ai-triumvirate',
    specFile: 'AiTriumviratePanel.tsx',
    claim: 'AI Triumvirate / Agents Nexus — AIChatPanelPro + AgentFleet (not Spec hero file)',
    shipSurfacePath:
      'packages/ide-ui/AIChatPanelPro + components/agents/window/AgentFleetPanel.tsx',
    status: 'PARTIAL',
    dockIds: ['chat'],
    note: 'MoA/Nexus live; J.11/J.12 STOPPED — no AI-native IDE marketing.',
  },
  {
    id: 'ux.node-editor',
    specFile: 'NodeEditorPanel.tsx',
    claim: 'Node / Visual Script editor — BlueprintEditor + VisualScriptEditor',
    shipSurfacePath:
      'components/engine/BlueprintEditor.tsx + packages/visual-scripting/VisualScriptEditor.tsx',
    status: 'PARTIAL',
    dockIds: ['node_editor', 'preview'],
    note: 'ReactFlow editors real; WGSL bake soak / 500+ nodes claim HELD.',
  },
  {
    id: 'ux.cinematic-timeline',
    specFile: 'CinematicTimelinePanel.tsx',
    claim: 'Cinematic timeline — Timeline3D + SequencerIdePanel (ITimelineService)',
    shipSurfacePath:
      'packages/ide-ui/Timeline3D.tsx + components/sequencer/SequencerIdePanel.tsx',
    status: 'PARTIAL',
    dockIds: ['timeline', 'sequencer'],
    note: 'Authoring + scrub/material/event cue PARTIAL; UE Sequencer parity HELD.',
  },
  {
    id: 'ux.asset-browser',
    specFile: 'AssetBrowserPanel.tsx',
    claim: 'Asset browser — Studio AssetBrowserPanel wired into CreativeWorkbenchShell',
    shipSurfacePath: 'components/studio/AssetBrowserPanel.tsx',
    status: 'PARTIAL',
    dockIds: ['assetBrowser'],
    note: 'Real workbench grid; not Master-UX “99% seed disk” hero claim.',
  },
  {
    id: 'ux.muscular-rig',
    specFile: 'MuscularRigPanel.tsx',
    claim: 'Muscular / control rig — ControlRigEditor studio tool (no Spec hero panel)',
    shipSurfacePath: 'components/character/ControlRigEditor.tsx',
    status: 'PARTIAL',
    dockIds: ['rig'],
    note: 'Law III web apply path; Euphoria muscle sim AAA HELD. Spec hero MISSING.',
  },
  {
    id: 'ux.audio-hrtf',
    specFile: 'AudioHrtfPanel.tsx',
    claim: 'Audio / HRTF — SoundCueEditor studio tool (MetaSounds CORE; HRTF AAA HELD)',
    shipSurfacePath: 'components/audio/SoundCueEditor.tsx',
    status: 'PARTIAL',
    dockIds: ['audio'],
    note: 'Spec hero MISSING; no telepathic-terminal / HRTF AAA marketing.',
  },
  {
    id: 'ux.terminal-console',
    specFile: 'TerminalConsolePanel.tsx',
    claim: 'Terminal console — MultiTerminalPanel + Forge sandbox PTY (host PTY HELD for agents)',
    shipSurfacePath: 'components/terminal/MultiTerminalPanel.tsx',
    status: 'PARTIAL',
    dockIds: ['terminal'],
    note: 'IDE region terminal registered; L.4 sandbox PTY first-light; E2B remote HELD.',
  },
  {
    id: 'ux.hardware-profiler',
    specFile: 'HardwareProfilerPanel.tsx',
    claim: 'Hardware profiler — ResourceMonitorHUD + CapScore / renderer honesty (no Spec hero)',
    shipSurfacePath:
      'components/agents/chat/ResourceMonitorHUD.tsx + components/preview/RendererHonestyBadge.tsx',
    status: 'PARTIAL',
    dockIds: ['chat', 'preview'],
    note: 'Name collision only with Spec; Unreal Insights exceeded HELD.',
  },
  {
    id: 'ux.world-partition',
    specFile: 'WorldPartitionPanel.tsx',
    claim: 'World Partition studio panel — streaming kernel PARTIAL; Spec hero UI absent',
    shipSurfacePath: 'lib/world-streaming/partition-streaming.ts',
    status: 'HELD',
    dockIds: [],
    note: 'partitionStreamingReady math exists; no Studio dock panel. UE zero-loading HELD.',
  },
  {
    id: 'ux.multiplayer-netcode',
    specFile: 'MultiplayerNetcodePanel.tsx',
    claim: 'Multiplayer / netcode studio panel — honesty adapters only; Spec hero absent',
    shipSurfacePath: 'lib/production/multiplayer-honesty-capability.ts',
    status: 'HELD',
    dockIds: [],
    note: 'Rollback soak PARTIAL in libs; GGPO/Agones + Spec hero UI HELD.',
  },
  {
    id: 'ux.global-settings',
    specFile: 'GlobalSettingsPanel.tsx',
    claim: 'Global settings — app/settings + BYOK/billing (CostGuard via Bridge only)',
    shipSurfacePath: 'app/settings/page.tsx',
    status: 'PARTIAL',
    dockIds: [],
    note: 'Settings surface real; Spec hero file absent. CostGuard claims via Bridge only.',
  },
  {
    id: 'ux.voronoi-destruction',
    specFile: 'VoronoiDestructionPanel.tsx',
    claim: 'Voronoi destruction studio panel — kernel math PARTIAL; Spec hero UI absent',
    shipSurfacePath: 'lib/destruction/destruction-honesty.ts',
    status: 'HELD',
    dockIds: [],
    note: 'No Chaos-exceeded UI. Do not invent VoronoiDestructionPanel.tsx.',
  },
  {
    id: 'ux.facial-blendshape',
    specFile: 'FacialBlendshapePanel.tsx',
    claim: 'Facial blendshape studio — FacialAnimationEditor ALPHA; MetaHuman parity HELD',
    shipSurfacePath: 'components/character/FacialAnimationEditor.tsx',
    status: 'PARTIAL',
    dockIds: ['facial'],
    note: 'Studio tool registered; Spec hero MISSING. No MetaHuman exceeded marketing.',
  },
  {
    id: 'ux.niagara-vfx',
    specFile: 'NiagaraVfxGraphPanel.tsx',
    claim: 'Niagara VFX graph — packages/engine/NiagaraVFX.runtime.tsx (real editor)',
    shipSurfacePath:
      'packages/engine/NiagaraVFX.runtime.tsx + components/engine/NiagaraVFX.tsx',
    status: 'PARTIAL',
    dockIds: ['vfx'],
    note: 'Presets/timeline deepened; Spec hero file absent. Niagara AAA / LBM HELD.',
  },
] as const

/** Mock / orphan Spec-named files that must stay absent (anti-mock). */
export const FORBIDDEN_MOCK_HERO_REL_PATHS = [
  'components/viewport/ViewportStudioPanel.tsx',
  'components/studio/AiTriumviratePanel.tsx',
  'components/studio/NodeEditorPanel.tsx',
  'components/studio/CinematicTimelinePanel.tsx',
  'components/studio/MuscularRigPanel.tsx',
  'components/studio/AudioHrtfPanel.tsx',
  'components/studio/TerminalConsolePanel.tsx',
  'components/studio/HardwareProfilerPanel.tsx',
  'components/studio/WorldPartitionPanel.tsx',
  'components/studio/MultiplayerNetcodePanel.tsx',
  'components/studio/GlobalSettingsPanel.tsx',
  'components/studio/VoronoiDestructionPanel.tsx',
  'components/studio/FacialBlendshapePanel.tsx',
  'components/studio/NiagaraVfxGraphPanel.tsx',
  'components/studio/MaterialGraphPanel.tsx',
  'components/studio/PostProcessSettingsPanel.tsx',
  '../packages/ide-ui/panels/DetailInspectorPanel.tsx',
] as const

/** Real modules that must exist for dock-registered / PARTIAL surface rows. */
const REQUIRED_REAL_SURFACE_REL_PATHS = [
  'components/preview/SceneViewportSurface.tsx',
  'components/engine/BlueprintEditor.tsx',
  'components/sequencer/SequencerIdePanel.tsx',
  'components/studio/AssetBrowserPanel.tsx',
  'components/character/ControlRigEditor.tsx',
  'components/audio/SoundCueEditor.tsx',
  'components/terminal/MultiTerminalPanel.tsx',
  'components/agents/chat/ResourceMonitorHUD.tsx',
  'app/settings/page.tsx',
  'components/character/FacialAnimationEditor.tsx',
  'components/engine/NiagaraVFX.tsx',
  '../packages/ide-ui/Timeline3D.tsx',
  '../packages/ide-ui/PropertiesPanel3D.tsx',
  '../packages/engine/NiagaraVFX.runtime.tsx',
  '../packages/visual-scripting/VisualScriptEditor.tsx',
] as const

function webRoot(): string {
  return process.cwd()
}

export function listPresentForbiddenMockHeroFiles(
  root: string = webRoot(),
): string[] {
  return FORBIDDEN_MOCK_HERO_REL_PATHS.filter((rel) => existsSync(join(root, rel)))
}

export function listMissingRequiredRealSurfaces(
  root: string = webRoot(),
): string[] {
  return REQUIRED_REAL_SURFACE_REL_PATHS.filter((rel) => !existsSync(join(root, rel)))
}

function studioToolIds(): Set<string> {
  return new Set(STUDIO_TOOLS.map((t) => t.id))
}

function ideRegionIds(): Set<string> {
  return new Set(WORKBENCH_REGION_REGISTRY.map((r) => r.id))
}

function isDockRegistered(dockIds: readonly string[]): boolean {
  if (dockIds.length === 0) return false
  const tools = studioToolIds()
  const regions = ideRegionIds()
  const creative = new Set<string>(CREATIVE_WORKBENCH_DOCK_SLOTS)
  const previewModes = new Set(['runtime', 'device', 'console', 'viewport3d', 'canvas', 'node_editor'])
  return dockIds.some(
    (id) =>
      creative.has(id) ||
      regions.has(id as (typeof WORKBENCH_REGION_REGISTRY)[number]['id']) ||
      tools.has(id) ||
      previewModes.has(id),
  )
}

/**
 * Build the CW1 15-slot hero panel bench certificate.
 * Bench columns always CLOSED when slot defs === 15 and marketing fail-closed.
 * Product status stays PARTIAL (honest — not a 15/15 ship certificate).
 */
export function buildMasterUxHeroPanelBench(
  root: string = webRoot(),
): MasterUxHeroPanelBench {
  if (HERO_PANEL_SLOT_DEFS.length !== MASTER_UX_HERO_PANEL_SPEC_COUNT) {
    throw new Error(
      `CW1 hero bench slot count mismatch: ${HERO_PANEL_SLOT_DEFS.length} !== ${MASTER_UX_HERO_PANEL_SPEC_COUNT}`,
    )
  }

  const mockPresent = listPresentForbiddenMockHeroFiles(root)
  const missingReal = listMissingRequiredRealSurfaces(root)

  const rows: MasterUxHeroPanelRow[] = HERO_PANEL_SLOT_DEFS.map((def) => {
    const dockRegistered = isDockRegistered(def.dockIds)
    let status = def.status
    let note = def.note
    if (def.shipSurfacePath && !dockRegistered && status === 'PARTIAL' && def.dockIds.length > 0) {
      // Surface claimed dock but registry miss → fail-closed honesty
      status = 'HELD'
      note = `${note} [dock registration miss]`
    }
    if (mockPresent.length > 0) {
      note = `${note} [FORBIDDEN mock hero on disk]`
    }
    return {
      ...def,
      status,
      dockRegistered,
      marketingAllowed: false as const,
      bench: 'CLOSED' as const,
      note,
    }
  })

  const summary = {
    realSurfaces: rows.filter((r) => r.shipSurfacePath !== null).length,
    missingOrHeldHero: rows.filter((r) => r.status === 'HELD' || r.status === 'NOT_IMPLEMENTED').length,
    partial: rows.filter((r) => r.status === 'PARTIAL').length,
    held: rows.filter((r) => r.status === 'HELD').length,
    notImplemented: rows.filter((r) => r.status === 'NOT_IMPLEMENTED').length,
    dockRegistered: rows.filter((r) => r.dockRegistered).length,
    mockHeroFilesPresent: mockPresent.length,
    marketingBlockedRows: rows.length,
  }

  log.info('master_ux_hero_panel_bench_built', {
    slots: rows.length,
    partial: summary.partial,
    held: summary.held,
    dockRegistered: summary.dockRegistered,
    mockHeroFilesPresent: summary.mockHeroFilesPresent,
    missingRealSurfaces: missingReal.length,
  })

  return {
    version: CW1_HERO_BENCH_VERSION,
    generatedAt: new Date().toISOString(),
    specSlotCount: MASTER_UX_HERO_PANEL_SPEC_COUNT,
    benchColumnsClosed: true,
    productStatus: 'PARTIAL',
    marketingAaaAllowed: false,
    rows,
    summary,
    forbiddenMockHeroRelPaths: FORBIDDEN_MOCK_HERO_REL_PATHS,
    workbenchDockDefaults: {
      creativeSlots: CREATIVE_WORKBENCH_DOCK_SLOTS,
      ideRegions: WORKBENCH_REGION_REGISTRY.map((r) => r.id),
      studioToolCount: STUDIO_TOOLS.length,
    },
    heldReason: 'cw1_hero_panel_product_depth',
  }
}

/** Evidence string for consolidation-truth-matrix row. */
export function formatMasterUxHeroBenchEvidence(bench: MasterUxHeroPanelBench): string {
  return [
    `v=${bench.version}`,
    `slots=${bench.specSlotCount}`,
    `benchColumns=CLOSED`,
    `product=${bench.productStatus}`,
    `partial=${bench.summary.partial}`,
    `held=${bench.summary.held}`,
    `dockRegistered=${bench.summary.dockRegistered}`,
    `realSurfaces=${bench.summary.realSurfaces}`,
    `mockHeroPresent=${bench.summary.mockHeroFilesPresent}`,
    `marketingBlocked=${bench.summary.marketingBlockedRows}`,
  ].join(';')
}
