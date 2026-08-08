/**
 * Chat UX P0 — Inline AI must consume a real token stream, not a completed fetch typewriter.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { streamPlainChat } from '@/lib/ai-chat-advanced-client'

function makeStreamResponse(chunks: string[], ok = true, status = 200): Response {
  const encoder = new TextEncoder()
  let index = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(chunks[index]))
      index += 1
    },
  })
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    statusText: ok ? 'OK' : 'Error',
  })
}

describe('streamPlainChat (Inline AI streaming)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('delivers incremental deltas before the stream completes', async () => {
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
              controller.enqueue(encoder.encode('Hel'))
              step = 1
              return
            }
            if (step === 1) {
              await secondChunkGate
              controller.enqueue(encoder.encode('lo'))
              step = 2
              return
            }
            controller.close()
          },
        })
        return new Response(body, { status: 200 })
      }),
    )

    const deltasSeenBeforeComplete: string[] = []
    const done = streamPlainChat({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'test-model',
      onDelta: (chunk) => {
        deltas.push(chunk)
        if (deltas.length === 1) {
          deltasSeenBeforeComplete.push(...deltas)
          resolveSecond?.()
        }
      },
    })

    const result = await done
    expect(deltasSeenBeforeComplete).toEqual(['Hel'])
    expect(deltas).toEqual(['Hel', 'lo'])
    expect(result.content).toBe('Hello')
  })

  it('fail-closes on non-OK HTTP without inventing content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: 'AI_PROVIDER_UNAVAILABLE', message: 'down' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(
      streamPlainChat({
        messages: [{ role: 'user', content: 'hi' }],
        model: 'test-model',
        onDelta: () => undefined,
      }),
    ).rejects.toMatchObject({ code: 'AI_PROVIDER_UNAVAILABLE', status: 503 })
  })

  it('does not treat a completed JSON blob as a stream success path helper', async () => {
    // Guard: streamPlainChat must read body chunks, not response.json() once.
    const fetchMock = vi.fn(async () => makeStreamResponse(['token-a', 'token-b']))
    vi.stubGlobal('fetch', fetchMock)

    const deltas: string[] = []
    const result = await streamPlainChat({
      messages: [{ role: 'user', content: 'stream please' }],
      model: 'test-model',
      onDelta: (c) => deltas.push(c),
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ai/stream',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(deltas.join('')).toBe('token-atoken-b')
    expect(result.content).toBe('token-atoken-b')
  })
})
