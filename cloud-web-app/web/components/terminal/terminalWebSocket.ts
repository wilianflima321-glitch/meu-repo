import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('XTerminalWebSocket');

export class TerminalWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;
  private messageQueue: string[] = [];
  private isConnected = false;
  private runtimeUrl = '';

  onData: ((data: string) => void) | null = null;
  onConnect: (() => void) | null = null;
  onDisconnect: (() => void) | null = null;
  onError: ((error: Event) => void) | null = null;

  setRuntimeUrl(url: string): void {
    this.runtimeUrl = url;
  }

  connect(sessionId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const baseUrl =
      this.runtimeUrl ||
      process.env.NEXT_PUBLIC_WS_URL ||
      (typeof window !== 'undefined' ? 'ws://localhost:3001' : '');

    const wsUrl = `${baseUrl}/terminal/${sessionId}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;

        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          if (message) {
            this.ws?.send(message);
          }
        }

        this.onConnect?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'output' && message.data) {
            this.onData?.(message.data);
            return;
          }

          if (message.type === 'error') {
            log.error('Terminal server reported an error', {
              sessionId,
              message: message.message,
            });
          }
        } catch {
          this.onData?.(event.data);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.onDisconnect?.();
        this.attemptReconnect(sessionId);
      };

      this.ws.onerror = (error) => {
        this.onError?.(error);
      };
    } catch (error) {
      log.error('WebSocket connection failed', {
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
      this.connect(sessionId);
    }, delay);
  }

  send(data: string): void {
    const message = JSON.stringify({ type: 'input', data });

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      return;
    }

    this.messageQueue.push(message);
  }

  resize(cols: number, rows: number): void {
    const message = JSON.stringify({ type: 'resize', cols, rows });

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
    this.messageQueue = [];
  }

  get connected(): boolean {
    return this.isConnected;
  }
}
