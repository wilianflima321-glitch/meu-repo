/**
 * Shared contracts for dialogue trees, conditions and UI payloads.
 */

export interface DialogueNode {
  id: string;
  type: 'text' | 'choice' | 'branch' | 'event' | 'set_variable' | 'check_variable';
  speaker?: string;
  text?: string;
  textKey?: string; // For localization
  choices?: DialogueChoice[];
  conditions?: DialogueCondition[];
  events?: DialogueEvent[];
  next?: string | null;
  expression?: string;
  voiceClip?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface DialogueChoice {
  id: string;
  text: string;
  textKey?: string;
  conditions?: DialogueCondition[];
  next: string | null;
  events?: DialogueEvent[];
  visited?: boolean;
}

export interface DialogueCondition {
  type: 'variable' | 'flag' | 'quest' | 'item' | 'stat' | 'custom';
  key: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_contains';
  value: unknown;
}

export interface DialogueEvent {
  type: 'set_variable' | 'set_flag' | 'add_item' | 'remove_item' | 'start_quest' | 'complete_quest' | 'trigger' | 'play_sound' | 'play_animation' | 'custom';
  key?: string;
  value?: unknown;
  params?: Record<string, unknown>;
}

export interface DialogueCharacter {
  id: string;
  name: string;
  nameKey?: string;
  portrait?: string;
  expressions: Record<string, string>;
  voiceId?: string;
  color?: string;
}

export interface DialogueConversation {
  id: string;
  title: string;
  startNode: string;
  nodes: Record<string, DialogueNode>;
  characters: Record<string, DialogueCharacter>;
  variables?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface DialogueState {
  currentConversation: string | null;
  currentNode: string | null;
  isActive: boolean;
  history: { nodeId: string; choiceId?: string }[];
  visitedNodes: Set<string>;
  visitedChoices: Set<string>;
}

export interface DialogueDisplayData {
  speaker: DialogueCharacter | null;
  text: string;
  expression: string;
  voiceClip: string | null;
  choices: {
    id: string;
    text: string;
    available: boolean;
    visited: boolean;
  }[];
  canContinue: boolean;
  isComplete: boolean;
}

