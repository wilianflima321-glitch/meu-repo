/**
 * Shared type contracts for animation blueprint editor.
 */

export type AnimationStateType = 
  | 'state'
  | 'entry'
  | 'conduit'
  | 'blend'
  | 'blendspace1d'
  | 'blendspace2d'
  | 'montage'
  | 'slot';

export interface AnimationState {
  id: string;
  name: string;
  type: AnimationStateType;
  animation?: string;
  looping: boolean;
  playRate: number;
  blendIn: number;
  blendOut: number;
  position: { x: number; y: number };
}

export interface TransitionRule {
  id: string;
  from: string;
  to: string;
  conditions: TransitionCondition[];
  blendTime: number;
  blendMode: 'linear' | 'cubic' | 'custom';
  priority: number;
  automatic: boolean;
}

export interface TransitionCondition {
  variable: string;
  operator: '==' | '!=' | '<' | '>' | '<=' | '>=';
  value: number | boolean | string;
}

export interface AnimationVariable {
  name: string;
  type: 'float' | 'int' | 'bool';
  defaultValue: number | boolean;
  min?: number;
  max?: number;
}

export interface BlendSpacePoint {
  animation: string;
  x: number;
  y?: number;
}
