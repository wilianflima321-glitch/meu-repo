export type Entity = number
export type ComponentType = number
export type SystemId = number

export interface ComponentSchema {
  id: ComponentType
  name: string
  size: number
  fields: ComponentField[]
  defaultData?: ArrayBuffer
}

export interface ComponentField {
  name: string
  type: 'f32' | 'f64' | 'i32' | 'u32' | 'i8' | 'u8' | 'bool' | 'vec2' | 'vec3' | 'vec4' | 'mat4' | 'entity'
  offset: number
  size: number
}

export interface Archetype {
  id: number
  componentTypes: Set<ComponentType>
  componentArrays: Map<ComponentType, ArrayBuffer>
  entityIds: Entity[]
  entityCount: number
  capacity: number
}

export interface Query {
  all?: ComponentType[]
  any?: ComponentType[]
  none?: ComponentType[]
}

export interface SystemConfig<TWorld = unknown> {
  id: SystemId
  name: string
  query: Query
  update: (world: TWorld, entities: Entity[], deltaTime: number) => void
  priority?: number
  enabled?: boolean
  runInParallel?: boolean
}

export interface WorldConfig {
  initialCapacity?: number
  maxEntities?: number
  enableChangeDetection?: boolean
}
