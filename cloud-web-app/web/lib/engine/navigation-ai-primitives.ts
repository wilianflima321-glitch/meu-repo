import type { NavigationPath, Vector3 } from './navigation-ai-types';

// Shared math utilities for navigation, pathfinding, and steering.
export const Vec3 = {
  create(x = 0, y = 0, z = 0): Vector3 {
    return { x, y, z };
  },

  add(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  },

  sub(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  },

  scale(v: Vector3, s: number): Vector3 {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  },

  length(v: Vector3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  },

  lengthSq(v: Vector3): number {
    return v.x * v.x + v.y * v.y + v.z * v.z;
  },

  normalize(v: Vector3): Vector3 {
    const len = Vec3.length(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  },

  dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  },

  cross(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  },

  distance(a: Vector3, b: Vector3): number {
    return Vec3.length(Vec3.sub(a, b));
  },

  distanceSq(a: Vector3, b: Vector3): number {
    return Vec3.lengthSq(Vec3.sub(a, b));
  },

  lerp(a: Vector3, b: Vector3, t: number): Vector3 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
  },

  clampLength(v: Vector3, maxLength: number): Vector3 {
    const len = Vec3.length(v);
    if (len <= maxLength) return v;
    return Vec3.scale(v, maxLength / len);
  },

  zero(): Vector3 {
    return { x: 0, y: 0, z: 0 };
  },

  distance2D(a: Vector3, b: Vector3): number {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    return Math.sqrt(dx * dx + dz * dz);
  },
};

export class PriorityQueue<T> {
  private heap: { item: T; priority: number }[] = [];

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  push(item: T, priority: number): void {
    this.heap.push({ item, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.isEmpty()) return undefined;

    const result = this.heap[0].item;
    const last = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }

    return result;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].priority <= this.heap[index].priority) break;

      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;

    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < length && this.heap[leftChild].priority < this.heap[smallest].priority) {
        smallest = leftChild;
      }

      if (rightChild < length && this.heap[rightChild].priority < this.heap[smallest].priority) {
        smallest = rightChild;
      }

      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

export interface GridConfig {
  width: number;
  height: number;
  cellSize: number;
  origin: Vector3;
}

export class NavigationGrid {
  private grid: number[][];
  private config: GridConfig;

  constructor(config: GridConfig) {
    this.config = config;
    this.grid = Array(config.height)
      .fill(null)
      .map(() => Array(config.width).fill(0));
  }

  setWalkable(x: number, z: number, walkable: boolean): void {
    if (this.isValidCell(x, z)) {
      this.grid[z][x] = walkable ? 0 : 1;
    }
  }

  isWalkable(x: number, z: number): boolean {
    if (!this.isValidCell(x, z)) return false;
    return this.grid[z][x] === 0;
  }

  isValidCell(x: number, z: number): boolean {
    return x >= 0 && x < this.config.width && z >= 0 && z < this.config.height;
  }

  worldToGrid(position: Vector3): { x: number; z: number } {
    return {
      x: Math.floor((position.x - this.config.origin.x) / this.config.cellSize),
      z: Math.floor((position.z - this.config.origin.z) / this.config.cellSize),
    };
  }

  gridToWorld(x: number, z: number): Vector3 {
    return {
      x: this.config.origin.x + (x + 0.5) * this.config.cellSize,
      y: this.config.origin.y,
      z: this.config.origin.z + (z + 0.5) * this.config.cellSize,
    };
  }

  findPath(start: Vector3, end: Vector3): NavigationPath {
    const startCell = this.worldToGrid(start);
    const endCell = this.worldToGrid(end);

    if (!this.isWalkable(startCell.x, startCell.z) || !this.isWalkable(endCell.x, endCell.z)) {
      return { points: [], totalCost: Infinity, isComplete: false };
    }

    const openSet = new PriorityQueue<{ x: number; z: number }>();
    const cameFrom = new Map<string, { x: number; z: number }>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    const key = (x: number, z: number) => `${x},${z}`;

    gScore.set(key(startCell.x, startCell.z), 0);
    fScore.set(key(startCell.x, startCell.z), this.heuristic(startCell, endCell));
    openSet.push(startCell, fScore.get(key(startCell.x, startCell.z))!);

    const directions = [
      { x: 0, z: 1 },
      { x: 1, z: 0 },
      { x: 0, z: -1 },
      { x: -1, z: 0 },
      { x: 1, z: 1 },
      { x: 1, z: -1 },
      { x: -1, z: 1 },
      { x: -1, z: -1 },
    ];

    while (!openSet.isEmpty()) {
      const current = openSet.pop()!;
      const currentKey = key(current.x, current.z);

      if (current.x === endCell.x && current.z === endCell.z) {
        const path: Vector3[] = [];
        let curr: { x: number; z: number } | undefined = current;

        while (curr) {
          path.unshift(this.gridToWorld(curr.x, curr.z));
          curr = cameFrom.get(key(curr.x, curr.z));
        }

        return {
          points: path,
          totalCost: gScore.get(currentKey) ?? 0,
          isComplete: true,
        };
      }

      for (const dir of directions) {
        const neighbor = { x: current.x + dir.x, z: current.z + dir.z };
        const neighborKey = key(neighbor.x, neighbor.z);

        if (!this.isWalkable(neighbor.x, neighbor.z)) continue;

        if (dir.x !== 0 && dir.z !== 0) {
          if (!this.isWalkable(current.x + dir.x, current.z) || !this.isWalkable(current.x, current.z + dir.z)) {
            continue;
          }
        }

        const moveCost = dir.x !== 0 && dir.z !== 0 ? 1.414 : 1;
        const tentativeG = (gScore.get(currentKey) ?? Infinity) + moveCost;

        if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeG);
          const f = tentativeG + this.heuristic(neighbor, endCell);
          fScore.set(neighborKey, f);
          openSet.push(neighbor, f);
        }
      }
    }

    return { points: [], totalCost: Infinity, isComplete: false };
  }

  private heuristic(a: { x: number; z: number }, b: { x: number; z: number }): number {
    const dx = Math.abs(a.x - b.x);
    const dz = Math.abs(a.z - b.z);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
  }

  setObstacle(worldPos: Vector3, radius: number): void {
    const cell = this.worldToGrid(worldPos);
    const cellRadius = Math.ceil(radius / this.config.cellSize);

    for (let dz = -cellRadius; dz <= cellRadius; dz++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const x = cell.x + dx;
        const z = cell.z + dz;
        if (dx * dx + dz * dz <= cellRadius * cellRadius) {
          this.setWalkable(x, z, false);
        }
      }
    }
  }

  clearObstacle(worldPos: Vector3, radius: number): void {
    const cell = this.worldToGrid(worldPos);
    const cellRadius = Math.ceil(radius / this.config.cellSize);

    for (let dz = -cellRadius; dz <= cellRadius; dz++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const x = cell.x + dx;
        const z = cell.z + dz;
        if (dx * dx + dz * dz <= cellRadius * cellRadius) {
          this.setWalkable(x, z, true);
        }
      }
    }
  }

  getConfig(): GridConfig {
    return { ...this.config };
  }
}
