import type {
  AnimationState,
  AnimationVariable,
  TransitionRule,
} from './animation-blueprint-types'

export const DEFAULT_ANIMATIONS: string[] = [
  'Idle',
  'Walk',
  'Run',
  'Sprint',
  'Jump_Start',
  'Jump_Loop',
  'Jump_End',
  'Crouch_Idle',
  'Crouch_Walk',
  'Attack_Light',
  'Attack_Heavy',
  'Hit_React',
  'Death',
]

export const INITIAL_ANIMATION_STATES: AnimationState[] = [
  { id: 'entry', name: 'Entry', type: 'entry', looping: false, playRate: 1, blendIn: 0, blendOut: 0, position: { x: 100, y: 200 } },
  { id: 'idle', name: 'Idle', type: 'state', animation: 'Idle', looping: true, playRate: 1, blendIn: 0.2, blendOut: 0.2, position: { x: 300, y: 200 } },
  { id: 'walk', name: 'Walk', type: 'state', animation: 'Walk', looping: true, playRate: 1, blendIn: 0.2, blendOut: 0.2, position: { x: 500, y: 100 } },
  { id: 'run', name: 'Run', type: 'state', animation: 'Run', looping: true, playRate: 1, blendIn: 0.15, blendOut: 0.15, position: { x: 500, y: 300 } },
  { id: 'jump', name: 'Jump', type: 'state', animation: 'Jump_Start', looping: false, playRate: 1, blendIn: 0.1, blendOut: 0.1, position: { x: 700, y: 200 } },
]

export const INITIAL_TRANSITIONS: TransitionRule[] = [
  { id: 't1', from: 'entry', to: 'idle', conditions: [], blendTime: 0, blendMode: 'linear', priority: 0, automatic: true },
  { id: 't2', from: 'idle', to: 'walk', conditions: [{ variable: 'Speed', operator: '>', value: 0.1 }], blendTime: 0.2, blendMode: 'linear', priority: 1, automatic: false },
  { id: 't3', from: 'walk', to: 'idle', conditions: [{ variable: 'Speed', operator: '<', value: 0.1 }], blendTime: 0.2, blendMode: 'linear', priority: 1, automatic: false },
  { id: 't4', from: 'walk', to: 'run', conditions: [{ variable: 'Speed', operator: '>', value: 0.6 }], blendTime: 0.15, blendMode: 'linear', priority: 2, automatic: false },
  { id: 't5', from: 'run', to: 'walk', conditions: [{ variable: 'Speed', operator: '<', value: 0.6 }], blendTime: 0.15, blendMode: 'linear', priority: 2, automatic: false },
  { id: 't6', from: 'idle', to: 'jump', conditions: [{ variable: 'IsJumping', operator: '==', value: true }], blendTime: 0.1, blendMode: 'linear', priority: 3, automatic: false },
  { id: 't7', from: 'walk', to: 'jump', conditions: [{ variable: 'IsJumping', operator: '==', value: true }], blendTime: 0.1, blendMode: 'linear', priority: 3, automatic: false },
  { id: 't8', from: 'run', to: 'jump', conditions: [{ variable: 'IsJumping', operator: '==', value: true }], blendTime: 0.1, blendMode: 'linear', priority: 3, automatic: false },
  { id: 't9', from: 'jump', to: 'idle', conditions: [{ variable: 'IsJumping', operator: '==', value: false }], blendTime: 0.2, blendMode: 'linear', priority: 0, automatic: false },
]

export const INITIAL_VARIABLES: AnimationVariable[] = [
  { name: 'Speed', type: 'float', defaultValue: 0, min: 0, max: 1 },
  { name: 'Direction', type: 'float', defaultValue: 0, min: -180, max: 180 },
  { name: 'IsJumping', type: 'bool', defaultValue: false },
  { name: 'IsCrouching', type: 'bool', defaultValue: false },
  { name: 'IsAttacking', type: 'bool', defaultValue: false },
]

export const INITIAL_VARIABLE_VALUES: Record<string, number | boolean> = {
  Speed: 0,
  Direction: 0,
  IsJumping: false,
  IsCrouching: false,
  IsAttacking: false,
}

export function cloneStates(states: AnimationState[]): AnimationState[] {
  return states.map((state) => ({
    ...state,
    position: { ...state.position },
  }))
}

export function cloneTransitions(transitions: TransitionRule[]): TransitionRule[] {
  return transitions.map((transition) => ({
    ...transition,
    conditions: transition.conditions.map((condition) => ({ ...condition })),
  }))
}

export function cloneVariables(variables: AnimationVariable[]): AnimationVariable[] {
  return variables.map((variable) => ({ ...variable }))
}
