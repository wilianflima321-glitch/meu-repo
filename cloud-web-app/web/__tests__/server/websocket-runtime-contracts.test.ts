import { describe, expect, it } from 'vitest';

import {
  asTerminalPayload,
  asWsRecord,
  normalizeMessageType,
  normalizePath,
  parseWebSocketRequestUrl,
  readNumber,
  readString,
  readStringArray,
  readStringMap,
  resolveHost,
  resolvePort,
  toUint8Array,
} from '@/lib/server/websocket-runtime-codecs';
import {
  isHttpOnlyPath,
  isLegacyCollaborationPath,
  isModernRuntimePath,
  resolveCollaborationRoomName,
  resolveConnectionType,
} from '@/lib/server/websocket-runtime-routing';
import { WS_MESSAGE_TYPES } from '@/lib/server/websocket-runtime-contracts';

describe('websocket runtime codecs', () => {
  it('normalizes paths, ports, hosts, and compatibility message types', () => {
    const previousPort = process.env.WS_PORT;
    const previousHost = process.env.WS_HOST;
    process.env.WS_PORT = '4111';
    process.env.WS_HOST = '127.0.0.1';

    expect(resolvePort()).toBe(4111);
    expect(resolvePort(4999)).toBe(4999);
    expect(resolveHost()).toBe('127.0.0.1');
    expect(normalizePath('')).toBe('/');
    expect(normalizePath('/ws/')).toBe('/ws');
    expect(normalizeMessageType('AUTH')).toBe(WS_MESSAGE_TYPES.AUTH);
    expect(normalizeMessageType(' request ')).toBe('request');
    expect(normalizeMessageType(123)).toBe('');

    if (previousPort === undefined) delete process.env.WS_PORT;
    else process.env.WS_PORT = previousPort;
    if (previousHost === undefined) delete process.env.WS_HOST;
    else process.env.WS_HOST = previousHost;
  });

  it('safely narrows loosely typed payloads', () => {
    expect(asWsRecord({ ok: true })).toEqual({ ok: true });
    expect(asWsRecord(null)).toEqual({});
    expect(readString('session')).toBe('session');
    expect(readNumber(42)).toBe(42);
    expect(readStringArray(['a', 'b'])).toEqual(['a', 'b']);
    expect(readStringArray(['a', 1])).toBeUndefined();
    expect(readStringMap({ A: 'one', B: 'two' })).toEqual({ A: 'one', B: 'two' });
    expect(readStringMap({ A: 1 })).toBeUndefined();
    expect(asTerminalPayload({ sessionId: 'term-1', cwd: '/repo' })).toEqual({ sessionId: 'term-1', cwd: '/repo' });
    expect(asTerminalPayload({ cwd: '/repo' })).toBeNull();
  });

  it('converts websocket raw data into uint8 arrays only when supported', () => {
    expect(Array.from(toUint8Array('ok') ?? [])).toEqual([111, 107]);
    expect(Array.from(toUint8Array(Buffer.from('ok')) ?? [])).toEqual([111, 107]);
    expect(Array.from(toUint8Array([Buffer.from('o'), Buffer.from('k')]) ?? [])).toEqual([111, 107]);
    expect(toUint8Array({ bad: true } as never)).toBeNull();
  });

  it('parses request URLs with WHATWG semantics and repeated query params', () => {
    const parsed = parseWebSocketRequestUrl('/ws/session%201/?sessionId=s1&tag=a&tag=b&userId=u1');

    expect(parsed.pathname).toBe('/ws/session%201');
    expect(parsed.query.sessionId).toBe('s1');
    expect(parsed.query.userId).toBe('u1');
    expect(parsed.query.tag).toEqual(['a', 'b']);
    expect(parseWebSocketRequestUrl(null).pathname).toBe('/');
  });
});

describe('websocket runtime routing', () => {
  it('classifies modern, legacy, collaboration, and HTTP-only paths', () => {
    expect(isHttpOnlyPath('/health')).toBe(true);
    expect(isModernRuntimePath('/ws')).toBe(true);
    expect(isLegacyCollaborationPath('/collaboration/project-a')).toBe(true);
    expect(isLegacyCollaborationPath('/terminal/session')).toBe(false);
    expect(resolveConnectionType('/export/job-1')).toBe('export');
    expect(resolveConnectionType('/terminal/session')).toBe('terminal');
    expect(resolveConnectionType('/lsp/typescript')).toBe('lsp');
    expect(resolveConnectionType('/ai/session')).toBe('ai');
    expect(resolveConnectionType('/dap/session')).toBe('dap');
    expect(resolveConnectionType('/collaboration/project-a')).toBe('collaboration');
    expect(resolveConnectionType('/ws')).toBe('general');
  });

  it('normalizes collaboration room names without leaking URL encoding details', () => {
    expect(resolveCollaborationRoomName('/collaboration')).toBe('default');
    expect(resolveCollaborationRoomName('/ws')).toBe('default');
    expect(resolveCollaborationRoomName('/collaboration/project%20one')).toBe('project one');
    expect(resolveCollaborationRoomName('/ws/project%2Ftwo')).toBe('project/two');
    expect(resolveCollaborationRoomName('/custom-room')).toBe('custom-room');
  });
});
