/**
 * Navigation AI shared contracts.
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface NavigationConfig {
  cellSize: number;
  cellHeight: number;
  agentHeight: number;
  agentRadius: number;
  agentMaxClimb: number;
  agentMaxSlope: number;
  regionMinSize: number;
  regionMergeSize: number;
  edgeMaxLen: number;
  edgeMaxError: number;
  vertsPerPoly: number;
  detailSampleDist: number;
  detailSampleMaxError: number;
}

export interface NavMeshPolygon {
  id: number;
  vertices: Vector3[];
  neighbors: number[];
  center: Vector3;
  area: number;
  flags: number;
}

export interface NavMeshData {
  polygons: NavMeshPolygon[];
  vertices: Vector3[];
  bounds: { min: Vector3; max: Vector3 };
}

export interface PathNode {
  position: Vector3;
  polygon: number;
  cost: number;
}

export interface NavigationPath {
  points: Vector3[];
  totalCost: number;
  isComplete: boolean;
}

export interface ObstacleConfig {
  type: 'box' | 'cylinder';
  position: Vector3;
  size?: Vector3;
  radius?: number;
  height?: number;
}

export interface AgentConfig {
  position: Vector3;
  radius: number;
  height: number;
  maxSpeed: number;
  maxAcceleration: number;
  separationWeight: number;
  cohesionWeight: number;
  alignmentWeight: number;
  obstacleAvoidanceWeight: number;
}

export type SteeringBehavior = 
  | 'seek'
  | 'flee'
  | 'arrive'
  | 'pursue'
  | 'evade'
  | 'wander'
  | 'obstacle_avoidance'
  | 'separation'
  | 'cohesion'
  | 'alignment';
