import type { RawData } from 'ws';
import { createRequire } from 'module';
import type { ParsedUrlQuery } from 'querystring';
import type { parse as parseUrl } from 'url';

import type { TerminalRuntimePayload, WsRecord } from './websocket-runtime-contracts';

const require = createRequire(import.meta.url);
const { WS_MESSAGE_TYPES } = require('./websocket-runtime-contracts.ts') as typeof import('./websocket-runtime-contracts');

export function resolvePort(explicit?: number): number {
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  const rawPort =
    process.env.WS_PORT ||
    process.env.AETHEL_WS_PORT ||
    process.env.RUNTIME_PORT ||
    '3001';
  const parsed = Number.parseInt(rawPort, 10);
  return Number.isFinite(parsed) ? parsed : 3001;
}

export function resolveHost(): string {
  return process.env.WS_HOST || process.env.AETHEL_WS_HOST || '0.0.0.0';
}

export function normalizePath(pathname?: string | null): string {
  if (!pathname || pathname.trim() === '') {
    return '/';
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function asParsedQuery(query: ReturnType<typeof parseUrl>['query']): ParsedUrlQuery {
  return query && typeof query === 'object' ? query : {};
}

export function asWsRecord(value: unknown): WsRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as WsRecord) : {};
}

export function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function readStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined;
}

export function readStringMap(value: unknown): Record<string, string> | undefined {
  if (value == null) {
    return undefined;
  }

  const record = asWsRecord(value);
  const entries = Object.entries(record);
  if (!entries.every(([, entryValue]) => typeof entryValue === 'string')) {
    return undefined;
  }

  return Object.fromEntries(entries) as Record<string, string>;
}

export function asTerminalPayload(value: unknown): TerminalRuntimePayload | null {
  const record = asWsRecord(value);
  const sessionId = readString(record.sessionId);
  return sessionId ? ({ ...record, sessionId } as TerminalRuntimePayload) : null;
}

export function normalizeMessageType(type: unknown): string {
  if (typeof type !== 'string') {
    return '';
  }

  switch (type.trim().toUpperCase()) {
    case 'AUTH':
      return WS_MESSAGE_TYPES.AUTH;
    case 'PING':
      return WS_MESSAGE_TYPES.PING;
    case 'PONG':
      return WS_MESSAGE_TYPES.PONG;
    case 'SUBSCRIBE':
      return WS_MESSAGE_TYPES.SUBSCRIBE;
    case 'UNSUBSCRIBE':
      return WS_MESSAGE_TYPES.UNSUBSCRIBE;
    case 'REQUEST':
      return 'request';
    default:
      return type.trim();
  }
}

export function toUint8Array(data: RawData): Uint8Array | null {
  if (typeof data === 'string') {
    return Uint8Array.from(Buffer.from(data));
  }

  if (Array.isArray(data)) {
    return Uint8Array.from(Buffer.concat(data));
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }

  return null;
}
