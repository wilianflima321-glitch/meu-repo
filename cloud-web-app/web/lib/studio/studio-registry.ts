/**
 * lib/studio/studio-registry.ts
 *
 * Single source of truth for all creative studio tools.
 * Used by StudioGroupedEditorClient (World/Character/FX) and
 * individual pages (Film, Logic/Quest).
 *
 * Rules:
 * - Never import three/R3F/Drei directly here - heavy runtimes load lazily.
 * - maturity must be accurate: 'GA' | 'BETA' | 'ALPHA'.
 * - Do NOT mark anything as GA without a shipped evidence receipt.
 * - All dynamicPath values must resolve from components/ at build time.
 */

import type { CreativeWorkbenchEvidence } from '@/components/studio/CreativeWorkbenchShell'

// --- Types --------------------------------------------------------------------

export type StudioMaturity = 'GA' | 'BETA' | 'ALPHA'

export type StudioGroup = 'World' | 'Character' | 'FX' | 'Film' | 'Logic'

export type StudioTool = {
  /** URL-safe tool id, used as ?tool=<id> param */
  id: string
  /** Human-facing label */
  label: string
  /** Short functional description shown in picker */
  description: string
  /** Maturity gate - affects evidence strip */
  maturity: StudioMaturity
  /** Which creative group this belongs to */
  group: StudioGroup
  /**
   * Absolute import path from repo root (relative to web/).
   * Used for dynamic() lazy loading at the page level.
   */
  dynamicPath: string
  /** Optional: which workbench slot this tool should fill when active */
  preferredSlot?: 'viewport' | 'timeline' | 'inspector' | 'outliner'
}

// --- Registry -----------------------------------------------------------------

export const STUDIO_TOOLS: StudioTool[] = [
  // -- World ------------------------------------------------------------------
  { id: 'level',     group: 'World',     maturity: 'BETA',  label: 'Level',     description: 'Playable space, spawn points, streaming regions.',      dynamicPath: '@/components/engine/LevelEditor' },
  { id: 'scene',     group: 'World',     maturity: 'BETA',  label: 'Scene',     description: 'Hierarchy, cameras, lights, transforms.',               dynamicPath: '@/components/scene-editor/SceneEditor' },
  { id: 'material',  group: 'World',     maturity: 'BETA',  label: 'Material',  description: 'PBR surfaces and texture decisions.',                   dynamicPath: '@/components/materials/MaterialEditor' },
  { id: 'terrain',   group: 'World',     maturity: 'BETA',  label: 'Terrain',   description: 'Heightmaps, biome zones, erosion passes.',              dynamicPath: '@/components/terrain/TerrainSculptingEditor' },
  { id: 'landscape', group: 'World',     maturity: 'BETA',  label: 'Landscape', description: 'Open-world layers and streaming layout.',              dynamicPath: '@/components/engine/LandscapeEditor' },
  { id: 'foliage',   group: 'World',     maturity: 'ALPHA', label: 'Foliage',   description: 'Density, slope, LOD, collision, wind.',                dynamicPath: '@/components/environment/FoliagePainter' },
  { id: 'water',     group: 'World',     maturity: 'ALPHA', label: 'Water',     description: 'Rivers, oceans, foam, flow maps, buoyancy.',           dynamicPath: '@/components/environment/WaterEditor' },

  // -- Character --------------------------------------------------------------
  { id: 'animation', group: 'Character', maturity: 'ALPHA', label: 'Animation', description: 'Blueprint planning, transitions, timing.',             dynamicPath: '@/components/engine/AnimationBlueprint' },
  { id: 'rig',       group: 'Character', maturity: 'ALPHA', label: 'Rig',       description: 'IK/FK chains, constraints, control handoff.',          dynamicPath: '@/components/character/ControlRigEditor' },
  { id: 'facial',    group: 'Character', maturity: 'ALPHA', label: 'Facial',    description: 'FACS poses, visemes, emotions, continuity.',           dynamicPath: '@/components/character/FacialAnimationEditor' },
  { id: 'hair',      group: 'Character', maturity: 'ALPHA', label: 'Hair',      description: 'Groom regions, strand physics, LODs.',                 dynamicPath: '@/components/character/HairFurEditor' },
  { id: 'cloth',     group: 'Character', maturity: 'ALPHA', label: 'Cloth',     description: 'Garments, wind, pinning, collisions.',                 dynamicPath: '@/components/physics/ClothSimulationEditor' },

  // -- FX ---------------------------------------------------------------------
  { id: 'vfx',    group: 'FX', maturity: 'ALPHA', label: 'VFX',    description: 'Particles, combat readability, cinematic cues.',               dynamicPath: '@/components/engine/NiagaraVFX' },
  { id: 'fluid',  group: 'FX', maturity: 'ALPHA', label: 'Fluid',  description: 'Liquids, SPH particles, simulation volumes.',                 dynamicPath: '@/components/physics/FluidSimulationEditor' },
  { id: 'sprite', group: 'FX', maturity: 'ALPHA', label: 'Sprite', description: '2D sprites, animation frames, pixel passes.',                dynamicPath: '@/components/editors/SpriteEditor' },

  // -- Film -------------------------------------------------------------------
  { id: 'director',  group: 'Film', maturity: 'ALPHA', label: 'Director',  description: 'Story, shots, continuity, actor blocking.',              dynamicPath: '@/components/nexus/DirectorMode',          preferredSlot: 'viewport' },
  { id: 'timeline',  group: 'Film', maturity: 'ALPHA', label: 'Timeline',  description: 'Edit, layers, cuts, timing, markers.',                  dynamicPath: '@/components/video/VideoTimelineEditor',   preferredSlot: 'timeline' },
  { id: 'audio',     group: 'Film', maturity: 'ALPHA', label: 'Audio',     description: 'Sound cues, mix, sync, SFX placement.',                 dynamicPath: '@/components/audio/SoundCueEditor',        preferredSlot: 'inspector' },
  { id: 'cinematic', group: 'Film', maturity: 'ALPHA', label: 'Cloud review', description: 'Stream, cost estimate, teardown, export receipt.', dynamicPath: '@/app/studio/cinematic/CloudStreamStudioClient', preferredSlot: 'viewport' },

  // -- Logic ------------------------------------------------------------------
  { id: 'quest', group: 'Logic', maturity: 'BETA', label: 'Quest',        description: 'Branching missions, objectives, rewards, prerequisites.', dynamicPath: '@/components/narrative/QuestEditor', preferredSlot: 'viewport' },
]

// --- Helpers ------------------------------------------------------------------

/** All tools for a given group, in definition order */
export function getGroupTools(group: StudioGroup): StudioTool[] {
  return STUDIO_TOOLS.filter((t) => t.group === group)
}

/** Find a specific tool by id and group */
export function getTool(group: StudioGroup, id: string): StudioTool | undefined {
  return STUDIO_TOOLS.find((t) => t.group === group && t.id === id)
}

/** Resolve the active tool from URL ?tool param, falling back to first in group */
export function resolveActiveTool(group: StudioGroup, toolParam: string | null): StudioTool {
  const tools = getGroupTools(group)
  return tools.find((t) => t.id === toolParam) ?? tools[0]
}

// --- Evidence builders --------------------------------------------------------

const MATURITY_EVIDENCE: Record<StudioMaturity, CreativeWorkbenchEvidence> = {
  GA: {
    label: 'Maturity',
    status: 'available',
    detail: 'Generally available - no known blocking issues.',
  },
  BETA: {
    label: 'Maturity',
    status: 'needs-review',
    detail: 'Beta - functional; known edge cases under human review.',
  },
  ALPHA: {
    label: 'Maturity',
    status: 'held',
    detail: 'Alpha - experimental. Not for production assets.',
  },
}

/**
 * Build the evidence strip for the active tool.
 * All claims here are honest - no "render available" without a real receipt.
 */
export function buildToolEvidence(tool: StudioTool): CreativeWorkbenchEvidence[] {
  return [
    MATURITY_EVIDENCE[tool.maturity],
    {
      label: 'Asset ledger',
      status: 'needs-review',
      detail: 'Asset ledger requires human sign-off before export.',
    },
    {
      label: 'Render trace',
      status: 'held',
      detail: 'No render receipt recorded for this session.',
    },
  ]
}

/** Maturity group metadata for the workbench mode config */
export const GROUP_CONFIG: Record<StudioGroup, {
  mode: 'World' | 'Character' | 'FX' | 'Film' | 'Logic'
  title: string
  activeHref: string
}> = {
  World:     { mode: 'World',     title: 'World Studio',     activeHref: '/studio/level' },
  Character: { mode: 'Character', title: 'Character Studio', activeHref: '/studio/animation' },
  FX:        { mode: 'FX',        title: 'FX Studio',        activeHref: '/studio/vfx' },
  Film:      { mode: 'Film',      title: 'Film Studio',      activeHref: '/studio/film' },
  Logic:     { mode: 'Logic',     title: 'Logic Studio',     activeHref: '/studio/quest' },
}
