/**
 * @file EventBus.ts
 * @description Sistema de eventos global para comunicação entre componentes
 * Padrão Observer/Pub-Sub para desacoplamento
 */

export type EventHandler<T = unknown> = (data: T) => void;
export type EventUnsubscribe = () => void;

interface EventSubscription<T = unknown> {
  id: string;
  handler: EventHandler<T>;
  once: boolean;
}

/**
 * EventBus - Sistema de eventos centralizado
 * Permite comunicação desacoplada entre componentes da IDE
 */
export class EventBus {
  private static instance: EventBus;
  private events: Map<string, EventSubscription<any>[]>;
  private subscriptionCounter: number;

  private constructor() {
    this.events = new Map();
    this.subscriptionCounter = 0;
  }

  /**
   * Obtém instância singleton do EventBus
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Gera ID único para subscription
   */
  private generateId(): string {
    return `sub_${++this.subscriptionCounter}_${Date.now()}`;
  }

  /**
   * Inscreve um handler para um evento
   * @param event Nome do evento
   * @param handler Função callback
   * @returns Função para cancelar inscrição
   */
  public on<T = unknown>(event: string, handler: EventHandler<T>): EventUnsubscribe {
    const subscription: EventSubscription<T> = {
      id: this.generateId(),
      handler,
      once: false
    };

    const handlers = this.events.get(event) || [];
    handlers.push(subscription);
    this.events.set(event, handlers);

    return () => this.off(event, subscription.id);
  }

  /**
   * Inscreve um handler que será chamado apenas uma vez
   * @param event Nome do evento
   * @param handler Função callback
   * @returns Função para cancelar inscrição
   */
  public once<T = unknown>(event: string, handler: EventHandler<T>): EventUnsubscribe {
    const subscription: EventSubscription<T> = {
      id: this.generateId(),
      handler,
      once: true
    };

    const handlers = this.events.get(event) || [];
    handlers.push(subscription);
    this.events.set(event, handlers);

    return () => this.off(event, subscription.id);
  }

  /**
   * Remove uma inscrição específica
   */
  private off(event: string, subscriptionId: string): void {
    const handlers = this.events.get(event);
    if (!handlers) return;

    const filtered = handlers.filter(sub => sub.id !== subscriptionId);
    
    if (filtered.length === 0) {
      this.events.delete(event);
    } else {
      this.events.set(event, filtered);
    }
  }

  /**
   * Emite um evento para todos os handlers inscritos
   * @param event Nome do evento
   * @param data Dados a serem passados para handlers
   */
  public emit<T = unknown>(event: string, data?: T): void {
    const handlers = this.events.get(event);
    if (!handlers || handlers.length === 0) return;

    const toRemove: string[] = [];

    handlers.forEach(subscription => {
      try {
        subscription.handler(data as T);
        
        if (subscription.once) {
          toRemove.push(subscription.id);
        }
      } catch (error) {
        console.error(`Erro ao executar handler para evento "${event}":`, error);
      }
    });

    // Remove handlers "once"
    toRemove.forEach(id => this.off(event, id));
  }

  /**
   * Emite evento de forma assíncrona
   */
  public async emitAsync<T = unknown>(event: string, data?: T): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.emit(event, data);
        resolve();
      }, 0);
    });
  }

  /**
   * Remove todos os handlers de um evento específico
   */
  public removeAllListeners(event: string): void {
    this.events.delete(event);
  }

  /**
   * Limpa todos os eventos e handlers
   */
  public clear(): void {
    this.events.clear();
  }

  /**
   * Retorna número de listeners para um evento
   */
  public listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }

  /**
   * Lista todos os eventos registrados
   */
  public eventNames(): string[] {
    return Array.from(this.events.keys());
  }

  /**
   * Verifica se evento tem listeners
   */
  public hasListeners(event: string): boolean {
    return this.listenerCount(event) > 0;
  }
}

// Eventos padrão do sistema
export const IDE_EVENTS = {
  // Workspace
  WORKSPACE_OPENED: 'workspace:opened',
  WORKSPACE_CLOSED: 'workspace:closed',
  WORKSPACE_CHANGED: 'workspace:changed',
  
  // Editor
  EDITOR_OPENED: 'editor:opened',
  EDITOR_CLOSED: 'editor:closed',
  EDITOR_FOCUS: 'editor:focus',
  EDITOR_DIRTY: 'editor:dirty',
  EDITOR_SAVED: 'editor:saved',
  EDITOR_CONTENT_CHANGED: 'editor:contentChanged',
  
  // Layout
  LAYOUT_CHANGED: 'layout:changed',
  SIDEBAR_TOGGLED: 'sidebar:toggled',
  PANEL_TOGGLED: 'panel:toggled',
  VIEW_ACTIVATED: 'view:activated',
  
  // Settings
  SETTINGS_CHANGED: 'settings:changed',
  THEME_CHANGED: 'theme:changed',
  
  // Git
  GIT_BRANCH_CHANGED: 'git:branchChanged',
  GIT_STATUS_CHANGED: 'git:statusChanged',
  GIT_COMMIT: 'git:commit',
  
  // Debug
  DEBUG_STARTED: 'debug:started',
  DEBUG_STOPPED: 'debug:stopped',
  DEBUG_PAUSED: 'debug:paused',
  DEBUG_CONTINUED: 'debug:continued',
  BREAKPOINT_ADDED: 'breakpoint:added',
  BREAKPOINT_REMOVED: 'breakpoint:removed',
  
  // Terminal
  TERMINAL_CREATED: 'terminal:created',
  TERMINAL_CLOSED: 'terminal:closed',
  TERMINAL_OUTPUT: 'terminal:output',
  
  // Extensions
  EXTENSION_INSTALLED: 'extension:installed',
  EXTENSION_UNINSTALLED: 'extension:uninstalled',
  EXTENSION_ACTIVATED: 'extension:activated',
  
  // Files
  FILE_CREATED: 'file:created',
  FILE_DELETED: 'file:deleted',
  FILE_RENAMED: 'file:renamed',
  FILE_SAVED: 'file:saved',
  
  // Build/Export
  BUILD_STARTED: 'build:started',
  BUILD_COMPLETED: 'build:completed',
  BUILD_FAILED: 'build:failed',
  BUILD_PROGRESS: 'build:progress',
  EXPORT_STARTED: 'export:started',
  EXPORT_COMPLETED: 'export:completed',
  EXPORT_FAILED: 'export:failed',
  EXPORT_PROGRESS: 'export:progress',
  
  // Render
  RENDER_STARTED: 'render:started',
  RENDER_PROGRESS: 'render:progress',
  RENDER_COMPLETED: 'render:completed',
  RENDER_FAILED: 'render:failed',
  
  // Notifications
  NOTIFICATION_SHOW: 'notification:show',
  NOTIFICATION_DISMISS: 'notification:dismiss',
  
  // System
  SYSTEM_ERROR: 'system:error',
  SYSTEM_WARNING: 'system:warning',
  SYSTEM_INFO: 'system:info',
  
  // Collaboration
  COLLAB_USER_JOINED: 'collab:userJoined',
  COLLAB_USER_LEFT: 'collab:userLeft',
  COLLAB_CURSOR_MOVED: 'collab:cursorMoved',
  COLLAB_SELECTION_CHANGED: 'collab:selectionChanged',
} as const;

export type IDEEventName = typeof IDE_EVENTS[keyof typeof IDE_EVENTS];

// Exportar instância global
export const eventBus = EventBus.getInstance();
