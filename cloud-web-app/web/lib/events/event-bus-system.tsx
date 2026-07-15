/** Global event bus runtime with priority, history, wildcard subscriptions and middleware. */

import { EventEmitter } from 'events';

import {createComponentLogger, logger} from '@/lib/observability/logger'
import type { EventBusConfig, EventData, EventFilter, EventHandler, EventMiddleware, EventPriority, EventSubscription } from './event-bus-contracts';
import {
  EventBusProvider,
  useChannel,
  useEvent,
  useEventBus,
  useEventDispatch,
  useEventHistory,
  useSignal,
} from './event-bus-react';
import { EmitEvent, OnEvent } from './event-bus-decorators';
import { EventChannel } from './event-bus-channel';
import { EVENT_PRIORITY_ORDER, createDefaultEventBusConfig } from './event-bus-defaults';
import { ComputedSignal, DeferredEvent, Signal, TypedEventEmitter } from './event-bus-reactive';
export type { EventBusConfig, EventData, EventFilter, EventHandler, EventMiddleware, EventPriority, EventSubscription } from './event-bus-contracts';


const log = createComponentLogger('events/event-bus-system')

// EVENT BUS CORE

export class EventBus extends EventEmitter {
  private static instance: EventBus | null = null;

  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private wildcardSubscriptions: EventSubscription[] = [];
  private history: EventData[] = [];
  private middleware: EventMiddleware[] = [];
  private config: EventBusConfig;
  private subscriptionIdCounter = 0;
  private channels: Map<string, EventChannel> = new Map();

  constructor(config: Partial<EventBusConfig> = {}) {
    super();

    this.config = createDefaultEventBusConfig(config);
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  static resetInstance(): void {
    if (EventBus.instance) {
      EventBus.instance.dispose();
      EventBus.instance = null;
    }
  }

  // ============================================================================
  // SUBSCRIPTION
  // ============================================================================

  subscribe<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
    options: {
      priority?: EventPriority;
      once?: boolean;
      filter?: EventFilter;
      context?: unknown;
    } = {}
  ): string {
    const id = this.generateSubscriptionId();

    const subscription: EventSubscription = {
      id,
      eventType,
      handler: handler as EventHandler,
      priority: options.priority || 'normal',
      once: options.once || false,
      filter: options.filter,
      context: options.context,
    };

    if (eventType === '*') {
      this.wildcardSubscriptions.push(subscription);
      this.sortByPriority(this.wildcardSubscriptions);
    } else {
      const subs = this.subscriptions.get(eventType) || [];
      subs.push(subscription);
      this.sortByPriority(subs);
      this.subscriptions.set(eventType, subs);
    }

    if (this.config.enableLogging) {
      log.info(`[EventBus] Subscribed: ${eventType} (id: ${id})`);
    }

    return id;
  }

  subscribeOnce<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
    options: Omit<Parameters<typeof this.subscribe>[2], 'once'> = {}
  ): string {
    return this.subscribe(eventType, handler, { ...options, once: true });
  }

  unsubscribe(subscriptionId: string): boolean {
    // Check regular subscriptions
    for (const [eventType, subs] of this.subscriptions) {
      const index = subs.findIndex((s) => s.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        if (this.config.enableLogging) {
          log.info(`[EventBus] Unsubscribed: ${eventType} (id: ${subscriptionId})`);
        }
        return true;
      }
    }

    // Check wildcard subscriptions
    const wildcardIndex = this.wildcardSubscriptions.findIndex((s) => s.id === subscriptionId);
    if (wildcardIndex !== -1) {
      this.wildcardSubscriptions.splice(wildcardIndex, 1);
      return true;
    }

    return false;
  }

  unsubscribeAll(eventType?: string): void {
    if (eventType) {
      if (eventType === '*') {
        this.wildcardSubscriptions = [];
      } else {
        this.subscriptions.delete(eventType);
      }
    } else {
      this.subscriptions.clear();
      this.wildcardSubscriptions = [];
    }
  }

  // ============================================================================
  // DISPATCH
  // ============================================================================

  dispatch<T = unknown>(
    eventType: string,
    payload: T,
    options: { source?: string; propagate?: boolean } = {}
  ): void {
    const event: EventData = {
      type: eventType,
      timestamp: Date.now(),
      payload,
      source: options.source,
      propagate: options.propagate ?? true,
    };

    if (this.config.enableLogging) {
      log.info(`[EventBus] Dispatch: ${eventType}`, payload);
    }

    // Add to history
    if (this.config.enableHistory) {
      this.addToHistory(event);
    }

    // Run through middleware chain
    this.runMiddleware(event, () => {
      this.executeHandlers(event);
    });
  }

  async dispatchAsync<T = unknown>(
    eventType: string,
    payload: T,
    options: { source?: string; propagate?: boolean } = {}
  ): Promise<void> {
    const event: EventData = {
      type: eventType,
      timestamp: Date.now(),
      payload,
      source: options.source,
      propagate: options.propagate ?? true,
    };

    if (this.config.enableHistory) {
      this.addToHistory(event);
    }

    await this.runMiddlewareAsync(event, async () => {
      await this.executeHandlersAsync(event);
    });
  }

  private executeHandlers(event: EventData): void {
    const toRemove: string[] = [];

    // Get relevant subscriptions
    const subs = [
      ...(this.subscriptions.get(event.type) || []),
      ...this.wildcardSubscriptions,
    ];

    for (const sub of subs) {
      // Apply filter
      if (sub.filter && !sub.filter(event)) continue;

      try {
        if (this.config.asyncHandlers) {
          Promise.resolve(sub.handler.call(sub.context, event)).catch((error) => {
            this.handleError(error, event, sub);
          });
        } else {
          sub.handler.call(sub.context, event);
        }
      } catch (error) {
        this.handleError(error, event, sub);
      }

      if (sub.once) {
        toRemove.push(sub.id);
      }

      // Check propagation
      if (event.propagate === false) break;
    }

    // Remove once handlers
    for (const id of toRemove) {
      this.unsubscribe(id);
    }
  }

  private async executeHandlersAsync(event: EventData): Promise<void> {
    const toRemove: string[] = [];

    const subs = [
      ...(this.subscriptions.get(event.type) || []),
      ...this.wildcardSubscriptions,
    ];

    for (const sub of subs) {
      if (sub.filter && !sub.filter(event)) continue;

      try {
        await sub.handler.call(sub.context, event);
      } catch (error) {
        this.handleError(error, event, sub);
      }

      if (sub.once) {
        toRemove.push(sub.id);
      }

      if (event.propagate === false) break;
    }

    for (const id of toRemove) {
      this.unsubscribe(id);
    }
  }

  private handleError(error: unknown, event: EventData, sub: EventSubscription): void {
    logger.error(`[EventBus] Error in handler for ${event.type}:`, error);

    this.emit('error', { error, event, subscription: sub });

    if (this.config.throwOnError) {
      throw error;
    }
  }

  // ============================================================================
  // MIDDLEWARE
  // ============================================================================

  use(middleware: EventMiddleware): () => void {
    this.middleware.push(middleware);

    return () => {
      const index = this.middleware.indexOf(middleware);
      if (index !== -1) {
        this.middleware.splice(index, 1);
      }
    };
  }

  private runMiddleware(event: EventData, final: () => void): void {
    if (this.middleware.length === 0) {
      final();
      return;
    }

    let index = 0;

    const next = (): void => {
      if (index >= this.middleware.length) {
        final();
        return;
      }

      const mw = this.middleware[index++];
      mw(event, next);
    };

    next();
  }

  private async runMiddlewareAsync(event: EventData, final: () => Promise<void>): Promise<void> {
    if (this.middleware.length === 0) {
      await final();
      return;
    }

    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= this.middleware.length) {
        await final();
        return;
      }

      const mw = this.middleware[index++];
      await mw(event, next);
    };

    await next();
  }

  // ============================================================================
  // HISTORY
  // ============================================================================

  private addToHistory(event: EventData): void {
    this.history.push(event);

    while (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }
  }

  getHistory(filter?: { type?: string; since?: number; limit?: number }): EventData[] {
    let result = [...this.history];

    if (filter?.type) {
      result = result.filter((e) => e.type === filter.type);
    }

    if (filter?.since) {
      result = result.filter((e) => e.timestamp >= filter.since!);
    }

    if (filter?.limit) {
      result = result.slice(-filter.limit);
    }

    return result;
  }

  clearHistory(): void {
    this.history = [];
  }

  replay(events: EventData[], options: { delay?: number } = {}): void {
    const delay = options.delay || 0;

    events.forEach((event, index) => {
      setTimeout(() => {
        this.dispatch(event.type, event.payload, {
          source: event.source,
          propagate: event.propagate,
        });
      }, delay * index);
    });
  }

  // ============================================================================
  // CHANNELS
  // ============================================================================

  createChannel(name: string): EventChannel {
    if (this.channels.has(name)) {
      return this.channels.get(name)!;
    }

    const channel = new EventChannel(name, this);
    this.channels.set(name, channel);

    return channel;
  }

  getChannel(name: string): EventChannel | undefined {
    return this.channels.get(name);
  }

  destroyChannel(name: string): void {
    const channel = this.channels.get(name);
    if (channel) {
      channel.dispose();
      this.channels.delete(name);
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private generateSubscriptionId(): string {
    return `sub_${++this.subscriptionIdCounter}_${Date.now()}`;
  }

  private sortByPriority(subs: EventSubscription[]): void {
    subs.sort(
      (a, b) => EVENT_PRIORITY_ORDER[b.priority] - EVENT_PRIORITY_ORDER[a.priority]
    );
  }

  getSubscriptionCount(eventType?: string): number {
    if (eventType === '*') {
      return this.wildcardSubscriptions.length;
    }

    if (eventType) {
      return this.subscriptions.get(eventType)?.length || 0;
    }

    let count = this.wildcardSubscriptions.length;
    for (const subs of this.subscriptions.values()) {
      count += subs.length;
    }
    return count;
  }

  getEventTypes(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  setConfig(config: Partial<EventBusConfig>): void {
    Object.assign(this.config, config);
  }

  dispose(): void {
    this.subscriptions.clear();
    this.wildcardSubscriptions = [];
    this.middleware = [];
    this.history = [];

    for (const channel of this.channels.values()) {
      channel.dispose();
    }
    this.channels.clear();

    this.removeAllListeners();
  }
}

// EVENT CHANNEL

export { EventChannel } from './event-bus-channel';

// EXPORTS

const __defaultExport = {
  EventBus,
  EventChannel,
  TypedEventEmitter,
  Signal,
  ComputedSignal,
  DeferredEvent,
  EventBusProvider,
  useEventBus,
  useEvent,
  useEventDispatch,
  useSignal,
  useChannel,
  useEventHistory,
  OnEvent,
  EmitEvent,
};

export default __defaultExport;
export {
  EventBusProvider,
  useChannel,
  useEvent,
  useEventBus,
  useEventDispatch,
  useEventHistory,
  useSignal,
} from './event-bus-react';
export { EmitEvent, OnEvent } from './event-bus-decorators';
export { ComputedSignal, DeferredEvent, Signal, TypedEventEmitter } from './event-bus-reactive';
