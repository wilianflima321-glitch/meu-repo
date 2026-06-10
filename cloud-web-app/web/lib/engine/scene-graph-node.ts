// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
/** Scene graph nodes and components: hierarchy, lifecycle and serialization. */
import { EventEmitter } from 'events';
import { THREE } from './scene-graph-three';
import { Transform } from './scene-transform';
import type { ContactPoint, NodeTag, SceneNodeData } from './scene-graph-contracts';
import type { Scene } from './scene-graph-scene';

let nodeIdCounter = 0;
export class SceneNode extends EventEmitter {
  public readonly id: string;
  public name: string;
  public readonly transform: Transform;
  private _enabled: boolean = true;
  private _activeSelf: boolean = true;
  private _activeInHierarchy: boolean = true;
  private _tags: Set<NodeTag> = new Set();
  private _layer: number = 0;
  private _parent: SceneNode | null = null;
  private _children: SceneNode[] = [];
  private _components: Map<string, Component> = new Map();
  private _scene: Scene | null = null;
  private _prefabId?: string;
  private _threeObject?: THREE.Object3D;
  public bounds: THREE.Box3 = new THREE.Box3();
  public boundingSphere: THREE.Sphere = new THREE.Sphere();
  constructor(name: string = 'Node') {
    super();
    this.id = `node_${++nodeIdCounter}_${Date.now().toString(36)}`;
    this.name = name;
    this.transform = new Transform();
    this.transform.setNode(this);
  }
  get enabled(): boolean { return this._enabled; }
  set enabled(value: boolean) {
    if (this._enabled !== value) {
      this._enabled = value;
      this.updateActiveState();
      this.emit('enabledChanged', value);
    }
  }
  get activeSelf(): boolean { return this._activeSelf; }
  set activeSelf(value: boolean) {
    if (this._activeSelf !== value) {
      this._activeSelf = value;
      this.updateActiveState();
    }
  }
  get activeInHierarchy(): boolean { return this._activeInHierarchy; }
  private updateActiveState(): void {
    const wasActive = this._activeInHierarchy;
    this._activeInHierarchy = this._activeSelf && this._enabled &&
      (this._parent ? this._parent._activeInHierarchy : true);
    if (wasActive !== this._activeInHierarchy) {
      this.emit('activeChanged', this._activeInHierarchy);
      for (const comp of this._components.values()) {
        if (this._activeInHierarchy) {
          comp.onEnable?.();
        } else {
          comp.onDisable?.();
        }
      }
      for (const child of this._children) {
        child.updateActiveState();
      }
    }
  }
  get tags(): NodeTag[] { return Array.from(this._tags); }
  get layer(): number { return this._layer; }
  set layer(value: number) { this._layer = value; }
  hasTag(tag: NodeTag): boolean { return this._tags.has(tag); }
  addTag(tag: NodeTag): void { this._tags.add(tag); }
  removeTag(tag: NodeTag): void { this._tags.delete(tag); }
  get parent(): SceneNode | null { return this._parent; }
  get children(): readonly SceneNode[] { return this._children; }
  get childCount(): number { return this._children.length; }
  get scene(): Scene | null { return this._scene; }
  get root(): SceneNode { return this._parent ? this._parent.root : this; }
  get prefabId(): string | undefined { return this._prefabId; }
  set prefabId(id: string | undefined) { this._prefabId = id; }
  get threeObject(): THREE.Object3D | undefined { return this._threeObject; }
  set threeObject(obj: THREE.Object3D | undefined) { this._threeObject = obj; }
  setParent(newParent: SceneNode | null, worldPositionStays: boolean = false): void {
    if (this._parent === newParent) return;
    const oldWorldPos = worldPositionStays ? this.transform.worldPosition.clone() : null;
    const oldWorldRot = worldPositionStays ? this.transform.worldRotation.clone() : null;
    if (this._parent) {
      const idx = this._parent._children.indexOf(this);
      if (idx >= 0) this._parent._children.splice(idx, 1);
      this._parent.emit('childRemoved', this);
    }
    this._parent = newParent;
    this.transform.setParent(newParent?.transform || null);
    if (newParent) {
      newParent._children.push(this);
      newParent.emit('childAdded', this);
      this._scene = newParent._scene;
    } else {
      this._scene = null;
    }
    if (worldPositionStays && oldWorldPos && oldWorldRot) {
      this.transform.setWorldPosition(oldWorldPos);
      this.transform.setWorldRotation(oldWorldRot);
    }
    this.updateActiveState();
    this.emit('parentChanged', newParent);
  }
  addChild(child: SceneNode): void {
    child.setParent(this);
  }
  removeChild(child: SceneNode): void {
    if (child._parent === this) {
      child.setParent(null);
    }
  }
  getChild(index: number): SceneNode | undefined {
    return this._children[index];
  }
  findChild(name: string): SceneNode | null {
    for (const child of this._children) {
      if (child.name === name) return child;
    }
    return null;
  }
  findChildRecursive(name: string): SceneNode | null {
    for (const child of this._children) {
      if (child.name === name) return child;
      const found = child.findChildRecursive(name);
      if (found) return found;
    }
    return null;
  }
  findByTag(tag: NodeTag): SceneNode | null {
    if (this._tags.has(tag)) return this;
    for (const child of this._children) {
      const found = child.findByTag(tag);
      if (found) return found;
    }
    return null;
  }
  findAllByTag(tag: NodeTag): SceneNode[] {
    const results: SceneNode[] = [];
    this.traverseDepthFirst(node => {
      if (node._tags.has(tag)) results.push(node);
    });
    return results;
  }
  getSiblingIndex(): number {
    return this._parent?._children.indexOf(this) ?? -1;
  }
  setSiblingIndex(index: number): void {
    if (!this._parent) return;
    const siblings = this._parent._children;
    const currentIndex = siblings.indexOf(this);
    if (currentIndex >= 0) {
      siblings.splice(currentIndex, 1);
      siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, this);
    }
  }
  addComponent<T extends Component>(ComponentClass: new () => T): T {
    const component = new ComponentClass();
    const typeName = ComponentClass.name;
    component.node = this;
    this._components.set(typeName, component);
    if (this._activeInHierarchy) {
      component.onAwake?.();
      component.onEnable?.();
    }
    this.emit('componentAdded', component);
    return component;
  }
  getComponent<T extends Component>(ComponentClass: new () => T): T | null {
    return (this._components.get(ComponentClass.name) as T) || null;
  }
  hasComponent<T extends Component>(ComponentClass: new () => T): boolean {
    return this._components.has(ComponentClass.name);
  }
  removeComponent<T extends Component>(ComponentClass: new () => T): boolean {
    const typeName = ComponentClass.name;
    const component = this._components.get(typeName);
    if (component) {
      component.onDestroy?.();
      this._components.delete(typeName);
      this.emit('componentRemoved', component);
      return true;
    }
    return false;
  }
  getComponents(): Component[] {
    return Array.from(this._components.values());
  }
  getComponentInChildren<T extends Component>(ComponentClass: new () => T): T | null {
    for (const child of this._children) {
      const comp = child.getComponent(ComponentClass);
      if (comp) return comp;
      const inChildren = child.getComponentInChildren(ComponentClass);
      if (inChildren) return inChildren;
    }
    return null;
  }
  getComponentsInChildren<T extends Component>(ComponentClass: new () => T): T[] {
    const results: T[] = [];
    this.traverseDepthFirst(node => {
      const comp = node.getComponent(ComponentClass);
      if (comp) results.push(comp);
    });
    return results;
  }
  getComponentInParent<T extends Component>(ComponentClass: new () => T): T | null {
    if (!this._parent) return null;
    const comp = this._parent.getComponent(ComponentClass);
    if (comp) return comp;
    return this._parent.getComponentInParent(ComponentClass);
  }
  traverseDepthFirst(callback: (node: SceneNode) => void): void {
    callback(this);
    for (const child of this._children) {
      child.traverseDepthFirst(callback);
    }
  }
  traverseBreadthFirst(callback: (node: SceneNode) => void): void {
    const queue: SceneNode[] = [this];
    while (queue.length > 0) {
      const node = queue.shift()!;
      callback(node);
      queue.push(...node._children);
    }
  }
  traverseAncestors(callback: (node: SceneNode) => void): void {
    let current: SceneNode | null = this._parent;
    while (current) {
      callback(current);
      current = current._parent;
    }
  }
  updateBounds(): void {
    this.bounds.makeEmpty();
    if (this._threeObject) {
      this._threeObject.traverse(obj => {
        if ((obj as THREE.Mesh).geometry) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry.computeBoundingBox();
          const box = mesh.geometry.boundingBox!.clone();
          box.applyMatrix4(mesh.matrixWorld);
          this.bounds.union(box);
        }
      });
    }
    for (const child of this._children) {
      child.updateBounds();
      this.bounds.union(child.bounds);
    }
    this.bounds.getBoundingSphere(this.boundingSphere);
  }
  update(deltaTime: number): void {
    if (!this._activeInHierarchy) return;
    for (const comp of this._components.values()) {
      if (comp.enabled) {
        comp.onUpdate?.(deltaTime);
      }
    }
    for (const child of this._children) {
      child.update(deltaTime);
    }
  }
  fixedUpdate(fixedDeltaTime: number): void {
    if (!this._activeInHierarchy) return;
    for (const comp of this._components.values()) {
      if (comp.enabled) {
        comp.onFixedUpdate?.(fixedDeltaTime);
      }
    }
    for (const child of this._children) {
      child.fixedUpdate(fixedDeltaTime);
    }
  }
  lateUpdate(deltaTime: number): void {
    if (!this._activeInHierarchy) return;
    for (const comp of this._components.values()) {
      if (comp.enabled) {
        comp.onLateUpdate?.(deltaTime);
      }
    }
    for (const child of this._children) {
      child.lateUpdate(deltaTime);
    }
  }
  destroy(): void {
    this.emit('destroy');
    for (const comp of this._components.values()) {
      comp.onDestroy?.();
    }
    this._components.clear();
    for (const child of [...this._children]) {
      child.destroy();
    }
    this.setParent(null);
    this._scene = null;
    this._threeObject = undefined;
  }
  clone(recursive: boolean = true): SceneNode {
    const clone = new SceneNode(this.name + '_Clone');
    clone.transform.fromJSON(this.transform.toJSON());
    clone._enabled = this._enabled;
    clone._activeSelf = this._activeSelf;
    clone._layer = this._layer;
    clone._tags = new Set(this._tags);
    clone._prefabId = this._prefabId;
    for (const [type, comp] of this._components) {
      const cloneComp = Object.create(Object.getPrototypeOf(comp));
      Object.assign(cloneComp, comp);
      cloneComp.node = clone;
      clone._components.set(type, cloneComp);
    }
    if (recursive) {
      for (const child of this._children) {
        const childClone = child.clone(true);
        childClone.setParent(clone);
      }
    }
    return clone;
  }
  toJSON(): SceneNodeData {
    return {
      id: this.id,
      name: this.name,
      enabled: this._enabled,
      tags: Array.from(this._tags),
      layer: this._layer,
      transform: this.transform.toJSON(),
      components: Array.from(this._components.values()).map(comp => ({
        type: comp.constructor.name,
        enabled: comp.enabled,
        data: comp.serialize?.() || {},
      })),
      children: this._children.map(child => child.toJSON()),
      prefabId: this._prefabId,
    };
  }
  setScene(scene: Scene | null): void {
    this._scene = scene;
    for (const child of this._children) {
      child.setScene(scene);
    }
  }
}
export abstract class Component {
  public node!: SceneNode;
  public enabled: boolean = true;
  get transform(): Transform { return this.node.transform; }
  get scene(): Scene | null { return this.node.scene; }
  onAwake?(): void;
  onEnable?(): void;
  onDisable?(): void;
  onStart?(): void;
  onUpdate?(deltaTime: number): void;
  onFixedUpdate?(fixedDeltaTime: number): void;
  onLateUpdate?(deltaTime: number): void;
  onDestroy?(): void;
  onCollisionEnter?(other: SceneNode, contact: ContactPoint): void;
  onCollisionStay?(other: SceneNode, contact: ContactPoint): void;
  onCollisionExit?(other: SceneNode): void;
  onTriggerEnter?(other: SceneNode): void;
  onTriggerStay?(other: SceneNode): void;
  onTriggerExit?(other: SceneNode): void;
  serialize?(): Record<string, unknown>;
  deserialize?(data: Record<string, unknown>): void;
  getComponent<T extends Component>(ComponentClass: new () => T): T | null {
    return this.node.getComponent(ComponentClass);
  }
  protected instantiate(prefabOrNode: SceneNode): SceneNode {
    return prefabOrNode.clone(true);
  }
  protected destroy(nodeOrComponent: SceneNode | Component): void {
    if (nodeOrComponent instanceof SceneNode) {
      nodeOrComponent.destroy();
    } else {
      nodeOrComponent.node.removeComponent(nodeOrComponent.constructor as new () => Component);
    }
  }
}
let sceneIdCounter = 0;
