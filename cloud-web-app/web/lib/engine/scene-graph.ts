// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
import { logger } from '@/lib/observability/logger';
/** Scene graph runtime: hierarchical transforms, culling, LOD and serialization. */
import * as THREE from 'three';
import { EventEmitter } from 'events';
import { Transform } from './scene-transform';
export { Transform } from './scene-transform';
import type { ComponentData, ContactPoint, EnvironmentData, NodeTag, SceneData, SceneNodeData, SceneSettings, TransformData } from './scene-graph-contracts';
export type { ComponentData, ContactPoint, EnvironmentData, NodeTag, SceneData, SceneNodeData, SceneSettings, TransformData } from './scene-graph-contracts';
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
export class Scene extends EventEmitter {
  public readonly id: string;
  public name: string;
  private _rootNodes: SceneNode[] = [];
  private _nodeMap: Map<string, SceneNode> = new Map();
  private _activeCamera: SceneNode | null = null;
  public ambientColor: THREE.Color = new THREE.Color(0x404040);
  public ambientIntensity: number = 0.5;
  public skybox: THREE.CubeTexture | null = null;
  public fog: THREE.Fog | THREE.FogExp2 | null = null;
  public gravity: THREE.Vector3 = new THREE.Vector3(0, -9.81, 0);
  public physicsIterations: number = 6;
  public timeScale: number = 1;
  public threeScene: THREE.Scene;
  constructor(name: string = 'Scene') {
    super();
    this.id = `scene_${++sceneIdCounter}_${Date.now().toString(36)}`;
    this.name = name;
    this.threeScene = new THREE.Scene();
  }
  get rootNodes(): readonly SceneNode[] { return this._rootNodes; }
  addNode(node: SceneNode): void {
    if (node.parent) {
      node.setParent(null);
    }
    this._rootNodes.push(node);
    node.setScene(this);
    this.registerNodeRecursive(node);
    this.emit('nodeAdded', node);
  }
  removeNode(node: SceneNode): void {
    const idx = this._rootNodes.indexOf(node);
    if (idx >= 0) {
      this._rootNodes.splice(idx, 1);
      node.setScene(null);
      this.unregisterNodeRecursive(node);
      this.emit('nodeRemoved', node);
    }
  }
  private registerNodeRecursive(node: SceneNode): void {
    this._nodeMap.set(node.id, node);
    for (const child of node.children) {
      this.registerNodeRecursive(child);
    }
  }
  private unregisterNodeRecursive(node: SceneNode): void {
    this._nodeMap.delete(node.id);
    for (const child of node.children) {
      this.unregisterNodeRecursive(child);
    }
  }
  getNodeById(id: string): SceneNode | null {
    return this._nodeMap.get(id) || null;
  }
  findNodeByName(name: string): SceneNode | null {
    for (const root of this._rootNodes) {
      if (root.name === name) return root;
      const found = root.findChildRecursive(name);
      if (found) return found;
    }
    return null;
  }
  findNodesByTag(tag: NodeTag): SceneNode[] {
    const results: SceneNode[] = [];
    for (const root of this._rootNodes) {
      results.push(...root.findAllByTag(tag));
    }
    return results;
  }
  findNodesWithComponent<T extends Component>(ComponentClass: new () => T): SceneNode[] {
    const results: SceneNode[] = [];
    this.traverse(node => {
      if (node.hasComponent(ComponentClass)) {
        results.push(node);
      }
    });
    return results;
  }
  get activeCamera(): SceneNode | null { return this._activeCamera; }
  set activeCamera(camera: SceneNode | null) {
    this._activeCamera = camera;
    this.emit('activeCameraChanged', camera);
  }
  traverse(callback: (node: SceneNode) => void): void {
    for (const root of this._rootNodes) {
      root.traverseDepthFirst(callback);
    }
  }
  update(deltaTime: number): void {
    const scaledDelta = deltaTime * this.timeScale;
    for (const root of this._rootNodes) {
      root.update(scaledDelta);
    }
  }
  fixedUpdate(fixedDeltaTime: number): void {
    const scaledDelta = fixedDeltaTime * this.timeScale;
    for (const root of this._rootNodes) {
      root.fixedUpdate(scaledDelta);
    }
  }
  lateUpdate(deltaTime: number): void {
    const scaledDelta = deltaTime * this.timeScale;
    for (const root of this._rootNodes) {
      root.lateUpdate(scaledDelta);
    }
  }
  cullFrustum(frustum: THREE.Frustum): SceneNode[] {
    const visible: SceneNode[] = [];
    this.traverse(node => {
      if (node.activeInHierarchy && frustum.intersectsSphere(node.boundingSphere)) {
        visible.push(node);
      }
    });
    return visible;
  }
  raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number = Infinity): RaycastHit[] {
    const raycaster = new THREE.Raycaster(origin, direction.normalize(), 0, maxDistance);
    const intersects = raycaster.intersectObjects(this.threeScene.children, true);
    const hits: RaycastHit[] = [];
    for (const intersect of intersects) {
      let node: SceneNode | null = null;
      this.traverse(n => {
        if (n.threeObject === intersect.object || n.threeObject?.children.includes(intersect.object)) {
          node = n;
        }
      });
      if (node) {
        hits.push({
          node,
          point: intersect.point,
          normal: intersect.face?.normal || new THREE.Vector3(0, 1, 0),
          distance: intersect.distance,
          triangleIndex: intersect.faceIndex,
        });
      }
    }
    return hits;
  }
  clear(): void {
    for (const root of [...this._rootNodes]) {
      root.destroy();
    }
    this._rootNodes = [];
    this._nodeMap.clear();
    this._activeCamera = null;
  }
  toJSON(): SceneData {
    return {
      id: this.id,
      name: this.name,
      nodes: this._rootNodes.map(node => node.toJSON()),
      environment: {
        ambientColor: [this.ambientColor.r, this.ambientColor.g, this.ambientColor.b],
        ambientIntensity: this.ambientIntensity,
        fog: this.fog ? {
          type: this.fog instanceof THREE.FogExp2 ? 'exponential2' : 'linear',
          color: [this.fog.color.r, this.fog.color.g, this.fog.color.b],
          near: (this.fog as THREE.Fog).near,
          far: (this.fog as THREE.Fog).far,
          density: (this.fog as THREE.FogExp2).density,
        } : undefined,
      },
      settings: {
        gravity: [this.gravity.x, this.gravity.y, this.gravity.z],
        physicsIterations: this.physicsIterations,
        timeScale: this.timeScale,
      },
    };
  }
  static fromJSON(data: SceneData, componentRegistry: ComponentRegistry): Scene {
    const scene = new Scene(data.name);
    scene.ambientColor.setRGB(...data.environment.ambientColor);
    scene.ambientIntensity = data.environment.ambientIntensity;
    if (data.environment.fog) {
      const fogData = data.environment.fog;
      const fogColor = new THREE.Color().setRGB(...fogData.color);
      if (fogData.type === 'linear') {
        scene.fog = new THREE.Fog(fogColor, fogData.near!, fogData.far!);
      } else {
        scene.fog = new THREE.FogExp2(fogColor, fogData.density!);
      }
    }
    scene.gravity.set(...data.settings.gravity);
    scene.physicsIterations = data.settings.physicsIterations;
    scene.timeScale = data.settings.timeScale;
    for (const nodeData of data.nodes) {
      const node = SceneLoader.createNodeFromData(nodeData, componentRegistry);
      scene.addNode(node);
    }
    return scene;
  }
}
export interface RaycastHit {
  node: SceneNode;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  triangleIndex?: number;
}
export class ComponentRegistry {
  private _constructors: Map<string, new () => Component> = new Map();
  register<T extends Component>(name: string, constructor: new () => T): void {
    this._constructors.set(name, constructor);
  }
  create(name: string): Component | null {
    const ctor = this._constructors.get(name);
    if (ctor) {
      return new ctor();
    }
    return null;
  }
  has(name: string): boolean {
    return this._constructors.has(name);
  }
  getAll(): string[] {
    return Array.from(this._constructors.keys());
  }
}
export class SceneLoader {
  static createNodeFromData(data: SceneNodeData, registry: ComponentRegistry): SceneNode {
    const node = new SceneNode(data.name);
    node.transform.fromJSON(data.transform);
    node.enabled = data.enabled;
    node.layer = data.layer;
    for (const tag of data.tags) {
      node.addTag(tag);
    }
    node.prefabId = data.prefabId;
    for (const compData of data.components) {
      const component = registry.create(compData.type);
      if (component) {
        component.enabled = compData.enabled;
        component.deserialize?.(compData.data);
        component.node = node;
        (node as any)._components.set(compData.type, component);
      }
    }
    for (const childData of data.children) {
      const child = this.createNodeFromData(childData, registry);
      child.setParent(node);
    }
    return node;
  }
}
export class SceneManager extends EventEmitter {
  private static _instance: SceneManager;
  private _scenes: Map<string, Scene> = new Map();
  private _activeScene: Scene | null = null;
  private _loadingScene: Scene | null = null;
  private _componentRegistry: ComponentRegistry = new ComponentRegistry();
  private constructor() {
    super();
  }
  static get instance(): SceneManager {
    if (!this._instance) {
      this._instance = new SceneManager();
    }
    return this._instance;
  }
  get activeScene(): Scene | null { return this._activeScene; }
  get componentRegistry(): ComponentRegistry { return this._componentRegistry; }
  get scenes(): Scene[] { return Array.from(this._scenes.values()); }
  createScene(name: string): Scene {
    const scene = new Scene(name);
    this._scenes.set(scene.id, scene);
    this.emit('sceneCreated', scene);
    return scene;
  }
  loadScene(sceneId: string): void {
    const scene = this._scenes.get(sceneId);
    if (!scene) {
      logger.error(`Scene ${sceneId} not found`);
      return;
    }
    this._loadingScene = scene;
    this.emit('sceneLoading', scene);
    if (this._activeScene) {
      this.emit('sceneUnloading', this._activeScene);
    }
    this._activeScene = scene;
    this._loadingScene = null;
    this.emit('sceneLoaded', scene);
  }
  unloadScene(sceneId: string): void {
    const scene = this._scenes.get(sceneId);
    if (scene) {
      if (this._activeScene === scene) {
        this._activeScene = null;
      }
      scene.clear();
      this._scenes.delete(sceneId);
      this.emit('sceneUnloaded', scene);
    }
  }
  getScene(sceneId: string): Scene | null {
    return this._scenes.get(sceneId) || null;
  }
  async saveScene(scene: Scene, path: string): Promise<void> {
    const data = scene.toJSON();
    const json = JSON.stringify(data, null, 2);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`scene_${path}`, json);
    }
    this.emit('sceneSaved', { scene, path });
  }
  async loadSceneFromFile(path: string): Promise<Scene | null> {
    let json: string | null = null;
    if (typeof localStorage !== 'undefined') {
      json = localStorage.getItem(`scene_${path}`);
    }
    if (!json) return null;
    const data: SceneData = JSON.parse(json);
    const scene = Scene.fromJSON(data, this._componentRegistry);
    this._scenes.set(scene.id, scene);
    this.emit('sceneLoadedFromFile', { scene, path });
    return scene;
  }
  update(deltaTime: number): void {
    this._activeScene?.update(deltaTime);
  }
  fixedUpdate(fixedDeltaTime: number): void {
    this._activeScene?.fixedUpdate(fixedDeltaTime);
  }
  lateUpdate(deltaTime: number): void {
    this._activeScene?.lateUpdate(deltaTime);
  }
}
export { CameraComponent, LightComponent, MeshRenderer } from './scene-graph-components';

export default SceneManager;
