import type { Entity } from './ecs-dots-contracts'

/** Sparse Set para mapeamento rapido Entity -> Index. */
export class SparseSet {
  private sparse: Uint32Array
  private dense: Uint32Array
  private count = 0

  constructor(maxEntities: number) {
    this.sparse = new Uint32Array(maxEntities)
    this.dense = new Uint32Array(maxEntities)
    this.sparse.fill(0xffffffff)
  }

  add(entity: Entity): number {
    if (this.has(entity)) return this.sparse[entity]

    const index = this.count++
    this.dense[index] = entity
    this.sparse[entity] = index
    return index
  }

  remove(entity: Entity): boolean {
    if (!this.has(entity)) return false

    const index = this.sparse[entity]
    const lastIndex = --this.count

    if (index !== lastIndex) {
      const lastEntity = this.dense[lastIndex]
      this.dense[index] = lastEntity
      this.sparse[lastEntity] = index
    }

    this.sparse[entity] = 0xffffffff
    return true
  }

  has(entity: Entity): boolean {
    return entity < this.sparse.length && this.sparse[entity] !== 0xffffffff
  }

  getIndex(entity: Entity): number {
    return this.sparse[entity]
  }

  getEntity(index: number): Entity {
    return this.dense[index]
  }

  getCount(): number {
    return this.count
  }

  *[Symbol.iterator](): Iterator<Entity> {
    for (let i = 0; i < this.count; i++) yield this.dense[i]
  }
}
