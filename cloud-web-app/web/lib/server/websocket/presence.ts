import type { WebSocket } from 'ws';

import type { ConnectionInfo, ConnectionType, WsChannel, WsClient } from '../websocket-runtime-contracts';

export interface WsPresenceSnapshot {
  connections: Map<WebSocket, ConnectionInfo>;
  clients: Map<string, WsClient>;
  channels: Map<string, WsChannel>;
  legacyRooms: Map<string, Set<WebSocket>>;
}

export function getConnectionCounts(connections: Iterable<ConnectionInfo>): Record<ConnectionType, number> {
  const counts: Record<ConnectionType, number> = {
    collaboration: 0,
    terminal: 0,
    lsp: 0,
    ai: 0,
    dap: 0,
    export: 0,
    general: 0,
  };

  for (const info of connections) {
    counts[info.type] += 1;
  }

  return counts;
}

export function buildHealthPayload(snapshot: WsPresenceSnapshot) {
  return {
    status: 'ok',
    service: 'aethel-websocket-server',
    connections: snapshot.connections.size,
    modernClients: snapshot.clients.size,
    channels: snapshot.channels.size,
    rooms: snapshot.legacyRooms.size,
    uptime: process.uptime(),
  };
}

export function buildStatsPayload(snapshot: WsPresenceSnapshot) {
  return {
    totalConnections: snapshot.connections.size,
    modernClients: snapshot.clients.size,
    channels: Array.from(snapshot.channels.entries()).map(([name, channel]) => ({
      name,
      clients: channel.clients.size,
      type: channel.type,
    })),
    legacyRooms: Array.from(snapshot.legacyRooms.entries()).map(([name, clients]) => ({
      name,
      clients: clients.size,
    })),
    connectionsByType: getConnectionCounts(snapshot.connections.values()),
    memory: process.memoryUsage(),
  };
}

export function buildMetricsPayload(snapshot: WsPresenceSnapshot): string {
  const lines = [
    '# HELP aethel_ws_connections Current active WebSocket connections',
    '# TYPE aethel_ws_connections gauge',
    `aethel_ws_connections ${snapshot.connections.size}`,
    '# HELP aethel_ws_clients Current active modern WebSocket clients',
    '# TYPE aethel_ws_clients gauge',
    `aethel_ws_clients ${snapshot.clients.size}`,
    '# HELP aethel_ws_channels Current active runtime channels',
    '# TYPE aethel_ws_channels gauge',
    `aethel_ws_channels ${snapshot.channels.size}`,
    '# HELP aethel_ws_rooms Current active collaboration rooms',
    '# TYPE aethel_ws_rooms gauge',
    `aethel_ws_rooms ${snapshot.legacyRooms.size}`,
  ];

  for (const [type, count] of Object.entries(getConnectionCounts(snapshot.connections.values()))) {
    lines.push(`aethel_ws_connections_by_type{type="${type}"} ${count}`);
  }

  return lines.join('\n');
}

export function startHeartbeat(options: {
  clients: Map<string, WsClient>;
  clientTimeoutMs: number;
  intervalMs: number;
  onInactive: (client: WsClient, clientId: string) => void;
}): NodeJS.Timeout {
  return setInterval(() => {
    const now = Date.now();

    for (const [clientId, client] of options.clients) {
      if (!client.isAlive || now - client.lastPing > options.clientTimeoutMs) {
        options.onInactive(client, clientId);
        continue;
      }

      client.isAlive = false;
      client.ws.ping();
    }
  }, options.intervalMs);
}
