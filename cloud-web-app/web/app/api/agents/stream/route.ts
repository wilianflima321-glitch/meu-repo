import { NextRequest, NextResponse } from 'next/server'
import { getOrchestrator, OrchestrationTask } from '@/lib/agent-orchestrator'

/**
 * POST /api/agents/stream
 * Streams responses from multiple AI agents in parallel
 * 
 * Request body:
 * {
 *   "prompt": "string",
 *   "agents": ["architect", "designer", "engineer"],
 *   "priority": "high"
 * }
 * 
 * Response: Server-Sent Events (SSE) stream
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, agents = ['architect', 'designer', 'engineer'], priority = 'normal' } = body

    if (!prompt || !Array.isArray(agents) || agents.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: prompt and agents array required' },
        { status: 400 }
      )
    }

    // Create orchestration task
    const task: OrchestrationTask = {
      id: `task-${Date.now()}`,
      prompt,
      agents: agents as any[],
      priority: priority as any,
      timeout: 30000, // 30 seconds
      createdAt: Date.now()
    }

    const orchestrator = getOrchestrator()

    // Create SSE stream
    const encoder = new TextEncoder()
    let isClosed = false

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Execute agents in parallel and stream results
          const generator = await orchestrator.executeParallel(task)

          for await (const message of generator) {
            if (isClosed) break

            // Send SSE message
            const sseMessage = `data: ${JSON.stringify(message)}\n\n`
            controller.enqueue(encoder.encode(sseMessage))
          }

          // Send completion message
          const completionMessage = `data: ${JSON.stringify({ 
            type: 'complete', 
            taskId: task.id,
            timestamp: Date.now()
          })}\n\n`
          controller.enqueue(encoder.encode(completionMessage))

          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          const errorMessage = `data: ${JSON.stringify({ 
            type: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error',
            taskId: task.id
          })}\n\n`
          controller.enqueue(encoder.encode(errorMessage))
          controller.close()
        }
      },
      cancel() {
        isClosed = true
        orchestrator.cancelTask(task.id)
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/agents/stream/status
 * Get status of all agents
 */
export async function GET(request: NextRequest) {
  try {
    const orchestrator = getOrchestrator()
    const agents = orchestrator.getAgentStatus()

    return NextResponse.json({
      agents,
      timestamp: Date.now()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get agent status' },
      { status: 500 }
    )
  }
}
