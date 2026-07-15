/**
 * POST /api/plugins/install — install a plugin
 *
 * DEBT-PLUGIN-001: Fixed — creates InstalledExtension record in DB.
 * Marketplace install now works end-to-end instead of returning 503.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { createComponentLogger } from '@/lib/observability/logger'

export const runtime = 'nodejs'

const log = createComponentLogger('api/plugins/install')

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

  try {
    // Check if already installed for this user
    const existing = await prisma.pluginInstall.findUnique({
      where: {
        userId_pluginId: { userId, pluginId },
      },
    })

    if (existing) {
      return NextResponse.json({
        status: 'already_installed',
        pluginId: pluginId,
        installedAt: existing.installedAt.toISOString(),
      })
    }

    // Install the plugin
    const installed = await prisma.pluginInstall.create({
      data: {
        userId,
        pluginId: pluginId,
      },
    })

    log.info('plugin.installed', {
      userId,
      pluginId,
      version,
      projectId: projectId ?? null,
    })

    return NextResponse.json({
      status: 'installed',
      id: installed.id,
      pluginId: pluginId,
      version,
      installedAt: installed.installedAt.toISOString(),
    })
  } catch (error) {
    log.error('Plugin install failed', error)
    return NextResponse.json(
      {
        error: 'PLUGIN_INSTALL_FAILED',
        message: 'Failed to install plugin. Please try again.',
        details: process.env.NODE_ENV !== 'production' ? (error as Error)?.message : undefined,
      },
      { status: 500 }
    )
  }
}

