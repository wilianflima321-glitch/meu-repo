'use client';

import { useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { Terminal as XTermType } from 'xterm';
import type { TerminalSession } from './terminalModels';
import { createTerminalSessionRequest, closeTerminalSessionRequest } from './terminalSessionApi';
import { connectTerminalSessionSocket } from './terminalSessionConnection';
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
    connectTerminalSessionSocket({
      sessionId,
      websocketUrl,
      terminalRef,
      websocketRef,
      fitTerminal,
      setIsConnected,
      writeTerminalError,
    });
  }, [fitTerminal, terminalRef, websocketRef, writeTerminalError]);

  const createSession = useCallback(async (cwd?: string, shell?: string) => {
    try {
      const { session: newSession, websocketUrl } = await createTerminalSessionRequest({
        sessionCount: sessions.length,
        initialCwd,
        initialShell,
        cwd,
        shell,
      });

      setSessions((prev) => [...prev, newSession]);
      setActiveSessionId(newSession.id);
      connectToSession(newSession.id, websocketUrl);

      return newSession;
    } catch (error) {
      log.error('Failed to create terminal session', { error });
      writeTerminalError('Failed to create terminal session. Please try again.');

      return null;
    }
  }, [connectToSession, initialCwd, initialShell, sessions.length, writeTerminalError]);

  const closeSession = useCallback(async (sessionId: string) => {
    try {
      await closeTerminalSessionRequest(sessionId);
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
