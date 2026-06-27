/**
 * GET  /api/plugins/list — list installed plugins
 * POST /api/plugins/install — install a plugin by registry ID
 *
 * BACKLOG §10.4 #33 / STRATEGY — Plugin lifecycle APIs
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { listInstalledPlugins, installPlugin } from '@/lib/plugins/host'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plugins = await listInstalledPlugins(userId);
  return NextResponse.json({
    plugins,
    _meta: {
      message: 'Plugin runtime active',
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

  try {
    const install = await installPlugin(userId, pluginId, version);
    return NextResponse.json(
      {
        success: true,
        pluginId,
        version,
        install,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json({ error: 'Failed to install plugin' }, { status: 500 });
  }
}
