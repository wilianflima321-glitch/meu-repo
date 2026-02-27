/** Behavior Tree runtime core (nodes, agents, manager). */

import { EventEmitter } from 'events';
import * as THREE from 'three';
import { AIProvider, useAI, useAgent } from './behavior-tree-react';
import { UtilityAI } from './behavior-tree-utility';
import {
  Blackboard,
  type AgentConfig,
  type NavPath,
  type PerceptionTarget,
} from './behavior-tree-system.blackboard';
import {
  ActionNode,
  ConditionCheckNode,
  ConditionNode,
  CooldownNode,
  FailerNode,
  InverterNode,
  LogNode,
  ParallelNode,
  RandomSelectorNode,
  RepeaterNode,
  RepeatUntilFailNode,
  SelectorNode,
  SequenceNode,
  SetBlackboardNode,
  SucceederNode,
  TimeoutNode,
  WaitNode,
  type BTNode,
  type BehaviorContext,
  type NodeStatus,
} from './behavior-tree-system.nodes';

export { AIProvider, useAI, useAgent, UtilityAI };
export type { UtilityAction, UtilityConsideration } from './behavior-tree-utility';
export { Blackboard };
export type { AgentConfig, NavPath, PerceptionTarget } from './behavior-tree-system.blackboard';

export {
  ActionNode,
  ConditionCheckNode,
  ConditionNode,
  CooldownNode,
  FailerNode,
  InverterNode,
  LogNode,
  ParallelNode,
  RandomSelectorNode,
  RepeaterNode,
  RepeatUntilFailNode,
  SelectorNode,
  SequenceNode,
  SetBlackboardNode,
  SucceederNode,
  TimeoutNode,
  WaitNode,
};
export type { BTNode, BehaviorContext, NodeStatus, NodeType } from './behavior-tree-system.nodes';

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
