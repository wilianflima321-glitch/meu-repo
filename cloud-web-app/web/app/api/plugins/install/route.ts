/**
 * POST /api/plugins/install — install a plugin
 *
 * BACKLOG §10.4 #33 — Plugin lifecycle
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { pluginId?: string; version?: string; projectId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { pluginId, version = 'latest', projectId } = body
  if (!pluginId) {
    return NextResponse.json({ error: 'pluginId is required' }, { status: 400 })
  }

  return NextResponse.json(
    {
      error: 'Plugin installation pending lib/plugins/host.ts implementation (BACKLOG §10.3 #25).',
      pluginId,
      version,
      projectId: projectId ?? null,
      _pending: true,
    },
    { status: 503 }
  )
}
