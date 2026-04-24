'use client';

import { useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { Terminal as XTermType } from 'xterm';
import type { TerminalSession } from './terminalModels';
import { TerminalWebSocket } from './terminalWebSocket';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('useTerminalSessions');

type UseTerminalSessionsOptions = {
  initialSessionId?: string | null;
  initialCwd: string;
  initialShell?: string;
  terminalRef: MutableRefObject<XTermType | null>;
  websocketRef: MutableRefObject<TerminalWebSocket | null>;
  fitTerminal: (socket?: TerminalWebSocket | null) => void;
  writeTerminalError: (message: string) => void;
};

export function useTerminalSessions({
  initialSessionId,
  initialCwd,
  initialShell,
  terminalRef,
  websocketRef,
  fitTerminal,
  writeTerminalError,
}: UseTerminalSessionsOptions) {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId || null);
  const [isConnected, setIsConnected] = useState(false);

  const connectToSession = useCallback((sessionId: string, websocketUrl?: string) => {
    if (!terminalRef.current) return;

    websocketRef.current?.disconnect();
    terminalRef.current.clear();

    const ws = new TerminalWebSocket();

    if (websocketUrl) {
      ws.setRuntimeUrl(websocketUrl);
    }

    ws.onData = (data) => {
      terminalRef.current?.write(data);
    };

    ws.onConnect = () => {
      setIsConnected(true);
      terminalRef.current?.focus();
      fitTerminal(ws);
    };

    ws.onDisconnect = () => {
      setIsConnected(false);
    };

    ws.onError = (error) => {
      log.error('Terminal websocket error', { error });
      writeTerminalError('Connection error. Attempting to reconnect...');
    };

    websocketRef.current = ws;
    ws.connect(sessionId);
  }, [fitTerminal, terminalRef, websocketRef, writeTerminalError]);

  const createSession = useCallback(async (cwd?: string, shell?: string) => {
    try {
      const response = await fetch('/api/terminal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Terminal ${sessions.length + 1}`,
          cwd: cwd || initialCwd,
          shellPath: shell || initialShell,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create terminal session');
      }

      const data = await response.json();

      const newSession: TerminalSession = {
        id: data.sessionId,
        name: data.name || `Terminal ${sessions.length + 1}`,
        shell: data.shell || 'bash',
        cwd: data.cwd || cwd || '~',
        createdAt: new Date(),
        isActive: true,
      };

      setSessions((prev) => [...prev, newSession]);
      setActiveSessionId(newSession.id);
      connectToSession(newSession.id, data.websocketUrl);

      return newSession;
    } catch (error) {
      log.error('Failed to create terminal session', { error });
      writeTerminalError('Failed to create terminal session. Please try again.');

      return null;
    }
  }, [connectToSession, initialCwd, initialShell, sessions.length, writeTerminalError]);

  const closeSession = useCallback(async (sessionId: string) => {
    try {
      await fetch('/api/terminal/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const remaining = sessions.filter((session) => session.id !== sessionId);
      setSessions(remaining);

      if (sessionId !== activeSessionId) {
        return;
      }

      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
        connectToSession(remaining[0].id);
        return;
      }

      await createSession();
    } catch (error) {
      log.error('Failed to close terminal session', { error, sessionId });
    }
  }, [activeSessionId, connectToSession, createSession, sessions]);

  const renameSession = useCallback((sessionId: string, newName: string) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId ? { ...session, name: newName } : session
      )
    );
  }, []);

  const switchSession = useCallback((sessionId: string) => {
    if (sessionId === activeSessionId) return;

    setActiveSessionId(sessionId);
    connectToSession(sessionId);
  }, [activeSessionId, connectToSession]);

  return {
    activeSessionId,
    connectToSession,
    createSession,
    closeSession,
    isConnected,
    renameSession,
    sessions,
    setActiveSessionId,
    switchSession,
  };
}
