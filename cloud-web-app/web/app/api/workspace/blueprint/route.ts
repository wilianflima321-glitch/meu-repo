import { NextRequest, NextResponse } from 'next/server'

import { buildWorkspaceBlueprint, type WorkspaceBlueprintMode } from '@/lib/product/workspace-blueprint'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_MISSION_LENGTH = 4_000
const ALLOWED_MODES = new Set<WorkspaceBlueprintMode>(['app', 'research', 'game', 'film', 'cloud', 'general'])

function normalizeMission(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_MISSION_LENGTH)
}

function normalizeMode(value: unknown): WorkspaceBlueprintMode | undefined {
  return typeof value === 'string' && ALLOWED_MODES.has(value as WorkspaceBlueprintMode)
    ? (value as WorkspaceBlueprintMode)
    : undefined
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as {
    mission?: unknown
    mode?: unknown
  }
  const mission = normalizeMission(payload.mission)
  if (!mission) {
    return NextResponse.json(
      {
        error: 'MISSION_REQUIRED',
        message: 'Provide a mission before generating a workspace blueprint.',
      },
      { status: 400 },
    )
  }

  const blueprint = buildWorkspaceBlueprint({
    mission,
    mode: normalizeMode(payload.mode),
  })

  return NextResponse.json({
    blueprint,
    state: 'needs-review',
    nextAction: 'Review the blueprint, then open the workspace, preview, annotations, code proposal, and evidence flow.',
  })
}
