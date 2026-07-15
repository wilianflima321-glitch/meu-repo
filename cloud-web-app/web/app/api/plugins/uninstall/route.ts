/**
 * POST /api/plugins/uninstall — uninstall a plugin
 *
 * BACKLOG §10.4 #33 — Plugin lifecycle
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { uninstallPlugin } from '@/lib/plugins/host'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { pluginId?: string; projectId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { pluginId, projectId } = body
  if (!pluginId) {
    return NextResponse.json({ error: 'pluginId is required' }, { status: 400 })
  }

  try {
    await uninstallPlugin(userId, pluginId);
    return NextResponse.json({ success: true, pluginId, projectId: projectId ?? null });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to uninstall plugin' }, { status: 500 });
  }
}
