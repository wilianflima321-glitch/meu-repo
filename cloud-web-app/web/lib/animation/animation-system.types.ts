export type EasingType = 
  | 'linear'
  | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad'
  | 'easeInCubic' | 'easeOutCubic' | 'easeInOutCubic'
  | 'easeInQuart' | 'easeOutQuart' | 'easeInOutQuart'
  | 'easeInQuint' | 'easeOutQuint' | 'easeInOutQuint'
  | 'easeInSine' | 'easeOutSine' | 'easeInOutSine'
  | 'easeInExpo' | 'easeOutExpo' | 'easeInOutExpo'
  | 'easeInCirc' | 'easeOutCirc' | 'easeInOutCirc'
  | 'easeInElastic' | 'easeOutElastic' | 'easeInOutElastic'
  | 'easeInBack' | 'easeOutBack' | 'easeInOutBack'
  | 'easeInBounce' | 'easeOutBounce' | 'easeInOutBounce'
  | 'custom';

export type PropertyType = 
  | 'number'
  | 'vector2'
  | 'vector3'
  | 'quaternion'
  | 'color'
  | 'boolean';

export interface Keyframe<T = number> {
  time: number;
  value: T;
  easing: EasingType;
  tangentIn?: T;
  tangentOut?: T;
}

export interface AnimationTrack<T = number> {
  id: string;
  name: string;
  propertyPath: string;
  propertyType: PropertyType;
  keyframes: Keyframe<T>[];
  enabled: boolean;
}

export interface AnimationClipData {
  id: string;
  name: string;
  duration: number;
  tracks: AnimationTrack<unknown>[];
  loop: boolean;
  speed: number;
  blendMode: 'additive' | 'override';
}

export interface AnimationState {
  id: string;
  name: string;
  clipId: string;
  speed: number;
  loop: boolean;
  blendDuration: number;
  onEnter?: () => void;
  onExit?: () => void;
  onUpdate?: (time: number, progress: number) => void;
}

export interface AnimationTransition {
  id: string;
  fromState: string;
  toState: string;
  condition: () => boolean;
  duration: number;
  interruptible: boolean;
  priority: number;
}

export interface AnimationLayer {
  id: string;
  name: string;
  weight: number;
  blendMode: 'additive' | 'override';
  mask?: string[]; // Bones to affect
  states: AnimationState[];
  transitions: AnimationTransition[];
  currentState: string | null;
}
