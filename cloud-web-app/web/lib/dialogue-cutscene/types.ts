import type * as THREE from 'three';

export type DialogueValue = unknown;
export type DialogueVariableMap = Map<string, DialogueValue>;
export type DialogueJsonRecord = Record<string, DialogueValue>;

export interface DialogueTreeJSON {
  id: string;
  name: string;
  startNode: string;
  nodes: DialogueNode[];
  characters?: Array<Omit<DialogueCharacter, 'portraits'> & { portraits?: Record<string, string> }>;
  variables?: DialogueJsonRecord;
}

export interface CutsceneJSON {
  id: string;
  name: string;
  duration: number;
  tracks: CutsceneTrack[];
  skippable?: boolean;
}

export interface CameraTrackJSON {
  keyframes?: Array<{
    time: number;
    position: { x: number; y: number; z: number };
    lookAt: { x: number; y: number; z: number };
    fov?: number;
    easing?: CameraKeyframe['easing'];
  }>;
}

export interface NamedEventData extends DialogueJsonRecord {
  name: string;
}

export function isRecord(value: unknown): value is DialogueJsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isCameraTrackJSON(value: unknown): value is CameraTrackJSON {
  return isRecord(value) && Array.isArray(value.keyframes);
}

export function isNamedEventData(value: unknown): value is NamedEventData {
  return isRecord(value) && typeof value.name === 'string';
}

export function compareOrdered(
  left: unknown,
  right: unknown,
  predicate: (a: number, b: number) => boolean
): boolean {
  const leftNumber = typeof left === 'number' ? left : Number(left);
  const rightNumber = typeof right === 'number' ? right : Number(right);
  return Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && predicate(leftNumber, rightNumber);
}

export interface DialogueNode {
  id: string;
  type: 'dialogue' | 'choice' | 'action' | 'condition' | 'random';
  speaker?: string;
  text?: string;
  localizedText?: Record<string, string>;
  voiceLine?: string;
  portrait?: string;
  emotion?: string;
  duration?: number;
  choices?: DialogueChoice[];
  nextNode?: string;
  conditions?: DialogueCondition[];
  actions?: DialogueAction[];
  branches?: { condition: DialogueCondition; nodeId: string }[];
  randomBranches?: { weight: number; nodeId: string }[];
}

export interface DialogueChoice {
  id: string;
  text: string;
  localizedText?: Record<string, string>;
  nextNode: string;
  conditions?: DialogueCondition[];
  consequences?: DialogueAction[];
  tooltip?: string;
  isDefault?: boolean;
}

export interface DialogueCondition {
  type: 'variable' | 'item' | 'quest' | 'flag' | 'relationship' | 'custom';
  key: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'has' | 'not_has';
  value: DialogueValue;
}

export interface DialogueAction {
  type: 'set_variable' | 'add_item' | 'remove_item' | 'set_flag' | 'start_quest' | 'complete_quest' | 'change_relationship' | 'play_animation' | 'play_sound' | 'trigger_event' | 'custom';
  target?: string;
  key?: string;
  value?: DialogueValue;
  amount?: number;
}

export interface DialogueTree {
  id: string;
  name: string;
  startNode: string;
  nodes: Map<string, DialogueNode>;
  characters: Map<string, DialogueCharacter>;
  variables: DialogueVariableMap;
}

export interface DialogueCharacter {
  id: string;
  name: string;
  localizedName?: Record<string, string>;
  portraits: Map<string, string>; // emotion -> image URL
  voiceActor?: string;
  defaultEmotion: string;
  textColor?: string;
  nameColor?: string;
}

export interface DialogueState {
  currentTreeId: string | null;
  currentNodeId: string | null;
  history: string[];
  variables: DialogueVariableMap;
  flags: Set<string>;
  relationships: Map<string, number>;
}

export interface CutsceneTrack {
  type: 'camera' | 'animation' | 'audio' | 'dialogue' | 'event' | 'subtitle';
  startTime: number;
  duration: number;
  data: unknown;
}

export interface CameraKeyframe {
  time: number;
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  fov?: number;
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export interface Cutscene {
  id: string;
  name: string;
  duration: number;
  tracks: CutsceneTrack[];
  onComplete?: () => void;
  skippable: boolean;
}

export interface SubtitleEntry {
  startTime: number;
  endTime: number;
  text: string;
  localizedText?: Record<string, string>;
  speaker?: string;
  position?: 'bottom' | 'top' | 'middle';
}
