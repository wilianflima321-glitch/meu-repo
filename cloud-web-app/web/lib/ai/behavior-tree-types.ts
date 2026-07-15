import type { Blackboard } from './behavior-tree-blackboard'
import type { AIAgent } from './behavior-tree-system'
import type { NodeStatus, NodeType } from './behavior-tree-contracts'

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
