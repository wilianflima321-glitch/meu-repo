import * as THREE from 'three'

export type SceneObjectType =
  | 'empty'
  | 'mesh'
  | 'light'
  | 'camera'
  | 'audio'
  | 'particle'
  | 'trigger'
  | 'volume'
  | 'blueprint'
  | 'prefab'
  | 'landscape'
  | 'foliage'
  | 'spline'
  | 'group'

export interface SceneObject {
  id: string
  name: string
  type: SceneObjectType
  visible: boolean
  locked: boolean
  selected: boolean
  children: SceneObject[]
  parentId?: string
  components?: string[]
  tags?: string[]
  layer?: number
  threeObject?: THREE.Object3D
}

export interface OutlinerFilter {
  search?: string
  types?: SceneObjectType[]
  showHidden?: boolean
  showLocked?: boolean
  tags?: string[]
}

export const OBJECT_TYPE_CONFIG: Record<SceneObjectType, { icon: string; color: string }> = {
  empty: { icon: 'o', color: '#888' },
  mesh: { icon: 'M', color: '#2196f3' },
  light: { icon: 'L', color: '#ffc107' },
  camera: { icon: 'C', color: '#9c27b0' },
  audio: { icon: 'A', color: '#00bcd4' },
  particle: { icon: 'P', color: '#ff5722' },
  trigger: { icon: 'T', color: '#4caf50' },
  volume: { icon: 'V', color: '#607d8b' },
  blueprint: { icon: 'B', color: '#3f51b5' },
  prefab: { icon: 'F', color: '#00acc1' },
  landscape: { icon: 'L', color: '#8bc34a' },
  foliage: { icon: 'G', color: '#4caf50' },
  spline: { icon: 'S', color: '#ff9800' },
  group: { icon: 'G', color: '#795548' },
}

export function createDefaultSceneObjects(): SceneObject[] {
  return [
    {
      id: '1',
      name: 'DirectionalLight',
      type: 'light',
      visible: true,
      locked: false,
      selected: false,
      children: [],
    },
    {
      id: '2',
      name: 'MainCamera',
      type: 'camera',
      visible: true,
      locked: true,
      selected: false,
      children: [],
    },
    {
      id: '3',
      name: 'Environment',
      type: 'group',
      visible: true,
      locked: false,
      selected: false,
      children: [
        {
          id: '3a',
          name: 'Landscape',
          type: 'landscape',
          visible: true,
          locked: false,
          selected: false,
          children: [],
          parentId: '3',
        },
        {
          id: '3b',
          name: 'Foliage',
          type: 'foliage',
          visible: true,
          locked: false,
          selected: false,
          children: [],
          parentId: '3',
        },
      ],
    },
    {
      id: '4',
      name: 'Player',
      type: 'blueprint',
      visible: true,
      locked: false,
      selected: true,
      components: ['CharacterMovement', 'CameraArm', 'SkeletalMesh'],
      children: [
        {
          id: '4a',
          name: 'Weapon',
          type: 'mesh',
          visible: true,
          locked: false,
          selected: false,
          children: [],
          parentId: '4',
        },
      ],
    },
    {
      id: '5',
      name: 'Enemies',
      type: 'group',
      visible: true,
      locked: false,
      selected: false,
      children: [
        {
          id: '5a',
          name: 'Enemy_01',
          type: 'blueprint',
          visible: true,
          locked: false,
          selected: false,
          children: [],
          parentId: '5',
          components: ['AI', 'Health'],
        },
        {
          id: '5b',
          name: 'Enemy_02',
          type: 'blueprint',
          visible: true,
          locked: false,
          selected: false,
          children: [],
          parentId: '5',
          components: ['AI', 'Health'],
        },
      ],
    },
    {
      id: '6',
      name: 'AudioManager',
      type: 'audio',
      visible: true,
      locked: false,
      selected: false,
      children: [],
    },
    {
      id: '7',
      name: 'ParticleEffects',
      type: 'group',
      visible: true,
      locked: false,
      selected: false,
      children: [
        {
          id: '7a',
          name: 'Fire_FX',
          type: 'particle',
          visible: true,
          locked: false,
          selected: false,
          children: [],
          parentId: '7',
        },
      ],
    },
  ]
}
