// @aethel-heavy-async-boundary
import * as THREE from 'three';
import { Component, SceneNode } from './scene-graph-node';

export interface ChronoZoneConfig {
  id: string;
  timeScale: number;
  bounds: THREE.Box3;
}

/**
 * ChronoManager handles localized time dilation across different realities.
 * E.g., A zone where time moves 10x slower (Bullet Time).
 */
export class ChronoManager {
  private zones: ChronoZoneConfig[] = [];
  public globalTimeScale: number = 1.0;

  public addZone(config: ChronoZoneConfig): void {
    this.zones.push(config);
  }

  public removeZone(id: string): void {
    this.zones = this.zones.filter(z => z.id !== id);
  }

  /**
   * Retrieves the localized delta time for a given position.
   */
  public getLocalDeltaTime(position: THREE.Vector3, globalDeltaTime: number): number {
    for (const zone of this.zones) {
      if (zone.bounds.containsPoint(position)) {
        return globalDeltaTime * zone.timeScale * this.globalTimeScale;
      }
    }
    return globalDeltaTime * this.globalTimeScale;
  }
}

export const chronoManager = new ChronoManager();

/**
 * Component that automatically dilates its Node's update calls
 * based on the ChronoManager's spatial zones.
 */
export class ChronoTransformComponent extends Component {
  private lastLocalDt: number = 0;

  onUpdate(globalDeltaTime: number): void {
    const localDt = chronoManager.getLocalDeltaTime(this.transform.worldPosition, globalDeltaTime);
    this.lastLocalDt = localDt;
    // In a full implementation, this component would intercept 
    // physics or animation ticks and pass localDt instead.
  }
}
