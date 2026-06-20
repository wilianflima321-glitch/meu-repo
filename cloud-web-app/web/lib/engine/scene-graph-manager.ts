// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
/** Scene graph manager: scene lifecycle, persistence and active-scene updates. */
import { EventEmitter } from 'events';
import { logger } from '@/lib/observability/logger';
import { Scene } from './scene-graph-scene';
import { ComponentRegistry } from './scene-graph-loading';
import type { SceneData } from './scene-graph-contracts';

export class SceneManager extends EventEmitter {
  private static _instance: SceneManager;
  private _scenes: Map<string, Scene> = new Map();
  private _activeScene: Scene | null = null;
  private _loadingScene: Scene | null = null;
  private _componentRegistry: ComponentRegistry = new ComponentRegistry();
  private _activeSelection: string[] = [];
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
  get activeSelection(): string[] { return this._activeSelection; }
  setSelection(nodeIds: string[]) {
    this._activeSelection = nodeIds;
    this.emit('selectionChanged', this._activeSelection);
  }
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
