// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
import * as THREE from 'three'
import type { Entity, RigidbodyComponent, System, TransformComponent } from './game-engine-core.contracts'
import type { World } from './game-engine-core'

export class TransformSystem implements System {
  name = 'TransformSystem';
  requiredComponents = ['transform'];
  priority = 0;

  update(entities: Entity[]): void {
    // Atualizar transforms hierárquicos
    const roots = entities.filter(e => !e.parent);
    roots.forEach(entity => this.updateTransformHierarchy(entity, entities));
  }

  private updateTransformHierarchy(
    entity: Entity,
    allEntities: Entity[],
    parentMatrix?: THREE.Matrix4
  ): void {
    // Aqui você atualizaria as transforms world baseado nas locais
    // Simplificado por brevidade
    entity.children.forEach(childId => {
      const child = allEntities.find(e => e.id === childId);
      if (child) {
        this.updateTransformHierarchy(child, allEntities, parentMatrix);
      }
    });
  }
}

export class PhysicsSystem implements System {
  name = 'PhysicsSystem';
  requiredComponents = ['transform', 'rigidbody'];
  priority = 10;

  private world?: World;

  constructor(world: World) {
    this.world = world;
  }

  update(entities: Entity[], deltaTime: number): void {
    if (!this.world) return;

    entities.forEach(entity => {
      const transform = this.world!.getComponent<TransformComponent>(entity.id, 'transform')!;
      const rb = this.world!.getComponent<RigidbodyComponent>(entity.id, 'rigidbody')!;

      if (rb.isKinematic) return;

      // Aplicar gravidade
      if (rb.useGravity) {
        rb.velocity.add(
          this.world!.physics.gravity.clone().multiplyScalar(deltaTime)
        );
      }

      // Aplicar drag
      rb.velocity.multiplyScalar(1 - rb.drag * deltaTime);
      rb.angularVelocity.multiplyScalar(1 - rb.angularDrag * deltaTime);

      // Atualizar posição
      if (!rb.constraints.freezePositionX) transform.position.x += rb.velocity.x * deltaTime;
      if (!rb.constraints.freezePositionY) transform.position.y += rb.velocity.y * deltaTime;
      if (!rb.constraints.freezePositionZ) transform.position.z += rb.velocity.z * deltaTime;

      // Atualizar rotação
      if (!rb.constraints.freezeRotationX) transform.rotation.x += rb.angularVelocity.x * deltaTime;
      if (!rb.constraints.freezeRotationY) transform.rotation.y += rb.angularVelocity.y * deltaTime;
      if (!rb.constraints.freezeRotationZ) transform.rotation.z += rb.angularVelocity.z * deltaTime;
    });
  }
}

// ============================================================================
// SINGLETON WORLD
// ============================================================================

