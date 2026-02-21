export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Particle {
  // Position and velocity
  position: Vector3;
  velocity: Vector3;
  acceleration: Vector3;
  
  // Visual
  color: Color;
  size: number;
  rotation: number;
  rotationSpeed: number;
  
  // Lifecycle
  life: number;
  maxLife: number;
  age: number;
  
  // Custom data
  userData: Record<string, number>;
}

export type EmitterShape = 'point' | 'sphere' | 'box' | 'cone' | 'circle' | 'line';
export type BlendMode = 'normal' | 'additive' | 'multiply' | 'screen';

export interface EmitterShapeConfig {
  type: EmitterShape;
  // Sphere/Circle
  radius?: number;
  innerRadius?: number;
  // Box
  size?: Vector3;
  // Cone
  angle?: number;
  height?: number;
  // Line
  start?: Vector3;
  end?: Vector3;
}

export interface ValueRange {
  min: number;
  max: number;
}

export interface ColorGradient {
  time: number; // 0-1
  color: Color;
}

export interface SizeOverLife {
  time: number; // 0-1
  size: number;
}

export interface VelocityModule {
  enabled: boolean;
  linear?: Vector3;
  orbital?: Vector3;
  radial?: number;
}

export interface NoiseModule {
  enabled: boolean;
  strength: number;
  frequency: number;
  scrollSpeed: number;
  octaves: number;
}

export interface CollisionModule {
  enabled: boolean;
  bounce: number;
  dampen: number;
  lifetimeLoss: number;
  planes?: { normal: Vector3; distance: number }[];
}

export interface SubEmitterConfig {
  trigger: 'birth' | 'death' | 'collision';
  emitterId: string;
  probability: number;
}

export interface ParticleEmitterConfig {
  // Identity
  name: string;
  enabled?: boolean;
  
  // Emission
  maxParticles: number;
  emissionRate: number; // particles per second
  bursts?: { time: number; count: number; cycles: number; interval: number }[];
  
  // Shape
  shape: EmitterShapeConfig;
  
  // Initial properties
  lifetime: ValueRange;
  speed: ValueRange;
  size: ValueRange;
  rotation: ValueRange;
  color: Color;
  
  // Over lifetime
  colorOverLife?: ColorGradient[];
  sizeOverLife?: SizeOverLife[];
  speedOverLife?: { time: number; multiplier: number }[];
  
  // Forces
  gravity?: Vector3;
  
  // Modules
  velocityModule?: VelocityModule;
  noiseModule?: NoiseModule;
  collisionModule?: CollisionModule;
  
  // Rendering
  blendMode?: BlendMode;
  texture?: string;
  spriteSheet?: { rows: number; cols: number; fps: number };
  
  // Sub-emitters
  subEmitters?: SubEmitterConfig[];
  
  // Simulation
  simulationSpace?: 'local' | 'world';
  startDelay?: number;
  duration?: number;
  loop?: boolean;
  prewarm?: boolean;
}
