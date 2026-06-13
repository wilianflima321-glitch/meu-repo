import { describe, expect, it } from 'vitest'

import {
  isMappedTool,
  listMappedToolNames,
  mapToolNameToCanonical,
} from '@/lib/production/agent-tool-name-adapter'
import { getCanonicalAgentTools } from '@/lib/production/agent-tool-bus'

describe('agent tool name adapter', () => {
  it('maps code mutation tools to the write-scoped diff-proposal tool', () => {
    for (const name of ['create_file', 'edit_file', 'write_file', 'apply_patch']) {
      const mapping = mapToolNameToCanonical(name)
      expect(mapping.toolId).toBe('diff-proposal')
      expect(mapping.mode).toBe('Builder')
      expect(mapping.mutating).toBe(true)
    }
  })

  it('falls back to a read-only tool for unknown names', () => {
    const mapping = mapToolNameToCanonical('totally_unknown_tool')
    expect(mapping.toolId).toBe('project-brain')
    expect(mapping.mutating).toBe(false)
    expect(isMappedTool('totally_unknown_tool')).toBe(false)
  })

  it('only maps to tool ids that exist in the canonical tool bus', () => {
    const canonicalIds = new Set(getCanonicalAgentTools().map((tool) => tool.id))
    for (const name of listMappedToolNames()) {
      const mapping = mapToolNameToCanonical(name)
      expect(canonicalIds.has(mapping.toolId)).toBe(true)
      expect(mapping.mode).toBeTruthy()
    }
  })
})
