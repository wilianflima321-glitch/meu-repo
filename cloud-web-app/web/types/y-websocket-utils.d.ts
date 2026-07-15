declare module 'y-websocket/bin/utils.cjs' {
  import type { IncomingMessage } from 'http'
  import type { WebSocket } from 'ws'

  export function setupWSConnection(
    conn: WebSocket,
    req: IncomingMessage,
    options?: unknown
  ): void
}
