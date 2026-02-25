import * as THREE from 'three'

export interface AgentConfig {
  id: string
  position: THREE.Vector3
  rotation: THREE.Quaternion
  speed: number
  sightRange: number
  sightAngle: number
  hearingRange: number
  memoryDuration: number
}

export interface PerceptionTarget {
  id: string
  position: THREE.Vector3
  type: string
  lastSeen: number
  confidence: number
  velocity?: THREE.Vector3
}

export interface NavPath {
  waypoints: THREE.Vector3[]
  currentIndex: number
  isComplete: boolean
}

export class Blackboard {
  private data: Map<string, unknown> = new Map()
  private observers: Map<string, ((value: unknown) => void)[]> = new Map()

  set<T>(key: string, value: T): void {
    this.data.set(key, value)

    const observers = this.observers.get(key)
    if (observers) {
      for (const observer of observers) {
        observer(value)
      }
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
    if (!this.observers.has(key)) {
      this.observers.set(key, [])
    }
    this.observers.get(key)!.push(callback)

    return () => {
      const observers = this.observers.get(key)
      if (observers) {
        const index = observers.indexOf(callback)
        if (index >= 0) observers.splice(index, 1)
      }
    }
  }

  getAll(): Map<string, unknown> {
    return new Map(this.data)
  }

  serialize(): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, value] of this.data) {
      if (value instanceof THREE.Vector3) {
        result[key] = { _type: 'Vector3', x: value.x, y: value.y, z: value.z }
      } else if (value instanceof THREE.Quaternion) {
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
          this.set(key, new THREE.Vector3(typed.x, typed.y, typed.z))
        } else if (typed._type === 'Quaternion') {
          this.set(key, new THREE.Quaternion(typed.x, typed.y, typed.z, typed.w))
        }
      } else {
        this.set(key, value)
      }
    }
  }
}
