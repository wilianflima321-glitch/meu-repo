import type {
  RepositoryAgentHandoff,
  RepositoryCriticalGap,
  RepositoryPriority,
  RepositorySurface,
} from './repository-cartography-contracts'

function priorityFromSurfaces(surfaces: RepositorySurface[]): RepositoryPriority {
  if (surfaces.some((surface) => surface.priority === 'critical')) return 'critical'
  if (surfaces.some((surface) => surface.priority === 'high')) return 'high'
  if (surfaces.some((surface) => surface.priority === 'medium')) return 'medium'
  return 'low'
}

export function buildAgentHandoffs(surfaces: RepositorySurface[], gaps: RepositoryCriticalGap[]): RepositoryAgentHandoff[] {
  const byAgent = new Map<string, RepositorySurface[]>()
  for (const surface of surfaces) {
    for (const agent of surface.ownerAgents) {
      const list = byAgent.get(agent) ?? []
      list.push(surface)
      byAgent.set(agent, list)
    }
  }

  const handoffs: RepositoryAgentHandoff[] = [
    {
      agent: 'Producer Agent',
      priority: gaps.some((gap) => gap.severity === 'blocker' || gap.severity === 'high') ? 'critical' : 'high',
      surfaces: surfaces
        .filter((surface) => surface.priority === 'critical')
        .slice(0, 12)
        .map((surface) => surface.path),
      objective: 'Lock mission scope, canonical owners, approval gates, and no-invention rules before specialized agents act.',
      requiredEvidence: ['Project Brain update', 'Mission Ledger entry', 'Approval checkpoint'],
    },
    {
      agent: 'Research Agent',
      priority: surfaces.some((surface) => surface.sourceKind === 'huggingface-hub' || surface.strategy === 'external-mirror')
        ? 'high'
        : 'medium',
      surfaces: surfaces
        .filter((surface) => surface.sourceKind === 'huggingface-hub' || surface.strategy === 'external-mirror')
        .slice(0, 12)
        .map((surface) => surface.path),
      objective: 'Mirror external metadata, licenses, model/dataset readmes, and folder trees without pulling unnecessary GB payloads.',
      requiredEvidence: ['External source manifest', 'License summary', 'Download budget'],
    },
  ]

  for (const [agent, agentSurfaces] of byAgent.entries()) {
    if (agent === 'Producer Agent') continue
    handoffs.push({
      agent,
      priority: priorityFromSurfaces(agentSurfaces),
      surfaces: agentSurfaces
        .sort((a, b) => b.sizeBytes - a.sizeBytes)
        .slice(0, 12)
        .map((surface) => surface.path),
      objective: objectiveForAgent(agent),
      requiredEvidence: evidenceForAgent(agent),
    })
  }

  return handoffs.sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || a.agent.localeCompare(b.agent))
}

function priorityWeight(priority: RepositoryPriority): number {
  switch (priority) {
    case 'critical':
      return 4
    case 'high':
      return 3
    case 'medium':
      return 2
    default:
      return 1
  }
}

function objectiveForAgent(agent: string): string {
  switch (agent) {
    case 'Asset Librarian Agent':
      return 'Normalize asset provenance, duplicates, quality, size, LOD, materials, animation clips, and scene usage.'
    case 'Technical Artist Agent':
      return 'Connect scene/world surfaces to viewport, lighting, materials, collision, streaming, and performance budgets.'
    case 'Gameplay Engineer Agent':
      return 'Map gameplay systems, combat feel, inputs, physics, enemies, quests, and playtest criteria before code edits.'
    case 'Cinematic Editor Agent':
      return 'Map shots, timeline, cameras, audio, subtitles, continuity, render queue, and review states.'
    case 'Story Agent':
      return 'Protect narrative continuity, style, character intent, quests, shots, and approved creative decisions.'
    case 'QA Agent':
      return 'Attach test, playtest, render, build, license, and regression evidence to every mission milestone.'
    case 'Performance Agent':
      return 'Prevent UI freezes by routing heavy assets, builds, renders, and indexing to workers, native, or cloud.'
    case 'Release Agent':
      return 'Verify build, deploy, rollback, environment, status, and release evidence before public output.'
    default:
      return 'Inspect owned surfaces and report evidence-backed next actions.'
  }
}

function evidenceForAgent(agent: string): string[] {
  switch (agent) {
    case 'Asset Librarian Agent':
      return ['Asset provenance report', 'Duplicate resolution', 'Quality/LOD summary']
    case 'Technical Artist Agent':
      return ['Viewport screenshot', 'Scene graph diff', 'Performance budget note']
    case 'Gameplay Engineer Agent':
      return ['Playtest capture', 'Input/combat criteria', 'Code diff validation']
    case 'Cinematic Editor Agent':
      return ['Shot preview', 'Timeline/render report', 'Continuity checklist']
    case 'Story Agent':
      return ['Creative bible update', 'Continuity decision', 'Approved story delta']
    case 'QA Agent':
      return ['Test report', 'Regression evidence', 'Known risk list']
    case 'Performance Agent':
      return ['Heavy job routing plan', 'Memory/FPS budget', 'Worker/cloud fallback proof']
    case 'Release Agent':
      return ['Build log', 'Deploy preview', 'Rollback plan']
    default:
      return ['Evidence note']
  }
}
