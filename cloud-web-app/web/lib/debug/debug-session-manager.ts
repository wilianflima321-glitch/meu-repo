import { EventEmitter } from 'events';
import type { DebugAdapterConfig } from './debug-adapter-contracts';
import { DebugAdapter } from './debug-adapter-core';

export class DebugSessionManager extends EventEmitter {
  private sessions: Map<string, DebugAdapter> = new Map();
  private activeSessionId: string | null = null;

  async createSession(config: DebugAdapterConfig): Promise<DebugAdapter> {
    const adapter = new DebugAdapter(config);

    adapter.on('event', (event) => {
      this.emit('event', { sessionId: adapter.getState().id, ...event });
    });

    await adapter.initialize();

    const sessionId = adapter.getState().id;
    this.sessions.set(sessionId, adapter);

    if (!this.activeSessionId) {
      this.activeSessionId = sessionId;
    }

    this.emit('sessionCreated', sessionId);
    return adapter;
  }

  getSession(sessionId: string): DebugAdapter | undefined {
    return this.sessions.get(sessionId);
  }

  getActiveSession(): DebugAdapter | undefined {
    return this.activeSessionId ? this.sessions.get(this.activeSessionId) : undefined;
  }

  setActiveSession(sessionId: string): void {
    if (this.sessions.has(sessionId)) {
      this.activeSessionId = sessionId;
      this.emit('activeSessionChanged', sessionId);
    }
  }

  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    await session.terminate();
    this.sessions.delete(sessionId);

    if (this.activeSessionId === sessionId) {
      const remaining = Array.from(this.sessions.keys());
      this.activeSessionId = remaining[0] || null;
    }

    this.emit('sessionTerminated', sessionId);
  }

  async terminateAll(): Promise<void> {
    for (const sessionId of this.sessions.keys()) {
      await this.terminateSession(sessionId);
    }
  }

  getAllSessions(): DebugAdapter[] {
    return Array.from(this.sessions.values());
  }
}

export const debugSessionManager = new DebugSessionManager();
