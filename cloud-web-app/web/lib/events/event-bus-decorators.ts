/** Decorator helpers for class-based event bus usage. */

import { EventBus } from './event-bus-system';
import type { EventPriority } from './event-bus-contracts';

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
