/**
 * Ghost Text Streamer
 * Handles SSE streams from the AI completion endpoint for low-latency Ghost Text.
 */

export interface GhostTextStreamOptions {
  prompt: string;
  maxTokens: number;
  temperature: number;
  provider?: string;
  onChunk: (text: string) => void;
  onComplete: (text: string) => void;
  onError: (err: Error) => void;
  signal: AbortSignal;
}

import { getByokHeaders } from '@/lib/ai'

export async function streamGhostText(options: GhostTextStreamOptions): Promise<void> {
  let accumulatedText = '';
  try {
    const res = await fetch('/api/ai/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getByokHeaders() },
      credentials: 'include',
      signal: options.signal,
      body: JSON.stringify({
        prompt: options.prompt,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        provider: options.provider,
        stream: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Stream failed: ${res.status} ${text}`);
    }

    if (!res.body) {
      throw new Error('ReadableStream not supported or no body');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (options.signal.aborted) break;

      const chunk = decoder.decode(value, { stream: true });
      // Very basic SSE parsing: extract data payload
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text || data.suggestion) {
              accumulatedText += (data.text || data.suggestion);
              options.onChunk(accumulatedText);
            }
          } catch (e) {
            // ignore JSON parse errors from partial chunks
          }
        }
      }
    }
    options.onComplete(accumulatedText);
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      options.onError(err);
    }
  }
}
