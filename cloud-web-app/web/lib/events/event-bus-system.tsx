/**
 * Event Bus System - Sistema de Eventos Global
 * 
 * Sistema completo de eventos com:
 * - Type-safe event dispatching
 * - Priority handling
 * - Event filtering
 * - Async event support
 * - Event history/replay
 * - Wildcard subscriptions
 * - Event middleware
 * - Debug logging
 * 
 * @module lib/events/event-bus-system
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export type EventPriority = 'highest' | 'high' | 'normal' | 'low' | 'lowest';

export interface EventData {
  type: string;
  timestamp: number;
  payload: unknown;
  source?: string;
  propagate?: boolean;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  priority: EventPriority;
  once: boolean;
  filter?: EventFilter;
  context?: unknown;
}

export type EventHandler<T = unknown> = (event: EventData & { payload: T }) => void | Promise<void>;
export type EventFilter = (event: EventData) => boolean;
export type EventMiddleware = (event: EventData, next: () => void) => void | Promise<void>;

export interface EventBusConfig {
  maxHistorySize: number;
  enableHistory: boolean;
  enableLogging: boolean;
  asyncHandlers: boolean;
  throwOnError: boolean;
}

// ============================================================================
// EVENT BUS CORE
// ============================================================================

export class EventBus extends EventEmitter {
  private static instance: EventBus | null = null;
  
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private wildcardSubscriptions: EventSubscription[] = [];
  private history: EventData[] = [];
  private middleware: EventMiddleware[] = [];
  private config: EventBusConfig;
  private subscriptionIdCounter = 0;
  private channels: Map<string, EventChannel> = new Map();
  
  private static priorityOrder: Record<EventPriority, number> = {
    highest: 4,
    high: 3,
    normal: 2,
    low: 1,
    lowest: 0,
  };
  
  constructor(config: Partial<EventBusConfig> = {}) {
    super();
    
    this.config = {
      maxHistorySize: 1000,
      enableHistory: true,
      enableLogging: false,
      asyncHandlers: true,
      throwOnError: false,
      ...config,
    };
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
      console.log(`[EventBus] Subscribed: ${eventType} (id: ${id})`);
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
          console.log(`[EventBus] Unsubscribed: ${eventType} (id: ${subscriptionId})`);
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
      console.log(`[EventBus] Dispatch: ${eventType}`, payload);
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
    console.error(`[EventBus] Error in handler for ${event.type}:`, error);
    
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
      (a, b) => EventBus.priorityOrder[b.priority] - EventBus.priorityOrder[a.priority]
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

// ============================================================================
// EVENT CHANNEL
// ============================================================================

export class EventChannel {
  private name: string;
  private bus: EventBus;
  private subscriptionIds: Set<string> = new Set();
  private prefix: string;
  
  constructor(name: string, bus: EventBus) {
    this.name = name;
    this.bus = bus;
    this.prefix = `channel:${name}:`;
  }
  
  subscribe<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
    options?: Parameters<EventBus['subscribe']>[2]
  ): string {
    const fullType = this.prefix + eventType;
    const id = this.bus.subscribe(fullType, handler, options);
    this.subscriptionIds.add(id);
    return id;
  }
  
  subscribeOnce<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
    options?: Parameters<EventBus['subscribeOnce']>[2]
  ): string {
    const fullType = this.prefix + eventType;
    const id = this.bus.subscribeOnce(fullType, handler, options);
    this.subscriptionIds.add(id);
    return id;
  }
  
  unsubscribe(subscriptionId: string): boolean {
    if (this.subscriptionIds.has(subscriptionId)) {
      this.subscriptionIds.delete(subscriptionId);
      return this.bus.unsubscribe(subscriptionId);
    }
    return false;
  }
  
  dispatch<T = unknown>(eventType: string, payload: T): void {
    this.bus.dispatch(this.prefix + eventType, payload, { source: this.name });
  }
  
  async dispatchAsync<T = unknown>(eventType: string, payload: T): Promise<void> {
    await this.bus.dispatchAsync(this.prefix + eventType, payload, { source: this.name });
  }
  
  getName(): string {
    return this.name;
  }
  
  dispose(): void {
    for (const id of this.subscriptionIds) {
      this.bus.unsubscribe(id);
    }
    this.subscriptionIds.clear();
  }
}

// ============================================================================
// TYPED EVENT EMITTER
// ============================================================================

export class TypedEventEmitter<TEvents extends Record<string, unknown>> {
  private bus: EventBus;
  private namespace: string;
  private subscriptionIds: Set<string> = new Set();
  
  constructor(namespace: string, bus?: EventBus) {
    this.namespace = namespace;
    this.bus = bus || EventBus.getInstance();
  }
  
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    this.bus.dispatch(`${this.namespace}:${String(event)}`, payload);
  }
  
  on<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void
  ): () => void {
    const id = this.bus.subscribe<TEvents[K]>(
      `${this.namespace}:${String(event)}`,
      (e) => handler(e.payload)
    );
    this.subscriptionIds.add(id);
    
    return () => {
      this.subscriptionIds.delete(id);
      this.bus.unsubscribe(id);
    };
  }
  
  subscribeOnce<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void
  ): () => void {
    const id = this.bus.subscribeOnce<TEvents[K]>(
      `${this.namespace}:${String(event)}`,
      (e) => handler(e.payload)
    );
    this.subscriptionIds.add(id);
    
    return () => {
      this.subscriptionIds.delete(id);
      this.bus.unsubscribe(id);
    };
  }
  
  off(event?: keyof TEvents): void {
    if (event) {
      // Remove specific event subscriptions
      const fullEvent = `${this.namespace}:${String(event)}`;
      for (const id of this.subscriptionIds) {
        // We need to track which IDs belong to which events for this to work properly
        // For now, just unsubscribe all in namespace
        this.bus.unsubscribe(id);
      }
    } else {
      // Remove all subscriptions
      for (const id of this.subscriptionIds) {
        this.bus.unsubscribe(id);
      }
      this.subscriptionIds.clear();
    }
  }
  
  dispose(): void {
    this.off();
  }
}

// ============================================================================
// SIGNAL (REACTIVE PATTERN)
// ============================================================================

export class Signal<T> {
  private value: T;
  private bus: EventBus;
  private eventType: string;
  private subscribers: Set<string> = new Set();
  
  constructor(initialValue: T, name?: string) {
    this.value = initialValue;
    this.bus = EventBus.getInstance();
    this.eventType = `signal:${name || `anonymous_${Date.now()}`}`;
  }
  
  get(): T {
    return this.value;
  }
  
  set(value: T): void {
    const oldValue = this.value;
    this.value = value;
    
    this.bus.dispatch(this.eventType, { oldValue, newValue: value });
  }
  
  update(fn: (current: T) => T): void {
    this.set(fn(this.value));
  }
  
  subscribe(handler: (newValue: T, oldValue: T) => void): () => void {
    const id = this.bus.subscribe<{ oldValue: T; newValue: T }>(
      this.eventType,
      (e) => handler(e.payload.newValue, e.payload.oldValue)
    );
    this.subscribers.add(id);
    
    return () => {
      this.subscribers.delete(id);
      this.bus.unsubscribe(id);
    };
  }
  
  dispose(): void {
    for (const id of this.subscribers) {
      this.bus.unsubscribe(id);
    }
    this.subscribers.clear();
  }
}

// ============================================================================
// COMPUTED SIGNAL
// ============================================================================

export class ComputedSignal<T> {
  private compute: () => T;
  private cachedValue: T | undefined;
  private dependencies: Signal<unknown>[];
  private unsubscribers: (() => void)[] = [];
  private signal: Signal<T>;
  
  constructor(compute: () => T, dependencies: Signal<unknown>[]) {
    this.compute = compute;
    this.dependencies = dependencies;
    this.cachedValue = compute();
    this.signal = new Signal(this.cachedValue);
    
    // Subscribe to dependencies
    for (const dep of dependencies) {
      const unsub = dep.subscribe(() => {
        this.recompute();
      });
      this.unsubscribers.push(unsub);
    }
  }
  
  get(): T {
    if (this.cachedValue === undefined) {
      this.cachedValue = this.compute();
    }
    return this.cachedValue;
  }
  
  private recompute(): void {
    this.cachedValue = this.compute();
    this.signal.set(this.cachedValue);
  }
  
  subscribe(handler: (value: T) => void): () => void {
    return this.signal.subscribe((newValue) => handler(newValue));
  }
  
  dispose(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.signal.dispose();
  }
}

// ============================================================================
// DEFERRED EVENT
// ============================================================================

export class DeferredEvent<T = void> {
  private bus: EventBus;
  private eventType: string;
  private resolved = false;
  private resolvedValue: T | undefined;
  
  constructor(name?: string) {
    this.bus = EventBus.getInstance();
    this.eventType = `deferred:${name || `anonymous_${Date.now()}`}`;
  }
  
  resolve(value: T): void {
    if (this.resolved) return;
    
    this.resolved = true;
    this.resolvedValue = value;
    this.bus.dispatch(this.eventType, value);
  }
  
  isResolved(): boolean {
    return this.resolved;
  }
  
  getValue(): T | undefined {
    return this.resolvedValue;
  }
  
  then(handler: (value: T) => void): () => void {
    if (this.resolved) {
      handler(this.resolvedValue as T);
      return () => {};
    }
    
    const id = this.bus.subscribeOnce<T>(this.eventType, (e) => handler(e.payload));
    return () => {
      this.bus.unsubscribe(id);
    };
  }
  
  toPromise(): Promise<T> {
    return new Promise((resolve) => {
      if (this.resolved) {
        resolve(this.resolvedValue as T);
        return;
      }
      
      this.bus.once<T>(this.eventType, (e) => resolve(e.payload));
    });
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useRef, useEffect, useContext, createContext, useCallback, useMemo } from 'react';

const EventBusContext = createContext<EventBus | null>(null);

export function EventBusProvider({ 
  children,
  config,
}: { 
  children: React.ReactNode;
  config?: Partial<EventBusConfig>;
}) {
  const busRef = useRef<EventBus>(new EventBus(config));
  
  useEffect(() => {
    return () => {
      busRef.current.dispose();
    };
  }, []);
  
  return (
    <EventBusContext.Provider value={busRef.current}>
      {children}
    </EventBusContext.Provider>
  );
}

export function useEventBus() {
  const bus = useContext(EventBusContext);
  if (!bus) {
    // Return global instance if not in provider
    return EventBus.getInstance();
  }
  return bus;
}

export function useEvent<T = unknown>(
  eventType: string,
  handler: EventHandler<T>,
  deps: unknown[] = []
): void {
  const bus = useEventBus();
  
  useEffect(() => {
    const id = bus.subscribe<T>(eventType, handler);
    return () => {
      bus.unsubscribe(id);
    };
  }, [bus, eventType, ...deps]);
}

export function useEventDispatch() {
  const bus = useEventBus();
  
  const dispatch = useCallback(
    <T = unknown>(eventType: string, payload: T) => {
      bus.dispatch(eventType, payload);
    },
    [bus]
  );
  
  const dispatchAsync = useCallback(
    async <T = unknown>(eventType: string, payload: T) => {
      await bus.dispatchAsync(eventType, payload);
    },
    [bus]
  );
  
  return { dispatch, dispatchAsync };
}

export function useSignal<T>(initialValue: T, name?: string): [T, (value: T) => void, Signal<T>] {
  const signalRef = useRef<Signal<T>>(new Signal(initialValue, name));
  const [value, setValue] = useState(initialValue);
  
  useEffect(() => {
    const signal = signalRef.current;
    const unsub = signal.subscribe((newValue) => {
      setValue(newValue);
    });
    
    return () => {
      unsub();
      signal.dispose();
    };
  }, []);
  
  const setSignalValue = useCallback((newValue: T) => {
    signalRef.current.set(newValue);
  }, []);
  
  return [value, setSignalValue, signalRef.current];
}

export function useChannel(channelName: string) {
  const bus = useEventBus();
  const channel = useMemo(() => bus.createChannel(channelName), [bus, channelName]);
  
  useEffect(() => {
    return () => {
      // Don't destroy channel on unmount - it may be used by other components
    };
  }, []);
  
  const subscribe = useCallback(
    <T = unknown>(eventType: string, handler: EventHandler<T>) => {
      return channel.subscribe(eventType, handler);
    },
    [channel]
  );
  
  const dispatch = useCallback(
    <T = unknown>(eventType: string, payload: T) => {
      channel.dispatch(eventType, payload);
    },
    [channel]
  );
  
  return { channel, subscribe, dispatch };
}

export function useEventHistory(options?: { type?: string; limit?: number }) {
  const bus = useEventBus();
  const [history, setHistory] = useState<EventData[]>([]);
  
  useEffect(() => {
    const updateHistory = () => {
      setHistory(bus.getHistory(options));
    };
    
    updateHistory();
    
    const id = bus.subscribe('*', updateHistory);
    
    return () => {
      bus.unsubscribe(id);
    };
  }, [bus, options?.type, options?.limit]);
  
  const clearHistory = useCallback(() => {
    bus.clearHistory();
    setHistory([]);
  }, [bus]);
  
  return { history, clearHistory };
}

// ============================================================================
// DECORATORS (for class-based usage)
// ============================================================================

// Storage for event subscriptions (replacing reflect-metadata)
const eventSubscriptionsMap = new WeakMap<Function, string[]>();

export function OnEvent(eventType: string, options?: { priority?: EventPriority }) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const bus = EventBus.getInstance();
    
    // Store subscription for cleanup (without reflect-metadata)
    const constructor = target.constructor;
    if (!eventSubscriptionsMap.has(constructor)) {
      eventSubscriptionsMap.set(constructor, []);
    }
    
    const subscriptions = eventSubscriptionsMap.get(constructor)!;
    
    const wrapper = function (this: object, ...args: unknown[]) {
      const id = bus.subscribe(
        eventType,
        (event) => originalMethod.call(this, event),
        { priority: options?.priority }
      );
      subscriptions.push(id);
    };
    
    descriptor.value = wrapper;
    return descriptor;
  };
}

export function EmitEvent(eventType: string) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const bus = EventBus.getInstance();
    
    descriptor.value = function (...args: unknown[]) {
      const result = originalMethod.apply(this, args);
      bus.dispatch(eventType, { args, result });
      return result;
    };
    
    return descriptor;
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
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
