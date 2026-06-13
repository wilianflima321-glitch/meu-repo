/**
 * Maps free-form agent tool registry names (e.g. `create_file`, `edit_file`,
 * `generate_image`) onto canonical Agent Tool Bus tools + modes.
 *
 * The agent stacks historically executed tools through `ai-tools-registry`
 * without ever consulting the governed tool bus, because their tool names do
 * not match the canonical `AgentWorkTool` ids. This adapter is the bridge that
 * lets every stack route through `agent-tool-job-runner` (the governed kernel).
 */
import type { AgentMode } from './agent-tool-bus'
import type { AgentWorkTool } from './parallel-agent-work-contract'

export interface CanonicalToolMapping {
  toolId: AgentWorkTool
  mode: AgentMode
  /** True when the underlying tool mutates project state (write-scoped). */
  mutating: boolean
}

const NAME_MAP: Record<string, CanonicalToolMapping> = {
  // Code mutations -> diff-proposal (write-scoped, requires receipts/rollback/lock).
  create_file: { toolId: 'diff-proposal', mode: 'Builder', mutating: true },
  edit_file: { toolId: 'diff-proposal', mode: 'Builder', mutating: true },
  delete_file: { toolId: 'diff-proposal', mode: 'Builder', mutating: true },
  write_file: { toolId: 'diff-proposal', mode: 'Builder', mutating: true },
  apply_patch: { toolId: 'diff-proposal', mode: 'Builder', mutating: true },
  apply_diff: { toolId: 'diff-proposal', mode: 'Builder', mutating: true },

  // Read / analysis.
  read_file: { toolId: 'file-read', mode: 'Builder', mutating: false },
  analyze_code: { toolId: 'code-search', mode: 'Builder', mutating: false },
  search: { toolId: 'code-search', mode: 'Builder', mutating: false },
  search_code: { toolId: 'code-search', mode: 'Builder', mutating: false },

  // Project lifecycle.
  create_project: { toolId: 'mission-ledger', mode: 'Coordinator', mutating: true },
  build_project: { toolId: 'test-runner', mode: 'Builder', mutating: false },
  run_tests: { toolId: 'test-runner', mode: 'QA', mutating: false },

  // Creative / asset generation.
  generate_image: { toolId: 'asset-metadata', mode: 'Creative', mutating: true },
  edit_image: { toolId: 'asset-metadata', mode: 'Creative', mutating: true },
  create_sprite_sheet: { toolId: 'asset-metadata', mode: 'Creative', mutating: true },
  generate_texture: { toolId: 'asset-metadata', mode: 'Creative', mutating: true },
  generate_3d_model: { toolId: 'asset-metadata', mode: 'Creative', mutating: true },
  generate_music: { toolId: 'asset-metadata', mode: 'Creative', mutating: true },
  generate_sfx: { toolId: 'asset-metadata', mode: 'Creative', mutating: true },
  text_to_speech: { toolId: 'asset-metadata', mode: 'Creative', mutating: true },
  query_assets: { toolId: 'asset-metadata', mode: 'Creative', mutating: false },
  get_asset_details: { toolId: 'asset-metadata', mode: 'Creative', mutating: false },
  render_video: { toolId: 'render-submit', mode: 'Creative', mutating: true },

  // Research.
  deep_research: { toolId: 'deep-research', mode: 'Research', mutating: false },
  web_search: { toolId: 'deep-research', mode: 'Research', mutating: false },
}

const DEFAULT_MAPPING: CanonicalToolMapping = {
  toolId: 'project-brain',
  mode: 'Builder',
  mutating: false,
}

export function isMappedTool(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(NAME_MAP, name)
}

export function mapToolNameToCanonical(name: string): CanonicalToolMapping {
  return NAME_MAP[name] ?? DEFAULT_MAPPING
}

export function listMappedToolNames(): string[] {
  return Object.keys(NAME_MAP)
}
