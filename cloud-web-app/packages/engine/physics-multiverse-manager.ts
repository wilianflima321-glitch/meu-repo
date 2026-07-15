// @aethel-heavy-async-boundary
import * as THREE from 'three';
import { PhysicsWorld } from '../physics-engine-real';
import { SceneNode, Component } from './scene-graph-node';

export interface PhysicsZoneConfig {
  id: string;
  gravity: THREE.Vector3;
  timeScale: number;
  bounds: THREE.Box3;
}

export class PhysicsMultiverseManager {
  private worlds: Map<string, PhysicsWorld> = new Map();
  private zones: PhysicsZoneConfig[] = [];

  // The default universe if no zone is active
  private defaultWorld: PhysicsWorld;

  constructor() {
    this.defaultWorld = new PhysicsWorld();
    this.worlds.set('default', this.defaultWorld);
  }

  public createZone(config: PhysicsZoneConfig): PhysicsWorld {
    const world = new PhysicsWorld();
    // In a real implementation we would set the custom gravity on the Rapier raw world
    // world.rawWorld.gravity = { x: config.gravity.x, y: config.gravity.y, z: config.gravity.z };
    
    this.worlds.set(config.id, world);
    this.zones.push(config);
    return world;
  }

  public getWorldForPosition(position: THREE.Vector3): PhysicsWorld {
    for (const zone of this.zones) {
      if (zone.bounds.containsPoint(position)) {
        return this.worlds.get(zone.id) || this.defaultWorld;
      }
    }
    return this.defaultWorld;
  }

  public update(globalDeltaTime: number): void {
    // Step all active multiverses based on their chronological scaling
    for (const [id, world] of this.worlds.entries()) {
      const zoneConfig = this.zones.find(z => z.id === id);
      const timeScale = zoneConfig ? zoneConfig.timeScale : 1.0;
      
      world.step(globalDeltaTime * timeScale);
    }
  }

  // Called when a Node needs to transition across dimensions
  public transitionNode(nodeId: string, fromWorldId: string, toWorldId: string): void {
    const fromWorld = this.worlds.get(fromWorldId);
    const toWorld = this.worlds.get(toWorldId);

    if (!fromWorld || !toWorld || fromWorld === toWorld) return;

    const bodyToMove = fromWorld.getBody(nodeId);
    if (!bodyToMove) return;

    // Phase 3.5: Zero-Loss State Extraction
    const state = bodyToMove.extractState();

    // Chrono-Momentum Preservation
    const fromZone = this.zones.find(z => z.id === fromWorldId);
    const toZone = this.zones.find(z => z.id === toWorldId);
    const fromTimeScale = fromZone ? fromZone.timeScale : 1.0;
    const toTimeScale = toZone ? toZone.timeScale : 1.0;

    const timeRatio = toTimeScale / fromTimeScale;

    state.linvel.x *= timeRatio;
    state.linvel.y *= timeRatio;
    state.linvel.z *= timeRatio;

    // Real implementation would extract Collider configs as well, 
    // destroy the body in fromWorld, create in toWorld, and apply state.
    // fromWorld.removeBody(nodeId);
    // const newBody = toWorld.addBody(nodeId, config);
    // newBody.applyState(state);
  }

  // Raycast Portal Probing
  public raycastAcrossMultiverse(origin: THREE.Vector3, direction: THREE.Vector3, startWorldId: string, maxDistance: number = Infinity): any {
    const startWorld = this.worlds.get(startWorldId) || this.defaultWorld;
    let hit = startWorld.raycast(origin, direction, maxDistance);

    if (hit && hit.colliderId === 'portal_boundary') {
      // Logic for bouncing the raycast into the next dimension
      // const targetWorld = this.worlds.get(hit.userData.targetWorldId);
      // const transformedOrigin = transformToPortal(hit.point, hit.userData.portalTransform);
      // return targetWorld.raycast(transformedOrigin, direction, maxDistance - hit.distance);
    }
    
    return hit;
  }
}

export const multiversePhysics = new PhysicsMultiverseManager();
