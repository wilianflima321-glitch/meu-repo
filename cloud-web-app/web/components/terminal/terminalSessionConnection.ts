'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Terminal as XTermType } from 'xterm';
import { createComponentLogger } from '@/lib/observability/logger';
import { TerminalWebSocket } from './terminalWebSocket';

const log = createComponentLogger('terminalSessionConnection');

type ConnectTerminalSessionOptions = {
  sessionId: string;
  websocketUrl?: string;
  terminalRef: MutableRefObject<XTermType | null>;
  websocketRef: MutableRefObject<TerminalWebSocket | null>;
  fitTerminal: (socket?: TerminalWebSocket | null) => void;
  setIsConnected: Dispatch<SetStateAction<boolean>>;
  writeTerminalError: (message: string) => void;
};

export function connectTerminalSessionSocket({
  sessionId,
  websocketUrl,
  terminalRef,
  websocketRef,
  fitTerminal,
  setIsConnected,
  writeTerminalError,
}: ConnectTerminalSessionOptions) {
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
    log.error('Terminal websocket error', { error, sessionId });
    writeTerminalError('Connection error. Attempting to reconnect...');
  };

  websocketRef.current = ws;
  ws.connect(sessionId);
}
