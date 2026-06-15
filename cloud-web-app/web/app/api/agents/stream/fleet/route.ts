/**
 * GET /api/agents/stream/fleet — SSE stream for real-time AgentStatusPill updates
 *
 * BACKLOG §10.4 #31 — real-time agent fleet status via Server-Sent Events
 *
 * Sends events in the format:
 *   data: { agentId, status, mode, cost, updatedAt }
 */
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// SSE keepalive interval (ms)
const KEEPALIVE_INTERVAL_MS = 15_000

// Maximum stream duration (5 min) — client must reconnect
const MAX_STREAM_MS = 5 * 60 * 1000

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const projectId = req.nextUrl.searchParams.get('projectId')

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      let keepaliveTimer: ReturnType<typeof setInterval> | null = null
      let maxTimer: ReturnType<typeof setTimeout> | null = null

      function send(data: unknown) {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // client disconnected
          cleanup()
        }
      }

      function sendKeepalive() {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          cleanup()
        }
      }

      function cleanup() {
        if (closed) return
        closed = true
        if (keepaliveTimer) clearInterval(keepaliveTimer)
        if (maxTimer) clearTimeout(maxTimer)
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      // Send initial connection event
      send({
        type: 'connected',
        projectId: projectId ?? null,
        userId,
        timestamp: new Date().toISOString(),
      })

      // Keepalive ping to prevent proxy timeouts
      keepaliveTimer = setInterval(sendKeepalive, KEEPALIVE_INTERVAL_MS)

      // Auto-close after max duration (client reconnects)
      maxTimer = setTimeout(() => {
        send({ type: 'stream-end', reason: 'max-duration', timestamp: new Date().toISOString() })
        cleanup()
      }, MAX_STREAM_MS)

      // Abort on client disconnect
      req.signal.addEventListener('abort', cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disable Nginx buffering
    },
  })
}
