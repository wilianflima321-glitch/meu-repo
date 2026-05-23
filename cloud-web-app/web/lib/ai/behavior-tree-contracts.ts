import type * as THREE from 'three'

export type NodeStatus = 'success' | 'failure' | 'running'
export type NodeType = 'composite' | 'decorator' | 'leaf' | 'root'

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
