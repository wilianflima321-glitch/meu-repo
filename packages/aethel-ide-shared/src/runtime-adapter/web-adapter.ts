import type { RuntimeAdapter } from './types';

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return (await response.json()) as T;
}

export function createWebRuntimeAdapter(): RuntimeAdapter {
  return {
    fs: {
      read: (path) =>
        jsonFetch<{ content: string }>(`/api/files/fs?path=${encodeURIComponent(path)}`).then(
          (payload) => payload.content,
        ),
      write: (path, content) =>
        jsonFetch('/api/files/fs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, content }),
        }).then(() => undefined),
      list: (path) =>
        jsonFetch<{ entries: Array<{ path: string; type: 'file' | 'folder' }> }>(
          `/api/files/fs?path=${encodeURIComponent(path)}&list=1`,
        ).then((payload) => payload.entries),
    },
    terminal: {
      createSession: async () => ({ id: 'web-terminal' }),
      write: async () => undefined,
      close: async () => undefined,
    },
    runtime: {
      probe: () =>
        jsonFetch<{ available?: boolean; reason?: string }>('/api/runtime/local-capabilities').then(
          (payload) => ({
            lane: 'browser-preview',
            available: Boolean(payload.available),
            reason: payload.reason,
            checkedAt: new Date().toISOString(),
          }),
        ),
      routeJob: (kind) =>
        jsonFetch<{ lane?: 'browser-preview' | 'local-native' | 'cloud-sandbox'; reason?: string }>(
          '/api/runtime/local-capabilities',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind }),
          },
        ).then((payload) => ({
          lane: payload.lane ?? 'browser-preview',
          reason: payload.reason ?? 'Browser preview is the safe default.',
        })),
    },
    ai: {
      complete: ({ prompt, model }) =>
        jsonFetch<{ text?: string; content?: string; costUsd?: number }>('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], model }),
        }).then((payload) => ({
          text: payload.text ?? payload.content ?? '',
          costUsd: payload.costUsd,
        })),
    },
    notifications: {
      notify: ({ title, body }) => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('aethel:notify', { detail: { title, body } }));
      },
    },
    window: {
      minimize: () => undefined,
      maximize: () => undefined,
      close: () => {
        if (typeof window !== 'undefined') window.close();
      },
    },
  };
}
