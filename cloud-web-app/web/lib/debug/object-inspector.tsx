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
import type {
  ComponentInfo,
  CustomInspector,
  InspectedObject,
  InspectorConfig,
  PropertyChange,
  PropertyDescriptor,
  PropertyMetadata,
  PropertyType,
} from './object-inspector-contracts';
import { Category, Color, Hidden, Inspectable, Range, Readonly, Slider } from './object-inspector-decorators';
import { registerBuiltInObjectInspectors } from './object-inspector-builtins';
import {
  InspectorProvider,
  useInspectedObject,
  useInspectorSearch,
  useInspectorSelection,
  useObjectInspector,
  usePropertyEditor,
} from './object-inspector-react';
import {
  getInspectorPropertyType,
  getInspectorTypeName,
  isInspectorGameObject,
  serializeInspectorValue,
} from './object-inspector-values';
export type {
  ComponentInfo,
  CustomInspector,
  InspectedObject,
  InspectorConfig,
  PropertyChange,
  PropertyDescriptor,
  PropertyMetadata,
  PropertyType,
} from './object-inspector-contracts';
// ============================================================================
// TYPES
// ============================================================================
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
    const typeName = getInspectorTypeName(object);
    const inspected: InspectedObject = {
      id,
      name: name || typeName,
      type: typeName,
      object,
      properties: this.getProperties(object, '', 0),
    };
    // Extract components if this looks like a game object
    if (isInspectorGameObject(object)) {
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
    if (isInspectorGameObject(inspected.object)) {
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
    const type = getInspectorPropertyType(value);
    const desc = Object.getOwnPropertyDescriptor(parent as object, key);
    const descriptor: PropertyDescriptor = {
      name: key,
      path,
      type,
      value: serializeInspectorValue(value, type, this.config.maxStringLength),
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
          type: getInspectorTypeName(component),
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
          name: getInspectorTypeName(component),
          type: getInspectorTypeName(component),
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
    registerBuiltInObjectInspectors((inspector) => this.registerInspector(inspector));
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
export { Category, Color, Hidden, Inspectable, Range, Readonly, Slider } from './object-inspector-decorators';
// ============================================================================
// REACT HOOKS
// ============================================================================
export {
  InspectorProvider,
  useInspectedObject,
  useInspectorSearch,
  useInspectorSelection,
  useObjectInspector,
  usePropertyEditor,
} from './object-inspector-react';
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
