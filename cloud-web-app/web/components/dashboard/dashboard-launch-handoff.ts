import {
  buildWorkspaceBlueprint,
  buildWorkspaceJourneyChecklist,
  summarizeWorkspaceBlueprint,
  type WorkspaceBlueprint,
} from '@/lib/product/workspace-blueprint'

export const DASHBOARD_LAUNCH_MISSION_KEY = 'aethel.dashboard.launchMission'

export type DashboardLaunchHandoff = {
  mission: string
  source: 'studio-home'
  createdAt: number
  blueprint: WorkspaceBlueprint
  blueprintSource: 'api' | 'local-fallback'
}

function buildLocalDashboardLaunchHandoff(mission: string): DashboardLaunchHandoff {
  const createdAt = Date.now()
  return {
    mission,
    source: 'studio-home',
    createdAt,
    blueprint: buildWorkspaceBlueprint({ mission, createdAt }),
    blueprintSource: 'local-fallback',
  }
}

export async function createDashboardLaunchHandoff(value: string): Promise<DashboardLaunchHandoff | null> {
  if (typeof window === 'undefined') return null
  const mission = value.trim()
  if (!mission) return null

  try {
    const response = await fetch('/api/workspace/blueprint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mission }),
    })
    if (!response.ok) throw new Error(`WORKSPACE_BLUEPRINT_${response.status}`)
    const payload = (await response.json()) as { blueprint?: WorkspaceBlueprint }
    if (!payload.blueprint?.id) throw new Error('WORKSPACE_BLUEPRINT_INVALID')
    return {
      mission,
      source: 'studio-home',
      createdAt: payload.blueprint.createdAt,
      blueprint: payload.blueprint,
      blueprintSource: 'api',
    }
  } catch {
    return buildLocalDashboardLaunchHandoff(mission)
  }
}

export function persistDashboardLaunchHandoff(handoff: DashboardLaunchHandoff | null) {
  if (typeof window === 'undefined' || !handoff) return
  window.sessionStorage.setItem(DASHBOARD_LAUNCH_MISSION_KEY, JSON.stringify(handoff))
}

export function persistDashboardLaunchMission(value: string) {
  if (typeof window === 'undefined') return
  const mission = value.trim()
  if (!mission) return
  persistDashboardLaunchHandoff(buildLocalDashboardLaunchHandoff(mission))
}

export function consumeDashboardLaunchMission(): DashboardLaunchHandoff | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(DASHBOARD_LAUNCH_MISSION_KEY)
  if (!raw) return null
  window.sessionStorage.removeItem(DASHBOARD_LAUNCH_MISSION_KEY)

  try {
    const parsed = JSON.parse(raw) as Partial<DashboardLaunchHandoff>
    if (typeof parsed.mission === 'string' && parsed.mission.trim()) {
      const mission = parsed.mission.trim()
      const createdAt = typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now()
      return {
        mission,
        source: parsed.source === 'studio-home' ? parsed.source : 'studio-home',
        createdAt,
        blueprintSource: parsed.blueprintSource === 'api' ? 'api' : 'local-fallback',
        blueprint:
          parsed.blueprint && typeof parsed.blueprint === 'object'
            ? (parsed.blueprint as WorkspaceBlueprint)
            : buildWorkspaceBlueprint({ mission, createdAt }),
      }
    }
  } catch {
    const mission = raw.trim()
    if (raw.trim()) {
      return {
        mission,
        source: 'studio-home',
        createdAt: Date.now(),
        blueprintSource: 'local-fallback',
        blueprint: buildWorkspaceBlueprint({ mission }),
      }
    }
  }

  return null
}

export function buildDashboardLaunchSystemContext(handoff: DashboardLaunchHandoff) {
  const checklist = buildWorkspaceJourneyChecklist(handoff.blueprint)
    .map((item) => `- ${item}`)
    .join('\n')

  return [
    'Studio Home mission handoff imported.',
    `Mission: ${handoff.mission}`,
    `Blueprint source: ${handoff.blueprintSource}`,
    summarizeWorkspaceBlueprint(handoff.blueprint),
    'Firebase-like journey contract:',
    checklist,
    'Use this as the active objective for planning, code edits, preview, Viewport 3D, receipts, and runtime checks.',
    'Route prompt -> blueprint -> workspace -> preview -> annotate -> code -> publish receipts as one governed path.',
    'Keep claims honest: browser preview is review/preview; Studio Local or Cloud Stream requires capability evidence.',
  ].join('\n')
}
