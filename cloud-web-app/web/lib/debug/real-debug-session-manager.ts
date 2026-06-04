import { RealDebugAdapter } from './real-debug-adapter';
import type { DebugConfiguration } from './real-debug-adapter-contracts';

export class DebugSessionManager {
  private static instance: DebugSessionManager;
  private sessions: Map<string, RealDebugAdapter> = new Map();
  private activeSessionId: string | null = null;

  static getInstance(): DebugSessionManager {
    if (!DebugSessionManager.instance) {
      DebugSessionManager.instance = new DebugSessionManager();
    }
    return DebugSessionManager.instance;
  }

  async startSession(config: DebugConfiguration): Promise<RealDebugAdapter> {
    const sessionId = `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const adapter = new RealDebugAdapter(config);

    await adapter.initialize();

    if (config.request === 'attach') {
      await adapter.attach();
    } else {
      await adapter.launch();
    }

    this.sessions.set(sessionId, adapter);
    this.activeSessionId = sessionId;

    adapter.on('terminated', () => {
      this.sessions.delete(sessionId);
      if (this.activeSessionId === sessionId) {
        this.activeSessionId = null;
      }
    });

    return adapter;
  }

  getActiveSession(): RealDebugAdapter | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }

  getSession(sessionId: string): RealDebugAdapter | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): Map<string, RealDebugAdapter> {
    return new Map(this.sessions);
  }

  setActiveSession(sessionId: string): void {
    if (this.sessions.has(sessionId)) {
      this.activeSessionId = sessionId;
    }
  }

  async stopSession(sessionId: string): Promise<void> {
    const adapter = this.sessions.get(sessionId);
    if (adapter) {
      await adapter.disconnect();
      this.sessions.delete(sessionId);
      if (this.activeSessionId === sessionId) {
        this.activeSessionId = null;
      }
    }
  }

  async stopAllSessions(): Promise<void> {
    const promises = Array.from(this.sessions.keys()).map((id) => this.stopSession(id));
    await Promise.all(promises);
  }
}

export const debugManager = DebugSessionManager.getInstance();
