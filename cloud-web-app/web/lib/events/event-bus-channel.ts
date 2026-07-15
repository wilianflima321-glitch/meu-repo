import type { EventFilter, EventHandler, EventPriority } from './event-bus-contracts';

export interface EventBusChannelSubscribeOptions {
  priority?: EventPriority;
  once?: boolean;
  filter?: EventFilter;
  context?: unknown;
}

export interface EventBusChannelRuntime {
  subscribe<T = unknown>(eventType: string, handler: EventHandler<T>, options?: EventBusChannelSubscribeOptions): string;
  subscribeOnce<T = unknown>(eventType: string, handler: EventHandler<T>, options?: EventBusChannelSubscribeOptions): string;
  unsubscribe(subscriptionId: string): boolean;
  dispatch<T = unknown>(eventType: string, payload: T, options?: { source?: string; propagate?: boolean }): void;
  dispatchAsync<T = unknown>(eventType: string, payload: T, options?: { source?: string; propagate?: boolean }): Promise<void>;
}

export class EventChannel {
  private name: string;
  private bus: EventBusChannelRuntime;
  private subscriptionIds: Set<string> = new Set();
  private prefix: string;

  constructor(name: string, bus: EventBusChannelRuntime) {
    this.name = name;
    this.bus = bus;
    this.prefix = `channel:${name}:`;
  }

  subscribe<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
    options?: EventBusChannelSubscribeOptions
  ): string {
    const fullType = this.prefix + eventType;
    const id = this.bus.subscribe(fullType, handler, options);
    this.subscriptionIds.add(id);
    return id;
  }

  subscribeOnce<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
    options?: EventBusChannelSubscribeOptions
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
