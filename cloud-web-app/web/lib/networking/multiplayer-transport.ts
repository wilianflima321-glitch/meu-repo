import type { ConnectionState, NetworkMessage } from './multiplayer-types';

export interface NetworkTransport {
  connect(url: string): Promise<void>;
  disconnect(): void;
  send(message: NetworkMessage): void;
  onMessage(callback: (message: NetworkMessage) => void): void;
  onConnect(callback: () => void): void;
  onDisconnect(callback: (reason: string) => void): void;
  getState(): ConnectionState;
  getPing(): number;
}

export class WebSocketTransport implements NetworkTransport {
  private socket: WebSocket | null = null;
  private messageCallback: ((message: NetworkMessage) => void) | null = null;
  private connectCallback: (() => void) | null = null;
  private disconnectCallback: ((reason: string) => void) | null = null;
  private state: ConnectionState = 'disconnected';
  private ping = 0;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime = 0;

  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.state = 'connecting';
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.state = 'connected';
        this.startPingLoop();
        this.connectCallback?.();
        resolve();
      };

      this.socket.onerror = (error) => {
        this.state = 'disconnected';
        reject(error);
      };

      this.socket.onclose = (event) => {
        this.state = 'disconnected';
        this.stopPingLoop();
        this.disconnectCallback?.(event.reason || 'Connection closed');
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as NetworkMessage;

          if (message.type === 'pong') {
            this.ping = Date.now() - this.lastPingTime;
          } else {
            this.messageCallback?.(message);
          }
        } catch {
          console.error('Failed to parse network message');
        }
      };
    });
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.state = 'disconnected';
    this.stopPingLoop();
  }

  send(message: NetworkMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  onMessage(callback: (message: NetworkMessage) => void): void {
    this.messageCallback = callback;
  }

  onConnect(callback: () => void): void {
    this.connectCallback = callback;
  }

  onDisconnect(callback: (reason: string) => void): void {
    this.disconnectCallback = callback;
  }

  getState(): ConnectionState {
    return this.state;
  }

  getPing(): number {
    return this.ping;
  }

  private startPingLoop(): void {
    this.pingInterval = setInterval(() => {
      this.lastPingTime = Date.now();
      this.send({
        type: 'ping',
        senderId: 'local',
        timestamp: this.lastPingTime,
        reliable: false,
        data: null,
      });
    }, 1000);
  }

  private stopPingLoop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
