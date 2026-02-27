/**
 * Dialogue and cutscene shared contracts extracted from runtime system module.
 */

import * as THREE from 'three';

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
  value: any;
}

export interface DialogueAction {
  type: 'set_variable' | 'add_item' | 'remove_item' | 'set_flag' | 'start_quest' | 'complete_quest' | 'change_relationship' | 'play_animation' | 'play_sound' | 'trigger_event' | 'custom';
  target?: string;
  key?: string;
  value?: any;
  amount?: number;
}

export interface DialogueTree {
  id: string;
  name: string;
  startNode: string;
  nodes: Map<string, DialogueNode>;
  characters: Map<string, DialogueCharacter>;
  variables: Map<string, any>;
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
  variables: Map<string, any>;
  flags: Set<string>;
  relationships: Map<string, number>;
}

// Cutscene types
export interface CutsceneTrack {
  type: 'camera' | 'animation' | 'audio' | 'dialogue' | 'event' | 'subtitle';
  startTime: number;
  duration: number;
  data: any;
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
