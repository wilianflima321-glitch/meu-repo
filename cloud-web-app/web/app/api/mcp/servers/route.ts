/**
 * GET  /api/mcp/servers — list all registered MCP servers for the authenticated user
 * POST /api/mcp/servers — register a new MCP server
 *
 * BACKLOG §10.4 #27 / STRATEGY TRACK E #18
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
    // McpServer model is defined in BACKLOG §11 data layer — may not exist yet.
    // If the model is missing, we return an empty list with a pending flag.
    const servers = await (prisma as any).mcpServer
      ?.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          endpoint: true,
          transport: true,
          status: true,
          lastSeenAt: true,
          createdAt: true,
        },
      })
      .catch(() => null)

    if (servers === null) {
      // Schema migration pending — return honest empty response
      return NextResponse.json({
        servers: [],
        _meta: { schemaPending: true, message: 'McpServer Prisma model not yet migrated.' },
      })
    }

    return NextResponse.json({ servers })
  } catch (error) {
    log.error('GET /api/mcp/servers failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

  try {
    const server = await (prisma as any).mcpServer
      ?.create({
        data: {
          userId,
          name,
          endpoint,
          transport,
          description: description ?? null,
          status: 'registered',
        },
      })
      .catch(() => null)

    if (server === null) {
      return NextResponse.json(
        { error: 'Schema migration pending — McpServer model not yet available.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ server }, { status: 201 })
  } catch (error) {
    log.error('POST /api/mcp/servers failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
