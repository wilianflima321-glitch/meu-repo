// @aethel-heavy-async-boundary: behavior tree serialization belongs to runtime/agent execution lanes.

type Vector3Like = { x: number; y: number; z: number; isVector3?: boolean; constructor?: { name?: string } }
type QuaternionLike = { x: number; y: number; z: number; w: number; isQuaternion?: boolean; constructor?: { name?: string } }

type BlackboardValueFactories = {
  vector3?: (x: number, y: number, z: number) => unknown
  quaternion?: (x: number, y: number, z: number, w: number) => unknown
}

const blackboardFactories: Required<BlackboardValueFactories> = {
  vector3: (x, y, z) => ({ x, y, z }),
  quaternion: (x, y, z, w) => ({ x, y, z, w }),
}

export function configureBlackboardValueFactories(factories: BlackboardValueFactories): void {
  if (factories.vector3) blackboardFactories.vector3 = factories.vector3
  if (factories.quaternion) blackboardFactories.quaternion = factories.quaternion
}

function isVector3Like(value: unknown): value is Vector3Like {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Vector3Like
  return (
    typeof candidate.x === 'number' &&
    typeof candidate.y === 'number' &&
    typeof candidate.z === 'number' &&
    (candidate.isVector3 === true || candidate.constructor?.name === 'Vector3')
  )
}

function isQuaternionLike(value: unknown): value is QuaternionLike {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as QuaternionLike
  return (
    typeof candidate.x === 'number' &&
    typeof candidate.y === 'number' &&
    typeof candidate.z === 'number' &&
    typeof candidate.w === 'number' &&
    (candidate.isQuaternion === true || candidate.constructor?.name === 'Quaternion')
  )
}

export class Blackboard {
  private data: Map<string, unknown> = new Map()
  private observers: Map<string, ((value: unknown) => void)[]> = new Map()

  set<T>(key: string, value: T): void {
    this.data.set(key, value)
    const observers = this.observers.get(key)
    if (observers) {
      for (const observer of observers) observer(value)
    }
  }

  get<T>(key: string, defaultValue?: T): T | undefined {
    const value = this.data.get(key)
    return (value !== undefined ? value : defaultValue) as T | undefined
  }

  has(key: string): boolean {
    return this.data.has(key)
  }

  delete(key: string): void {
    this.data.delete(key)
  }

  clear(): void {
    this.data.clear()
  }

  observe(key: string, callback: (value: unknown) => void): () => void {
    if (!this.observers.has(key)) this.observers.set(key, [])
    this.observers.get(key)!.push(callback)
    return () => {
      const observers = this.observers.get(key)
      if (!observers) return
      const index = observers.indexOf(callback)
      if (index >= 0) observers.splice(index, 1)
    }
  }

  getAll(): Map<string, unknown> {
    return new Map(this.data)
  }

  serialize(): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, value] of this.data) {
      if (isVector3Like(value)) {
        result[key] = { _type: 'Vector3', x: value.x, y: value.y, z: value.z }
      } else if (isQuaternionLike(value)) {
        result[key] = { _type: 'Quaternion', x: value.x, y: value.y, z: value.z, w: value.w }
      } else {
        result[key] = value
      }
    }
    return result
  }

  deserialize(data: Record<string, unknown>): void {
    this.clear()
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null && '_type' in value) {
        const typed = value as { _type: string; x: number; y: number; z: number; w?: number }
        if (typed._type === 'Vector3') {
          this.set(key, blackboardFactories.vector3(typed.x, typed.y, typed.z))
        } else if (typed._type === 'Quaternion') {
          this.set(key, blackboardFactories.quaternion(typed.x, typed.y, typed.z, typed.w ?? 1))
        }
      } else {
        this.set(key, value)
      }
    }
  }
}
