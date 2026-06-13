import jwt from 'jsonwebtoken';

import { createComponentLogger } from '../../observability/logger.ts';
import { WS_MESSAGE_TYPES, type DecodedAuthPayload, type WsClient, type WsMetadata } from '../websocket-runtime-contracts.ts';
import { asWsRecord, readString } from '../websocket-runtime-codecs.ts';
import { sendToClient } from './transport.ts';

const log = createComponentLogger('server/websocket-auth');

export type WsAuthenticatedCallback = (event: { clientId: string; userId: string }) => void;

export function isGuestAuthAllowed(): boolean {
  const override = process.env.AETHEL_ALLOW_INSECURE_WS_AUTH;
  if (override === 'true') {
    return true;
  }
  if (override === 'false') {
    return false;
  }
  return process.env.NODE_ENV !== 'production';
}

export function getJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'your-secret-key-change-in-production') {
    return null;
  }
  return secret;
}

export function verifyJwtToken(token: string): DecodedAuthPayload | null {
  const secret = getJwtSecret();
  if (!secret) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload & DecodedAuthPayload;
    if (!decoded.userId) {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    log.warn('[WebSocket] JWT verification failed', error);
    return null;
  }
}

export function setClientIdentity(client: WsClient, userId: string, metadata: WsMetadata): void {
  client.userId = userId;
  client.metadata = {
    ...client.metadata,
    ...metadata,
    authenticatedAt: Date.now(),
  };
}

export function ensureUserIdentity(client: WsClient, requestedUserId?: string): string | null {
  if (client.userId) {
    return client.userId;
  }

  if (!isGuestAuthAllowed()) {
    return null;
  }

  const userId = requestedUserId || `guest_${client.id}`;
  setClientIdentity(client, userId, { authMode: 'guest' });
  return userId;
}

export function handleClientAuth(
  client: WsClient,
  payload: unknown,
  closeOnFailure: boolean,
  onAuthenticated?: WsAuthenticatedCallback
): void {
  const data = asWsRecord(payload);
  const token = readString(data.token)?.trim() || '';
  const requestedUserId = readString(data.userId)?.trim() || '';

  if (token) {
    const decoded = verifyJwtToken(token);
    if (!decoded) {
      sendToClient(client, {
        type: WS_MESSAGE_TYPES.AUTH_ERROR,
        channel: 'system',
        payload: { error: 'Invalid or expired token' },
      });
      if (closeOnFailure) {
        setTimeout(() => client.ws.close(4001, 'Invalid token'), 100);
      }
      return;
    }

    setClientIdentity(client, decoded.userId, {
      email: decoded.email,
      role: decoded.role,
      authMode: 'jwt',
    });
    sendToClient(client, {
      type: WS_MESSAGE_TYPES.AUTH_SUCCESS,
      channel: 'system',
      payload: {
        userId: decoded.userId,
        role: decoded.role,
      },
    });
    onAuthenticated?.({ clientId: client.id, userId: decoded.userId });
    return;
  }

  const fallbackUserId = ensureUserIdentity(client, requestedUserId || undefined);
  if (!fallbackUserId) {
    sendToClient(client, {
      type: WS_MESSAGE_TYPES.AUTH_ERROR,
      channel: 'system',
      payload: { error: 'Authentication required' },
    });
    if (closeOnFailure) {
      setTimeout(() => client.ws.close(4001, 'Authentication required'), 100);
    }
    return;
  }

  sendToClient(client, {
    type: WS_MESSAGE_TYPES.AUTH_SUCCESS,
    channel: 'system',
    payload: {
      userId: fallbackUserId,
      role: 'guest',
      insecure: true,
    },
  });
  onAuthenticated?.({ clientId: client.id, userId: fallbackUserId });
}
