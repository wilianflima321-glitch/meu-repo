/**
 * Decorators for scoped profiler instrumentation.
 */

import { Profiler } from './profiler-system';

// ============================================================================
// PROFILER DECORATORS
// ============================================================================

export function Profile(category = 'default') {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      const profiler = Profiler.getInstance();
      const name = `${target.constructor.name}.${propertyKey}`;

      return profiler.scope(name, () => original.apply(this, args), category);
    };

    return descriptor;
  };
}

export function ProfileAsync(category = 'default') {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const profiler = Profiler.getInstance();
      const name = `${target.constructor.name}.${propertyKey}`;

      return profiler.scopeAsync(name, () => original.apply(this, args), category);
    };

    return descriptor;
  };
}
