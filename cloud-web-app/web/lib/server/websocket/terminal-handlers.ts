import type { TerminalPtyManager, TerminalSessionConfig } from '../terminal-pty-runtime';
import type { WsClient, WsMessage } from '../websocket-runtime-contracts';
import { WS_MESSAGE_TYPES } from '../websocket-runtime-contracts';
import {
  asTerminalPayload,
  asWsRecord,
  readNumber,
  readString,
  readStringArray,
  readStringMap,
} from '../websocket-runtime-codecs';
import { createClientId } from './ids';

type TerminalHandlerContext = {
  terminalManager: TerminalPtyManager;
  ensureUserIdentity: (client: WsClient, userId: string | undefined) => string | null;
  sendToClient: (client: WsClient, message: WsMessage) => void;
  sendError: (client: WsClient, error: string) => void;
  subscribeToChannel: (client: WsClient, channelName: string) => void;
  broadcastToChannel: (channelName: string, message: WsMessage) => void;
  log: { warn: (message: string, payload?: unknown) => void };
};

export async function handleTerminalCreate(
  context: TerminalHandlerContext,
  client: WsClient,
  payload: unknown
): Promise<void> {
  const data = asWsRecord(payload);
  const userId = context.ensureUserIdentity(client, readString(data.userId));
  if (!userId) {
    context.sendToClient(client, {
      type: WS_MESSAGE_TYPES.TERMINAL_ERROR,
      channel: 'terminal',
      payload: { error: 'Authentication required for terminal creation' },
    });
    return;
  }

  try {
    const config: TerminalSessionConfig = {
      id: readString(data.sessionId) || createClientId(),
      userId,
      name: readString(data.name) || 'Terminal',
      cwd: readString(data.cwd) || process.cwd(),
      shell: readString(data.shell),
      args: readStringArray(data.args),
      env: readStringMap(data.env),
      cols: readNumber(data.cols),
      rows: readNumber(data.rows),
    };

    const session = await context.terminalManager.createSession(config);
    const channelName = `terminal:${session.id}`;
    context.subscribeToChannel(client, channelName);

    context.sendToClient(client, {
      type: WS_MESSAGE_TYPES.TERMINAL_CREATED,
      channel: channelName,
      payload: {
        sessionId: session.id,
        name: session.name,
        shell: session.shell,
        cwd: session.cwd,
      },
    });
  } catch (error) {
    context.sendToClient(client, {
      type: WS_MESSAGE_TYPES.TERMINAL_ERROR,
      channel: 'terminal',
      payload: {
        error: error instanceof Error ? error.message : 'Failed to create terminal',
      },
    });
  }
}

export function handleTerminalInput(
  context: TerminalHandlerContext,
  client: WsClient,
  payload: unknown
): void {
  const dataRecord = asWsRecord(payload);
  const sessionId = dataRecord.sessionId;
  const data = dataRecord.data;
  if (typeof sessionId !== 'string' || typeof data !== 'string') {
    context.sendError(client, 'Terminal input requires sessionId and data');
    return;
  }

  if (!context.terminalManager.write(sessionId, data)) {
    context.sendToClient(client, {
      type: WS_MESSAGE_TYPES.TERMINAL_ERROR,
      channel: `terminal:${sessionId}`,
      payload: { error: 'Terminal session is not available' },
    });
  }
}

export function handleTerminalResize(
  context: TerminalHandlerContext,
  client: WsClient,
  payload: unknown
): void {
  const data = asWsRecord(payload);
  const sessionId = data.sessionId;
  const cols = data.cols;
  const rows = data.rows;
  if (typeof sessionId !== 'string' || typeof cols !== 'number' || typeof rows !== 'number') {
    context.sendError(client, 'Terminal resize requires sessionId, cols and rows');
    return;
  }

  if (!context.terminalManager.resize(sessionId, cols, rows)) {
    context.sendToClient(client, {
      type: WS_MESSAGE_TYPES.TERMINAL_ERROR,
      channel: `terminal:${sessionId}`,
      payload: { error: 'Failed to resize terminal session' },
    });
  }
}

export async function handleTerminalKill(
  context: TerminalHandlerContext,
  client: WsClient,
  payload: unknown
): Promise<void> {
  const sessionId = asWsRecord(payload).sessionId;
  if (typeof sessionId !== 'string') {
    context.sendError(client, 'Terminal kill requires sessionId');
    return;
  }

  await context.terminalManager.killSession(sessionId);
}

export function setupTerminalEvents(context: TerminalHandlerContext): void {
  context.terminalManager.on('data', (output: unknown) => {
    const terminalOutput = asTerminalPayload(output);
    if (!terminalOutput) {
      context.log.warn('[Terminal] Ignoring malformed output event', output);
      return;
    }

    const channelName = `terminal:${terminalOutput.sessionId}`;
    context.broadcastToChannel(channelName, {
      type: WS_MESSAGE_TYPES.TERMINAL_DATA,
      channel: channelName,
      payload: terminalOutput,
    });
  });

  context.terminalManager.on('exit', (info: unknown) => {
    const terminalInfo = asTerminalPayload(info);
    if (!terminalInfo) {
      context.log.warn('[Terminal] Ignoring malformed exit event', info);
      return;
    }

    const channelName = `terminal:${terminalInfo.sessionId}`;
    context.broadcastToChannel(channelName, {
      type: WS_MESSAGE_TYPES.TERMINAL_EXIT,
      channel: channelName,
      payload: terminalInfo,
    });
  });
}
