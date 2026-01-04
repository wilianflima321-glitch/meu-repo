export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type PostChatInput = {
  model?: string;
  messages: ChatMessage[];
  maxTokens?: number;
};

export type PostChatOptions = {
  headers?: Record<string, string>;
};

/**
 * Thin client wrapper around the Next.js AI proxy routes.
 * Server-side enforcement (auth/plan/metering) happens in /api/ai/chat.
 */
export async function postChat(input: PostChatInput, options: PostChatOptions = {}) {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: JSON.stringify(input),
  });

  const text = await res.text();
  const data = (() => {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return { content: text };
    }
  })();

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `HTTP ${res.status}`;
    throw new Error(typeof message === 'string' ? message : `HTTP ${res.status}`);
  }

  return data;
}
