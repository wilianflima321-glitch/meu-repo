/** Behavior Tree runtime core (nodes, agents, manager). */

import { EventEmitter } from 'events';
import * as THREE from 'three';
import { AIProvider, useAI, useAgent } from './behavior-tree-react';
import { UtilityAI } from './behavior-tree-utility';

export { AIProvider, useAI, useAgent, UtilityAI };
export type { UtilityAction, UtilityConsideration } from './behavior-tree-utility';
// TYPES

export type NodeStatus = 'success' | 'failure' | 'running';
export type NodeType = 'composite' | 'decorator' | 'leaf' | 'root';

export interface BehaviorContext {
  blackboard: Blackboard;
  agent: AIAgent;
  deltaTime: number;
}

export interface BTNode {
  id: string;
  name: string;
  type: NodeType;
  tick(context: BehaviorContext): NodeStatus;
  reset(): void;
  abort(): void;
}

export interface AgentConfig {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  speed: number;
  sightRange: number;
  sightAngle: number;
  hearingRange: number;
  memoryDuration: number;
}

export interface PerceptionTarget {
  id: string;
  position: THREE.Vector3;
  type: string;
  lastSeen: number;
  confidence: number;
  velocity?: THREE.Vector3;
}

export interface NavPath {
  waypoints: THREE.Vector3[];
  currentIndex: number;
  isComplete: boolean;
}
// BLACKBOARD

export class Blackboard {
  private data: Map<string, unknown> = new Map();
  private observers: Map<string, ((value: unknown) => void)[]> = new Map();
  
  set<T>(key: string, value: T): void {
    this.data.set(key, value);
    
    const observers = this.observers.get(key);
    if (observers) {
      for (const observer of observers) {
        observer(value);
      }
    }
  }
  
  get<T>(key: string, defaultValue?: T): T | undefined {
    const value = this.data.get(key);
    return (value !== undefined ? value : defaultValue) as T | undefined;
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
  
  observe(key: string, callback: (value: unknown) => void): () => void {
    if (!this.observers.has(key)) {
      this.observers.set(key, []);
    }
    this.observers.get(key)!.push(callback);
    
    return () => {
      const observers = this.observers.get(key);
      if (observers) {
        const index = observers.indexOf(callback);
        if (index >= 0) observers.splice(index, 1);
      }
    };
  }
  
  getAll(): Map<string, unknown> {
    return new Map(this.data);
  }
  
  serialize(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of this.data) {
      if (value instanceof THREE.Vector3) {
        result[key] = { _type: 'Vector3', x: value.x, y: value.y, z: value.z };
      } else if (value instanceof THREE.Quaternion) {
        result[key] = { _type: 'Quaternion', x: value.x, y: value.y, z: value.z, w: value.w };
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  
  deserialize(data: Record<string, unknown>): void {
    this.clear();
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null && '_type' in value) {
        const typed = value as { _type: string; x: number; y: number; z: number; w?: number };
        if (typed._type === 'Vector3') {
          this.set(key, new THREE.Vector3(typed.x, typed.y, typed.z));
        } else if (typed._type === 'Quaternion') {
          this.set(key, new THREE.Quaternion(typed.x, typed.y, typed.z, typed.w));
        }
      } else {
        this.set(key, value);
      }
    }
  }
}
// BASE NODES

abstract class BaseNode implements BTNode {
  id: string;
  name: string;
  abstract type: NodeType;
  
  constructor(name: string) {
    this.id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.name = name;
  }
  
  abstract tick(context: BehaviorContext): NodeStatus;
  
  reset(): void {
    // Override in subclasses
  }
  
  abort(): void {
    // Override in subclasses
  }
}
// COMPOSITE NODES

export class SequenceNode extends BaseNode {
  type: NodeType = 'composite';
  private children: BTNode[] = [];
  private currentIndex = 0;
  
  constructor(name: string, children: BTNode[] = []) {
    super(name);
    this.children = children;
  }
  
  addChild(node: BTNode): void {
    this.children.push(node);
  }
  
  tick(context: BehaviorContext): NodeStatus {
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
    for (const child of this.children) {
      child.reset();
    }
  }
  
  abort(): void {
    if (this.currentIndex < this.children.length) {
      this.children[this.currentIndex].abort();
    }
    this.reset();
  }
}

export class SelectorNode extends BaseNode {
  type: NodeType = 'composite';
  private children: BTNode[] = [];
  private currentIndex = 0;
  
  constructor(name: string, children: BTNode[] = []) {
    super(name);
    this.children = children;
  }
  
  addChild(node: BTNode): void {
    this.children.push(node);
  }
  
  tick(context: BehaviorContext): NodeStatus {
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
    for (const child of this.children) {
      child.reset();
    }
  }
  
  abort(): void {
    if (this.currentIndex < this.children.length) {
      this.children[this.currentIndex].abort();
    }
    this.reset();
  }
}

export class ParallelNode extends BaseNode {
  type: NodeType = 'composite';
  private children: BTNode[] = [];
  private successThreshold: number;
  private failureThreshold: number;
  
  constructor(name: string, successThreshold = -1, failureThreshold = 1, children: BTNode[] = []) {
    super(name);
    this.successThreshold = successThreshold;
    this.failureThreshold = failureThreshold;
    this.children = children;
  }
  
  addChild(node: BTNode): void {
    this.children.push(node);
  }
  
  tick(context: BehaviorContext): NodeStatus {
    let successCount = 0;
    let failureCount = 0;
    let runningCount = 0;
    
    for (const child of this.children) {
      const status = child.tick(context);
      
      switch (status) {
        case 'success':
          successCount++;
          break;
        case 'failure':
          failureCount++;
          break;
        case 'running':
          runningCount++;
          break;
      }
    }
    
    const actualSuccessThreshold = this.successThreshold === -1 
      ? this.children.length 
      : this.successThreshold;
    
    if (failureCount >= this.failureThreshold) {
      return 'failure';
    }
    
    if (successCount >= actualSuccessThreshold) {
      return 'success';
    }
    
    if (runningCount > 0) {
      return 'running';
    }
    
    return 'failure';
  }
  
  reset(): void {
    for (const child of this.children) {
      child.reset();
    }
  }
  
  abort(): void {
    for (const child of this.children) {
      child.abort();
    }
  }
}

export class RandomSelectorNode extends BaseNode {
  type: NodeType = 'composite';
  private children: BTNode[] = [];
  private shuffledOrder: number[] = [];
  private currentIndex = 0;
  
  constructor(name: string, children: BTNode[] = []) {
    super(name);
    this.children = children;
    this.shuffleOrder();
  }
  
  addChild(node: BTNode): void {
    this.children.push(node);
    this.shuffleOrder();
  }
  
  private shuffleOrder(): void {
    this.shuffledOrder = this.children.map((_, i) => i);
    for (let i = this.shuffledOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledOrder[i], this.shuffledOrder[j]] = [this.shuffledOrder[j], this.shuffledOrder[i]];
    }
  }
  
  tick(context: BehaviorContext): NodeStatus {
    while (this.currentIndex < this.shuffledOrder.length) {
      const childIndex = this.shuffledOrder[this.currentIndex];
      const status = this.children[childIndex].tick(context);
      
      if (status === 'running') {
        return 'running';
      }
      
      if (status === 'success') {
        this.currentIndex = 0;
        this.shuffleOrder();
        return 'success';
      }
      
      this.currentIndex++;
    }
    
    this.currentIndex = 0;
    this.shuffleOrder();
    return 'failure';
  }
  
  reset(): void {
    this.currentIndex = 0;
    this.shuffleOrder();
    for (const child of this.children) {
      child.reset();
    }
  }
  
  abort(): void {
    if (this.currentIndex < this.shuffledOrder.length) {
      this.children[this.shuffledOrder[this.currentIndex]].abort();
    }
    this.reset();
  }
}
// DECORATOR NODES

export class InverterNode extends BaseNode {
  type: NodeType = 'decorator';
  private child: BTNode;
  
  constructor(name: string, child: BTNode) {
    super(name);
    this.child = child;
  }
  
  tick(context: BehaviorContext): NodeStatus {
    const status = this.child.tick(context);
    
    if (status === 'success') return 'failure';
    if (status === 'failure') return 'success';
    return 'running';
  }
  
  reset(): void {
    this.child.reset();
  }
  
  abort(): void {
    this.child.abort();
  }
}

export class RepeaterNode extends BaseNode {
  type: NodeType = 'decorator';
  private child: BTNode;
  private maxRepeats: number;
  private currentRepeat = 0;
  
  constructor(name: string, child: BTNode, maxRepeats = -1) {
    super(name);
    this.child = child;
    this.maxRepeats = maxRepeats; // -1 = infinite
  }
  
  tick(context: BehaviorContext): NodeStatus {
    const status = this.child.tick(context);
    
    if (status === 'running') {
      return 'running';
    }
    
    this.child.reset();
    this.currentRepeat++;
    
    if (this.maxRepeats !== -1 && this.currentRepeat >= this.maxRepeats) {
      this.currentRepeat = 0;
      return 'success';
    }
    
    return 'running';
  }
  
  reset(): void {
    this.currentRepeat = 0;
    this.child.reset();
  }
  
  abort(): void {
    this.currentRepeat = 0;
    this.child.abort();
  }
}

export class RepeatUntilFailNode extends BaseNode {
  type: NodeType = 'decorator';
  private child: BTNode;
  
  constructor(name: string, child: BTNode) {
    super(name);
    this.child = child;
  }
  
  tick(context: BehaviorContext): NodeStatus {
    const status = this.child.tick(context);
    
    if (status === 'running') {
      return 'running';
    }
    
    if (status === 'failure') {
      return 'success';
    }
    
    this.child.reset();
    return 'running';
  }
  
  reset(): void {
    this.child.reset();
  }
  
  abort(): void {
    this.child.abort();
  }
}

export class SucceederNode extends BaseNode {
  type: NodeType = 'decorator';
  private child: BTNode;
  
  constructor(name: string, child: BTNode) {
    super(name);
    this.child = child;
  }
  
  tick(context: BehaviorContext): NodeStatus {
    const status = this.child.tick(context);
    return status === 'running' ? 'running' : 'success';
  }
  
  reset(): void {
    this.child.reset();
  }
  
  abort(): void {
    this.child.abort();
  }
}

export class FailerNode extends BaseNode {
  type: NodeType = 'decorator';
  private child: BTNode;
  
  constructor(name: string, child: BTNode) {
    super(name);
    this.child = child;
  }
  
  tick(context: BehaviorContext): NodeStatus {
    const status = this.child.tick(context);
    return status === 'running' ? 'running' : 'failure';
  }
  
  reset(): void {
    this.child.reset();
  }
  
  abort(): void {
    this.child.abort();
  }
}

export class CooldownNode extends BaseNode {
  type: NodeType = 'decorator';
  private child: BTNode;
  private cooldownTime: number;
  private lastExecutionTime = 0;
  
  constructor(name: string, child: BTNode, cooldownTime: number) {
    super(name);
    this.child = child;
    this.cooldownTime = cooldownTime;
  }
  
  tick(context: BehaviorContext): NodeStatus {
    const now = Date.now();
    
    if (now - this.lastExecutionTime < this.cooldownTime) {
      return 'failure';
    }
    
    const status = this.child.tick(context);
    
    if (status !== 'running') {
      this.lastExecutionTime = now;
    }
    
    return status;
  }
  
  reset(): void {
    this.child.reset();
  }
  
  abort(): void {
    this.child.abort();
  }
}

export class TimeoutNode extends BaseNode {
  type: NodeType = 'decorator';
  private child: BTNode;
  private timeout: number;
  private startTime: number | null = null;
  
  constructor(name: string, child: BTNode, timeout: number) {
    super(name);
    this.child = child;
    this.timeout = timeout;
  }
  
  tick(context: BehaviorContext): NodeStatus {
    if (this.startTime === null) {
      this.startTime = Date.now();
    }
    
    if (Date.now() - this.startTime > this.timeout) {
      this.child.abort();
      this.startTime = null;
      return 'failure';
    }
    
    const status = this.child.tick(context);
    
    if (status !== 'running') {
      this.startTime = null;
    }
    
    return status;
  }
  
  reset(): void {
    this.startTime = null;
    this.child.reset();
  }
  
  abort(): void {
    this.startTime = null;
    this.child.abort();
  }
}

export class ConditionNode extends BaseNode {
  type: NodeType = 'decorator';
  private child: BTNode;
  private condition: (context: BehaviorContext) => boolean;
  
  constructor(name: string, child: BTNode, condition: (context: BehaviorContext) => boolean) {
    super(name);
    this.child = child;
    this.condition = condition;
  }
  
  tick(context: BehaviorContext): NodeStatus {
    if (!this.condition(context)) {
      return 'failure';
    }
    return this.child.tick(context);
  }
  
  reset(): void {
    this.child.reset();
  }
  
  abort(): void {
    this.child.abort();
  }
}
// LEAF NODES

export class ActionNode extends BaseNode {
  type: NodeType = 'leaf';
  private action: (context: BehaviorContext) => NodeStatus;
  
  constructor(name: string, action: (context: BehaviorContext) => NodeStatus) {
    super(name);
    this.action = action;
  }
  
  tick(context: BehaviorContext): NodeStatus {
    return this.action(context);
  }
}

export class ConditionCheckNode extends BaseNode {
  type: NodeType = 'leaf';
  private condition: (context: BehaviorContext) => boolean;
  
  constructor(name: string, condition: (context: BehaviorContext) => boolean) {
    super(name);
    this.condition = condition;
  }
  
  tick(context: BehaviorContext): NodeStatus {
    return this.condition(context) ? 'success' : 'failure';
  }
}

export class WaitNode extends BaseNode {
  type: NodeType = 'leaf';
  private duration: number;
  private startTime: number | null = null;
  
  constructor(name: string, duration: number) {
    super(name);
    this.duration = duration;
  }
  
  tick(): NodeStatus {
    if (this.startTime === null) {
      this.startTime = Date.now();
    }
    
    if (Date.now() - this.startTime >= this.duration) {
      this.startTime = null;
      return 'success';
    }
    
    return 'running';
  }
  
  reset(): void {
    this.startTime = null;
  }
  
  abort(): void {
    this.startTime = null;
  }
}

export class LogNode extends BaseNode {
  type: NodeType = 'leaf';
  private message: string | ((context: BehaviorContext) => string);
  
  constructor(name: string, message: string | ((context: BehaviorContext) => string)) {
    super(name);
    this.message = message;
  }
  
  tick(context: BehaviorContext): NodeStatus {
    const msg = typeof this.message === 'function' ? this.message(context) : this.message;
    console.log(`[BT:${context.agent.id}] ${msg}`);
    return 'success';
  }
}

export class SetBlackboardNode extends BaseNode {
  type: NodeType = 'leaf';
  private key: string;
  private valueOrGetter: unknown | ((context: BehaviorContext) => unknown);
  
  constructor(name: string, key: string, valueOrGetter: unknown | ((context: BehaviorContext) => unknown)) {
    super(name);
    this.key = key;
    this.valueOrGetter = valueOrGetter;
  }
  
  tick(context: BehaviorContext): NodeStatus {
    const value = typeof this.valueOrGetter === 'function' 
      ? (this.valueOrGetter as (context: BehaviorContext) => unknown)(context) 
      : this.valueOrGetter;
    context.blackboard.set(this.key, value);
    return 'success';
  }
}
// BEHAVIOR TREE

export class BehaviorTree {
  private root: BTNode;
  private blackboard: Blackboard;
  
  constructor(root: BTNode, blackboard?: Blackboard) {
    this.root = root;
    this.blackboard = blackboard || new Blackboard();
  }
  
  tick(agent: AIAgent, deltaTime: number): NodeStatus {
    const context: BehaviorContext = {
      blackboard: this.blackboard,
      agent,
      deltaTime,
    };
    
    return this.root.tick(context);
  }
  
  reset(): void {
    this.root.reset();
  }
  
  abort(): void {
    this.root.abort();
  }
  
  getBlackboard(): Blackboard {
    return this.blackboard;
  }
  
  setRoot(root: BTNode): void {
    this.root = root;
  }
}
// PERCEPTION SYSTEM

export class PerceptionSystem {
  private targets: Map<string, PerceptionTarget> = new Map();
  private sightRange: number;
  private sightAngle: number;
  private hearingRange: number;
  private memoryDuration: number;
  
  constructor(sightRange = 20, sightAngle = 120, hearingRange = 15, memoryDuration = 5000) {
    this.sightRange = sightRange;
    this.sightAngle = sightAngle * (Math.PI / 180);
    this.hearingRange = hearingRange;
    this.memoryDuration = memoryDuration;
  }
  
  updatePerception(
    agentPosition: THREE.Vector3,
    agentForward: THREE.Vector3,
    potentialTargets: { id: string; position: THREE.Vector3; type: string; velocity?: THREE.Vector3 }[]
  ): void {
    const now = Date.now();
    
    for (const target of potentialTargets) {
      const toTarget = new THREE.Vector3().subVectors(target.position, agentPosition);
      const distance = toTarget.length();
      
      let canSee = false;
      let canHear = false;
      
      // Sight check
      if (distance <= this.sightRange) {
        toTarget.normalize();
        const angle = Math.acos(agentForward.dot(toTarget));
        
        if (angle <= this.sightAngle / 2) {
          canSee = true;
        }
      }
      
      // Hearing check
      if (distance <= this.hearingRange) {
        canHear = true;
      }
      
      if (canSee || canHear) {
        const existing = this.targets.get(target.id);
        const confidence = canSee ? 1.0 : 0.5;
        
        this.targets.set(target.id, {
          id: target.id,
          position: target.position.clone(),
          type: target.type,
          lastSeen: now,
          confidence: existing ? Math.min(1, existing.confidence + 0.1) : confidence,
          velocity: target.velocity?.clone(),
        });
      }
    }
    
    // Decay old memories
    for (const [id, target] of this.targets) {
      if (now - target.lastSeen > this.memoryDuration) {
        this.targets.delete(id);
      } else if (now - target.lastSeen > 1000) {
        target.confidence *= 0.95;
      }
    }
  }
  
  getKnownTargets(): PerceptionTarget[] {
    return Array.from(this.targets.values());
  }
  
  getTarget(id: string): PerceptionTarget | undefined {
    return this.targets.get(id);
  }
  
  getNearestTarget(position: THREE.Vector3, type?: string): PerceptionTarget | null {
    let nearest: PerceptionTarget | null = null;
    let nearestDist = Infinity;
    
    for (const target of this.targets.values()) {
      if (type && target.type !== type) continue;
      
      const dist = position.distanceTo(target.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = target;
      }
    }
    
    return nearest;
  }
  
  getTargetsOfType(type: string): PerceptionTarget[] {
    return Array.from(this.targets.values()).filter((t) => t.type === type);
  }
  
  forgetTarget(id: string): void {
    this.targets.delete(id);
  }
  
  clear(): void {
    this.targets.clear();
  }
  
  setSightRange(range: number): void {
    this.sightRange = range;
  }
  
  setSightAngle(angle: number): void {
    this.sightAngle = angle * (Math.PI / 180);
  }
  
  setHearingRange(range: number): void {
    this.hearingRange = range;
  }
  
  setMemoryDuration(duration: number): void {
    this.memoryDuration = duration;
  }
}
// AI AGENT

export class AIAgent extends EventEmitter {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  velocity: THREE.Vector3 = new THREE.Vector3();
  
  private speed: number;
  private behaviorTree: BehaviorTree | null = null;
  private perception: PerceptionSystem;
  private currentPath: NavPath | null = null;
  
  private state: 'idle' | 'moving' | 'attacking' | 'dead' = 'idle';
  private health = 100;
  private maxHealth = 100;
  
  constructor(config: AgentConfig) {
    super();
    this.id = config.id;
    this.position = config.position.clone();
    this.rotation = config.rotation.clone();
    this.speed = config.speed;
    
    this.perception = new PerceptionSystem(
      config.sightRange,
      config.sightAngle,
      config.hearingRange,
      config.memoryDuration
    );
  }
  
  setBehaviorTree(tree: BehaviorTree): void {
    this.behaviorTree = tree;
  }
  
  update(deltaTime: number): void {
    if (this.state === 'dead') return;
    
    // Update behavior tree
    if (this.behaviorTree) {
      this.behaviorTree.tick(this, deltaTime);
    }
    
    // Update path following
    if (this.currentPath && !this.currentPath.isComplete) {
      this.followPath(deltaTime);
    }
    
    this.emit('updated', { agent: this });
  }
  
  updatePerception(targets: { id: string; position: THREE.Vector3; type: string; velocity?: THREE.Vector3 }[]): void {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rotation);
    this.perception.updatePerception(this.position, forward, targets);
  }
  
  setPath(waypoints: THREE.Vector3[]): void {
    this.currentPath = {
      waypoints: waypoints.map((w) => w.clone()),
      currentIndex: 0,
      isComplete: false,
    };
    this.state = 'moving';
    this.emit('pathSet', { waypoints });
  }
  
  private followPath(deltaTime: number): void {
    if (!this.currentPath || this.currentPath.isComplete) return;
    
    const targetPoint = this.currentPath.waypoints[this.currentPath.currentIndex];
    const direction = new THREE.Vector3().subVectors(targetPoint, this.position);
    const distance = direction.length();
    
    if (distance < 0.5) {
      this.currentPath.currentIndex++;
      
      if (this.currentPath.currentIndex >= this.currentPath.waypoints.length) {
        this.currentPath.isComplete = true;
        this.state = 'idle';
        this.velocity.set(0, 0, 0);
        this.emit('pathComplete');
        return;
      }
    }
    
    direction.normalize();
    this.velocity.copy(direction).multiplyScalar(this.speed);
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    // Face movement direction
    if (direction.lengthSq() > 0.001) {
      const lookAt = new THREE.Matrix4().lookAt(
        this.position,
        new THREE.Vector3().addVectors(this.position, direction),
        new THREE.Vector3(0, 1, 0)
      );
      this.rotation.setFromRotationMatrix(lookAt);
    }
  }
  
  moveTo(target: THREE.Vector3): NodeStatus {
    const direction = new THREE.Vector3().subVectors(target, this.position);
    const distance = direction.length();
    
    if (distance < 0.5) {
      this.velocity.set(0, 0, 0);
      return 'success';
    }
    
    direction.normalize();
    this.velocity.copy(direction).multiplyScalar(this.speed);
    
    // Face movement direction
    const lookAt = new THREE.Matrix4().lookAt(
      this.position,
      target,
      new THREE.Vector3(0, 1, 0)
    );
    this.rotation.setFromRotationMatrix(lookAt);
    
    return 'running';
  }
  
  lookAt(target: THREE.Vector3): void {
    const lookAt = new THREE.Matrix4().lookAt(
      this.position,
      target,
      new THREE.Vector3(0, 1, 0)
    );
    this.rotation.setFromRotationMatrix(lookAt);
  }
  
  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    this.emit('damaged', { amount, health: this.health });
    
    if (this.health <= 0) {
      this.die();
    }
  }
  
  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.emit('healed', { amount, health: this.health });
  }
  
  die(): void {
    this.state = 'dead';
    this.velocity.set(0, 0, 0);
    this.behaviorTree?.abort();
    this.emit('died', { agent: this });
  }
  
  getForward(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.rotation);
  }
  
  getPerception(): PerceptionSystem {
    return this.perception;
  }
  
  getHealth(): number {
    return this.health;
  }
  
  getMaxHealth(): number {
    return this.maxHealth;
  }
  
  getState(): string {
    return this.state;
  }
  
  setState(state: 'idle' | 'moving' | 'attacking' | 'dead'): void {
    this.state = state;
    this.emit('stateChanged', { state });
  }
  
  isAlive(): boolean {
    return this.state !== 'dead';
  }
  
  getPath(): NavPath | null {
    return this.currentPath;
  }
  
  cancelPath(): void {
    this.currentPath = null;
    this.state = 'idle';
    this.velocity.set(0, 0, 0);
    this.emit('pathCancelled');
  }
}
// AI MANAGER

export class AIManager extends EventEmitter {
  private agents: Map<string, AIAgent> = new Map();
  private worldTargets: { id: string; position: THREE.Vector3; type: string; velocity?: THREE.Vector3 }[] = [];
  
  createAgent(config: AgentConfig): AIAgent {
    const agent = new AIAgent(config);
    this.agents.set(agent.id, agent);
    this.emit('agentCreated', { agent });
    return agent;
  }
  
  removeAgent(id: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      this.agents.delete(id);
      this.emit('agentRemoved', { agent });
    }
  }
  
  getAgent(id: string): AIAgent | undefined {
    return this.agents.get(id);
  }
  
  getAllAgents(): AIAgent[] {
    return Array.from(this.agents.values());
  }
  
  update(deltaTime: number): void {
    for (const agent of this.agents.values()) {
      agent.updatePerception(this.worldTargets);
      agent.update(deltaTime);
    }
  }
  
  registerWorldTarget(id: string, position: THREE.Vector3, type: string, velocity?: THREE.Vector3): void {
    const existing = this.worldTargets.find((t) => t.id === id);
    if (existing) {
      existing.position = position;
      existing.velocity = velocity;
    } else {
      this.worldTargets.push({ id, position, type, velocity });
    }
  }
  
  unregisterWorldTarget(id: string): void {
    const index = this.worldTargets.findIndex((t) => t.id === id);
    if (index >= 0) {
      this.worldTargets.splice(index, 1);
    }
  }
  
  getWorldTargets(): typeof this.worldTargets {
    return this.worldTargets;
  }
  
  dispose(): void {
    this.agents.clear();
    this.worldTargets = [];
    this.removeAllListeners();
  }
}

const __defaultExport = {
  AIManager,
  AIAgent,
  AIProvider,
  useAI,
  useAgent,
  BehaviorTree,
  Blackboard,
  PerceptionSystem,
  UtilityAI,
  // Composite nodes
  SequenceNode,
  SelectorNode,
  ParallelNode,
  RandomSelectorNode,
  // Decorator nodes
  InverterNode,
  RepeaterNode,
  RepeatUntilFailNode,
  SucceederNode,
  FailerNode,
  CooldownNode,
  TimeoutNode,
  ConditionNode,
  // Leaf nodes
  ActionNode,
  ConditionCheckNode,
  WaitNode,
  LogNode,
  SetBlackboardNode,
};

export default __defaultExport;
