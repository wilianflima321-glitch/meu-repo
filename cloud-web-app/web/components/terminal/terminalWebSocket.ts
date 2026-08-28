import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('XTerminalWebSocket');

function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
}

export class TerminalWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;
  private messageQueue: string[] = [];
  private isConnected = false;
  private runtimeUrl = '';
  
  // Tauri specifics
  private tauriUnlisten: (() => void) | null = null;
  private isTauri = false;
  private tauriSessionId = '';

  onData: ((data: string) => void) | null = null;
  onConnect: (() => void) | null = null;
  onDisconnect: (() => void) | null = null;
  onError: ((error: Event | string) => void) | null = null;

  constructor() {
    this.isTauri = isTauriRuntime();
  }

  setRuntimeUrl(url: string): void {
    this.runtimeUrl = url;
  }

  connect(sessionId: string): void {
    if (this.isConnected) {
      return;
    }

    if (this.isTauri) {
      this.tauriSessionId = sessionId;
      this.connectTauri(sessionId).catch(err => {
        log.error('Tauri PTY connection failed', { sessionId, error: err });
        this.onError?.(err as string);
      });
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

  private async importTauriModule(modulePath: string): Promise<any> {
    const specifier = ['@tauri-apps', 'api', modulePath].join('/');
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const dynamicImport = new Function('s', 'return import(s)') as (s: string) => Promise<any>;
    return dynamicImport(specifier);
  }

  private async connectTauri(sessionId: string): Promise<void> {
    try {
      // Dynamic import to avoid breaking standard browser build
      const core = await this.importTauriModule('core');
      const event = await this.importTauriModule('event');
      
      // Request local PTY creation.
      const response = await core.invoke('terminal_create', { cwd: null });
      this.tauriSessionId = response.id;
      
      this.tauriUnlisten = await event.listen(`terminal_data_${this.tauriSessionId}`, (e: { payload: number[] }) => {
        const text = new TextDecoder().decode(new Uint8Array(e.payload));
        this.onData?.(text);
      });
      
      this.isConnected = true;
      this.onConnect?.();
      
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        if (msg) this.send(msg);
      }
    } catch (err) {
      throw err;
    }
  }

  private attemptReconnect(sessionId: string): void {
    if (this.isTauri) return; // No auto-reconnect for local Tauri PTY yet

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
    if (this.isTauri) {
      if (!this.isConnected) {
        this.messageQueue.push(data);
        return;
      }
      this.importTauriModule('core').then(core => {
        core.invoke('terminal_write', { sessionId: this.tauriSessionId, input: data }).catch((err: unknown) => {
          log.error('terminal_write failed', { error: err });
        });
      });
      return;
    }

    const message = JSON.stringify({ type: 'input', data });

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      return;
    }

    this.messageQueue.push(message);
  }

  resize(cols: number, rows: number): void {
    if (this.isTauri) {
      if (!this.isConnected) return;
      this.importTauriModule('core').then(core => {
        core.invoke('terminal_resize', { sessionId: this.tauriSessionId, cols, rows }).catch((err: unknown) => {
          log.error('terminal_resize failed', { error: err });
        });
      });
      return;
    }

    const message = JSON.stringify({ type: 'resize', cols, rows });

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    }
  }

  disconnect(): void {
    if (this.isTauri) {
      if (this.tauriUnlisten) {
        this.tauriUnlisten();
        this.tauriUnlisten = null;
      }
      if (this.isConnected) {
        this.importTauriModule('core').then(core => {
          core.invoke('terminal_close', { sessionId: this.tauriSessionId }).catch((err: unknown) => {
            log.error('terminal_close failed', { error: err });
          });
        });
      }
      this.isConnected = false;
      this.messageQueue = [];
      return;
    }

    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
    this.messageQueue = [];
  }

  get connected(): boolean {
    return this.isConnected;
  }
}
