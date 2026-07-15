import { createComponentLogger } from '@/lib/observability/logger'
import type { NodeStatus, NodeType } from './behavior-tree-contracts'
import type { BehaviorContext, BTNode } from './behavior-tree-types'
import {
  AMBIENT_BT_KEYS,
  applyAmbientEmotionToBlackboard,
  recomputeNpcPriorityBias,
  type AmbientNpcPriorityBias,
} from '@/lib/ambient'
import type { AmbientEmotionDelta, AmbientEmotionLabel } from '@/lib/ambient'
import type { Blackboard } from './behavior-tree-blackboard'
import type { CharacterTopologyBus } from '@/lib/character/character-topology-bus'
import type {
  EqsLosTester,
  EqsTarget,
  EqsWorldPoint,
} from '@/lib/character/environment-query-system'
import * as THREE from 'three'

/** Letter cj — blackboard keys for EQS→GAS fire action. */
export const EQS_BT_KEYS = {
  topologyBus: 'eqsTopologyBus',
  target: 'eqsTarget',
  candidates: 'eqsCandidates',
  hasLineOfSight: 'eqsHasLineOfSight',
  frame: 'eqsFrame',
} as const

const log = createComponentLogger('ai/behavior-tree-nodes')

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
  }
  abort(): void {
  }
}
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
    log.info(`[BT:${context.agent.id}] ${msg}`);
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


// ---------------------------------------------------------------------------
// K.0/J AmbientEmotionDelta → NPC BT ($0 local; no LLM)
// ---------------------------------------------------------------------------

/**
 * Apply emotion to blackboard and return recomputed NPC priority bias.
 * Always local / $0 — never escalates cloud.
 */

/**
 * Recompute NPC priority weight from ambient blackboard bias (local $0).
 * Returns classic baseline when ambient keys absent — never throws / never surfaces UI.
 */
export function recomputeNpcPriorityFromAmbientBlackboard(
  blackboard: { get<T>(key: string, defaultValue?: T): T | undefined },
  baseline = 1,
): number {
  const bias = blackboard.get<string>(AMBIENT_BT_KEYS.npcPriorityBias)
  switch (bias) {
    case 'critical':
      return baseline * 2.0
    case 'elevated':
      return baseline * 1.4
    case 'low':
      return baseline * 0.6
    case 'normal':
      return baseline
    default:
      return baseline
  }
}
export function recomputeNpcPriorityOnAmbientEmotion(
  blackboard: Blackboard,
  emotion: AmbientEmotionDelta,
): AmbientNpcPriorityBias {
  const bias = applyAmbientEmotionToBlackboard(blackboard, emotion)
  return bias ?? recomputeNpcPriorityBias(emotion.label)
}

/** Condition leaf: succeed when blackboard ambientEmotion matches label. */
export class AmbientEmotionConditionNode extends BaseNode {
  type: NodeType = 'leaf'
  private expected: AmbientEmotionLabel
  constructor(name: string, expected: AmbientEmotionLabel) {
    super(name)
    this.expected = expected
  }
  tick(context: BehaviorContext): NodeStatus {
    const label = context.blackboard.get<AmbientEmotionLabel>(AMBIENT_BT_KEYS.emotion)
    // Zero-UI: missing ambient keys → classic AI (ambient branch fails closed, no throw)
    if (label === undefined) return 'failure'
    return label === this.expected ? 'success' : 'failure'
  }
}

/** Condition leaf: succeed when ambientNpcPriorityBias is elevated or critical. */
export class AmbientNpcPriorityElevatedNode extends BaseNode {
  type: NodeType = 'leaf'
  tick(context: BehaviorContext): NodeStatus {
    const bias = context.blackboard.get<AmbientNpcPriorityBias>(AMBIENT_BT_KEYS.npcPriorityBias)
    return bias === 'elevated' || bias === 'critical' ? 'success' : 'failure'
  }
}

/**
 * Letter cj — EQS los-fire → GAS fireball (or relocate).
 * Zero-UI: missing bus/target/LoS → failure (no chrome).
 */
export class EqsFireAbilityActionNode extends BaseNode {
  type: NodeType = 'leaf'
  tick(context: BehaviorContext): NodeStatus {
    const bus = context.blackboard.get<CharacterTopologyBus>(EQS_BT_KEYS.topologyBus)
    const target = context.blackboard.get<EqsTarget>(EQS_BT_KEYS.target)
    const hasLos = context.blackboard.get<EqsLosTester>(EQS_BT_KEYS.hasLineOfSight)
    if (!bus || !target || !hasLos) {
      return 'failure'
    }
    const candidates =
      context.blackboard.get<EqsWorldPoint[]>(EQS_BT_KEYS.candidates) ?? []
    const frame = context.blackboard.get<number>(EQS_BT_KEYS.frame) ?? 0
    const result = bus.evaluateAndFireWithEqs(frame, {
      kind: 'los-fire',
      agent: {
        x: context.agent.position.x,
        y: context.agent.position.y,
        z: context.agent.position.z,
      },
      target,
      candidates,
      hasLineOfSight: hasLos,
    })
    if (result.fired) {
      context.agent.setState('attacking')
      return 'success'
    }
    if (result.relocateTo) {
      const p = result.relocateTo
      return context.agent.moveTo(new THREE.Vector3(p.x, p.y, p.z))
    }
    return 'failure'
  }
}

export { AMBIENT_BT_KEYS, applyAmbientEmotionToBlackboard, recomputeNpcPriorityBias }
