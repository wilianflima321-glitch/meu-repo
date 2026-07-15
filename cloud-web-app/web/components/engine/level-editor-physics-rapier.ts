// @aethel-heavy-async-boundary
import * as THREE from 'three';
import {
  initPhysicsEngine,
  PhysicsWorld,
  type ColliderConfig,
  type PhysicsBody,
} from '@/lib/physics-engine-real';
import {
  getPhysicsGravity,
  isPhysicsEnabled,
} from '@/lib/settings/engine-settings';
import type { LevelObject } from './level-editor-core';

type BodyEntry = {
  body: PhysicsBody;
  static: boolean;
};

function meshPrimitive(obj: LevelObject): 'box' | 'sphere' | 'plane' {
  const meshComp = obj.components.find((c) => c.type === 'StaticMesh');
  const meshName = String(meshComp?.properties?.mesh ?? 'Cube').toLowerCase();
  if (meshName.includes('sphere')) return 'sphere';
  if (meshName.includes('plane')) return 'plane';
  return 'box';
}

function resolveBodyType(obj: LevelObject): 'dynamic' | 'static' | 'kinematic' {
  if (obj.id === 'floor' || obj.locked) return 'static';
  const rigid = obj.components.find((c) => c.type === 'Rigidbody' || c.type === 'RigidBody');
  const rawType = String(rigid?.properties?.type ?? '').toLowerCase();
  if (rawType === 'static') return 'static';
  if (rawType === 'kinematic') return 'kinematic';
  const collider = obj.components.find((c) => c.type === 'BoxCollider' || c.type === 'MeshCollider');
  if (collider && obj.id === 'floor') return 'static';
  if (obj.type !== 'mesh' && obj.type !== 'blueprint') return 'static';
  return 'dynamic';
}

function buildCollider(obj: LevelObject): ColliderConfig {
  const scale = new THREE.Vector3(...obj.scale);
  const primitive = meshPrimitive(obj);

  if (primitive === 'sphere') {
    return {
      shape: 'sphere',
      radius: Math.max(scale.x, scale.y, scale.z) * 0.5,
      material: { friction: 0.6, restitution: 0.25, density: 1, frictionCombine: 'average', restitutionCombine: 'average' },
    };
  }

  if (primitive === 'plane') {
    return {
      shape: 'box',
      halfExtents: new THREE.Vector3(scale.x * 0.5, 0.05, scale.z * 0.5),
      material: { friction: 0.8, restitution: 0.1, density: 1, frictionCombine: 'average', restitutionCombine: 'average' },
    };
  }

  return {
    shape: 'box',
    halfExtents: scale.clone().multiplyScalar(0.5),
    material: { friction: 0.5, restitution: 0.35, density: 1, frictionCombine: 'average', restitutionCombine: 'average' },
  };
}

export class LevelEditorPhysicsSession {
  private world: PhysicsWorld | null = null;
  private bodies = new Map<string, BodyEntry>();

  async init(objects: LevelObject[]): Promise<void> {
    if (!isPhysicsEnabled()) return;

    await initPhysicsEngine();
    const gravityY = getPhysicsGravity();
    this.world = new PhysicsWorld(new THREE.Vector3(0, gravityY, 0));
    this.world.init(new THREE.Vector3(0, gravityY, 0));
    this.bodies.clear();

    for (const obj of objects) {
      if (!obj.visible) continue;
      if (obj.type === 'light' || obj.type === 'camera' || obj.type === 'empty') continue;

      const bodyType = resolveBodyType(obj);
      const euler = new THREE.Euler(
        THREE.MathUtils.degToRad(obj.rotation[0]),
        THREE.MathUtils.degToRad(obj.rotation[1]),
        THREE.MathUtils.degToRad(obj.rotation[2]),
      );

      const body = this.world.createBody({
        type: bodyType,
        position: new THREE.Vector3(...obj.position),
        rotation: new THREE.Quaternion().setFromEuler(euler),
        linearDamping: 0.08,
        angularDamping: 0.12,
      });
      body.userData.objectId = obj.id;
      this.world.addCollider(body.id, buildCollider(obj));
      this.bodies.set(obj.id, { body, static: bodyType === 'static' });
    }
  }

  step(objects: LevelObject[], deltaTime: number): LevelObject[] {
    if (!this.world) return objects;

    this.world.step(deltaTime);

    return objects.map((obj) => {
      const entry = this.bodies.get(obj.id);
      if (!entry || entry.static) return obj;

      const position = entry.body.position;
      const rotation = entry.body.rotation;
      const euler = new THREE.Euler().setFromQuaternion(rotation, 'XYZ');

      return {
        ...obj,
        position: [position.x, position.y, position.z],
        rotation: [
          THREE.MathUtils.radToDeg(euler.x),
          THREE.MathUtils.radToDeg(euler.y),
          THREE.MathUtils.radToDeg(euler.z),
        ],
      };
    });
  }

  destroy(): void {
    this.bodies.clear();
    this.world = null;
  }
}
