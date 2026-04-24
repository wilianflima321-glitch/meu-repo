'use client';

import type { TerminalSession } from './terminalModels';

type CreateTerminalSessionResponse = {
  sessionId: string;
  name?: string;
  shell?: string;
  cwd?: string;
  websocketUrl?: string;
};

type CreateTerminalSessionOptions = {
  sessionCount: number;
  initialCwd: string;
  initialShell?: string;
  cwd?: string;
  shell?: string;
};

export function getTerminalSessionName(sessionCount: number) {
  return `Terminal ${sessionCount + 1}`;
}

export async function createTerminalSessionRequest({
  sessionCount,
  initialCwd,
  initialShell,
  cwd,
  shell,
}: CreateTerminalSessionOptions): Promise<{
  session: TerminalSession;
  websocketUrl?: string;
}> {
  const fallbackName = getTerminalSessionName(sessionCount);
  const response = await fetch('/api/terminal/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: fallbackName,
      cwd: cwd || initialCwd,
      shellPath: shell || initialShell,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create terminal session');
  }

  const data = (await response.json()) as CreateTerminalSessionResponse;

  return {
    session: {
      id: data.sessionId,
      name: data.name || fallbackName,
      shell: data.shell || 'bash',
      cwd: data.cwd || cwd || '~',
      createdAt: new Date(),
      isActive: true,
    },
    websocketUrl: data.websocketUrl,
  };
}

export async function closeTerminalSessionRequest(sessionId: string) {
  await fetch('/api/terminal/close', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
}
