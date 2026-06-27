export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type PostChatInput = {
  model?: string;
  messages: ChatMessage[];
  maxTokens?: number;
};

export type PostChatOptions = {
  headers?: Record<string, string>;
};

export function getByokHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const rawSettings = localStorage.getItem('settings');
    if (!rawSettings) return {};
    const settings = JSON.parse(rawSettings);
    if (!settings['ai.byok.enabled']) return {};

    const headers: Record<string, string> = {
      'x-aethel-byok-active': '1',
    };

    const openAIKey = settings['ai.byok.openaiKey'];
    const anthropicKey = settings['ai.byok.anthropicKey'];
    const googleKey = settings['ai.byok.googleKey'];
    const openrouterKey = settings['ai.byok.openrouterKey'];

    if (openAIKey) headers['x-aethel-byok-openai'] = String(openAIKey).trim();
    if (anthropicKey) headers['x-aethel-byok-anthropic'] = String(anthropicKey).trim();
    if (googleKey) headers['x-aethel-byok-google'] = String(googleKey).trim();
    if (openrouterKey) headers['x-aethel-byok-openrouter'] = String(openrouterKey).trim();

    return headers;
  } catch {
    return {};
  }
}

/**
 * Thin client wrapper around the Next.js AI proxy routes.
 * Server-side enforcement (auth/plan/metering) happens in /api/ai/chat.
 */
export async function postChat(input: PostChatInput, options: PostChatOptions = {}) {
  const byokHeaders = getByokHeaders();
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...byokHeaders,
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
