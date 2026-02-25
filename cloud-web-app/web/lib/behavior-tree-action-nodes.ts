import * as THREE from 'three';

import { BehaviorNode, type BehaviorTreeContext, type NodeStatus } from './behavior-tree-core';

export type ActionFn = (context: BehaviorTreeContext) => NodeStatus;

export class ActionNode extends BehaviorNode {
  private action: ActionFn;

  constructor(name: string, action: ActionFn) {
    super(name);
    this.action = action;
  }

  tick(context: BehaviorTreeContext): NodeStatus {
    return this.action(context);
  }
}

/**
 * Wait - Espera por um tempo determinado
 */
export class WaitNode extends BehaviorNode {
  private duration: number;
  private startTime: number = 0;
  private started: boolean = false;

  constructor(name: string = 'Wait', duration: number = 1) {
    super(name);
    this.duration = duration;
  }

  tick(_context: BehaviorTreeContext): NodeStatus {
    if (!this.started) {
      this.started = true;
      this.startTime = performance.now() / 1000;
    }

    const elapsed = performance.now() / 1000 - this.startTime;

    if (elapsed >= this.duration) {
      this.reset();
      return 'success';
    }

    return 'running';
  }

  reset(): void {
    this.started = false;
    this.startTime = 0;
    super.reset();
  }
}

/**
 * SetBlackboard - Define um valor no blackboard
 */
export class SetBlackboardNode extends BehaviorNode {
  private key: string;
  private value: unknown | ((ctx: BehaviorTreeContext) => unknown);

  constructor(name: string, key: string, value: unknown | ((ctx: BehaviorTreeContext) => unknown)) {
    super(name);
    this.key = key;
    this.value = value;
  }

  tick(context: BehaviorTreeContext): NodeStatus {
    const val = typeof this.value === 'function' ? this.value(context) : this.value;
    context.blackboard.set(this.key, val);
    return 'success';
  }
}

/**
 * MoveToTarget - Move em direÃ§Ã£o ao alvo
 */
export class MoveToTargetNode extends BehaviorNode {
  private targetKey: string;
  private speed: number;
  private arrivalDistance: number;

  constructor(
    name: string = 'MoveToTarget',
    targetKey: string = 'target',
    speed: number = 5,
    arrivalDistance: number = 0.5
  ) {
    super(name);
    this.targetKey = targetKey;
    this.speed = speed;
    this.arrivalDistance = arrivalDistance;
  }

  tick(context: BehaviorTreeContext): NodeStatus {
    const target = context.blackboard.get<THREE.Vector3>(this.targetKey);
    const entity = context.entity as { position: THREE.Vector3; velocity?: THREE.Vector3 };

    if (!target || !entity?.position) return 'failure';

    const direction = target.clone().sub(entity.position);
    const distance = direction.length();

    if (distance <= this.arrivalDistance) {
      if (entity.velocity) entity.velocity.set(0, 0, 0);
      return 'success';
    }

    direction.normalize().multiplyScalar(this.speed);

    if (entity.velocity) {
      entity.velocity.copy(direction);
    } else {
      entity.position.add(direction.multiplyScalar(context.deltaTime));
    }

    return 'running';
  }
}

/**
 * LookAtTarget - Rotaciona para olhar o alvo
 */
export class LookAtTargetNode extends BehaviorNode {
  private targetKey: string;
  private rotationSpeed: number;

  constructor(name: string = 'LookAtTarget', targetKey: string = 'target', rotationSpeed: number = 5) {
    super(name);
    this.targetKey = targetKey;
    this.rotationSpeed = rotationSpeed;
  }

  tick(context: BehaviorTreeContext): NodeStatus {
    const target = context.blackboard.get<THREE.Vector3>(this.targetKey);
    const entity = context.entity as { position: THREE.Vector3; rotation?: THREE.Euler };

    if (!target || !entity?.position || !entity.rotation) return 'failure';

    const direction = target.clone().sub(entity.position);
    direction.y = 0;

    if (direction.lengthSq() < 0.0001) return 'success';

    const targetAngle = Math.atan2(direction.x, direction.z);
    const currentAngle = entity.rotation.y;

    let diff = targetAngle - currentAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    if (Math.abs(diff) < 0.01) {
      entity.rotation.y = targetAngle;
      return 'success';
    }

    const rotationAmount = Math.sign(diff) * Math.min(Math.abs(diff), this.rotationSpeed * context.deltaTime);
    entity.rotation.y += rotationAmount;

    return 'running';
  }
}

/**
 * PlayAnimation - Toca uma animaÃ§Ã£o
 */
export class PlayAnimationNode extends BehaviorNode {
  private animationName: string;
  private waitForCompletion: boolean;

  constructor(name: string = 'PlayAnimation', animationName: string, waitForCompletion: boolean = true) {
    super(name);
    this.animationName = animationName;
    this.waitForCompletion = waitForCompletion;
  }

  tick(context: BehaviorTreeContext): NodeStatus {
    const entity = context.entity as { animator?: { play: (name: string) => void; isPlaying: (name: string) => boolean } };

    if (!entity?.animator) return 'failure';

    entity.animator.play(this.animationName);

    if (!this.waitForCompletion) return 'success';

    return entity.animator.isPlaying(this.animationName) ? 'running' : 'success';
  }
}

/**
 * Attack - Executa um ataque
 */
export class AttackNode extends BehaviorNode {
  private damage: number;
  private range: number;
  private cooldown: number;
  private lastAttackTime: number = 0;

  constructor(name: string = 'Attack', damage: number = 10, range: number = 2, cooldown: number = 1) {
    super(name);
    this.damage = damage;
    this.range = range;
    this.cooldown = cooldown;
  }

  tick(context: BehaviorTreeContext): NodeStatus {
    const currentTime = performance.now() / 1000;

    if (currentTime - this.lastAttackTime < this.cooldown) {
      return 'failure';
    }

    const target = context.blackboard.get<{ position: THREE.Vector3; health?: number }>('target_entity');
    const entity = context.entity as { position: THREE.Vector3 };

    if (!target || !entity?.position) return 'failure';

    const distance = entity.position.distanceTo(target.position);
    if (distance > this.range) return 'failure';

    if (target.health !== undefined) {
      target.health -= this.damage;
      context.blackboard.set('last_damage_dealt', this.damage);
    }

    this.lastAttackTime = currentTime;
    return 'success';
  }
}

/**
 * FindNearestEnemy - Encontra o inimigo mais prÃ³ximo
 */
export class FindNearestEnemyNode extends BehaviorNode {
  private searchRadius: number;
  private targetKey: string;

  constructor(name: string = 'FindNearestEnemy', searchRadius: number = 20, targetKey: string = 'target') {
    super(name);
    this.searchRadius = searchRadius;
    this.targetKey = targetKey;
  }

  tick(context: BehaviorTreeContext): NodeStatus {
    const entity = context.entity as { position: THREE.Vector3; tag?: string };
    const enemies = context.blackboard.get<Array<{ position: THREE.Vector3; tag?: string }>>('enemies') || [];

    if (!entity?.position) return 'failure';

    let nearestEnemy: { position: THREE.Vector3; tag?: string } | null = null;
    let nearestDistance = this.searchRadius;

    for (const enemy of enemies) {
      if (enemy === entity) continue;
      if (enemy.tag === entity.tag) continue; // Same team

      const distance = entity.position.distanceTo(enemy.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    }

    if (nearestEnemy) {
      context.blackboard.set(this.targetKey, nearestEnemy.position.clone());
      context.blackboard.set('target_entity', nearestEnemy);
      return 'success';
    }

    return 'failure';
  }
}

/**
 * Patrol - Patrulha entre waypoints
 */
export class PatrolNode extends BehaviorNode {
  private waypointsKey: string;
  private currentIndex: number = 0;
  private arrivalDistance: number;
  private speed: number;

  constructor(
    name: string = 'Patrol',
    waypointsKey: string = 'patrol_waypoints',
    speed: number = 3,
    arrivalDistance: number = 0.5
  ) {
    super(name);
    this.waypointsKey = waypointsKey;
    this.speed = speed;
    this.arrivalDistance = arrivalDistance;
  }

  tick(context: BehaviorTreeContext): NodeStatus {
    const waypoints = context.blackboard.get<THREE.Vector3[]>(this.waypointsKey);
    const entity = context.entity as { position: THREE.Vector3 };

    if (!waypoints || waypoints.length === 0 || !entity?.position) {
      return 'failure';
    }

    const target = waypoints[this.currentIndex];
    const direction = target.clone().sub(entity.position);
    const distance = direction.length();

    if (distance <= this.arrivalDistance) {
      this.currentIndex = (this.currentIndex + 1) % waypoints.length;
      return 'running';
    }

    direction.normalize().multiplyScalar(this.speed * context.deltaTime);
    entity.position.add(direction);

    return 'running';
  }

  reset(): void {
    this.currentIndex = 0;
    super.reset();
  }
}

/**
 * Flee - Foge do alvo
 */
export class FleeNode extends BehaviorNode {
  private targetKey: string;
  private speed: number;
  private safeDistance: number;

  constructor(
    name: string = 'Flee',
    targetKey: string = 'target',
    speed: number = 6,
    safeDistance: number = 15
  ) {
    super(name);
    this.targetKey = targetKey;
    this.speed = speed;
    this.safeDistance = safeDistance;
  }

  tick(context: BehaviorTreeContext): NodeStatus {
    const target = context.blackboard.get<THREE.Vector3>(this.targetKey);
    const entity = context.entity as { position: THREE.Vector3 };

    if (!target || !entity?.position) return 'failure';

    const direction = entity.position.clone().sub(target);
    const distance = direction.length();

    if (distance >= this.safeDistance) {
      return 'success';
    }

    direction.normalize().multiplyScalar(this.speed * context.deltaTime);
    entity.position.add(direction);

    return 'running';
  }
}

