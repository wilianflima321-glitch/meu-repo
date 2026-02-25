export type DialogueNodeType = 
  | 'entry' 
  | 'dialogue' 
  | 'choice' 
  | 'condition' 
  | 'action' 
  | 'exit'
  | 'random'
  | 'jump';

export interface DialogueLine {
  id: string;
  characterId: string;
  emotion: string;
  text: string;
  audioFile?: string;
  duration?: number;
  localization: Record<string, string>;
}

export interface DialogueChoice {
  id: string;
  text: string;
  condition?: string;
  localization: Record<string, string>;
}

export interface DialogueCondition {
  variable: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: string | number | boolean;
}

export interface DialogueAction {
  type: 'set_variable' | 'trigger_event' | 'play_audio' | 'camera' | 'custom';
  params: Record<string, any>;
}

export interface DialogueNodeData extends Record<string, unknown> {
  label: string;
  nodeType: DialogueNodeType;
  lines?: DialogueLine[];
  choices?: DialogueChoice[];
  conditions?: DialogueCondition[];
  actions?: DialogueAction[];
  targetNode?: string;
  notes?: string;
}

export interface Character {
  id: string;
  name: string;
  portrait: string;
  color: string;
  emotions: string[];
}

export interface DialogueVariable {
  name: string;
  type: 'string' | 'number' | 'boolean';
  defaultValue: any;
}
