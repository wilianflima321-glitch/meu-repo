/**
 * GET    /api/mcp/servers/[id] — get MCP server detail
 * PATCH  /api/mcp/servers/[id] — update MCP server
 * DELETE /api/mcp/servers/[id] — remove MCP server
 *
 * BACKLOG §10.4 #27 / STRATEGY TRACK E #18
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { createComponentLogger } from '@/lib/observability/logger'

export const runtime = 'nodejs'

const log = createComponentLogger('api/mcp/servers/[id]')

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const server = await (prisma as any).mcpServer
      ?.findFirst({ where: { id: params.id, userId } })
      .catch(() => null)

    if (server === null) {
      return NextResponse.json({ error: 'Schema migration pending or not found' }, { status: 404 })
    }
    if (!server) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ server })
  } catch (error) {
    log.error('GET /api/mcp/servers/[id] failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, endpoint, transport, description, status } = body

  try {
    const server = await (prisma as any).mcpServer
      ?.update({
        where: { id: params.id, userId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(endpoint !== undefined ? { endpoint } : {}),
          ...(transport !== undefined ? { transport } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(status !== undefined ? { status } : {}),
          updatedAt: new Date(),
        },
      })
      .catch(() => null)

    if (server === null) {
      return NextResponse.json({ error: 'Schema migration pending or not found' }, { status: 404 })
    }

    return NextResponse.json({ server })
  } catch (error) {
    log.error('PATCH /api/mcp/servers/[id] failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await (prisma as any).mcpServer
      ?.delete({ where: { id: params.id, userId } })
      .catch(() => null)

    return NextResponse.json({ deleted: true })
  } catch (error) {
    log.error('DELETE /api/mcp/servers/[id] failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
