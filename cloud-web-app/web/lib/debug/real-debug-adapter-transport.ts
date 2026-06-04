import type { DebugConfiguration, DebugEvent } from './real-debug-adapter-contracts';

export async function startDebugAdapterSession(config: DebugConfiguration): Promise<string> {
  const response = await fetch('/api/dap/session/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: config.type,
      workspaceRoot: config.cwd,
      cwd: config.cwd,
      env: config.env,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to start debug session');
  }

  const data = await response.json();
  return data.sessionId;
}

export async function sendDebugAdapterRequest<T = Record<string, unknown>>(
  sessionId: string | null,
  command: string,
  args: Record<string, unknown>,
): Promise<T> {
  if (!sessionId) {
    throw new Error('No active debug session');
  }

  const response = await fetch('/api/dap/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      command,
      arguments: args,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `DAP request failed: ${command}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || `DAP request failed: ${command}`);
  }

  return (data.body || {}) as T;
}

export async function fetchDebugAdapterEvents(sessionId: string, since: number): Promise<DebugEvent[]> {
  const response = await fetch(`/api/dap/events?sessionId=${sessionId}&since=${since}`);
  if (!response.ok) return [];

  const data = await response.json();
  return Array.isArray(data.events) ? data.events : [];
}
