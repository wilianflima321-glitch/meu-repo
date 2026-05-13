import type { ConnectionType } from './websocket-runtime-contracts';

const HTTP_ONLY_PATHS = new Set(['/health', '/stats', '/metrics']);
const MODERN_RUNTIME_PATHS = new Set(['/', '/ws']);
const RESERVED_WS_PREFIXES = ['/export', '/terminal', '/lsp', '/ai', '/dap'];
const COLLAB_PREFIXES = ['/collaboration/', '/ws/'];

export function isHttpOnlyPath(pathname: string): boolean {
  return HTTP_ONLY_PATHS.has(pathname);
}

export function isModernRuntimePath(pathname: string): boolean {
  return MODERN_RUNTIME_PATHS.has(pathname);
}

export function isLegacyExportPath(pathname: string): boolean {
  return pathname === '/export' || pathname.startsWith('/export/');
}

export function isLegacyTerminalPath(pathname: string): boolean {
  return pathname === '/terminal' || pathname.startsWith('/terminal/');
}

export function isLegacyLspPath(pathname: string): boolean {
  return pathname === '/lsp' || pathname.startsWith('/lsp/');
}

export function isLegacyAiPath(pathname: string): boolean {
  return pathname === '/ai' || pathname.startsWith('/ai/');
}

export function isLegacyDapPath(pathname: string): boolean {
  return pathname === '/dap' || pathname.startsWith('/dap/');
}

export function isLegacyCollaborationPath(pathname: string): boolean {
  if (pathname === '/collaboration' || pathname === '/ws') {
    return true;
  }

  if (COLLAB_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  if (pathname === '/') {
    return false;
  }

  if (RESERVED_WS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return false;
  }

  return !HTTP_ONLY_PATHS.has(pathname);
}

export function resolveConnectionType(pathname: string): ConnectionType {
  if (isLegacyExportPath(pathname)) return 'export';
  if (isLegacyTerminalPath(pathname)) return 'terminal';
  if (isLegacyLspPath(pathname)) return 'lsp';
  if (isLegacyAiPath(pathname)) return 'ai';
  if (isLegacyDapPath(pathname)) return 'dap';
  if (isLegacyCollaborationPath(pathname) && !isModernRuntimePath(pathname)) return 'collaboration';
  return 'general';
}

export function resolveCollaborationRoomName(pathname: string): string {
  if (pathname === '/collaboration' || pathname === '/ws') {
    return 'default';
  }

  if (pathname.startsWith('/collaboration/')) {
    return decodeURIComponent(pathname.slice('/collaboration/'.length)) || 'default';
  }

  if (pathname.startsWith('/ws/')) {
    return decodeURIComponent(pathname.slice('/ws/'.length)) || 'default';
  }

  return decodeURIComponent(pathname.replace(/^\/+/, '')) || 'default';
}
