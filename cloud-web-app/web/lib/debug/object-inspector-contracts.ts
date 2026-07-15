export type PropertyType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'function'
  | 'null'
  | 'undefined'
  | 'symbol'
  | 'bigint'
  | 'date'
  | 'regexp'
  | 'map'
  | 'set'
  | 'error'
  | 'promise'
  | 'vector2'
  | 'vector3'
  | 'color'
  | 'quaternion'
  | 'matrix4'
  | 'unknown';

export interface PropertyDescriptor {
  name: string;
  path: string;
  type: PropertyType;
  value: unknown;
  writable: boolean;
  enumerable: boolean;
  configurable: boolean;
  getter?: boolean;
  setter?: boolean;
  children?: PropertyDescriptor[];
  metadata?: PropertyMetadata;
}

export interface PropertyMetadata {
  displayName?: string;
  description?: string;
  category?: string;
  order?: number;
  hidden?: boolean;
  readonly?: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: unknown }[];
  color?: boolean;
  multiline?: boolean;
  slider?: boolean;
  range?: [number, number];
  precision?: number;
  unit?: string;
  customEditor?: string;
}

export interface InspectedObject {
  id: string;
  name: string;
  type: string;
  object: unknown;
  properties: PropertyDescriptor[];
  components?: ComponentInfo[];
  path?: string;
}

export interface ComponentInfo {
  name: string;
  type: string;
  enabled: boolean;
  properties: PropertyDescriptor[];
}

export interface PropertyChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: number;
}

export interface CustomInspector {
  type: string;
  match: (value: unknown) => boolean;
  getProperties: (value: unknown) => PropertyDescriptor[];
  setValue?: (target: unknown, path: string, value: unknown) => boolean;
}

export interface InspectorConfig {
  maxDepth: number;
  maxArrayItems: number;
  maxStringLength: number;
  trackChanges: boolean;
  expandByDefault: boolean;
}
