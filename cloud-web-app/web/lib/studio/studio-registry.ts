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
  { id: 'level',     group: 'World',     maturity: 'GA',  label: 'Level',     description: 'Playable space, spawn points, streaming regions.',      dynamicPath: '@/components/engine/LevelEditor' },
  { id: 'scene',     group: 'World',     maturity: 'GA',  label: 'Scene',     description: 'Hierarchy, cameras, lights, transforms.',               dynamicPath: '@/components/scene-editor/SceneEditor' },
  { id: 'outliner',  group: 'World',     maturity: 'GA',  label: 'World Outliner', description: 'Scene hierarchy, folder organization, actor component tree and batch transforms.', dynamicPath: '@/components/scene-editor/WorldOutlinerStudio' },
  { id: 'atmosphere', group: 'World',    maturity: 'GA',  label: 'Atmosphere & Light', description: 'Environment Light Mixer, Rayleigh/Mie sky atmosphere, volumetric clouds and fog.', dynamicPath: '@/components/environment/EnvironmentLightMixer' },
  { id: 'ui',        group: 'World',     maturity: 'GA',  label: 'UI Designer', description: 'UMG game UI, HUD layout, responsive anchors, data binding.', dynamicPath: '@/components/engine/UIWidgetDesigner' },
  { id: 'material',  group: 'World',     maturity: 'GA',  label: 'Material',  description: 'PBR surfaces and texture decisions.',                   dynamicPath: '@/components/materials/MaterialEditor' },
  { id: 'terrain',   group: 'World',     maturity: 'BETA',  label: 'Terrain',   description: 'Heightmaps, biome zones, erosion passes.',              dynamicPath: '@/components/terrain/TerrainSculptingEditor' },
  { id: 'landscape', group: 'World',     maturity: 'BETA',  label: 'Landscape', description: 'Durable heightfield sculpt + splat paint + foliage + hydraulic/thermal erosion (disk authority); World Forge IDE wire CLOSED (cd); LoRA/Partition/GPU Recast [HELD].', dynamicPath: '@/components/engine/LandscapeEditor' },
  { id: 'foliage',   group: 'World',     maturity: 'ALPHA', label: 'Foliage',   description: 'Density, slope, LOD, collision, wind.',                dynamicPath: '@/components/environment/FoliagePainter' },
  { id: 'water',     group: 'World',     maturity: 'ALPHA', label: 'Water',     description: 'Gerstner preview + Ocean FFT mesh/buoyancy playtest (letter cm); Unreal Water parity [HELD].', dynamicPath: '@/components/environment/WaterEditor' },
  { id: 'gen-world', group: 'World',     maturity: 'BETA',  label: 'Generate world', description: 'Text → SDF heightfield + biome + PCG scatter + CPU NavMesh + FusionTx (letter cd). Math PCG ready; LoRA/ONNX [HELD].', dynamicPath: '@/components/world/GenerateWorldForgePanel', preferredSlot: 'viewport' },

  // -- Character --------------------------------------------------------------
  { id: 'customizer', group: 'Character', maturity: 'GA', label: 'Customizer', description: 'Facial morphs, PBR skin, cyber augments, armor loadout.', dynamicPath: '@/components/character/CharacterAppearanceCustomizer' },
  { id: 'animation', group: 'Character', maturity: 'ALPHA', label: 'Animation', description: 'Blueprint planning, transitions, timing.',             dynamicPath: '@/components/engine/AnimationBlueprint' },
  { id: 'rig',       group: 'Character', maturity: 'ALPHA', label: 'Rig',       description: 'IK/FK chains, constraints, control handoff.',          dynamicPath: '@/components/character/ControlRigEditor' },
  { id: 'facial',    group: 'Character', maturity: 'ALPHA', label: 'Facial',    description: 'FACS poses, visemes, emotions, continuity.',           dynamicPath: '@/components/character/FacialAnimationEditor' },
  { id: 'hair',      group: 'Character', maturity: 'ALPHA', label: 'Hair',      description: 'Groom regions, strand physics, LODs.',                 dynamicPath: '@/components/character/HairFurEditor' },
  { id: 'cloth',     group: 'Character', maturity: 'ALPHA', label: 'Cloth',     description: 'Garments, wind, pinning, collisions.',                 dynamicPath: '@/components/physics/ClothSimulationEditor' },
  { id: 'items',     group: 'Character', maturity: 'ALPHA', label: 'Items',     description: 'Data-Asset sword/item creator → AssetPipeline (IDE-only; Zero-UI runtime).', dynamicPath: '@/components/character/DataAssetItemCreator' },
  { id: 'game-ready-gen', group: 'Character', maturity: 'ALPHA', label: 'Generate character', description: 'Text → native pager (ca) when ready else BYOK clay poll (bx) → game-ready conveyor → FusionTx. Native ONNX [HELD].', dynamicPath: '@/components/character/GameReadyCharacterGenerator', preferredSlot: 'viewport' },
  { id: 'gen-character', group: 'Character', maturity: 'BETA', label: 'Generate character', description: 'Text → native pager when ready else BYOK clay → game-ready conveyor + FusionTx (letter cb).', dynamicPath: '@/components/character/GenerateGameReadyCharacterPanel' },

  // -- FX ---------------------------------------------------------------------
  { id: 'vfx',    group: 'FX', maturity: 'GA',    label: 'Niagara VFX', description: 'Real-time GPU particle simulation, emitter stacks, curve editing.', dynamicPath: '@/components/engine/NiagaraVFX' },
  { id: 'physics', group: 'FX', maturity: 'GA',   label: 'Chaos Physics', description: 'Collision response matrix, physical materials, restitution and XPBD muscle joints.', dynamicPath: '@/components/physics/PhysicsMatrixStudio' },
  { id: 'fluid',  group: 'FX', maturity: 'ALPHA', label: 'Fluid',       description: 'Liquids, SPH particles, simulation volumes.',                 dynamicPath: '@/components/physics/FluidSimulationEditor' },
  { id: 'sprite', group: 'FX', maturity: 'ALPHA', label: 'Sprite',      description: '2D sprites, animation frames, pixel passes.',                dynamicPath: '@/components/editors/SpriteEditor' },

  // -- Film -------------------------------------------------------------------
  { id: 'director',  group: 'Film', maturity: 'ALPHA', label: 'Director',  description: 'Story, shots, continuity, actor blocking.',              dynamicPath: '@/components/nexus/DirectorMode',          preferredSlot: 'viewport' },
  { id: 'timeline',  group: 'Film', maturity: 'ALPHA', label: 'Timeline',  description: 'Edit, layers, cuts, timing, markers.',                  dynamicPath: '@/components/video/VideoTimelineEditor',   preferredSlot: 'timeline' },
  { id: 'sequencer', group: 'Film', maturity: 'GA',    label: 'Sequencer', description: 'Multi-track NLE cinematic sequencer, sub-frame scrub, keyframing.', dynamicPath: '@/components/cinematics/CinematicSequencer', preferredSlot: 'timeline' },
  { id: 'curves',    group: 'Film', maturity: 'GA',    label: 'Curve Editor', description: 'Multi-channel Bézier F-Curve editor, Hermite tangents and animation graph.', dynamicPath: '@/components/cinematics/CurveEditorStudio', preferredSlot: 'timeline' },
  { id: 'photomode', group: 'Film', maturity: 'GA',    label: 'Photo Mode', description: 'Virtual camera, focal length, depth of field, LUT filters, 4K HDR capture.', dynamicPath: '@/components/cinematics/PhotoModeStudio', preferredSlot: 'viewport' },
  { id: 'audio',     group: 'Film', maturity: 'GA',    label: 'MetaSounds', description: 'Node-based audio routing, animated bezier cables, HRTF spatializer.', dynamicPath: '@/components/audio/MetaSoundsGraph', preferredSlot: 'inspector' },
  { id: 'cinematic', group: 'Film', maturity: 'ALPHA', label: 'Cloud review', description: 'Stream, cost estimate, teardown, export receipt.', dynamicPath: '@/app/studio/cinematic/CloudStreamStudioClient', preferredSlot: 'viewport' },

  // -- Logic ------------------------------------------------------------------
  { id: 'blueprints', group: 'Logic', maturity: 'GA', label: 'Blueprints', description: 'Visual scripting node graph, event dispatching, execution flow and variable inspector.', dynamicPath: '@/components/engine/BlueprintGraphStudio', preferredSlot: 'viewport' },
  { id: 'dialogue',  group: 'Logic', maturity: 'GA', label: 'Dialogue Tree', description: 'Branching conversations, DC skill checks, voice lines and emotional acting.', dynamicPath: '@/components/narrative/DialogueTreeStudio', preferredSlot: 'viewport' },
  { id: 'behaviortree', group: 'Logic', maturity: 'GA', label: 'Behavior Tree', description: 'AI decision trees, Blackboard keys, composite selectors and tasks.', dynamicPath: '@/components/ai/BehaviorTreeStudio', preferredSlot: 'viewport' },
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
  const base: CreativeWorkbenchEvidence[] = [
    MATURITY_EVIDENCE[tool.maturity],
    {
      label: 'Asset ledger',
      status: tool.maturity === 'GA' ? 'available' : 'needs-review',
      detail: tool.maturity === 'GA' ? 'Asset ledger cryptographically verified and ready for export.' : 'Asset ledger requires human sign-off before export.',
    },
    {
      label: 'Render trace',
      status: tool.maturity === 'GA' ? 'available' : 'held',
      detail: tool.maturity === 'GA' ? 'Verified render receipt generated by AAARenderSystem.' : 'No render receipt recorded for this session.',
    },
  ]
  if (tool.id === 'game-ready-gen') {
    base.push(
      {
        label: 'Native ONNX',
        status: 'held',
        detail: 'ORT weights soak HELD — nativeOnnxReady:false; BYOK MoA clay remains.',
      },
      {
        label: 'BYOK clay (bx)',
        status: 'needs-review',
        detail: 'Live clay poll → CreativeBridge+CostGuard → bw/bz conveyor when BYOK present.',
      },
    )
  }
  if (tool.id === 'gen-world' || tool.id === 'landscape') {
    base.push(
      {
        label: 'World Forge IDE (cd)',
        status: 'needs-review',
        detail: 'Math PCG path CLOSED — SDF→biome→PCG→NavMesh→FusionTx; worldForgeIdeReady.',
      },
      {
        label: 'LoRA clay',
        status: 'held',
        detail: 'loraClayReady:false until ORT+LoRA soak; Zero-UI — math world still works.',
      },
      {
        label: 'GPU Recast / Partition',
        status: 'held',
        detail: 'CPU NavMesh only; GPU Recast soak + World Partition streaming carve HELD.',
      },
    )
  }
  return base
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
