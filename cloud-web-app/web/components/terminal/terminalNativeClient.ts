import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('TerminalNativeClient');

export class TerminalNativeClient {
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;
  private messageQueue: string[] = [];
  private isConnected = false;
  private sessionId = '';
  private unlistenData: (() => void) | null = null;

  onData: ((data: string) => void) | null = null;
  onConnect: (() => void) | null = null;
  onDisconnect: (() => void) | null = null;
  onError: ((error: Event) => void) | null = null;

  setRuntimeUrl(_url: string): void {
    // No-op for native client
  }

  async connect(sessionId: string): Promise<void> {
    if (this.isConnected) {
      return;
    }
    
    this.sessionId = sessionId;
    const adapter = (window as any).__AETHEL_RUNTIME_ADAPTER__;
    if (!adapter) {
      log.error('Native Runtime Adapter not found');
      return;
    }

    try {
      this.unlistenData = await adapter.terminal.onData(sessionId, (data: Uint8Array | number[]) => {
        try {
          const str = new TextDecoder().decode(new Uint8Array(data));
          this.onData?.(str);
        } catch (e) {
          log.error('Failed to decode terminal output', { error: e });
        }
      });

      this.isConnected = true;
      this.reconnectAttempts = 0;

      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          void adapter.terminal.write(sessionId, message);
        }
      }

      this.onConnect?.();
    } catch (error) {
      log.error('Native terminal connection failed', {
        sessionId,
        error,
      });
      this.attemptReconnect(sessionId);
    }
  }

  private attemptReconnect(sessionId: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      log.error('Max reconnection attempts reached', {
        sessionId,
        attempts: this.reconnectAttempts,
      });
      return;
    }

    this.reconnectAttempts += 1;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    window.setTimeout(() => {
      log.info('Attempting to reconnect terminal session', {
        sessionId,
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
      });
      void this.connect(sessionId);
    }, delay);
  }

  send(data: string): void {
    const adapter = (window as any).__AETHEL_RUNTIME_ADAPTER__;

    if (this.isConnected && adapter) {
      void adapter.terminal.write(this.sessionId, data);
      return;
    }

    this.messageQueue.push(data);
  }

  resize(_cols: number, _rows: number): void {
    // Native terminal resizing could be supported later if PTY supports it
  }

  disconnect(): void {
    const adapter = (window as any).__AETHEL_RUNTIME_ADAPTER__;
    if (this.unlistenData) {
      this.unlistenData();
      this.unlistenData = null;
    }
    if (this.isConnected && adapter && this.sessionId) {
      void adapter.terminal.close(this.sessionId);
    }
    this.isConnected = false;
    this.messageQueue = [];
  }

  get connected(): boolean {
    return this.isConnected;
  }
}
