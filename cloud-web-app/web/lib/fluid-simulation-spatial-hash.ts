/** Spatial hash helper for fluid simulations. */
import * as THREE from 'three';

export class SpatialHashGrid {
  private cellSize: number;
  private cells: Map<string, number[]> = new Map();
  
  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }
  
  clear(): void {
    this.cells.clear();
  }
  
  insert(particleId: number, position: THREE.Vector3): void {
    const key = this.getKey(position);
    
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    
    this.cells.get(key)!.push(particleId);
  }
  
  getNeighbors(position: THREE.Vector3, radius: number): number[] {
    const neighbors: number[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    
    const cx = Math.floor(position.x / this.cellSize);
    const cy = Math.floor(position.y / this.cellSize);
    const cz = Math.floor(position.z / this.cellSize);
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          const cell = this.cells.get(key);
          
          if (cell) {
            neighbors.push(...cell);
          }
        }
      }
    }
    
    return neighbors;
  }
  
  private getKey(position: THREE.Vector3): string {
    const cx = Math.floor(position.x / this.cellSize);
    const cy = Math.floor(position.y / this.cellSize);
    const cz = Math.floor(position.z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }
}

