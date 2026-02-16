/**
 * Dialogue System - Sistema de Diálogos para Jogos
 * 
 * Sistema completo de diálogos com:
 * - Dialogue trees com branching
 * - Conditions e events
 * - Character expressions
 * - Voice over integration
 * - Variables e state tracking
 * - Localization ready
 * 
 * @module lib/dialogue/dialogue-system
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// DIALOGUE VARIABLE STORE
// ============================================================================

export class DialogueVariableStore {
  private variables: Map<string, unknown> = new Map();
  private flags: Set<string> = new Set();
  private persistentKeys: Set<string> = new Set();
  
  setVariable(key: string, value: unknown, persistent = false): void {
    this.variables.set(key, value);
    if (persistent) {
      this.persistentKeys.add(key);
    }
  }
  
  getVariable<T>(key: string, defaultValue?: T): T {
    return (this.variables.get(key) ?? defaultValue) as T;
  }
  
  hasVariable(key: string): boolean {
    return this.variables.has(key);
  }
  
  deleteVariable(key: string): void {
    this.variables.delete(key);
    this.persistentKeys.delete(key);
  }
  
  setFlag(flag: string): void {
    this.flags.add(flag);
  }
  
  clearFlag(flag: string): void {
    this.flags.delete(flag);
  }
  
  hasFlag(flag: string): boolean {
    return this.flags.has(flag);
  }
  
  incrementVariable(key: string, amount = 1): void {
    const current = this.getVariable<number>(key, 0);
    this.setVariable(key, current + amount);
  }
  
  decrementVariable(key: string, amount = 1): void {
    const current = this.getVariable<number>(key, 0);
    this.setVariable(key, current - amount);
  }
  
  clear(persistentOnly = false): void {
    if (persistentOnly) {
      for (const key of this.variables.keys()) {
        if (!this.persistentKeys.has(key)) {
          this.variables.delete(key);
        }
      }
    } else {
      this.variables.clear();
      this.flags.clear();
      this.persistentKeys.clear();
    }
  }
  
  serialize(): { variables: Record<string, unknown>; flags: string[]; persistent: string[] } {
    const variables: Record<string, unknown> = {};
    for (const [key, value] of this.variables) {
      variables[key] = value;
    }
    
    return {
      variables,
      flags: Array.from(this.flags),
      persistent: Array.from(this.persistentKeys),
    };
  }
  
  deserialize(data: { variables: Record<string, unknown>; flags: string[]; persistent: string[] }): void {
    this.clear();
    
    for (const [key, value] of Object.entries(data.variables)) {
      this.variables.set(key, value);
    }
    
    for (const flag of data.flags) {
      this.flags.add(flag);
    }
    
    for (const key of data.persistent) {
      this.persistentKeys.add(key);
    }
  }
}

// ============================================================================
// CONDITION EVALUATOR
// ============================================================================

export class ConditionEvaluator {
  private variableStore: DialogueVariableStore;
  private customEvaluators: Map<string, (condition: DialogueCondition) => boolean> = new Map();
  
  constructor(variableStore: DialogueVariableStore) {
    this.variableStore = variableStore;
  }
  
  registerCustomEvaluator(type: string, evaluator: (condition: DialogueCondition) => boolean): void {
    this.customEvaluators.set(type, evaluator);
  }
  
  evaluate(condition: DialogueCondition): boolean {
    switch (condition.type) {
      case 'variable':
        return this.evaluateVariable(condition);
      case 'flag':
        return this.evaluateFlag(condition);
      case 'custom':
        return this.evaluateCustom(condition);
      default:
        // For quest, item, stat - these would need external integration
        const customEvaluator = this.customEvaluators.get(condition.type);
        if (customEvaluator) {
          return customEvaluator(condition);
        }
        console.warn(`Unknown condition type: ${condition.type}`);
        return true;
    }
  }
  
  evaluateAll(conditions: DialogueCondition[]): boolean {
    return conditions.every((condition) => this.evaluate(condition));
  }
  
  private evaluateVariable(condition: DialogueCondition): boolean {
    const actual = this.variableStore.getVariable(condition.key);
    return this.compareValues(actual, condition.operator, condition.value);
  }
  
  private evaluateFlag(condition: DialogueCondition): boolean {
    const hasFlag = this.variableStore.hasFlag(condition.key);
    
    if (condition.operator === '==' && condition.value === true) {
      return hasFlag;
    }
    if (condition.operator === '==' && condition.value === false) {
      return !hasFlag;
    }
    if (condition.operator === '!=') {
      return hasFlag !== condition.value;
    }
    
    return hasFlag;
  }
  
  private evaluateCustom(condition: DialogueCondition): boolean {
    const evaluator = this.customEvaluators.get(condition.key);
    if (evaluator) {
      return evaluator(condition);
    }
    return true;
  }
  
  private compareValues(actual: unknown, operator: string, expected: unknown): boolean {
    switch (operator) {
      case '==':
        return actual === expected;
      case '!=':
        return actual !== expected;
      case '>':
        return (actual as number) > (expected as number);
      case '<':
        return (actual as number) < (expected as number);
      case '>=':
        return (actual as number) >= (expected as number);
      case '<=':
        return (actual as number) <= (expected as number);
      case 'contains':
        if (Array.isArray(actual)) {
          return actual.includes(expected);
        }
        if (typeof actual === 'string') {
          return actual.includes(expected as string);
        }
        return false;
      case 'not_contains':
        if (Array.isArray(actual)) {
          return !actual.includes(expected);
        }
        if (typeof actual === 'string') {
          return !actual.includes(expected as string);
        }
        return true;
      default:
        return actual === expected;
    }
  }
}

// ============================================================================
// TEXT PROCESSOR
// ============================================================================

export class DialogueTextProcessor {
  private variableStore: DialogueVariableStore;
  private localizationFn: ((key: string) => string) | null = null;
  
  constructor(variableStore: DialogueVariableStore) {
    this.variableStore = variableStore;
  }
  
  setLocalizationFunction(fn: (key: string) => string): void {
    this.localizationFn = fn;
  }
  
  processText(text: string, textKey?: string): string {
    // Get localized text if available
    let processedText = text;
    
    if (textKey && this.localizationFn) {
      const localized = this.localizationFn(textKey);
      if (localized !== textKey) {
        processedText = localized;
      }
    }
    
    // Replace variables in text {variable_name}
    processedText = processedText.replace(/\{(\w+)\}/g, (match, varName) => {
      const value = this.variableStore.getVariable(varName);
      return value !== undefined ? String(value) : match;
    });
    
    // Replace conditional text [condition?true_text:false_text]
    processedText = processedText.replace(/\[(\w+)\?([^:]*):([^\]]*)\]/g, (match, varName, trueText, falseText) => {
      const value = this.variableStore.getVariable(varName);
      return value ? trueText : falseText;
    });
    
    return processedText;
  }
  
  processCharacterName(character: DialogueCharacter): string {
    if (character.nameKey && this.localizationFn) {
      const localized = this.localizationFn(character.nameKey);
      if (localized !== character.nameKey) {
        return localized;
      }
    }
    return character.name;
  }
}

// ============================================================================
// DIALOGUE MANAGER
// ============================================================================

export class DialogueManager extends EventEmitter {
  private conversations: Map<string, DialogueConversation> = new Map();
  private variableStore: DialogueVariableStore;
  private conditionEvaluator: ConditionEvaluator;
  private textProcessor: DialogueTextProcessor;
  
  private state: DialogueState = {
    currentConversation: null,
    currentNode: null,
    isActive: false,
    history: [],
    visitedNodes: new Set(),
    visitedChoices: new Set(),
  };
  
  private typewriterSpeed = 50;
  private autoAdvanceDelay = 2000;
  private isTyping = false;
  private currentText = '';
  private displayedText = '';
  private typewriterInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    super();
    this.variableStore = new DialogueVariableStore();
    this.conditionEvaluator = new ConditionEvaluator(this.variableStore);
    this.textProcessor = new DialogueTextProcessor(this.variableStore);
  }
  
  // ============================================================================
  // CONVERSATION MANAGEMENT
  // ============================================================================
  
  loadConversation(conversation: DialogueConversation): void {
    this.conversations.set(conversation.id, conversation);
    
    // Initialize conversation-local variables
    if (conversation.variables) {
      for (const [key, value] of Object.entries(conversation.variables)) {
        this.variableStore.setVariable(`${conversation.id}.${key}`, value);
      }
    }
    
    this.emit('conversationLoaded', { conversationId: conversation.id });
  }
  
  unloadConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
    this.emit('conversationUnloaded', { conversationId });
  }
  
  getConversation(conversationId: string): DialogueConversation | undefined {
    return this.conversations.get(conversationId);
  }
  
  // ============================================================================
  // DIALOGUE FLOW
  // ============================================================================
  
  startConversation(conversationId: string, startNodeOverride?: string): boolean {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      console.error(`Conversation not found: ${conversationId}`);
      return false;
    }
    
    this.state = {
      currentConversation: conversationId,
      currentNode: startNodeOverride || conversation.startNode,
      isActive: true,
      history: [],
      visitedNodes: new Set(),
      visitedChoices: new Set(),
    };
    
    this.emit('conversationStarted', { conversationId });
    this.processCurrentNode();
    
    return true;
  }
  
  endConversation(): void {
    if (!this.state.isActive) return;
    
    this.stopTypewriter();
    
    const conversationId = this.state.currentConversation;
    
    this.state = {
      currentConversation: null,
      currentNode: null,
      isActive: false,
      history: this.state.history,
      visitedNodes: this.state.visitedNodes,
      visitedChoices: this.state.visitedChoices,
    };
    
    this.emit('conversationEnded', { conversationId });
  }
  
  continue(): void {
    if (!this.state.isActive || !this.state.currentNode) return;
    
    // If still typing, complete the text
    if (this.isTyping) {
      this.completeTypewriter();
      return;
    }
    
    const node = this.getCurrentNode();
    if (!node) return;
    
    // If this is a choice node, don't auto-continue
    if (node.type === 'choice' && node.choices && node.choices.length > 0) {
      return;
    }
    
    this.advanceToNode(node.next);
  }
  
  selectChoice(choiceId: string): void {
    if (!this.state.isActive) return;
    
    const node = this.getCurrentNode();
    if (!node || node.type !== 'choice' || !node.choices) return;
    
    const choice = node.choices.find((c) => c.id === choiceId);
    if (!choice) return;
    
    // Check conditions
    if (choice.conditions && !this.conditionEvaluator.evaluateAll(choice.conditions)) {
      return;
    }
    
    // Execute choice events
    if (choice.events) {
      for (const event of choice.events) {
        this.executeEvent(event);
      }
    }
    
    // Mark choice as visited
    this.state.visitedChoices.add(`${this.state.currentConversation}.${node.id}.${choiceId}`);
    
    // Record history
    this.state.history.push({ nodeId: node.id, choiceId });
    
    this.emit('choiceSelected', { nodeId: node.id, choiceId, choice });
    
    this.advanceToNode(choice.next);
  }
  
  private advanceToNode(nextNodeId: string | null | undefined): void {
    if (!nextNodeId) {
      this.endConversation();
      return;
    }
    
    this.state.currentNode = nextNodeId;
    this.state.visitedNodes.add(`${this.state.currentConversation}.${nextNodeId}`);
    
    this.processCurrentNode();
  }
  
  private processCurrentNode(): void {
    const node = this.getCurrentNode();
    if (!node) {
      this.endConversation();
      return;
    }
    
    // Execute node events
    if (node.events) {
      for (const event of node.events) {
        this.executeEvent(event);
      }
    }
    
    switch (node.type) {
      case 'text':
      case 'choice':
        this.displayNode(node);
        break;
        
      case 'branch':
        this.processBranchNode(node);
        break;
        
      case 'set_variable':
        this.processSetVariableNode(node);
        break;
        
      case 'check_variable':
        this.processCheckVariableNode(node);
        break;
        
      case 'event':
        this.processEventNode(node);
        break;
    }
  }
  
  private displayNode(node: DialogueNode): void {
    const conversation = this.getCurrentConversation();
    if (!conversation) return;
    
    const speaker = node.speaker ? conversation.characters[node.speaker] : null;
    const text = node.text ? this.textProcessor.processText(node.text, node.textKey) : '';
    
    this.currentText = text;
    this.displayedText = '';
    
    // Start typewriter effect
    this.startTypewriter();
    
    this.emit('nodeDisplayed', {
      node,
      speaker,
      text,
      expression: node.expression || 'default',
      voiceClip: node.voiceClip,
    });
  }
  
  private processBranchNode(node: DialogueNode): void {
    if (!node.conditions || node.conditions.length === 0) {
      this.advanceToNode(node.next);
      return;
    }
    
    // Find first matching condition
    // Branch nodes have conditions in choices for multiple paths
    if (node.choices) {
      for (const choice of node.choices) {
        if (!choice.conditions || this.conditionEvaluator.evaluateAll(choice.conditions)) {
          this.advanceToNode(choice.next);
          return;
        }
      }
    }
    
    // Default path if no conditions match
    this.advanceToNode(node.next);
  }
  
  private processSetVariableNode(node: DialogueNode): void {
    if (node.metadata?.variable && node.metadata?.value !== undefined) {
      this.variableStore.setVariable(
        node.metadata.variable as string,
        node.metadata.value
      );
    }
    this.advanceToNode(node.next);
  }
  
  private processCheckVariableNode(node: DialogueNode): void {
    if (!node.conditions || !node.choices) {
      this.advanceToNode(node.next);
      return;
    }
    
    // First choice is "true" path, second is "false" path
    const conditionsMet = this.conditionEvaluator.evaluateAll(node.conditions);
    const choice = conditionsMet ? node.choices[0] : node.choices[1];
    
    if (choice) {
      this.advanceToNode(choice.next);
    } else {
      this.advanceToNode(node.next);
    }
  }
  
  private processEventNode(node: DialogueNode): void {
    // Events already executed, just advance
    this.advanceToNode(node.next);
  }
  
  // ============================================================================
  // TYPEWRITER
  // ============================================================================
  
  private startTypewriter(): void {
    this.stopTypewriter();
    this.isTyping = true;
    
    let charIndex = 0;
    
    this.typewriterInterval = setInterval(() => {
      if (charIndex < this.currentText.length) {
        this.displayedText = this.currentText.substring(0, charIndex + 1);
        charIndex++;
        this.emit('textUpdated', { text: this.displayedText, complete: false });
      } else {
        this.completeTypewriter();
      }
    }, this.typewriterSpeed);
  }
  
  private stopTypewriter(): void {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    this.isTyping = false;
  }
  
  private completeTypewriter(): void {
    this.stopTypewriter();
    this.displayedText = this.currentText;
    this.emit('textUpdated', { text: this.displayedText, complete: true });
  }
  
  setTypewriterSpeed(charsPerSecond: number): void {
    this.typewriterSpeed = 1000 / charsPerSecond;
  }
  
  // ============================================================================
  // EVENTS
  // ============================================================================
  
  private executeEvent(event: DialogueEvent): void {
    switch (event.type) {
      case 'set_variable':
        if (event.key) {
          this.variableStore.setVariable(event.key, event.value);
        }
        break;
        
      case 'set_flag':
        if (event.key) {
          if (event.value === false) {
            this.variableStore.clearFlag(event.key);
          } else {
            this.variableStore.setFlag(event.key);
          }
        }
        break;
        
      case 'trigger':
      case 'play_sound':
      case 'play_animation':
      case 'add_item':
      case 'remove_item':
      case 'start_quest':
      case 'complete_quest':
      case 'custom':
        this.emit('dialogueEvent', { event });
        break;
    }
  }
  
  registerEventHandler(eventType: string, handler: (event: DialogueEvent) => void): void {
    this.on(`event:${eventType}`, handler);
  }
  
  // ============================================================================
  // GETTERS
  // ============================================================================
  
  getCurrentConversation(): DialogueConversation | undefined {
    if (!this.state.currentConversation) return undefined;
    return this.conversations.get(this.state.currentConversation);
  }
  
  getCurrentNode(): DialogueNode | undefined {
    const conversation = this.getCurrentConversation();
    if (!conversation || !this.state.currentNode) return undefined;
    return conversation.nodes[this.state.currentNode];
  }
  
  getDisplayData(): DialogueDisplayData | null {
    if (!this.state.isActive) return null;
    
    const node = this.getCurrentNode();
    const conversation = this.getCurrentConversation();
    
    if (!node || !conversation) return null;
    
    const speaker = node.speaker ? conversation.characters[node.speaker] : null;
    
    let choices: DialogueDisplayData['choices'] = [];
    
    if (node.type === 'choice' && node.choices) {
      choices = node.choices.map((choice) => {
        const available = !choice.conditions || this.conditionEvaluator.evaluateAll(choice.conditions);
        const visitedKey = `${this.state.currentConversation}.${node.id}.${choice.id}`;
        
        return {
          id: choice.id,
          text: this.textProcessor.processText(choice.text, choice.textKey),
          available,
          visited: this.state.visitedChoices.has(visitedKey),
        };
      });
    }
    
    return {
      speaker,
      text: this.displayedText,
      expression: node.expression || 'default',
      voiceClip: node.voiceClip || null,
      choices,
      canContinue: !this.isTyping && (node.type !== 'choice' || choices.length === 0),
      isComplete: !this.isTyping,
    };
  }
  
  isActive(): boolean {
    return this.state.isActive;
  }
  
  getState(): DialogueState {
    return { ...this.state };
  }
  
  getVariableStore(): DialogueVariableStore {
    return this.variableStore;
  }
  
  getHistory(): { nodeId: string; choiceId?: string }[] {
    return [...this.state.history];
  }
  
  hasVisitedNode(conversationId: string, nodeId: string): boolean {
    return this.state.visitedNodes.has(`${conversationId}.${nodeId}`);
  }
  
  hasVisitedChoice(conversationId: string, nodeId: string, choiceId: string): boolean {
    return this.state.visitedChoices.has(`${conversationId}.${nodeId}.${choiceId}`);
  }
  
  // ============================================================================
  // SERIALIZATION
  // ============================================================================
  
  serialize(): {
    variables: ReturnType<DialogueVariableStore['serialize']>;
    visitedNodes: string[];
    visitedChoices: string[];
  } {
    return {
      variables: this.variableStore.serialize(),
      visitedNodes: Array.from(this.state.visitedNodes),
      visitedChoices: Array.from(this.state.visitedChoices),
    };
  }
  
  deserialize(data: ReturnType<DialogueManager['serialize']>): void {
    this.variableStore.deserialize(data.variables);
    this.state.visitedNodes = new Set(data.visitedNodes);
    this.state.visitedChoices = new Set(data.visitedChoices);
  }
  
  // ============================================================================
  // LOCALIZATION
  // ============================================================================
  
  setLocalizationFunction(fn: (key: string) => string): void {
    this.textProcessor.setLocalizationFunction(fn);
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  registerConditionEvaluator(type: string, evaluator: (condition: DialogueCondition) => boolean): void {
    this.conditionEvaluator.registerCustomEvaluator(type, evaluator);
  }
  
  dispose(): void {
    this.endConversation();
    this.conversations.clear();
    this.variableStore.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// DIALOGUE BUILDER (FLUENT API)
// ============================================================================

export class DialogueBuilder {
  private conversation: DialogueConversation;
  private currentNodeId: string | null = null;
  
  constructor(id: string, title: string) {
    this.conversation = {
      id,
      title,
      startNode: '',
      nodes: {},
      characters: {},
    };
  }
  
  addCharacter(id: string, name: string, options?: Partial<Omit<DialogueCharacter, 'id' | 'name'>>): this {
    this.conversation.characters[id] = {
      id,
      name,
      expressions: { default: '' },
      ...options,
    };
    return this;
  }
  
  addNode(id: string, type: DialogueNode['type'], options: Partial<Omit<DialogueNode, 'id' | 'type'>> = {}): this {
    this.conversation.nodes[id] = {
      id,
      type,
      ...options,
    };
    this.currentNodeId = id;
    
    if (!this.conversation.startNode) {
      this.conversation.startNode = id;
    }
    
    return this;
  }
  
  text(speaker: string, text: string, options?: Partial<DialogueNode>): this {
    const id = `node_${Object.keys(this.conversation.nodes).length + 1}`;
    return this.addNode(id, 'text', { speaker, text, ...options });
  }
  
  choice(speaker: string, text: string, choices: DialogueChoice[]): this {
    const id = `node_${Object.keys(this.conversation.nodes).length + 1}`;
    return this.addNode(id, 'choice', { speaker, text, choices });
  }
  
  branch(conditions: DialogueCondition[], truePath: string, falsePath: string): this {
    const id = `node_${Object.keys(this.conversation.nodes).length + 1}`;
    return this.addNode(id, 'branch', {
      conditions,
      choices: [
        { id: 'true', text: '', next: truePath },
        { id: 'false', text: '', next: falsePath },
      ],
    });
  }
  
  setVariable(key: string, value: unknown): this {
    const id = `node_${Object.keys(this.conversation.nodes).length + 1}`;
    return this.addNode(id, 'set_variable', {
      metadata: { variable: key, value },
    });
  }
  
  event(events: DialogueEvent[]): this {
    const id = `node_${Object.keys(this.conversation.nodes).length + 1}`;
    return this.addNode(id, 'event', { events });
  }
  
  next(nodeId: string): this {
    if (this.currentNodeId) {
      this.conversation.nodes[this.currentNodeId].next = nodeId;
    }
    return this;
  }
  
  end(): this {
    if (this.currentNodeId) {
      this.conversation.nodes[this.currentNodeId].next = null;
    }
    return this;
  }
  
  setStartNode(nodeId: string): this {
    this.conversation.startNode = nodeId;
    return this;
  }
  
  build(): DialogueConversation {
    return this.conversation;
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useRef, useEffect, useContext, createContext, useCallback } from 'react';

const DialogueContext = createContext<DialogueManager | null>(null);

export function DialogueProvider({ children }: { children: React.ReactNode }) {
  const managerRef = useRef<DialogueManager>(new DialogueManager());
  
  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      manager.dispose();
    };
  }, []);
  
  return (
    <DialogueContext.Provider value={managerRef.current}>
      {children}
    </DialogueContext.Provider>
  );
}

export function useDialogue() {
  const manager = useContext(DialogueContext);
  if (!manager) {
    throw new Error('useDialogue must be used within a DialogueProvider');
  }
  
  const [displayData, setDisplayData] = useState<DialogueDisplayData | null>(null);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    const updateDisplay = () => {
      setDisplayData(manager.getDisplayData());
      setIsActive(manager.isActive());
    };
    
    manager.on('conversationStarted', updateDisplay);
    manager.on('conversationEnded', updateDisplay);
    manager.on('nodeDisplayed', updateDisplay);
    manager.on('textUpdated', updateDisplay);
    manager.on('choiceSelected', updateDisplay);
    
    return () => {
      manager.off('conversationStarted', updateDisplay);
      manager.off('conversationEnded', updateDisplay);
      manager.off('nodeDisplayed', updateDisplay);
      manager.off('textUpdated', updateDisplay);
      manager.off('choiceSelected', updateDisplay);
    };
  }, [manager]);
  
  const startConversation = useCallback((conversationId: string, startNode?: string) => {
    return manager.startConversation(conversationId, startNode);
  }, [manager]);
  
  const continueDialogue = useCallback(() => {
    manager.continue();
  }, [manager]);
  
  const selectChoice = useCallback((choiceId: string) => {
    manager.selectChoice(choiceId);
  }, [manager]);
  
  const endConversation = useCallback(() => {
    manager.endConversation();
  }, [manager]);
  
  return {
    manager,
    displayData,
    isActive,
    startConversation,
    continue: continueDialogue,
    selectChoice,
    endConversation,
    loadConversation: manager.loadConversation.bind(manager),
    setVariable: manager.getVariableStore().setVariable.bind(manager.getVariableStore()),
    getVariable: manager.getVariableStore().getVariable.bind(manager.getVariableStore()),
    setFlag: manager.getVariableStore().setFlag.bind(manager.getVariableStore()),
    hasFlag: manager.getVariableStore().hasFlag.bind(manager.getVariableStore()),
  };
}

export function useDialogueEvents(eventType: string, handler: (event: DialogueEvent) => void) {
  const { manager } = useDialogue();
  
  useEffect(() => {
    const wrappedHandler = ({ event }: { event: DialogueEvent }) => {
      if (event.type === eventType || eventType === '*') {
        handler(event);
      }
    };
    
    manager.on('dialogueEvent', wrappedHandler);
    
    return () => {
      manager.off('dialogueEvent', wrappedHandler);
    };
  }, [manager, eventType, handler]);
}

const __defaultExport = {
  DialogueManager,
  DialogueBuilder,
  DialogueVariableStore,
  DialogueProvider,
  useDialogue,
  useDialogueEvents,
};

export default __defaultExport;
