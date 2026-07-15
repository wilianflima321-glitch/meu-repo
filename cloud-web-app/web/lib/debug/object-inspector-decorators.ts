/**
 * Decorators for object inspector property metadata.
 */

import type { PropertyMetadata } from './object-inspector-contracts';

// ============================================================================
// PROPERTY DECORATORS
// ============================================================================

export function Inspectable(metadata?: PropertyMetadata) {
  return function (target: object, propertyKey: string) {
    const proto = target as Record<string, unknown>;
    if (!proto.__propertyMetadata__) {
      proto.__propertyMetadata__ = {};
    }
    (proto.__propertyMetadata__ as Record<string, PropertyMetadata>)[propertyKey] = metadata || {};
  };
}

export function Range(min: number, max: number) {
  return Inspectable({ min, max, range: [min, max] });
}

export function Slider(min: number, max: number, step = 1) {
  return Inspectable({ min, max, step, slider: true });
}

export function Color() {
  return Inspectable({ color: true });
}

export function Hidden() {
  return Inspectable({ hidden: true });
}

export function Readonly() {
  return Inspectable({ readonly: true });
}

export function Category(name: string) {
  return Inspectable({ category: name });
}
