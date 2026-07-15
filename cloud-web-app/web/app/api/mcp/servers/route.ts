/**
 * GET  /api/mcp/servers — list all registered MCP servers for the authenticated user
 * POST /api/mcp/servers — register a new MCP server
 *
 * DEBT-DB-001: Fixed — uses typed Prisma access (McpServer model exists in schema).
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { createComponentLogger } from '@/lib/observability/logger'

export const runtime = 'nodejs'

const log = createComponentLogger('api/mcp/servers')

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const servers = await prisma.mcpServer.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        endpoint: true,
        transport: true,
        status: true,
        description: true,
        lastSeenAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ servers })
  } catch (error) {
    log.error('GET /api/mcp/servers failed', error)
    return NextResponse.json(
      {
        error: 'MCP_SERVERS_FETCH_FAILED',
        message: 'Failed to fetch MCP servers.',
        details: process.env.NODE_ENV !== 'production' ? (error as Error)?.message : undefined,
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    name?: string
    endpoint?: string
    transport?: 'stdio' | 'sse' | 'websocket'
    description?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, endpoint, transport = 'stdio', description } = body
  if (!name || !endpoint) {
    return NextResponse.json({ error: 'name and endpoint are required' }, { status: 400 })
  }

  // DEBT-DB-001: Web browser cannot use stdio transport — validate
  // Only Desktop (Tauri) can use stdio; web clients must use SSE or WebSocket.
  if (transport === 'stdio') {
    return NextResponse.json(
      {
        error: 'INVALID_TRANSPORT',
        message: 'stdio transport is only supported in Desktop (Tauri). Use "sse" or "websocket" for web.',
      },
      { status: 400 }
    )
  }

  try {
    const server = await prisma.mcpServer.create({
      data: {
        userId,
        name,
        endpoint,
        transport,
        description: description ?? null,
        status: 'registered',
      },
    })

    return NextResponse.json({ server }, { status: 201 })
  } catch (error) {
    log.error('POST /api/mcp/servers failed', error)
    return NextResponse.json(
      {
        error: 'MCP_SERVER_CREATE_FAILED',
        message: 'Failed to register MCP server.',
        details: process.env.NODE_ENV !== 'production' ? (error as Error)?.message : undefined,
      },
      { status: 500 }
    )
  }
}

