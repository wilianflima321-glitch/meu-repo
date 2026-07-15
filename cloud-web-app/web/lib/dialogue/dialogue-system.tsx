import { logger } from '@/lib/observability/logger';
/**
 * Dialogue System
 *
 * Runtime for branching conversations, conditions, events, character
 * expressions, voice hooks, variables, state tracking, and localization.
 *
 * @module lib/dialogue/dialogue-system
 */

import { EventEmitter } from 'events';
import { DialogueBuilder } from './dialogue-builder';
import { createDialogueDisplayData } from './dialogue-display';
import { ConditionEvaluator, DialogueTextProcessor, DialogueVariableStore } from './dialogue-runtime-parts';
import { DialogueTypewriter } from './dialogue-typewriter';
import type {
  DialogueCharacter,
  DialogueChoice,
  DialogueCondition,
  DialogueConversation,
  DialogueDisplayData,
  DialogueEvent,
  DialogueNode,
  DialogueState,
} from './dialogue-contracts';
export { DialogueBuilder } from './dialogue-builder';
export { ConditionEvaluator, DialogueTextProcessor, DialogueVariableStore } from './dialogue-runtime-parts';
export type {
  DialogueCharacter,
  DialogueChoice,
  DialogueCondition,
  DialogueConversation,
  DialogueDisplayData,
  DialogueEvent,
  DialogueNode,
  DialogueState,
} from './dialogue-contracts';

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

  private autoAdvanceDelay = 2000;
  private typewriter = new DialogueTypewriter();

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
      logger.error(`Conversation not found: ${conversationId}`);
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
    if (this.typewriter.isTyping()) {
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

    // Start typewriter effect
    this.startTypewriter(text);

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

  private startTypewriter(text: string): void {
    this.typewriter.start(text, (displayedText, complete) => {
      this.emit('textUpdated', { text: displayedText, complete });
    });
  }

  private stopTypewriter(): void {
    this.typewriter.stop();
  }

  private completeTypewriter(): void {
    this.typewriter.complete((displayedText, complete) => {
      this.emit('textUpdated', { text: displayedText, complete });
    });
  }

  setTypewriterSpeed(charsPerSecond: number): void {
    this.typewriter.setCharsPerSecond(charsPerSecond);
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

    return createDialogueDisplayData({
      isTyping: this.typewriter.isTyping(),
      displayedText: this.typewriter.getDisplayedText(),
      state: this.state,
      node,
      conversation,
      conditionEvaluator: this.conditionEvaluator,
      textProcessor: this.textProcessor,
    });
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
// REACT HOOKS
// ============================================================================

import { DialogueProvider, useDialogue, useDialogueEvents } from './dialogue-react';
export { DialogueProvider, useDialogue, useDialogueEvents } from './dialogue-react';

const __defaultExport = {
  DialogueManager,
  DialogueBuilder,
  DialogueVariableStore,
  DialogueProvider,
  useDialogue,
  useDialogueEvents,
};

export default __defaultExport;
