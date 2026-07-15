/**
 * OMNI-PLAN FASE 3.1 — Ação B ("Ghost Nodes").
 *
 * Projects a single semi-transparent "next node" suggestion onto the canvas
 * so the user can commit it with TAB instead of hand-placing + hand-wiring
 * every node. Two suggestion sources are supported:
 *
 * 1. `onSuggestNextNodes` (optional, host-injected, async) — the same
 *    injection pattern already used for `onGenerateBlueprint` in
 *    `VisualScriptEditor.tsx` (Golden Rule 1: no package-internal network
 *    calls). Host apps can wire this to a real LLM call that reads the
 *    compiled graph JSON and returns candidate next nodes.
 * 2. `suggestNextNodeHeuristically` (local, synchronous, always available) —
 *    a small deterministic affinity table keyed by the dangling node's
 *    `type`. This is the fallback used whenever no AI backend is injected,
 *    and is what actually ships without extra host wiring.
 */

import type { Edge } from '@xyflow/react'
import { NODE_CATALOG, type NodeDefinition } from '../visual-node-catalog'
import type { VisualNodeType } from '../VisualScriptEditor'

export interface GhostSuggestion {
  /** The node whose unconnected output port this suggestion continues from. */
  sourceNodeId: string
  sourcePortId: string
  definition: NodeDefinition
  position: { x: number; y: number }
}

/**
 * Ordered "what usually comes next" affinities, curated from the real node
 * catalog (`visual-node-catalog.ts`). Not exhaustive — only covers node
 * types with a clear, common continuation — everything else falls back to
 * `DEFAULT_CHAIN`.
 */
const AFFINITY_RULES: Record<string, string[]> = {
  event_start: ['action_spawn', 'variable_set', 'action_log'],
  event_update: ['condition_compare', 'action_move', 'physics_raycast'],
  event_collision: ['condition_compare', 'ability_apply_effect', 'action_destroy'],
  event_trigger: ['ability_apply_effect', 'action_spawn'],
  condition_compare: ['flow_branch'],
  flow_branch: ['action_move', 'ability_apply_effect', 'action_log'],
  flow_sequence: ['action_move', 'action_log'],
  flow_for_loop: ['action_spawn'],
  flow_for_each: ['ability_apply_effect'],
  action_move: ['physics_raycast', 'action_rotate'],
  action_spawn: ['ability_apply_effect', 'action_log'],
  physics_raycast: ['condition_compare', 'physics_add_force'],
  physics_add_force: ['action_log'],
  input_key: ['flow_branch', 'action_move'],
  input_axis: ['action_move'],
  ability_apply_effect: ['ability_wait_delay', 'audio_play'],
  ability_check_tag: ['flow_branch'],
  ability_wait_delay: ['ability_apply_effect', 'action_log'],
  audio_play: ['action_log'],
  variable_get: ['condition_compare'],
  variable_set: ['action_log'],
  worldgen_generate_mesh: ['worldgen_check_coherence'],
  worldgen_populate_biome: ['worldgen_check_coherence'],
  material_base_colour: ['material_output'],
  material_texture: ['material_mix'],
  material_noise: ['material_mix'],
  material_mix: ['material_output'],
  material_fresnel: ['material_mix'],
}

const DEFAULT_CHAIN = ['action_log']

const catalogByType = new Map(NODE_CATALOG.map((definition) => [definition.type, definition]))

const GHOST_OFFSET_X = 260
const GHOST_ROW_HEIGHT = 90

/**
 * Finds the most recently created node that still has a dangling `exec`
 * output (nothing wired out of it yet) — this is, in practice, the node the
 * user just placed and is about to continue wiring, without needing
 * explicit selection-state plumbing.
 */
function findDanglingExecNode(nodes: VisualNodeType[], edges: Edge[]): { node: VisualNodeType; portId: string } | null {
  const wiredSourceHandles = new Set(edges.map((edge) => `${edge.source}::${edge.sourceHandle ?? ''}`))

  const candidates = nodes
    .map((node) => {
      const definition = (node.data as { definition?: NodeDefinition } | undefined)?.definition
      const execOutput = definition?.outputs.find((port) => port.type === 'exec')
      if (!execOutput) return null
      if (wiredSourceHandles.has(`${node.id}::${execOutput.id}`)) return null
      return { node, portId: execOutput.id }
    })
    .filter((candidate): candidate is { node: VisualNodeType; portId: string } => candidate !== null)

  if (candidates.length === 0) return null

  // Node ids are minted as `node-${Date.now()}` (see VisualScriptEditor.handleAddNode) —
  // parsing the timestamp lets us pick the most recently placed candidate.
  candidates.sort((a, b) => {
    const aTime = Number(a.node.id.split('-')[1] ?? 0)
    const bTime = Number(b.node.id.split('-')[1] ?? 0)
    return bTime - aTime
  })
  return candidates[0]
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function findFreePosition(anchor: { x: number; y: number }, nodes: VisualNodeType[]): { x: number; y: number } {
  const candidateWidth = 200
  const candidateHeight = 80
  for (let attempt = 0; attempt < 6; attempt++) {
    const position = { x: anchor.x, y: anchor.y + attempt * GHOST_ROW_HEIGHT }
    const collides = nodes.some((node) =>
      rectsOverlap(
        { ...position, width: candidateWidth, height: candidateHeight },
        { x: node.position.x, y: node.position.y, width: node.measured?.width ?? 200, height: node.measured?.height ?? 80 }
      )
    )
    if (!collides) return position
  }
  return anchor
}

/**
 * Local, synchronous, zero-network suggestion heuristic. Always available —
 * this is what runs when no `onSuggestNextNodes` AI backend is injected.
 */
export function suggestNextNodeHeuristically(nodes: VisualNodeType[], edges: Edge[]): GhostSuggestion | null {
  const dangling = findDanglingExecNode(nodes, edges)
  if (!dangling) return null

  const sourceType = (dangling.node.data as { definition?: NodeDefinition } | undefined)?.definition?.type
  const chain = (sourceType && AFFINITY_RULES[sourceType]) || DEFAULT_CHAIN
  const suggestedType = chain.find((type) => catalogByType.has(type)) ?? DEFAULT_CHAIN[0]
  const definition = catalogByType.get(suggestedType)
  if (!definition) return null

  const anchor = {
    x: dangling.node.position.x + (dangling.node.measured?.width ?? 200) + GHOST_OFFSET_X - 200,
    y: dangling.node.position.y,
  }
  const position = findFreePosition(anchor, nodes)

  return {
    sourceNodeId: dangling.node.id,
    sourcePortId: dangling.portId,
    definition,
    position,
  }
}
