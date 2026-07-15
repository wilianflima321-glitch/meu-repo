import { EventEmitter } from 'events';
import { AcpMessage, AcpMessageType, AcpMessageSchema } from './acp-message-schema';
import { logger } from '@/lib/observability/logger';

/**
 * Agent Tool Bus (ACP)
 * IMPROVE-AI-001
 * Unified event bus for agent communication across cloud WSS and desktop Rust.
 */
export class AgentToolBus extends EventEmitter {
  private static instance: AgentToolBus;
  private messageHistory: AcpMessage[] = [];
  
  private constructor() {
    super();
    // Allow more listeners for large workspaces
    this.setMaxListeners(100);
  }

  public static getInstance(): AgentToolBus {
    if (!AgentToolBus.instance) {
      AgentToolBus.instance = new AgentToolBus();
    }
    return AgentToolBus.instance;
  }

  /**
   * Broadcast a message to the bus.
   */
  public broadcast(message: AcpMessage): void {
    try {
      // Validate schema before dispatch
      const validated = AcpMessageSchema.parse(message);
      
      // Store in memory (max 1000 messages)
      this.messageHistory.push(validated);
      if (this.messageHistory.length > 1000) {
        this.messageHistory.shift();
      }

      this.emit(validated.type, validated);
      this.emit('*', validated); // Wildcard listener
      
    } catch (err) {
      logger.error('[AgentToolBus] Invalid ACP message broadcast attempted:', err);
    }
  }

  /**
   * Subscribe to specific message types
   */
  public subscribe(type: AcpMessageType | '*', listener: (msg: AcpMessage) => void): () => void {
    this.on(type, listener);
    return () => {
      this.off(type, listener);
    };
  }

  /**
   * Get recent message history
   */
  public getHistory(): AcpMessage[] {
    return [...this.messageHistory];
  }
}

export const agentToolBus = AgentToolBus.getInstance();
