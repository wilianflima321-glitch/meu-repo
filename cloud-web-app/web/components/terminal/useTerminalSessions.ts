'use client';

import { useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { Terminal as XTermType } from 'xterm';
import type { TerminalSession, TerminalSocketHandle } from './terminalModels';
import { createTerminalSessionRequest, closeTerminalSessionRequest } from './terminalSessionApi';
import { ForgeTerminalSocket } from './forgeTerminalClient';
import { connectTerminalSessionSocket } from './terminalSessionConnection';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('useTerminalSessions');

type UseTerminalSessionsOptions = {
  initialSessionId?: string | null;
  initialCwd: string;
  initialShell?: string;
  /** When set, enables "New Forge sandbox" IDE entry (L.4). */
  forgeProjectId?: string;
  existingSandboxSessionId?: string;
  terminalRef: MutableRefObject<XTermType | null>;
  websocketRef: MutableRefObject<TerminalSocketHandle | null>;
  fitTerminal: (socket?: TerminalSocketHandle | null) => void;
  writeTerminalError: (message: string) => void;
};

export function useTerminalSessions({
  initialSessionId,
  initialCwd,
  initialShell,
  forgeProjectId,
  existingSandboxSessionId,
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

  const attachForgeSession = useCallback(async (session: TerminalSession) => {
    websocketRef.current?.disconnect();
    setIsConnected(false);

    const term = terminalRef.current;
    term?.clear();
    term?.writeln('\x1b[36m[Forge sandbox]\x1b[0m AgentShellPolicy lane — not host PTY.');
    term?.writeln(
      `\x1b[90msession=${session.forgeSessionId || session.id} provider=${session.provider || 'local-isolated'}\x1b[0m`,
    );
    term?.writeln(
      '\x1b[90mAttaching duplex (stdin/stdout pipes). True sandbox PTY remains HELD.\x1b[0m',
    );

    const socket = new ForgeTerminalSocket();
    socket.onData = (data) => {
      terminalRef.current?.write(data);
    };
    socket.onConnect = () => {
      setIsConnected(true);
      terminalRef.current?.writeln(
        '\x1b[32mForge duplex ready\x1b[0m \x1b[90m(mode=sandbox-exec-duplex, pty=false)\x1b[0m',
      );
      terminalRef.current?.focus();
      fitTerminal(socket);
    };
    socket.onDisconnect = () => {
      setIsConnected(false);
    };
    socket.onError = (error) => {
      const message = typeof error === 'string' ? error : 'Forge duplex connection error';
      log.error('Forge terminal duplex error', { error: message, sessionId: session.id });
      writeTerminalError(`${message} — fail-closed (no host PTY fallback).`);
      setIsConnected(false);
    };

    websocketRef.current = socket;
    socket.connect(session.forgeSessionId || session.id);
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

  const createForgeSession = useCallback(async () => {
    if (!forgeProjectId) {
      writeTerminalError('Forge sandbox terminal requires a bound projectId.');
      return null;
    }
    try {
      const { session: newSession } = await createTerminalSessionRequest({
        sessionCount: sessions.length,
        initialCwd,
        cwd: initialCwd,
        forgeProjectId,
        existingSandboxSessionId,
      });

      setSessions((prev) => [...prev, newSession]);
      setActiveSessionId(newSession.id);
      await attachForgeSession(newSession);
      return newSession;
    } catch (error) {
      log.error('Failed to create Forge sandbox terminal', { error });
      writeTerminalError(
        error instanceof Error
          ? error.message
          : 'Failed to open Forge sandbox terminal (fail-closed).',
      );
      return null;
    }
  }, [
    attachForgeSession,
    existingSandboxSessionId,
    forgeProjectId,
    initialCwd,
    sessions.length,
    writeTerminalError,
  ]);

  const closeSession = useCallback(async (sessionId: string) => {
    try {
      const closing = sessions.find((session) => session.id === sessionId);
      await closeTerminalSessionRequest(sessionId, closing?.executionLane);
      const remaining = sessions.filter((session) => session.id !== sessionId);
      setSessions(remaining);

      if (sessionId !== activeSessionId) {
        return;
      }

      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
        if (remaining[0].executionLane === 'forge-sandbox') {
          await attachForgeSession(remaining[0]);
        } else {
          connectToSession(remaining[0].id);
        }
        return;
      }

      await createSession();
    } catch (error) {
      log.error('Failed to close terminal session', { error, sessionId });
    }
  }, [activeSessionId, attachForgeSession, connectToSession, createSession, sessions]);

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
    const target = sessions.find((session) => session.id === sessionId);
    if (target?.executionLane === 'forge-sandbox') {
      void attachForgeSession(target);
      return;
    }
    connectToSession(sessionId);
  }, [activeSessionId, attachForgeSession, connectToSession, sessions]);

  return {
    activeSessionId,
    connectToSession,
    createSession,
    createForgeSession,
    closeSession,
    forgeProjectId,
    isConnected,
    renameSession,
    sessions,
    setActiveSessionId,
    switchSession,
  };
}
