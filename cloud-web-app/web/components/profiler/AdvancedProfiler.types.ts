export interface ProfilerFrame {
  frameId: number;
  timestamp: number;
  duration: number;
  cpuTime: number;
  gpuTime: number;
  markers: ProfilerMarker[];
  memory: MemoryStats;
  drawCalls: number;
  triangles: number;
  vertices: number;
}

export interface ProfilerMarker {
  id: string;
  name: string;
  category: ProfilerCategory;
  startTime: number;
  duration: number;
  depth: number;
  color: string;
  children?: ProfilerMarker[];
  metadata?: Record<string, unknown>;
}

export type ProfilerCategory =
  | 'render'
  | 'physics'
  | 'animation'
  | 'ai'
  | 'audio'
  | 'scripts'
  | 'ui'
  | 'network'
  | 'loading'
  | 'custom';

export interface MemoryStats {
  totalHeap: number;
  usedHeap: number;
  textures: number;
  geometries: number;
  materials: number;
  shaders: number;
}

export interface GPUStats {
  frameTime: number;
  drawCalls: number;
  triangles: number;
  vertices: number;
  textureBinds: number;
  shaderSwitches: number;
  stateChanges: number;
}

export interface ProfilerSession {
  id: string;
  name: string;
  startTime: number;
  frames: ProfilerFrame[];
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
}

export const categoryColors: Record<ProfilerCategory, string> = {
  render: '#3b82f6',
  physics: '#22c55e',
  animation: '#f59e0b',
  ai: '#8b5cf6',
  audio: '#ec4899',
  scripts: '#06b6d4',
  ui: '#f97316',
  network: '#84cc16',
  loading: '#64748b',
  custom: '#94a3b8',
};

export const TARGET_FRAME_TIME = 16.67;
export const WARNING_FRAME_TIME = 33.33;
