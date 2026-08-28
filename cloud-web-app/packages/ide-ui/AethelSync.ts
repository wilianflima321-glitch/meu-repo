/**
 * AethelSync
 * The Ultra-Low Latency WebSocket Bridge between the React IDE and the Rust Kernel ECS.
 */

export type ECSData = {
  capacity: number;
  len: number;
  positions: Float32Array; // Interleaved [x,y,z, x,y,z...]
  scales: Float32Array;
  colors: Float32Array;
};

type SyncMessage = 
  | { type: 'kernel_handshake', status: string, capacity: number }
  | { type: 'entity_spawned', id: number, pos: [number, number, number] }
  | { type: 'pong' }
  | { type: 'error', message: string };

class AethelSyncClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimer: NodeJS.Timeout | null = null;
  public isConnected = false;
  
  // Callbacks
  public onConnect?: () => void;
  public onDisconnect?: () => void;
  public onEntitySpawned?: (id: number, pos: [number, number, number]) => void;

  constructor(url = 'ws://127.0.0.1:9090') {
    this.url = url;
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    console.log('[AethelSync] Connecting to Kernel at', this.url);
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('[AethelSync] Connected to Kernel.');
      this.isConnected = true;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.onConnect?.();
    };

    this.ws.onclose = () => {
      console.warn('[AethelSync] Disconnected from Kernel.');
      this.isConnected = false;
      this.onDisconnect?.();
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('[AethelSync] WebSocket Error:', err);
    };

    this.ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data) as SyncMessage;
          this.handleMessage(msg);
        } catch (e) {
          console.error('[AethelSync] Failed to parse message:', event.data);
        }
      } else {
        // Handle binary ECS data dump here later
        console.log('[AethelSync] Received binary ECS frame:', event.data.byteLength, 'bytes');
      }
    };
  }

  private handleMessage(msg: SyncMessage) {
    switch (msg.type) {
      case 'kernel_handshake':
        console.log(`[AethelSync] Handshake OK. Kernel capacity: ${msg.capacity}`);
        break;
      case 'entity_spawned':
        console.log(`[AethelSync] Entity spawned! ID: ${msg.id} at [${msg.pos.join(', ')}]`);
        this.onEntitySpawned?.(msg.id, msg.pos);
        break;
      case 'pong':
        console.log(`[AethelSync] Pong from Kernel.`);
        break;
    }
  }

  public sendCommand(cmd: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(cmd);
    } else {
      console.warn('[AethelSync] Cannot send command, not connected.');
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 3000);
    }
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export a singleton instance
export const AethelSync = new AethelSyncClient();
