import type { IncomingMessage, ServerResponse } from 'http';

import { normalizePath, parseWebSocketRequestUrl } from '../websocket-runtime-codecs';

export interface RuntimeHttpRoutes {
  health: () => unknown;
  stats: () => unknown;
  metrics: () => string;
}

export function handleRuntimeHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  routes: RuntimeHttpRoutes
): void {
  const url = parseWebSocketRequestUrl(req.url || '/');
  const pathname = normalizePath(url.pathname);

  if (pathname === '/' || pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(routes.health()));
    return;
  }

  if (pathname === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(routes.stats()));
    return;
  }

  if (pathname === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
    res.end(routes.metrics());
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}
