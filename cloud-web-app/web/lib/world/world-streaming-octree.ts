import type { BoundingBox, Vector3 } from './world-streaming-types';

interface OctreeNode<T> {
  bounds: BoundingBox;
  items: T[];
  children: OctreeNode<T>[] | null;
  depth: number;
}

export class Octree<T extends { bounds: BoundingBox }> {
  private root: OctreeNode<T>;
  private maxDepth: number;
  private maxItemsPerNode: number;

  constructor(bounds: BoundingBox, maxDepth = 8, maxItemsPerNode = 8) {
    this.maxDepth = maxDepth;
    this.maxItemsPerNode = maxItemsPerNode;
    this.root = this.createNode(bounds, 0);
  }

  private createNode(bounds: BoundingBox, depth: number): OctreeNode<T> {
    return {
      bounds,
      items: [],
      children: null,
      depth,
    };
  }

  insert(item: T): boolean {
    return this.insertIntoNode(this.root, item);
  }

  private insertIntoNode(node: OctreeNode<T>, item: T): boolean {
    if (!this.boundsIntersect(node.bounds, item.bounds)) {
      return false;
    }

    if (node.children) {
      for (const child of node.children) {
        if (this.boundsContains(child.bounds, item.bounds)) {
          return this.insertIntoNode(child, item);
        }
      }
      node.items.push(item);
      return true;
    }

    node.items.push(item);

    if (node.items.length > this.maxItemsPerNode && node.depth < this.maxDepth) {
      this.subdivide(node);
    }

    return true;
  }

  private subdivide(node: OctreeNode<T>): void {
    const { min, max } = node.bounds;
    const mid = {
      x: (min.x + max.x) / 2,
      y: (min.y + max.y) / 2,
      z: (min.z + max.z) / 2,
    };

    node.children = [
      this.createNode({ min: { x: min.x, y: min.y, z: min.z }, max: { x: mid.x, y: mid.y, z: mid.z } }, node.depth + 1),
      this.createNode({ min: { x: mid.x, y: min.y, z: min.z }, max: { x: max.x, y: mid.y, z: mid.z } }, node.depth + 1),
      this.createNode({ min: { x: min.x, y: mid.y, z: min.z }, max: { x: mid.x, y: max.y, z: mid.z } }, node.depth + 1),
      this.createNode({ min: { x: mid.x, y: mid.y, z: min.z }, max: { x: max.x, y: max.y, z: mid.z } }, node.depth + 1),
      this.createNode({ min: { x: min.x, y: min.y, z: mid.z }, max: { x: mid.x, y: mid.y, z: max.z } }, node.depth + 1),
      this.createNode({ min: { x: mid.x, y: min.y, z: mid.z }, max: { x: max.x, y: mid.y, z: max.z } }, node.depth + 1),
      this.createNode({ min: { x: min.x, y: mid.y, z: mid.z }, max: { x: mid.x, y: max.y, z: max.z } }, node.depth + 1),
      this.createNode({ min: { x: mid.x, y: mid.y, z: mid.z }, max: { x: max.x, y: max.y, z: max.z } }, node.depth + 1),
    ];

    const items = node.items;
    node.items = [];

    for (const item of items) {
      this.insertIntoNode(node, item);
    }
  }

  query(bounds: BoundingBox): T[] {
    const results: T[] = [];
    this.queryNode(this.root, bounds, results);
    return results;
  }

  private queryNode(node: OctreeNode<T>, bounds: BoundingBox, results: T[]): void {
    if (!this.boundsIntersect(node.bounds, bounds)) {
      return;
    }

    for (const item of node.items) {
      if (this.boundsIntersect(item.bounds, bounds)) {
        results.push(item);
      }
    }

    if (node.children) {
      for (const child of node.children) {
        this.queryNode(child, bounds, results);
      }
    }
  }

  queryRadius(center: Vector3, radius: number): T[] {
    const bounds: BoundingBox = {
      min: { x: center.x - radius, y: center.y - radius, z: center.z - radius },
      max: { x: center.x + radius, y: center.y + radius, z: center.z + radius },
    };

    const candidates = this.query(bounds);
    return candidates.filter((item) => {
      const itemCenter = this.getBoundsCenter(item.bounds);
      return this.distance(center, itemCenter) <= radius;
    });
  }

  clear(): void {
    this.root = this.createNode(this.root.bounds, 0);
  }

  private boundsIntersect(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.min.x <= b.max.x &&
      a.max.x >= b.min.x &&
      a.min.y <= b.max.y &&
      a.max.y >= b.min.y &&
      a.min.z <= b.max.z &&
      a.max.z >= b.min.z
    );
  }

  private boundsContains(container: BoundingBox, contained: BoundingBox): boolean {
    return (
      container.min.x <= contained.min.x &&
      container.max.x >= contained.max.x &&
      container.min.y <= contained.min.y &&
      container.max.y >= contained.max.y &&
      container.min.z <= contained.min.z &&
      container.max.z >= contained.max.z
    );
  }

  private getBoundsCenter(bounds: BoundingBox): Vector3 {
    return {
      x: (bounds.min.x + bounds.max.x) / 2,
      y: (bounds.min.y + bounds.max.y) / 2,
      z: (bounds.min.z + bounds.max.z) / 2,
    };
  }

  private distance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

