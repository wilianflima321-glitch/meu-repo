// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
/** Scene graph scene runtime: roots, updates, culling, raycasts and serialization. */
import { EventEmitter } from 'events';
import { THREE } from './scene-graph-three';
import { SceneNode } from './scene-graph-node';
import type { Component } from './scene-graph-node';
import { ComponentRegistry, SceneLoader } from './scene-graph-loading';
import type { NodeTag, SceneData } from './scene-graph-contracts';

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
