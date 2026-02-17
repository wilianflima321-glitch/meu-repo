/**
 * Object Inspector System - Inspetor de Objetos Avançado
 * 
 * Sistema completo com:
 * - Property inspection
 * - Live value editing
 * - Object hierarchy
 * - Component viewers
 * - Value serialization
 * - Change tracking
 * - Property search
 * - Custom inspectors
 * 
 * @module lib/debug/object-inspector
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// OBJECT INSPECTOR
// ============================================================================

export class ObjectInspector extends EventEmitter {
  private static instance: ObjectInspector | null = null;
  
  private config: InspectorConfig;
  private inspectedObjects: Map<string, InspectedObject> = new Map();
  private selectedObject: string | null = null;
  private customInspectors: CustomInspector[] = [];
  private changeHistory: PropertyChange[] = [];
  private expandedPaths: Set<string> = new Set();
  private idCounter = 0;
  
  constructor(config: Partial<InspectorConfig> = {}) {
    super();
    
    this.config = {
      maxDepth: 10,
      maxArrayItems: 100,
      maxStringLength: 1000,
      trackChanges: true,
      expandByDefault: false,
      ...config,
    };
    
    this.registerBuiltInInspectors();
  }
  
  static getInstance(): ObjectInspector {
    if (!ObjectInspector.instance) {
      ObjectInspector.instance = new ObjectInspector();
    }
    return ObjectInspector.instance;
  }
  
  // ============================================================================
  // OBJECT INSPECTION
  // ============================================================================
  
  inspect(object: unknown, name?: string): InspectedObject {
    const id = `obj_${++this.idCounter}`;
    const typeName = this.getTypeName(object);
    
    const inspected: InspectedObject = {
      id,
      name: name || typeName,
      type: typeName,
      object,
      properties: this.getProperties(object, '', 0),
    };
    
    // Extract components if this looks like a game object
    if (this.isGameObject(object)) {
      inspected.components = this.getComponents(object);
    }
    
    this.inspectedObjects.set(id, inspected);
    this.emit('objectInspected', inspected);
    
    return inspected;
  }
  
  uninspect(id: string): void {
    this.inspectedObjects.delete(id);
    if (this.selectedObject === id) {
      this.selectedObject = null;
    }
    this.emit('objectUninspected', id);
  }
  
  select(id: string | null): void {
    this.selectedObject = id;
    this.emit('selectionChanged', id);
  }
  
  getSelected(): InspectedObject | null {
    if (!this.selectedObject) return null;
    return this.inspectedObjects.get(this.selectedObject) || null;
  }
  
  refresh(id: string): InspectedObject | null {
    const inspected = this.inspectedObjects.get(id);
    if (!inspected) return null;
    
    inspected.properties = this.getProperties(inspected.object, '', 0);
    
    if (this.isGameObject(inspected.object)) {
      inspected.components = this.getComponents(inspected.object);
    }
    
    this.emit('objectRefreshed', inspected);
    return inspected;
  }
  
  // ============================================================================
  // PROPERTY EXTRACTION
  // ============================================================================
  
  private getProperties(obj: unknown, basePath: string, depth: number): PropertyDescriptor[] {
    if (depth > this.config.maxDepth) {
      return [];
    }
    
    if (obj === null || obj === undefined) {
      return [];
    }
    
    // Check custom inspectors first
    for (const inspector of this.customInspectors) {
      if (inspector.match(obj)) {
        return inspector.getProperties(obj);
      }
    }
    
    const properties: PropertyDescriptor[] = [];
    
    if (typeof obj === 'object') {
      const entries = this.getObjectEntries(obj);
      
      for (const [key, value] of entries) {
        const path = basePath ? `${basePath}.${key}` : key;
        const descriptor = this.createPropertyDescriptor(obj, key, value, path, depth);
        properties.push(descriptor);
      }
    }
    
    return properties;
  }
  
  private getObjectEntries(obj: object): [string, unknown][] {
    if (Array.isArray(obj)) {
      return obj.slice(0, this.config.maxArrayItems).map((v, i) => [String(i), v]);
    }
    
    if (obj instanceof Map) {
      return Array.from(obj.entries()).map(([k, v]) => [String(k), v]);
    }
    
    if (obj instanceof Set) {
      return Array.from(obj).map((v, i) => [String(i), v]);
    }
    
    const entries: [string, unknown][] = [];
    
    // Get own properties
    for (const key of Object.keys(obj)) {
      try {
        entries.push([key, (obj as Record<string, unknown>)[key]]);
      } catch {
        entries.push([key, '<error accessing property>']);
      }
    }
    
    return entries;
  }
  
  private createPropertyDescriptor(
    parent: unknown,
    key: string,
    value: unknown,
    path: string,
    depth: number
  ): PropertyDescriptor {
    const type = this.getPropertyType(value);
    const desc = Object.getOwnPropertyDescriptor(parent as object, key);
    
    const descriptor: PropertyDescriptor = {
      name: key,
      path,
      type,
      value: this.serializeValue(value, type),
      writable: desc?.writable ?? true,
      enumerable: desc?.enumerable ?? true,
      configurable: desc?.configurable ?? true,
      getter: !!desc?.get,
      setter: !!desc?.set,
      metadata: this.extractMetadata(parent, key),
    };
    
    // Add children for objects/arrays
    if (this.hasChildren(type, value)) {
      if (this.config.expandByDefault || this.expandedPaths.has(path)) {
        descriptor.children = this.getProperties(value, path, depth + 1);
      } else {
        // Mark as expandable without loading children
        descriptor.children = [];
      }
    }
    
    return descriptor;
  }
  
  private hasChildren(type: PropertyType, value: unknown): boolean {
    return (
      (type === 'object' || type === 'array' || type === 'map' || type === 'set') &&
      value !== null
    );
  }
  
  // ============================================================================
  // VALUE EDITING
  // ============================================================================
  
  setValue(id: string, path: string, value: unknown): boolean {
    const inspected = this.inspectedObjects.get(id);
    if (!inspected) return false;
    
    try {
      const oldValue = this.getValueAtPath(inspected.object, path);
      
      // Check custom inspector for setValue
      for (const inspector of this.customInspectors) {
        if (inspector.match(inspected.object) && inspector.setValue) {
          if (inspector.setValue(inspected.object, path, value)) {
            this.recordChange(path, oldValue, value);
            this.refresh(id);
            return true;
          }
        }
      }
      
      // Default setValue
      const success = this.setValueAtPath(inspected.object, path, value);
      
      if (success) {
        this.recordChange(path, oldValue, value);
        this.refresh(id);
      }
      
      return success;
    } catch (error) {
      this.emit('error', { path, error });
      return false;
    }
  }
  
  private getValueAtPath(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    
    return current;
  }
  
  private setValueAtPath(obj: unknown, path: string, value: unknown): boolean {
    const parts = path.split('.');
    let current: unknown = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (current === null || current === undefined) return false;
      current = (current as Record<string, unknown>)[parts[i]];
    }
    
    if (current === null || current === undefined) return false;
    
    const lastKey = parts[parts.length - 1];
    (current as Record<string, unknown>)[lastKey] = value;
    
    return true;
  }
  
  // ============================================================================
  // CHANGE TRACKING
  // ============================================================================
  
  private recordChange(path: string, oldValue: unknown, newValue: unknown): void {
    if (!this.config.trackChanges) return;
    
    const change: PropertyChange = {
      path,
      oldValue,
      newValue,
      timestamp: Date.now(),
    };
    
    this.changeHistory.push(change);
    this.emit('propertyChanged', change);
    
    // Keep only last 100 changes
    while (this.changeHistory.length > 100) {
      this.changeHistory.shift();
    }
  }
  
  getChangeHistory(): PropertyChange[] {
    return [...this.changeHistory];
  }
  
  clearChangeHistory(): void {
    this.changeHistory = [];
  }
  
  // ============================================================================
  // EXPANSION STATE
  // ============================================================================
  
  expand(path: string): void {
    this.expandedPaths.add(path);
    this.emit('pathExpanded', path);
  }
  
  collapse(path: string): void {
    this.expandedPaths.delete(path);
    this.emit('pathCollapsed', path);
  }
  
  toggle(path: string): void {
    if (this.expandedPaths.has(path)) {
      this.collapse(path);
    } else {
      this.expand(path);
    }
  }
  
  isExpanded(path: string): boolean {
    return this.expandedPaths.has(path);
  }
  
  expandAll(id: string): void {
    const inspected = this.inspectedObjects.get(id);
    if (!inspected) return;
    
    const expandRecursive = (props: PropertyDescriptor[]) => {
      for (const prop of props) {
        if (prop.children && prop.children.length > 0) {
          this.expandedPaths.add(prop.path);
          expandRecursive(prop.children);
        }
      }
    };
    
    expandRecursive(inspected.properties);
    this.refresh(id);
  }
  
  collapseAll(): void {
    this.expandedPaths.clear();
    this.emit('allCollapsed');
  }
  
  // ============================================================================
  // SEARCH
  // ============================================================================
  
  search(id: string, query: string): PropertyDescriptor[] {
    const inspected = this.inspectedObjects.get(id);
    if (!inspected) return [];
    
    const results: PropertyDescriptor[] = [];
    const queryLower = query.toLowerCase();
    
    const searchRecursive = (props: PropertyDescriptor[]) => {
      for (const prop of props) {
        if (
          prop.name.toLowerCase().includes(queryLower) ||
          String(prop.value).toLowerCase().includes(queryLower)
        ) {
          results.push(prop);
        }
        
        if (prop.children) {
          searchRecursive(prop.children);
        }
      }
    };
    
    searchRecursive(inspected.properties);
    return results;
  }
  
  // ============================================================================
  // TYPE HELPERS
  // ============================================================================
  
  private getPropertyType(value: unknown): PropertyType {
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
        
        // Check for common game engine types
        if (this.isVector2(value)) return 'vector2';
        if (this.isVector3(value)) return 'vector3';
        if (this.isColor(value)) return 'color';
        if (this.isQuaternion(value)) return 'quaternion';
        if (this.isMatrix4(value)) return 'matrix4';
        
        return 'object';
        
      default:
        return 'unknown';
    }
  }
  
  private getTypeName(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (typeof value === 'object') {
      return value.constructor?.name || 'Object';
    }
    return typeof value;
  }
  
  private isVector2(value: unknown): boolean {
    return (
      value !== null &&
      typeof value === 'object' &&
      'x' in value &&
      'y' in value &&
      !('z' in value)
    );
  }
  
  private isVector3(value: unknown): boolean {
    return (
      value !== null &&
      typeof value === 'object' &&
      'x' in value &&
      'y' in value &&
      'z' in value &&
      !('w' in value)
    );
  }
  
  private isColor(value: unknown): boolean {
    return (
      value !== null &&
      typeof value === 'object' &&
      (('r' in value && 'g' in value && 'b' in value) ||
        ('isColor' in value))
    );
  }
  
  private isQuaternion(value: unknown): boolean {
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
  
  private isMatrix4(value: unknown): boolean {
    return (
      value !== null &&
      typeof value === 'object' &&
      'elements' in value &&
      Array.isArray((value as { elements: unknown }).elements) &&
      (value as { elements: unknown[] }).elements.length === 16
    );
  }
  
  private isGameObject(value: unknown): boolean {
    return (
      value !== null &&
      typeof value === 'object' &&
      ('components' in value || 'children' in value || 'isObject3D' in value)
    );
  }
  
  // ============================================================================
  // VALUE SERIALIZATION
  // ============================================================================
  
  private serializeValue(value: unknown, type: PropertyType): unknown {
    switch (type) {
      case 'string':
        const str = value as string;
        return str.length > this.config.maxStringLength
          ? str.substring(0, this.config.maxStringLength) + '...'
          : str;
          
      case 'function':
        const fn = value as Function;
        return `function ${fn.name || 'anonymous'}()`;
        
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
        
      case 'object':
        if (value === null) return null;
        const constructor = (value as object).constructor?.name;
        return constructor ? `{${constructor}}` : '{Object}';
        
      case 'vector2':
        const v2 = value as { x: number; y: number };
        return { x: v2.x, y: v2.y };
        
      case 'vector3':
        const v3 = value as { x: number; y: number; z: number };
        return { x: v3.x, y: v3.y, z: v3.z };
        
      case 'color':
        const c = value as { r: number; g: number; b: number };
        return { r: c.r, g: c.g, b: c.b };
        
      case 'quaternion':
        const q = value as { x: number; y: number; z: number; w: number };
        return { x: q.x, y: q.y, z: q.z, w: q.w };
        
      default:
        return value;
    }
  }
  
  // ============================================================================
  // COMPONENT EXTRACTION
  // ============================================================================
  
  private getComponents(obj: unknown): ComponentInfo[] {
    const components: ComponentInfo[] = [];
    
    // Three.js Object3D style
    if ((obj as { children?: unknown[] }).children) {
      // Don't add children as components
    }
    
    // ECS style components
    if ((obj as { components?: Map<string, unknown> }).components instanceof Map) {
      const comps = (obj as { components: Map<string, unknown> }).components;
      
      for (const [name, component] of comps) {
        components.push({
          name,
          type: this.getTypeName(component),
          enabled: true,
          properties: this.getProperties(component, '', 0),
        });
      }
    }
    
    // Array-style components
    if (Array.isArray((obj as { components?: unknown[] }).components)) {
      const comps = (obj as { components: unknown[] }).components;
      
      for (let i = 0; i < comps.length; i++) {
        const component = comps[i];
        components.push({
          name: this.getTypeName(component),
          type: this.getTypeName(component),
          enabled: true,
          properties: this.getProperties(component, '', 0),
        });
      }
    }
    
    return components;
  }
  
  // ============================================================================
  // METADATA EXTRACTION
  // ============================================================================
  
  private extractMetadata(obj: unknown, key: string): PropertyMetadata | undefined {
    // Check for __metadata__ property
    const meta = (obj as Record<string, unknown>).__metadata__;
    if (meta && typeof meta === 'object' && (meta as Record<string, unknown>)[key]) {
      return (meta as Record<string, PropertyMetadata>)[key];
    }
    
    // Check for decorator metadata
    const proto = Object.getPrototypeOf(obj);
    if (proto && proto.__propertyMetadata__) {
      return proto.__propertyMetadata__[key];
    }
    
    return undefined;
  }
  
  // ============================================================================
  // CUSTOM INSPECTORS
  // ============================================================================
  
  registerInspector(inspector: CustomInspector): void {
    this.customInspectors.push(inspector);
  }
  
  unregisterInspector(type: string): void {
    const index = this.customInspectors.findIndex(i => i.type === type);
    if (index !== -1) {
      this.customInspectors.splice(index, 1);
    }
  }
  
  private registerBuiltInInspectors(): void {
    // Vector3 inspector
    this.registerInspector({
      type: 'Vector3',
      match: (v) => this.isVector3(v),
      getProperties: (v) => {
        const vec = v as { x: number; y: number; z: number };
        return [
          { name: 'x', path: 'x', type: 'number', value: vec.x, writable: true, enumerable: true, configurable: true, metadata: { step: 0.1 } },
          { name: 'y', path: 'y', type: 'number', value: vec.y, writable: true, enumerable: true, configurable: true, metadata: { step: 0.1 } },
          { name: 'z', path: 'z', type: 'number', value: vec.z, writable: true, enumerable: true, configurable: true, metadata: { step: 0.1 } },
        ];
      },
    });
    
    // Color inspector
    this.registerInspector({
      type: 'Color',
      match: (v) => this.isColor(v),
      getProperties: (v) => {
        const color = v as { r: number; g: number; b: number };
        return [
          { name: 'r', path: 'r', type: 'number', value: color.r, writable: true, enumerable: true, configurable: true, metadata: { min: 0, max: 1, step: 0.01 } },
          { name: 'g', path: 'g', type: 'number', value: color.g, writable: true, enumerable: true, configurable: true, metadata: { min: 0, max: 1, step: 0.01 } },
          { name: 'b', path: 'b', type: 'number', value: color.b, writable: true, enumerable: true, configurable: true, metadata: { min: 0, max: 1, step: 0.01 } },
        ];
      },
    });
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  clear(): void {
    this.inspectedObjects.clear();
    this.selectedObject = null;
    this.changeHistory = [];
    this.expandedPaths.clear();
  }
  
  dispose(): void {
    this.clear();
    this.customInspectors = [];
    this.removeAllListeners();
  }
}

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

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useContext, createContext, useCallback, useMemo, useRef } from 'react';

interface InspectorContextValue {
  inspector: ObjectInspector;
}

const InspectorContext = createContext<InspectorContextValue | null>(null);

export function InspectorProvider({ 
  children,
  config,
}: { 
  children: React.ReactNode;
  config?: Partial<InspectorConfig>;
}) {
  const value = useMemo(() => ({
    inspector: new ObjectInspector(config),
  }), [config]);
  
  useEffect(() => {
    return () => {
      value.inspector.dispose();
    };
  }, [value]);
  
  return (
    <InspectorContext.Provider value={value}>
      {children}
    </InspectorContext.Provider>
  );
}

export function useObjectInspector() {
  const context = useContext(InspectorContext);
  return context?.inspector || ObjectInspector.getInstance();
}

export function useInspectedObject(id: string) {
  const inspector = useObjectInspector();
  const [object, setObject] = useState<InspectedObject | null>(null);
  
  useEffect(() => {
    const updateObject = () => {
      const inspected = inspector['inspectedObjects'].get(id);
      setObject(inspected ? { ...inspected } : null);
    };
    
    updateObject();
    
    inspector.on('objectRefreshed', (obj: InspectedObject) => {
      if (obj.id === id) updateObject();
    });
    
    return () => {
      inspector.removeAllListeners('objectRefreshed');
    };
  }, [inspector, id]);
  
  const setValue = useCallback((path: string, value: unknown) => {
    return inspector.setValue(id, path, value);
  }, [inspector, id]);
  
  const refresh = useCallback(() => {
    inspector.refresh(id);
  }, [inspector, id]);
  
  return { object, setValue, refresh };
}

export function useInspectorSelection() {
  const inspector = useObjectInspector();
  const [selected, setSelected] = useState<InspectedObject | null>(null);
  
  useEffect(() => {
    const update = () => {
      setSelected(inspector.getSelected());
    };
    
    update();
    inspector.on('selectionChanged', update);
    
    return () => {
      inspector.off('selectionChanged', update);
    };
  }, [inspector]);
  
  const select = useCallback((id: string | null) => {
    inspector.select(id);
  }, [inspector]);
  
  return { selected, select };
}

export function usePropertyEditor(id: string, path: string) {
  const inspector = useObjectInspector();
  const [value, setValue] = useState<unknown>(null);
  
  useEffect(() => {
    const obj = inspector['inspectedObjects'].get(id);
    if (obj) {
      const prop = findProperty(obj.properties, path);
      setValue(prop?.value);
    }
  }, [inspector, id, path]);
  
  const update = useCallback((newValue: unknown) => {
    inspector.setValue(id, path, newValue);
    setValue(newValue);
  }, [inspector, id, path]);
  
  return { value, update };
}

function findProperty(props: PropertyDescriptor[], path: string): PropertyDescriptor | null {
  for (const prop of props) {
    if (prop.path === path) return prop;
    if (prop.children) {
      const found = findProperty(prop.children, path);
      if (found) return found;
    }
  }
  return null;
}

export function useInspectorSearch(id: string) {
  const inspector = useObjectInspector();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PropertyDescriptor[]>([]);
  
  useEffect(() => {
    if (query.length > 1) {
      setResults(inspector.search(id, query));
    } else {
      setResults([]);
    }
  }, [inspector, id, query]);
  
  return { query, setQuery, results };
}

const __defaultExport = {
  ObjectInspector,
  Inspectable,
  Range,
  Slider,
  Color,
  Hidden,
  Readonly,
  Category,
  InspectorProvider,
  useObjectInspector,
  useInspectedObject,
  useInspectorSelection,
  usePropertyEditor,
  useInspectorSearch,
};

export default __defaultExport;
