import type { RuntimeComponentData } from './types';
import { toComponentData } from './utils';

export type ComponentSerializer = {
  serialize: (component: RuntimeComponentData) => Record<string, unknown>;
  deserialize: (data: Record<string, unknown>) => unknown;
};

export const componentSerializers: Map<string, ComponentSerializer> = new Map();

export function registerComponentSerializer(type: string, serializer: ComponentSerializer): void {
  componentSerializers.set(type, serializer);
}

// Built-in serializers

registerComponentSerializer('MeshRenderer', {
  serialize: (component: RuntimeComponentData) => ({
    meshId: component.meshId,
    materialIds: component.materialIds,
    castShadows: component.castShadows,
    receiveShadows: component.receiveShadows,
  }),
  deserialize: (data) => ({
    meshId: data.meshId,
    materialIds: data.materialIds,
    castShadows: data.castShadows ?? true,
    receiveShadows: data.receiveShadows ?? true,
  }),
});

registerComponentSerializer('Light', {
  serialize: (component: RuntimeComponentData) => ({
    type: component.type,
    color: component.color,
    intensity: component.intensity,
    range: component.range,
    angle: component.angle,
    penumbra: component.penumbra,
    castShadows: component.castShadows,
  }),
  deserialize: (data) => ({
    type: data.type || 'point',
    color: data.color || '#ffffff',
    intensity: data.intensity ?? 1,
    range: data.range ?? 10,
    angle: data.angle ?? Math.PI / 4,
    penumbra: data.penumbra ?? 0.1,
    castShadows: data.castShadows ?? true,
  }),
});

registerComponentSerializer('Camera', {
  serialize: (component: RuntimeComponentData) => ({
    type: component.type,
    fov: component.fov,
    near: component.near,
    far: component.far,
    orthographicSize: component.orthographicSize,
    isMain: component.isMain,
  }),
  deserialize: (data) => ({
    type: data.type || 'perspective',
    fov: data.fov ?? 60,
    near: data.near ?? 0.1,
    far: data.far ?? 1000,
    orthographicSize: data.orthographicSize ?? 10,
    isMain: data.isMain ?? false,
  }),
});

registerComponentSerializer('Collider', {
  serialize: (component: RuntimeComponentData) => ({
    shape: component.shape,
    size: component.size,
    center: component.center,
    isTrigger: component.isTrigger,
    physicsMaterial: component.physicsMaterial,
  }),
  deserialize: (data) => ({
    shape: data.shape || 'box',
    size: data.size || { x: 1, y: 1, z: 1 },
    center: data.center || { x: 0, y: 0, z: 0 },
    isTrigger: data.isTrigger ?? false,
    physicsMaterial: data.physicsMaterial,
  }),
});

registerComponentSerializer('RigidBody', {
  serialize: (component: RuntimeComponentData) => ({
    mass: component.mass,
    drag: component.drag,
    angularDrag: component.angularDrag,
    useGravity: component.useGravity,
    isKinematic: component.isKinematic,
    constraints: component.constraints,
  }),
  deserialize: (data) => ({
    mass: data.mass ?? 1,
    drag: data.drag ?? 0,
    angularDrag: data.angularDrag ?? 0.05,
    useGravity: data.useGravity ?? true,
    isKinematic: data.isKinematic ?? false,
    constraints: data.constraints || {},
  }),
});

registerComponentSerializer('AudioSource', {
  serialize: (component: RuntimeComponentData) => ({
    clipId: component.clipId,
    volume: component.volume,
    pitch: component.pitch,
    loop: component.loop,
    playOnAwake: component.playOnAwake,
    spatial: component.spatial,
    minDistance: component.minDistance,
    maxDistance: component.maxDistance,
  }),
  deserialize: (data) => ({
    clipId: data.clipId,
    volume: data.volume ?? 1,
    pitch: data.pitch ?? 1,
    loop: data.loop ?? false,
    playOnAwake: data.playOnAwake ?? false,
    spatial: data.spatial ?? true,
    minDistance: data.minDistance ?? 1,
    maxDistance: data.maxDistance ?? 100,
  }),
});

registerComponentSerializer('Script', {
  serialize: (component: RuntimeComponentData) => ({
    scriptId: component.scriptId,
    properties: component.properties,
  }),
  deserialize: (data) => ({
    scriptId: data.scriptId,
    properties: data.properties || {},
  }),
});

registerComponentSerializer('ParticleSystem', {
  serialize: (component: RuntimeComponentData) => ({
    presetName: component.presetName,
    emissionRate: component.emissionRate,
    maxParticles: component.maxParticles,
    lifetime: component.lifetime,
    startColor: component.startColor,
    endColor: component.endColor,
    startSize: component.startSize,
    endSize: component.endSize,
  }),
  deserialize: (data) => ({
    presetName: data.presetName,
    emissionRate: data.emissionRate ?? 100,
    maxParticles: data.maxParticles ?? 1000,
    lifetime: data.lifetime ?? { min: 1, max: 3 },
    startColor: data.startColor,
    endColor: data.endColor,
    startSize: data.startSize ?? { min: 1, max: 2 },
    endSize: data.endSize ?? { min: 0.5, max: 1 },
  }),
});

registerComponentSerializer('Animator', {
  serialize: (component: RuntimeComponentData) => ({
    controllerPath: component.controllerPath,
    parameters: component.parameters,
    rootMotion: component.rootMotion,
  }),
  deserialize: (data) => ({
    controllerPath: data.controllerPath,
    parameters: data.parameters || {},
    rootMotion: data.rootMotion ?? false,
  }),
});

registerComponentSerializer('NavMeshAgent', {
  serialize: (component: RuntimeComponentData) => ({
    speed: component.speed,
    angularSpeed: component.angularSpeed,
    acceleration: component.acceleration,
    stoppingDistance: component.stoppingDistance,
    radius: component.radius,
    height: component.height,
    avoidancePriority: component.avoidancePriority,
  }),
  deserialize: (data) => ({
    speed: data.speed ?? 3.5,
    angularSpeed: data.angularSpeed ?? 120,
    acceleration: data.acceleration ?? 8,
    stoppingDistance: data.stoppingDistance ?? 0.1,
    radius: data.radius ?? 0.5,
    height: data.height ?? 2,
    avoidancePriority: data.avoidancePriority ?? 50,
  }),
});
