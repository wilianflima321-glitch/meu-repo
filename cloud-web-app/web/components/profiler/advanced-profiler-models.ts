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
  render: 'var(--aethel-primary)',
  physics: 'var(--aethel-success)',
  animation: 'var(--aethel-warning)',
  ai: 'var(--aethel-accent)',
  audio: 'var(--aethel-error-light)',
  scripts: 'var(--aethel-info)',
  ui: 'var(--aethel-warning-dark)',
  network: 'var(--aethel-success-light)',
  loading: 'var(--aethel-text-muted)',
  custom: 'var(--aethel-text-tertiary)',
};

export const TARGET_FRAME_TIME = 16.67; // 60 FPS
export const WARNING_FRAME_TIME = 33.33; // 30 FPS
