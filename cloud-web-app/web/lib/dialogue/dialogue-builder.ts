import type {
  DialogueCharacter,
  DialogueChoice,
  DialogueCondition,
  DialogueConversation,
  DialogueEvent,
  DialogueNode,
} from './dialogue-contracts';

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
