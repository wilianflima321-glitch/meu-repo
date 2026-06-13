import type { WebSocket } from 'ws';
import { buildHealthPayload, buildMetricsPayload, buildStatsPayload } from './websocket/presence.ts';
import type { ConnectionInfo, WsChannel, WsClient } from './websocket-runtime-contracts.ts';

export interface WebSocketServerSnapshotSource {
  connections: Map<WebSocket, ConnectionInfo>;
  clients: Map<string, WsClient>;
  channels: Map<string, WsChannel>;
  legacyRooms: Map<string, Set<WebSocket>>;
}

export function getWebSocketPresenceSnapshot(source: WebSocketServerSnapshotSource) {
  return {
    connections: source.connections,
    clients: source.clients,
    channels: source.channels,
    legacyRooms: source.legacyRooms,
  };
}

export function getWebSocketHealthPayload(source: WebSocketServerSnapshotSource) {
  return buildHealthPayload(getWebSocketPresenceSnapshot(source));
}

export function getWebSocketStatsPayload(source: WebSocketServerSnapshotSource) {
  return buildStatsPayload(getWebSocketPresenceSnapshot(source));
}

export function getWebSocketMetricsPayload(source: WebSocketServerSnapshotSource): string {
  return buildMetricsPayload(getWebSocketPresenceSnapshot(source));
}

export function getWebSocketRuntimeStats(source: WebSocketServerSnapshotSource) {
  const { clients, channels, legacyRooms, connections } = getWebSocketPresenceSnapshot(source);
  return {
    clients: clients.size,
    channels: channels.size,
    legacyRooms: legacyRooms.size,
    connections: connections.size,
    uptime: process.uptime(),
  };
}
