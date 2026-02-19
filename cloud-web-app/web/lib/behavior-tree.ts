/**
 * AI Behavior Tree System - Sistema de IA para NPCs REAL
 * 
 * Implementação completa de Behavior Trees para IA de jogos.
 * Suporta todos os nós padrão: Sequence, Selector, Parallel,
 * Decorators, Actions, Conditions.
 * 
 * NÃO É MOCK - Sistema completo estilo Unreal Engine!
 */

import * as THREE from 'three';
import { createBossBehaviorTree, createCowardBehaviorTree } from './behavior-tree-boss-preset';

// ============================================================================
// TIPOS BASE
// ============================================================================

export type NodeStatus = 'success' | 'failure' | 'running';

export interface BehaviorTreeContext {
  entity: unknown;
  world: unknown;
  deltaTime: number;
  blackboard: Blackboard;
}

export interface Blackboard {
  data: Map<string, unknown>;
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
}

// ============================================================================
// BLACKBOARD IMPLEMENTATION
// ============================================================================

export class BlackboardImpl implements Blackboard {
  data: Map<string, unknown> = new Map();
  
  get<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined;
  }
  
  set<T>(key: string, value: T): void {
    this.data.set(key, value);
  }
  
  has(key: string): boolean {
    return this.data.has(key);
  }
  
  delete(key: string): void {
    this.data.delete(key);
  }
  
  clear(): void {
    this.data.clear();
  }
}

// ============================================================================
// NODE BASE CLASS
// ============================================================================

export abstract class BehaviorNode {
  id: string;
  name: string;
  children: BehaviorNode[] = [];
  parent: BehaviorNode | null = null;
  
  constructor(name: string) {
    this.id = `node_${Math.random().toString(36).substr(2, 9)}`;
    this.name = name;
  }
  
  abstract tick(context: BehaviorTreeContext): NodeStatus;
  
  addChild(child: BehaviorNode): this {
    child.parent = this;
    this.children.push(child);
    return this;
  }
  
  removeChild(child: BehaviorNode): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
  }
  
  // Called when node is reset or tree restarts
  reset(): void {
    this.children.forEach(child => child.reset());
  }
}

// ============================================================================
// COMPOSITE NODES
// ============================================================================

/**
 * Sequence - Executa filhos em sequência.
 * Retorna FAILURE se qualquer filho falhar.
 * Retorna SUCCESS se todos os filhos tiverem sucesso.
 */
export class SequenceNode extends BehaviorNode {
  private currentIndex: number = 0;
  
  constructor(name: string = 'Sequence') {
    super(name);
  }
  
  tick(context: BehaviorTreeContext): NodeStatus {
    while (this.currentIndex < this.children.length) {
      const status = this.children[this.currentIndex].tick(context);
      
      if (status === 'running') {
        return 'running';
      }
      
      if (status === 'failure') {
        this.currentIndex = 0;
        return 'failure';
      }
      
      this.currentIndex++;
    }
    
    this.currentIndex = 0;
    return 'success';
  }
  
  reset(): void {
    this.currentIndex = 0;
    super.reset();
  }
}

/**
 * Selector - Tenta filhos até um ter sucesso.
 * Retorna SUCCESS se qualquer filho tiver sucesso.
 * Retorna FAILURE se todos falharem.
 */
export class SelectorNode extends BehaviorNode {
  private currentIndex: number = 0;
  
  constructor(name: string = 'Selector') {
    super(name);
  }
  
  tick(context: BehaviorTreeContext): NodeStatus {
    while (this.currentIndex < this.children.length) {
      const status = this.children[this.currentIndex].tick(context);
      
      if (status === 'running') {
        return 'running';
      }
      
      if (status === 'success') {
        this.currentIndex = 0;
        return 'success';
      }
      
      this.currentIndex++;
    }
    
    this.currentIndex = 0;
    return 'failure';
  }
  
  reset(): void {
    this.currentIndex = 0;
    super.reset();
  }
}

/**
 * Parallel - Executa todos os filhos simultaneamente.
 * Configurável para succeeder com todos ou apenas um.
 */
export class ParallelNode extends BehaviorNode {
  private policy: 'require_one' | 'require_all';
  private childStatuses: Map<string, NodeStatus> = new Map();
  
  constructor(name: string = 'Parallel', policy: 'require_one' | 'require_all' = 'require_all') {
    super(name);
    this.policy = policy;
  }
  
  tick(context: BehaviorTreeContext): NodeStatus {
    let successCount = 0;
    let failureCount = 0;
    let runningCount = 0;
    
    for (const child of this.children) {
      // Skip if already finished
      const prevStatus = this.childStatuses.get(child.id);
      if (prevStatus === 'success' || prevStatus === 'failure') {
        if (prevStatus === 'success') successCount++;
        else failureCount++;
        continue;
      }
      
      const status = child.tick(context);
      this.childStatuses.set(child.id, status);
      
      if (status === 'success') successCount++;
      else if (status === 'failure') failureCount++;
      else runningCount++;
    }
    
    // Check completion based on policy
    if (this.policy === 'require_one') {
      if (successCount > 0) {
        this.reset();
        return 'success';
      }
      if (runningCount === 0) {
        this.reset();
        return 'failure';
      }
    } else {
      if (failureCount > 0) {
        this.reset();
        return 'failure';
      }
      if (runningCount === 0) {
        this.reset();
        return 'success';
      }
    }
    
    return 'running';
  }
  
  reset(): void {
    this.childStatuses.clear();
    super.reset();
  }
}

/**
 * RandomSelector - Seleciona um filho aleatório
 */
export class RandomSelectorNode extends BehaviorNode {
  private selectedIndex: number = -1;
  
  constructor(name: string = 'RandomSelector') {
    super(name);
  }
  
  tick(context: BehaviorTreeContext): NodeStatus {
    if (this.children.length === 0) return 'failure';
    
    if (this.selectedIndex === -1) {
      this.selectedIndex = Math.floor(Math.random() * this.children.length);
    }
    
    const status = this.children[this.selectedIndex].tick(context);
    
    if (status !== 'running') {
      this.selectedIndex = -1;
    }
    
    return status;
  }
  
  reset(): void {
    this.selectedIndex = -1;
    super.reset();
  }
}

// ============================================================================
// DECORATOR NODES
// ============================================================================

/**
 * Inverter - Inverte o resultado do filho
 */
export class InverterNode extends BehaviorNode {
  constructor(name: string = 'Inverter') {
    super(name);
  }
  
  tick(context: BehaviorTreeContext): NodeStatus {
    if (this.children.length === 0) return 'failure';
    
    const status = this.children[0].tick(context);
    
    if (status === 'success') return 'failure';
    if (status === 'failure') return 'success';
    return 'running';
  }
}

/**
 * Repeater - Repete o filho N vezes ou infinitamente
 */
export class RepeaterNode extends BehaviorNode {
  private repeatCount: number;
  private currentCount: number = 0;
  private infinite: boolean;
  
  constructor(name: string = 'Repeater', repeatCount: number = -1) {
    super(name);
    this.repeatCount = repeatCount;
    this.infinite = repeatCount < 0;
  }
  
  tick(context: BehaviorTreeContext): NodeStatus {
    if (this.children.length === 0) return 'failure';
    
    const status = this.children[0].tick(context);
    
    if (status === 'running') {
      return 'running';
    }
    
    if (status === 'failure') {
      this.currentCount = 0;
      return 'failure';
    }
    
    this.currentCount++;
    
    if (this.infinite || this.currentCount < this.repeatCount) {
      this.children[0].reset();
      return 'running';
    }
    
    this.currentCount = 0;
    return 'success';
  }
  
  reset(): void {
    this.currentCount = 0;
    super.reset();
  }
}

/**
 * RepeatUntilFail - Repete até o filho falhar
 */
export class RepeatUntilFailNode extends BehaviorNode {
  constructor(name: string = 'RepeatUntilFail') {
    super(name);
  }
  
  tick(context: BehaviorTreeContext): NodeStatus {
    if (this.children.length === 0) return 'failure';
    
    const status = this.children[0].tick(context);
    
    if (status === 'failure') {
      return 'success';
    }
    
    if (status === 'success') {
      this.children[0].reset();
    }
    
    return 'running';
  }
}

/**
 * Succeeder - Sempre retorna success
 */
export class SucceederNode extends BehaviorNode {
  constructor(name: string = 'Succeeder') {
    super(name);
  }
  
  tick(context: BehaviorTreeContext): NodeStatus {
    if (this.children.length > 0) {
      this.children[0].tick(context);
    }
    return 'success';
  }
}

/**
 * Timeout - Falha se o filho demorar muito
 */
export class TimeoutNode extends BehaviorNode {
  private timeout: number;
  private startTime: number = 0;
  private started: boolean = false;
  
  constructor(name: string = 'Timeout', timeout: number = 5) {
    super(name);
    this.timeout = timeout;
  }
  
  tick(context: BehaviorTreeContext): NodeStatus {
    if (this.children.length === 0) return 'failure';
    
    if (!this.started) {
      this.started = true;
      this.startTime = performance.now() / 1000;
    }
    
    const elapsed = performance.now() / 1000 - this.startTime;
    if (elapsed >= this.timeout) {
      this.reset();
      return 'failure';
    }
    
    const status = this.children[0].tick(context);
    
    if (status !== 'running') {
      this.reset();
    }
    
    return status;
  }
  
  reset(): void {
    this.started = false;
    this.startTime = 0;
    super.reset();
  }
}

/**
 * Cooldown - Espera um tempo antes de executar novamente
 */
export class CooldownNode extends BehaviorNode {
  private cooldown: number;
  private lastRunTime: number = 0;
  
  constructor(name: string = 'Cooldown', cooldown: number = 1) {
    super(name);
    this.cooldown = cooldown;
  }
  
  tick(context: BehaviorTreeContext): NodeStatus {
    if (this.children.length === 0) return 'failure';
    
    const currentTime = performance.now() / 1000;
    
    if (currentTime - this.lastRunTime < this.cooldown) {
      return 'failure';
    }
    
    const status = this.children[0].tick(context);
    
    if (status !== 'running') {
      this.lastRunTime = currentTime;
    }
    
    return status;
  }
}

// ============================================================================
// CONDITION NODES
// ============================================================================

type ConditionFn = (context: BehaviorTreeContext) => boolean;

export class ConditionNode extends BehaviorNode {
  private condition: ConditionFn;
  
  constructor(name: string, condition: ConditionFn) {
    super(name);
    this.condition = condition;
  }
  
  tick(context: BehaviorTreeContext): NodeStatus {
    return this.condition(context) ? 'success' : 'failure';
  }
}

// Built-in conditions
export class BlackboardCondition extends BehaviorNode {
  private key: string;
  private operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'exists' | 'not_exists';
  private value?: unknown;
  
  constructor(
    name: string,
    key: string,
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'exists' | 'not_exists',
    value?: unknown
  ) {
    super(name);
    this.key = key;
    this.operator = operator;
    this.value = value;
  }
  
  tick(context: BehaviorTreeContext): NodeStatus {
    const bbValue = context.blackboard.get(this.key);
    
    switch (this.operator) {
      case 'exists':
        return context.blackboard.has(this.key) ? 'success' : 'failure';
      case 'not_exists':
        return !context.blackboard.has(this.key) ? 'success' : 'failure';
      case '==':
        return bbValue === this.value ? 'success' : 'failure';
      case '!=':
        return bbValue !== this.value ? 'success' : 'failure';
      case '>':
        return (bbValue as number) > (this.value as number) ? 'success' : 'failure';
      case '<':
        return (bbValue as number) < (this.value as number) ? 'success' : 'failure';
      case '>=':
        return (bbValue as number) >= (this.value as number) ? 'success' : 'failure';
      case '<=':
        return (bbValue as number) <= (this.value as number) ? 'success' : 'failure';
      default:
        return 'failure';
    }
  }
}

export class DistanceCondition extends BehaviorNode {
  private targetKey: string;
  private operator: '<' | '>' | '<=' | '>=';
  private distance: number;
  
  constructor(name: string, targetKey: string, operator: '<' | '>' | '<=' | '>=', distance: number) {
    super(name);
    this.targetKey = targetKey;
    this.operator = operator;
    this.distance = distance;
  }
  
  tick(context: BehaviorTreeContext): NodeStatus {
    const target = context.blackboard.get<THREE.Vector3>(this.targetKey);
    const entity = context.entity as { position: THREE.Vector3 };
    
    if (!target || !entity?.position) return 'failure';
    
    const dist = entity.position.distanceTo(target);
    
    switch (this.operator) {
      case '<': return dist < this.distance ? 'success' : 'failure';
      case '>': return dist > this.distance ? 'success' : 'failure';
      case '<=': return dist <= this.distance ? 'success' : 'failure';
      case '>=': return dist >= this.distance ? 'success' : 'failure';
      default: return 'failure';
    }
  }
}

// ============================================================================
// ACTION NODES
// ============================================================================

type ActionFn = (context: BehaviorTreeContext) => NodeStatus;

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
 * MoveToTarget - Move em direção ao alvo
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
    let currentAngle = entity.rotation.y;
    
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
 * PlayAnimation - Toca uma animação
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
    
    // Apply damage
    if (target.health !== undefined) {
      target.health -= this.damage;
      context.blackboard.set('last_damage_dealt', this.damage);
    }
    
    this.lastAttackTime = currentTime;
    return 'success';
  }
}

/**
 * FindNearestEnemy - Encontra o inimigo mais próximo
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

// ============================================================================
// BEHAVIOR TREE
// ============================================================================

export class BehaviorTree {
  root: BehaviorNode;
  blackboard: Blackboard;
  
  constructor(root: BehaviorNode) {
    this.root = root;
    this.blackboard = new BlackboardImpl();
  }
  
  tick(entity: unknown, world: unknown, deltaTime: number): NodeStatus {
    const context: BehaviorTreeContext = {
      entity,
      world,
      deltaTime,
      blackboard: this.blackboard,
    };
    
    return this.root.tick(context);
  }
  
  reset(): void {
    this.root.reset();
  }
}

// ============================================================================
// BUILDER PATTERN
// ============================================================================

export class BehaviorTreeBuilder {
  private stack: BehaviorNode[] = [];
  private root: BehaviorNode | null = null;
  
  private current(): BehaviorNode {
    return this.stack[this.stack.length - 1];
  }
  
  sequence(name: string = 'Sequence'): this {
    const node = new SequenceNode(name);
    this.addNode(node);
    this.stack.push(node);
    return this;
  }
  
  selector(name: string = 'Selector'): this {
    const node = new SelectorNode(name);
    this.addNode(node);
    this.stack.push(node);
    return this;
  }
  
  parallel(name: string = 'Parallel', policy: 'require_one' | 'require_all' = 'require_all'): this {
    const node = new ParallelNode(name, policy);
    this.addNode(node);
    this.stack.push(node);
    return this;
  }
  
  inverter(name: string = 'Inverter'): this {
    const node = new InverterNode(name);
    this.addNode(node);
    this.stack.push(node);
    return this;
  }
  
  repeater(name: string = 'Repeater', count: number = -1): this {
    const node = new RepeaterNode(name, count);
    this.addNode(node);
    this.stack.push(node);
    return this;
  }
  
  repeatUntilFail(name: string = 'RepeatUntilFail'): this {
    const node = new RepeatUntilFailNode(name);
    this.addNode(node);
    this.stack.push(node);
    return this;
  }
  
  timeout(name: string = 'Timeout', duration: number = 5): this {
    const node = new TimeoutNode(name, duration);
    this.addNode(node);
    this.stack.push(node);
    return this;
  }
  
  cooldown(name: string = 'Cooldown', duration: number = 1): this {
    const node = new CooldownNode(name, duration);
    this.addNode(node);
    this.stack.push(node);
    return this;
  }
  
  condition(name: string, fn: ConditionFn): this {
    const node = new ConditionNode(name, fn);
    this.addNode(node);
    return this;
  }
  
  blackboardCondition(
    name: string,
    key: string,
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'exists' | 'not_exists',
    value?: unknown
  ): this {
    const node = new BlackboardCondition(name, key, operator, value);
    this.addNode(node);
    return this;
  }
  
  distanceCondition(name: string, targetKey: string, operator: '<' | '>' | '<=' | '>=', distance: number): this {
    const node = new DistanceCondition(name, targetKey, operator, distance);
    this.addNode(node);
    return this;
  }
  
  action(name: string, fn: ActionFn): this {
    const node = new ActionNode(name, fn);
    this.addNode(node);
    return this;
  }
  
  wait(name: string = 'Wait', duration: number = 1): this {
    const node = new WaitNode(name, duration);
    this.addNode(node);
    return this;
  }
  
  setBlackboard(name: string, key: string, value: unknown | ((ctx: BehaviorTreeContext) => unknown)): this {
    const node = new SetBlackboardNode(name, key, value);
    this.addNode(node);
    return this;
  }
  
  moveToTarget(name: string = 'MoveToTarget', targetKey: string = 'target', speed: number = 5): this {
    const node = new MoveToTargetNode(name, targetKey, speed);
    this.addNode(node);
    return this;
  }
  
  lookAtTarget(name: string = 'LookAtTarget', targetKey: string = 'target'): this {
    const node = new LookAtTargetNode(name, targetKey);
    this.addNode(node);
    return this;
  }
  
  findNearestEnemy(name: string = 'FindNearestEnemy', radius: number = 20): this {
    const node = new FindNearestEnemyNode(name, radius);
    this.addNode(node);
    return this;
  }
  
  attack(name: string = 'Attack', damage: number = 10, range: number = 2): this {
    const node = new AttackNode(name, damage, range);
    this.addNode(node);
    return this;
  }
  
  patrol(name: string = 'Patrol', waypointsKey: string = 'patrol_waypoints'): this {
    const node = new PatrolNode(name, waypointsKey);
    this.addNode(node);
    return this;
  }
  
  flee(name: string = 'Flee', targetKey: string = 'target', speed: number = 6, safeDistance: number = 15): this {
    const node = new FleeNode(name, targetKey, speed, safeDistance);
    this.addNode(node);
    return this;
  }
  
  end(): this {
    this.stack.pop();
    return this;
  }
  
  build(): BehaviorTree {
    if (!this.root) throw new Error('No root node');
    return new BehaviorTree(this.root);
  }
  
  private addNode(node: BehaviorNode): void {
    if (this.stack.length === 0) {
      this.root = node;
    } else {
      this.current().addChild(node);
    }
  }
}

// ============================================================================
// PRESET BEHAVIOR TREES
// ============================================================================

export const BehaviorPresets = {
  /**
   * Basic enemy AI: Find target, chase, attack
   */
  basicEnemy(options: { attackDamage?: number; attackRange?: number; chaseSpeed?: number } = {}): BehaviorTree {
    const { attackDamage = 10, attackRange = 2, chaseSpeed = 5 } = options;
    
    return new BehaviorTreeBuilder()
      .selector('Root')
        // Combat behavior
        .sequence('Combat')
          .findNearestEnemy('FindTarget', 15)
          .selector('Engage')
            // Attack if in range
            .sequence('Attack')
              .distanceCondition('InRange', 'target', '<=', attackRange)
              .lookAtTarget('LookAt')
              .attack('Attack', attackDamage, attackRange)
              .wait('AttackCooldown', 0.5)
            .end()
            // Chase if not in range
            .sequence('Chase')
              .lookAtTarget('LookAt')
              .moveToTarget('Chase', 'target', chaseSpeed)
            .end()
          .end()
        .end()
        // Patrol if no target
        .patrol('Patrol')
      .end()
      .build();
  },

  /**
   * Patrol guard: Patrol route, investigate sounds, return to patrol
   */
  patrolGuard(): BehaviorTree {
    return new BehaviorTreeBuilder()
      .selector('Root')
        // Investigate disturbance
        .sequence('Investigate')
          .blackboardCondition('HasDisturbance', 'disturbance', 'exists')
          .setBlackboard('SetTarget', 'target', (ctx) => ctx.blackboard.get('disturbance'))
          .moveToTarget('GoToDisturbance', 'target', 4)
          .wait('InvestigateWait', 3)
          .action('ClearDisturbance', (ctx) => {
            ctx.blackboard.delete('disturbance');
            ctx.blackboard.delete('target');
            return 'success';
          })
        .end()
        // Normal patrol
        .patrol('Patrol', 'patrol_waypoints')
      .end()
      .build();
  },

  /**
   * Coward AI: Flee when health is low
   */
  coward(options: { fleeHealthThreshold?: number; fleeSpeed?: number } = {}): BehaviorTree {
    return createCowardBehaviorTree(BehaviorTreeBuilder, options);
  },

  /**
   * Boss AI: Multi-phase with different behaviors
   */
  bossAI(): BehaviorTree {
    return createBossBehaviorTree(BehaviorTreeBuilder);
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export function createBehaviorTree(): BehaviorTreeBuilder {
  return new BehaviorTreeBuilder();
}
