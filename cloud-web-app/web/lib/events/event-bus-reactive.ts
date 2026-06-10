import { EventBus } from './event-bus-system';

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
    handler: (payload: TEvents[K]) => void,
  ): () => void {
    const id = this.bus.subscribe<TEvents[K]>(
      `${this.namespace}:${String(event)}`,
      (e) => handler(e.payload),
    );
    this.subscriptionIds.add(id);

    return () => {
      this.subscriptionIds.delete(id);
      this.bus.unsubscribe(id);
    };
  }

  subscribeOnce<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void,
  ): () => void {
    const id = this.bus.subscribeOnce<TEvents[K]>(
      `${this.namespace}:${String(event)}`,
      (e) => handler(e.payload),
    );
    this.subscriptionIds.add(id);

    return () => {
      this.subscriptionIds.delete(id);
      this.bus.unsubscribe(id);
    };
  }

  off(event?: keyof TEvents): void {
    if (event) {
      for (const id of this.subscriptionIds) {
        this.bus.unsubscribe(id);
      }
    } else {
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
      (e) => handler(e.payload.newValue, e.payload.oldValue),
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

export class ComputedSignal<T> {
  private compute: () => T;
  private cachedValue: T | undefined;
  private unsubscribers: (() => void)[] = [];
  private signal: Signal<T>;

  constructor(compute: () => T, dependencies: Signal<unknown>[]) {
    this.compute = compute;
    this.cachedValue = compute();
    this.signal = new Signal(this.cachedValue);

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

      this.bus.subscribeOnce<T>(this.eventType, (e) => resolve(e.payload));
    });
  }
}
