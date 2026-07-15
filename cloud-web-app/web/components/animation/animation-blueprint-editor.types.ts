export type AnimationNodeType = 
  | 'state'
  | 'entry'
  | 'exit'
  | 'conduit'
  | 'blend_space_1d'
  | 'blend_space_2d'
  | 'blend_node'
  | 'sequence'
  | 'pose_snapshot'
  | 'state_alias';

export interface AnimationParameter {
  id: string;
  name: string;
  type: 'float' | 'int' | 'bool' | 'trigger';
  value: number | boolean;
  min?: number;
  max?: number;
}

export interface TransitionCondition {
  parameter: string;
  comparison: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: number | boolean;
}

export interface AnimationTransition {
  id: string;
  sourceState: string;
  targetState: string;
  conditions: TransitionCondition[];
  blendTime: number;
  blendMode: 'linear' | 'cubic' | 'custom';
  interruptible: boolean;
  priority: number;
}

export interface AnimationState {
  id: string;
  name: string;
  type: AnimationNodeType;
  animation?: string;
  blendTree?: BlendTree;
  speed: number;
  loop: boolean;
  notifies: AnimationNotify[];
}

export interface BlendTree {
  type: '1d' | '2d' | 'additive';
  parameterX: string;
  parameterY?: string;
  children: BlendTreeNode[];
}

export interface BlendTreeNode {
  animation: string;
  position: { x: number; y?: number };
  weight?: number;
}

export interface AnimationNotify {
  id: string;
  name: string;
  time: number;
  duration?: number;
  payload?: Record<string, unknown>;
}

export interface AnimationLayer {
  id: string;
  name: string;
  blendMode: 'override' | 'additive';
  weight: number;
  mask?: string[]; // Bone mask
  stateMachine: string;
}

export interface AnimationBlueprint {
  id: string;
  name: string;
  skeleton: string;
  parameters: AnimationParameter[];
  states: AnimationState[];
  transitions: AnimationTransition[];
  layers: AnimationLayer[];
  defaultState: string;
}

// ============================================================================
// NODE DATA TYPES
// ============================================================================

export interface StateNodeData extends Record<string, unknown> {
  state: AnimationState;
  isDefault: boolean;
  isSelected: boolean;
  onEdit: (state: AnimationState) => void;
  onSetDefault: (stateId: string) => void;
}

export interface TransitionEdgeData extends Record<string, unknown> {
  transition: AnimationTransition;
  onEdit?: (transition: AnimationTransition) => void;
}
