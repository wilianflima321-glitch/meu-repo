/**
 * Visual Script ECS Component Integration
 * 
 * Integrates Visual Script Runtime with the ECS-based GameLoop.
 * This bridges the gap between visual scripting and the game engine core.
 * 
 * @module lib/visual-script-integration
 */

import type { Entity, System, World, EntityId, Component, TransformComponent } from './game-engine-core';
import { VisualScriptRuntime, RuntimeContext, Vector3 } from '../components/visual-scripting/VisualScriptRuntime';
import type { VisualScript } from '../components/visual-scripting/VisualScriptEditor';
import * as THREE from 'three';

// ============================================================================
// VISUAL SCRIPT COMPONENT
// ============================================================================

export interface VisualScriptComponent extends Component {
  type: 'visualScript';
  
  /** The script definition (nodes, edges, variables) */
  script: VisualScript;
  
  /** Runtime instance - created automatically */
  runtime?: VisualScriptRuntime;
  
  /** Whether the script is enabled */
  enabled: boolean;
  
  /** Whether Start has been called */
  hasStarted: boolean;
}

// ============================================================================
// INPUT SYSTEM SINGLETON
// ============================================================================

class InputManager {
  private keysDown: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();
  private keysJustReleased: Set<string> = new Set();
  
  public mousePosition = { x: 0, y: 0 };
  public mouseDelta = { x: 0, y: 0 };
  private mouseButtons: Set<number> = new Set();
  
  private lastMouseX = 0;
  private lastMouseY = 0;
  
  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('mousedown', this.onMouseDown);
      window.addEventListener('mouseup', this.onMouseUp);
    }
  }
  
  private onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (!this.keysDown.has(key)) {
      this.keysJustPressed.add(key);
    }
    this.keysDown.add(key);
  };
  
  private onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    this.keysDown.delete(key);
    this.keysJustReleased.add(key);
  };
  
  private onMouseMove = (e: MouseEvent) => {
    this.mousePosition.x = e.clientX;
    this.mousePosition.y = e.clientY;
    this.mouseDelta.x = e.clientX - this.lastMouseX;
    this.mouseDelta.y = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };
  
  private onMouseDown = (e: MouseEvent) => {
    this.mouseButtons.add(e.button);
  };
  
  private onMouseUp = (e: MouseEvent) => {
    this.mouseButtons.delete(e.button);
  };
  
  getKey(key: string): boolean {
    return this.keysDown.has(key.toLowerCase());
  }
  
  getKeyDown(key: string): boolean {
    return this.keysJustPressed.has(key.toLowerCase());
  }
  
  getKeyUp(key: string): boolean {
    return this.keysJustReleased.has(key.toLowerCase());
  }
  
  getAxis(axis: string): number {
    switch (axis.toLowerCase()) {
      case 'horizontal':
        return (this.getKey('d') || this.getKey('arrowright') ? 1 : 0) - 
               (this.getKey('a') || this.getKey('arrowleft') ? 1 : 0);
      case 'vertical':
        return (this.getKey('w') || this.getKey('arrowup') ? 1 : 0) - 
               (this.getKey('s') || this.getKey('arrowdown') ? 1 : 0);
      case 'mousex':
        return this.mouseDelta.x;
      case 'mousey':
        return this.mouseDelta.y;
      default:
        return 0;
    }
  }
  
  mouseButton(button: number): boolean {
    return this.mouseButtons.has(button);
  }
  
  /** Called at end of frame to clear just-pressed/released states */
  endFrame(): void {
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
  }
  
  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('mousedown', this.onMouseDown);
      window.removeEventListener('mouseup', this.onMouseUp);
    }
  }
}

// Singleton
let inputManager: InputManager | null = null;
export function getInputManager(): InputManager {
  if (!inputManager) {
    inputManager = new InputManager();
  }
  return inputManager;
}

// ============================================================================
// VISUAL SCRIPT SYSTEM
// ============================================================================

export class VisualScriptSystem implements System {
  name = 'VisualScript';
  requiredComponents = ['transform', 'visualScript'];
  priority = 50; // Run after physics, before rendering
  
  private runtimes: Map<EntityId, VisualScriptRuntime> = new Map();
  private world: World | null = null;
  private scene: THREE.Scene | null = null;
  private inputManager: InputManager;
  
  constructor(scene?: THREE.Scene) {
    this.scene = scene || null;
    this.inputManager = getInputManager();
  }
  
  setWorld(world: World): void {
    this.world = world;
  }
  
  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }
  
  onEntityAdded(entity: Entity): void {
    // Runtime will be created in update
  }
  
  onEntityRemoved(entity: Entity): void {
    const runtime = this.runtimes.get(entity.id);
    if (runtime) {
      runtime.stop();
      this.runtimes.delete(entity.id);
    }
  }
  
  update(entities: Entity[], deltaTime: number): void {
    if (!this.world) return;
    
    for (const entity of entities) {
      this.updateEntity(entity, deltaTime);
    }
    
    // Clear input state at end of frame
    this.inputManager.endFrame();
  }
  
  private updateEntity(entity: Entity, deltaTime: number): void {
    if (!this.world) return;
    
    const scriptComp = this.world.getComponent<VisualScriptComponent>(entity.id, 'visualScript');
    if (!scriptComp || !scriptComp.enabled) return;
    
    // Get or create runtime
    let runtime = this.runtimes.get(entity.id);
    
    if (!runtime) {
      const context = this.createRuntimeContext(entity, deltaTime);
      runtime = new VisualScriptRuntime(scriptComp.script, context);
      this.runtimes.set(entity.id, runtime);
      scriptComp.runtime = runtime;
    }
    
    // Call Start on first frame
    if (!scriptComp.hasStarted) {
      scriptComp.hasStarted = true;
      runtime.start();
    }
    
    // Call Update every frame
    runtime.update(deltaTime);
  }
  
  private createRuntimeContext(entity: Entity, deltaTime: number): RuntimeContext {
    const transform = this.world?.getComponent<TransformComponent>(entity.id, 'transform');
    
    const gameObject = transform ? {
      position: { x: transform.position.x, y: transform.position.y, z: transform.position.z },
      rotation: { x: transform.rotation.x, y: transform.rotation.y, z: transform.rotation.z },
      scale: { x: transform.scale.x, y: transform.scale.y, z: transform.scale.z },
      name: entity.id,
      _transform: transform, // Keep reference for mutations
    } : undefined;
    
    return {
      variables: new Map(),
      gameObject,
      deltaTime,
      
      input: {
        getKey: (key) => this.inputManager.getKey(key),
        getKeyDown: (key) => this.inputManager.getKeyDown(key),
        getKeyUp: (key) => this.inputManager.getKeyUp(key),
        getAxis: (axis) => this.inputManager.getAxis(axis),
        mousePosition: this.inputManager.mousePosition,
        mouseDelta: this.inputManager.mouseDelta,
        mouseButton: (btn) => this.inputManager.mouseButton(btn),
      },
      
      physics: {
        raycast: (origin, direction, distance) => {
          // TODO: Integrate with Rapier physics
          return null;
        },
        addForce: (target, force, impulse) => {
          // TODO: Integrate with Rapier physics
          console.log('[VisualScript] addForce called:', force);
        },
      },
      
      audio: {
        playSound: (sound, volume = 1, loop = false) => {
          // TODO: Integrate with AudioEngine
          console.log('[VisualScript] playSound:', sound);
        },
        stopSound: (sound) => {
          console.log('[VisualScript] stopSound:', sound);
        },
      },
      
      objects: {
        spawn: (prefab, position) => {
          // TODO: Create entity from prefab
          console.log('[VisualScript] spawn:', prefab, position);
          return null;
        },
        destroy: (target, delay = 0) => {
          console.log('[VisualScript] destroy:', target, 'delay:', delay);
        },
        find: (name) => {
          // Search in scene
          if (this.scene) {
            return this.scene.getObjectByName(name) || null;
          }
          return null;
        },
      },
      
      log: (message) => {
        console.log('[VisualScript]', message);
      },
    };
  }
  
  /**
   * Trigger collision event on all visual scripts attached to entity
   */
  onEntityCollision(entityId: EntityId, other: unknown, point: Vector3): void {
    const runtime = this.runtimes.get(entityId);
    if (runtime) {
      runtime.onCollision(other, point);
    }
  }
  
  /**
   * Trigger enter event on all visual scripts attached to entity
   */
  onEntityTriggerEnter(entityId: EntityId, other: unknown): void {
    const runtime = this.runtimes.get(entityId);
    if (runtime) {
      runtime.onTriggerEnter(other);
    }
  }
  
  /**
   * Trigger exit event on all visual scripts attached to entity
   */
  onEntityTriggerExit(entityId: EntityId, other: unknown): void {
    const runtime = this.runtimes.get(entityId);
    if (runtime) {
      runtime.onTriggerExit(other);
    }
  }
}

// ============================================================================
// INTEGRATION WITH GAME LOOP
// ============================================================================

export function createVisualScriptComponent(entityId: EntityId, script: VisualScript): VisualScriptComponent {
  return {
    type: 'visualScript',
    entityId,
    script,
    enabled: true,
    hasStarted: false,
  };
}

/**
 * Helper to attach a visual script to an entity
 */
export function attachVisualScript(
  world: World,
  entityId: EntityId,
  script: VisualScript
): void {
  const component = createVisualScriptComponent(entityId, script);
  world.addComponent(entityId, component);
}

/**
 * Helper to detach visual script from an entity
 */
export function detachVisualScript(
  world: World,
  entityId: EntityId
): void {
  world.removeComponent(entityId, 'visualScript');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  VisualScriptSystem,
  createVisualScriptComponent,
  attachVisualScript,
  detachVisualScript,
  getInputManager,
};
