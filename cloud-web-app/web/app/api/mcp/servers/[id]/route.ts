/**
 * GET    /api/mcp/servers/[id] — get MCP server detail
 * PATCH  /api/mcp/servers/[id] — update MCP server
 * DELETE /api/mcp/servers/[id] — remove MCP server
 *
 * DEBT-DB-001/DB-003: Fixed — typed Prisma access.
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
    const server = await prisma.mcpServer.findFirst({
      where: { id: params.id, userId },
    })

    if (!server) {
      return NextResponse.json({ error: 'MCP server not found' }, { status: 404 })
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
    // Verify ownership first
    const existing = await prisma.mcpServer.findFirst({
      where: { id: params.id, userId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'MCP server not found' }, { status: 404 })
    }

    const server = await prisma.mcpServer.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined ? { name: String(name) } : {}),
        ...(endpoint !== undefined ? { endpoint: String(endpoint) } : {}),
        ...(transport !== undefined ? { transport: String(transport) } : {}),
        ...(description !== undefined ? { description: description ? String(description) : null } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
      },
    })

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
    // Verify ownership before deleting
    const existing = await prisma.mcpServer.findFirst({
      where: { id: params.id, userId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'MCP server not found' }, { status: 404 })
    }

    await prisma.mcpServer.delete({ where: { id: params.id } })

    return NextResponse.json({ deleted: true })
  } catch (error) {
    log.error('DELETE /api/mcp/servers/[id] failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

