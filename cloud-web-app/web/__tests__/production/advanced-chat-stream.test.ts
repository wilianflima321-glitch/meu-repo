/**
 * R19 — Advanced chat must consume real SSE token deltas, not a completed JSON typewriter.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { streamAdvancedChat, AdvancedChatRequestError } from '@/lib/ai-chat-advanced-client'

function sseBlock(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`
}

describe('streamAdvancedChat (AIChatPanelPro / chat-advanced)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('delivers incremental SSE deltas before the stream completes', async () => {
    const deltas: string[] = []
    let resolveSecond: (() => void) | undefined
    const secondChunkGate = new Promise<void>((resolve) => {
      resolveSecond = resolve
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const encoder = new TextEncoder()
        let step = 0
        const body = new ReadableStream<Uint8Array>({
          async pull(controller) {
            if (step === 0) {
              controller.enqueue(
                encoder.encode(
                  sseBlock({ type: 'meta', traceId: 'tr-1', model: 'test-model' }) +
                    sseBlock({ type: 'content', delta: 'Hel', content: 'Hel' }),
                ),
              )
              step = 1
              return
            }
            if (step === 1) {
              await secondChunkGate
              controller.enqueue(
                encoder.encode(
                  sseBlock({ type: 'content', delta: 'lo', content: 'Hello' }) +
                    sseBlock({ type: 'done', tokensUsed: 2, traceId: 'tr-1', content: 'Hello' }),
                ),
              )
              step = 2
              return
            }
            controller.close()
          },
        })
        return new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        })
      }),
    )

    const seenBeforeComplete: string[] = []
    const done = streamAdvancedChat({
      message: 'hi',
      model: 'test-model',
      messages: [{ role: 'user', content: 'hi' }],
      profileOverride: { qualityMode: 'standard', agentCount: 1, enableWebResearch: false },
      onDelta: (chunk) => {
        deltas.push(chunk)
        if (deltas.length === 1) {
          seenBeforeComplete.push(...deltas)
          resolveSecond?.()
        }
      },
    })

    const result = await done
    expect(seenBeforeComplete).toEqual(['Hel'])
    expect(deltas).toEqual(['Hel', 'lo'])
    expect(result.content).toBe('Hello')
    expect(result.traceId).toBe('tr-1')
    expect(result.aborted).toBe(false)

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ai/chat-advanced',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"stream":true'),
      }),
    )
  })

  it('fail-closes when the response is JSON instead of an event-stream (no theater)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ message: { role: 'assistant', content: 'done' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(
      streamAdvancedChat({
        message: 'hi',
        model: 'test-model',
        messages: [{ role: 'user', content: 'hi' }],
        profileOverride: { qualityMode: 'standard', agentCount: 1, enableWebResearch: false },
        onDelta: () => undefined,
      }),
    ).rejects.toMatchObject({ code: 'AI_STREAM_UNAVAILABLE', status: 502 })
  })

  it('rejects multi-agent profiles client-side without inventing a stream', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      streamAdvancedChat({
        message: 'deep audit',
        model: 'test-model',
        messages: [{ role: 'user', content: 'deep audit' }],
        profileOverride: { qualityMode: 'studio', agentCount: 3, enableWebResearch: true },
        onDelta: () => undefined,
      }),
    ).rejects.toBeInstanceOf(AdvancedChatRequestError)

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
