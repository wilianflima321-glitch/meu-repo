'use client';

import type { TerminalSession } from './terminalModels';
import {
  closeForgeTerminalSessionRequest,
  createForgeTerminalSessionRequest,
} from './forgeTerminalClient';

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
  /** When set, opens L.4 Forge sandbox lane instead of human host PTY. */
  forgeProjectId?: string;
  existingSandboxSessionId?: string;
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
  forgeProjectId,
  existingSandboxSessionId,
}: CreateTerminalSessionOptions): Promise<{
  session: TerminalSession;
  websocketUrl?: string;
}> {
  if (forgeProjectId) {
    const forge = await createForgeTerminalSessionRequest({
      projectId: forgeProjectId,
      projectRootPath: cwd || initialCwd,
      existingSandboxSessionId,
      sessionCount,
    });
    return { session: forge.session };
  }

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
      executionLane: 'human-host-pty',
    },
    websocketUrl: data.websocketUrl,
  };
}

export async function closeTerminalSessionRequest(
  sessionId: string,
  executionLane?: TerminalSession['executionLane'],
) {
  if (executionLane === 'forge-sandbox') {
    await closeForgeTerminalSessionRequest(sessionId);
    return;
  }
  await fetch('/api/terminal/close', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
}
