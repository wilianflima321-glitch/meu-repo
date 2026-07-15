import type { PropertyType } from './object-inspector-contracts';

export function getInspectorPropertyType(value: unknown): PropertyType {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  const type = typeof value;

  switch (type) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'function':
    case 'symbol':
    case 'bigint':
      return type;

    case 'object':
      if (Array.isArray(value)) return 'array';
      if (value instanceof Date) return 'date';
      if (value instanceof RegExp) return 'regexp';
      if (value instanceof Map) return 'map';
      if (value instanceof Set) return 'set';
      if (value instanceof Error) return 'error';
      if (value instanceof Promise) return 'promise';
      if (isInspectorVector2(value)) return 'vector2';
      if (isInspectorVector3(value)) return 'vector3';
      if (isInspectorColor(value)) return 'color';
      if (isInspectorQuaternion(value)) return 'quaternion';
      if (isInspectorMatrix4(value)) return 'matrix4';
      return 'object';

    default:
      return 'unknown';
  }
}

export function getInspectorTypeName(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === 'object') {
    return value.constructor?.name || 'Object';
  }
  return typeof value;
}

export function isInspectorVector2(value: unknown): boolean {
  return value !== null && typeof value === 'object' && 'x' in value && 'y' in value && !('z' in value);
}

export function isInspectorVector3(value: unknown): boolean {
  return value !== null && typeof value === 'object' && 'x' in value && 'y' in value && 'z' in value && !('w' in value);
}

export function isInspectorColor(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    (('r' in value && 'g' in value && 'b' in value) || 'isColor' in value)
  );
}

export function isInspectorQuaternion(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    'x' in value &&
    'y' in value &&
    'z' in value &&
    'w' in value &&
    ('isQuaternion' in value || Object.keys(value).length === 4)
  );
}

export function isInspectorMatrix4(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    'elements' in value &&
    Array.isArray((value as { elements: unknown }).elements) &&
    (value as { elements: unknown[] }).elements.length === 16
  );
}

export function isInspectorGameObject(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    ('components' in value || 'children' in value || 'isObject3D' in value)
  );
}

export function serializeInspectorValue(value: unknown, type: PropertyType, maxStringLength: number): unknown {
  switch (type) {
    case 'string': {
      const str = value as string;
      return str.length > maxStringLength ? `${str.substring(0, maxStringLength)}...` : str;
    }

    case 'function': {
      const fn = value as Function;
      return `function ${fn.name || 'anonymous'}()`;
    }

    case 'symbol':
      return (value as symbol).toString();
    case 'date':
      return (value as Date).toISOString();
    case 'regexp':
      return (value as RegExp).toString();
    case 'error':
      return (value as Error).message;
    case 'promise':
      return '[Promise]';
    case 'map':
      return `Map(${(value as Map<unknown, unknown>).size})`;
    case 'set':
      return `Set(${(value as Set<unknown>).size})`;
    case 'array':
      return `Array(${(value as unknown[]).length})`;
    case 'object': {
      if (value === null) return null;
      const constructor = (value as object).constructor?.name;
      return constructor ? `{${constructor}}` : '{Object}';
    }
    case 'vector2': {
      const v2 = value as { x: number; y: number };
      return { x: v2.x, y: v2.y };
    }
    case 'vector3': {
      const v3 = value as { x: number; y: number; z: number };
      return { x: v3.x, y: v3.y, z: v3.z };
    }
    case 'color': {
      const c = value as { r: number; g: number; b: number };
      return { r: c.r, g: c.g, b: c.b };
    }
    case 'quaternion': {
      const q = value as { x: number; y: number; z: number; w: number };
      return { x: q.x, y: q.y, z: q.z, w: q.w };
    }
    default:
      return value;
  }
}
