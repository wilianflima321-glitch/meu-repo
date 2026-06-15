/**
 * GET  /api/plugins/list — list installed plugins
 * POST /api/plugins/install — install a plugin by registry ID
 *
 * BACKLOG §10.4 #33 / STRATEGY — Plugin lifecycle APIs
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // TODO: query Prisma for user's installed plugins when PluginInstall model is ready
  return NextResponse.json({
    plugins: [],
    _meta: {
      schemaPending: true,
      message: 'Plugin runtime (lib/plugins/host.ts) not yet implemented. BACKLOG §10.3 #25.',
    },
  })
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { pluginId?: string; version?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { pluginId, version = 'latest' } = body
  if (!pluginId) {
    return NextResponse.json({ error: 'pluginId is required' }, { status: 400 })
  }

  return NextResponse.json(
    {
      error: 'Plugin installation is pending implementation of lib/plugins/host.ts (BACKLOG §10.3 #25).',
      pluginId,
      version,
      _pending: true,
    },
    { status: 503 }
  )
}
