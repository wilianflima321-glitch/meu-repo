import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { createStudioSession } from '@/lib/server/studio-home-store'
import { enforceRateLimit } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

type Body = {
  projectId?: string
  mission?: string
  qualityMode?: 'standard' | 'delivery' | 'studio'
  budgetCap?: number
}

function sanitizeProjectId(value: unknown): string {
  const raw = String(value || '').trim()
  if (!raw) return 'default'
  const normalized = raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  return normalized || 'default'
}

function sanitizeMission(value: unknown): string {
  const mission = String(value || '').trim()
  if (!mission) {
    return 'Build a production-ready studio workflow with chat, preview and deterministic apply.'
  }
  return mission.slice(0, 2000)
}

function sanitizeQualityMode(value: unknown): 'standard' | 'delivery' | 'studio' {
  const mode = String(value || '').trim()
  if (mode === 'standard' || mode === 'delivery' || mode === 'studio') return mode
  return 'studio'
}

function sanitizeBudgetCap(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 30
  return Math.max(5, Math.min(100000, Math.round(n)))
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'studio-session-start',
      key: auth.userId,
      max: 15,
      windowMs: 60 * 60 * 1000,
      message: 'Too many studio session starts. Please retry later.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const body = (await req.json().catch(() => ({}))) as Body
    const session = await createStudioSession({
      userId: auth.userId,
      projectId: sanitizeProjectId(body.projectId),
      mission: sanitizeMission(body.mission),
      qualityMode: sanitizeQualityMode(body.qualityMode),
      budgetCap: sanitizeBudgetCap(body.budgetCap),
    })

    return NextResponse.json({
      ok: true,
      session,
      capability: 'STUDIO_HOME_SESSION',
      capabilityStatus: 'IMPLEMENTED',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start studio session'
    if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message }, { status: 401 })
    }
    return NextResponse.json({ error: 'STUDIO_SESSION_START_FAILED', message }, { status: 500 })
  }
}
