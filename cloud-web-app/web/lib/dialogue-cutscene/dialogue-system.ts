import {
  compareOrdered,
  type DialogueAction,
  type DialogueCharacter,
  type DialogueChoice,
  type DialogueCondition,
  type DialogueNode,
  type DialogueState,
  type DialogueTree,
  type DialogueTreeJSON,
  type DialogueValue,
} from './types';

export class DialogueSystem {
  private trees: Map<string, DialogueTree> = new Map();
  private state: DialogueState;
  private currentLanguage: string = 'en';
  
  private onDialogueStart?: (tree: DialogueTree, node: DialogueNode) => void;
  private onDialogueEnd?: (tree: DialogueTree) => void;
  private onNodeChange?: (node: DialogueNode) => void;
  private onChoicesAvailable?: (choices: DialogueChoice[]) => void;
  private onAction?: (action: DialogueAction) => void;
  
  private variableProvider?: (key: string) => DialogueValue;
  private conditionEvaluator?: (condition: DialogueCondition) => boolean;
  private actionHandler?: (action: DialogueAction) => void;
  
  constructor() {
    this.state = {
      currentTreeId: null,
      currentNodeId: null,
      history: [],
      variables: new Map(),
      flags: new Set(),
      relationships: new Map(),
    };
  }
  
  loadTree(tree: DialogueTree): void {
    this.trees.set(tree.id, tree);
  }
  
  loadFromJSON(json: DialogueTreeJSON): DialogueTree {
    const tree: DialogueTree = {
      id: json.id,
      name: json.name,
      startNode: json.startNode,
      nodes: new Map(),
      characters: new Map(),
      variables: new Map(Object.entries(json.variables || {})),
    };
    
    for (const nodeData of json.nodes) {
      tree.nodes.set(nodeData.id, nodeData);
    }
    
    for (const charData of json.characters || []) {
      tree.characters.set(charData.id, {
        ...charData,
        portraits: new Map(Object.entries(charData.portraits || {})),
      });
    }
    
    this.loadTree(tree);
    return tree;
  }
  
  startDialogue(treeId: string): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;
    
    this.state.currentTreeId = treeId;
    this.state.currentNodeId = tree.startNode;
    this.state.history = [];
    
    const startNode = tree.nodes.get(tree.startNode);
    if (startNode) {
      this.onDialogueStart?.(tree, startNode);
      this.processNode(startNode);
    }
    
    return true;
  }
  
  private processNode(node: DialogueNode): void {
    this.state.history.push(node.id);
    this.onNodeChange?.(node);
    
    switch (node.type) {
      case 'dialogue':
        break;
        
      case 'choice':
        const availableChoices = (node.choices || []).filter(
          choice => this.evaluateConditions(choice.conditions)
        );
        this.onChoicesAvailable?.(availableChoices);
        break;
        
      case 'action':
        this.executeActions(node.actions || []);
        if (node.nextNode) {
          this.advanceToNode(node.nextNode);
        }
        break;
        
      case 'condition':
        for (const branch of node.branches || []) {
          if (this.evaluateCondition(branch.condition)) {
            this.advanceToNode(branch.nodeId);
            return;
          }
        }
        if (node.nextNode) {
          this.advanceToNode(node.nextNode);
        }
        break;
        
      case 'random':
        const totalWeight = (node.randomBranches || []).reduce((sum, b) => sum + b.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const branch of node.randomBranches || []) {
          random -= branch.weight;
          if (random <= 0) {
            this.advanceToNode(branch.nodeId);
            return;
          }
        }
        break;
    }
  }
  
  advance(): void {
    const tree = this.getCurrentTree();
    const node = this.getCurrentNode();
    
    if (!tree || !node) return;
    
    if (node.nextNode) {
      this.advanceToNode(node.nextNode);
    } else {
      this.endDialogue();
    }
  }
  
  selectChoice(choiceId: string): void {
    const node = this.getCurrentNode();
    if (!node || node.type !== 'choice') return;
    
    const choice = node.choices?.find(c => c.id === choiceId);
    if (!choice) return;
    
    this.executeActions(choice.consequences || []);
    
    this.advanceToNode(choice.nextNode);
  }
  
  private advanceToNode(nodeId: string): void {
    const tree = this.getCurrentTree();
    if (!tree) return;
    
    const node = tree.nodes.get(nodeId);
    if (node) {
      this.state.currentNodeId = nodeId;
      this.processNode(node);
    } else {
      this.endDialogue();
    }
  }
  
  endDialogue(): void {
    const tree = this.getCurrentTree();
    
    this.state.currentTreeId = null;
    this.state.currentNodeId = null;
    
    if (tree) {
      this.onDialogueEnd?.(tree);
    }
  }
  
  private evaluateConditions(conditions?: DialogueCondition[]): boolean {
    if (!conditions || conditions.length === 0) return true;
    return conditions.every(c => this.evaluateCondition(c));
  }
  
  private evaluateCondition(condition: DialogueCondition): boolean {
    if (this.conditionEvaluator) {
      return this.conditionEvaluator(condition);
    }
    
    let value: DialogueValue;
    
    switch (condition.type) {
      case 'variable':
        value = this.state.variables.get(condition.key) ?? 
                this.variableProvider?.(condition.key);
        break;
      case 'flag':
        value = this.state.flags.has(condition.key);
        break;
      case 'relationship':
        value = this.state.relationships.get(condition.key) ?? 0;
        break;
      default:
        value = this.variableProvider?.(condition.key);
    }
    
    switch (condition.operator) {
      case '==': return value === condition.value;
      case '!=': return value !== condition.value;
      case '>': return compareOrdered(value, condition.value, (left, right) => left > right);
      case '<': return compareOrdered(value, condition.value, (left, right) => left < right);
      case '>=': return compareOrdered(value, condition.value, (left, right) => left >= right);
      case '<=': return compareOrdered(value, condition.value, (left, right) => left <= right);
      case 'has': return value === true || value !== undefined;
      case 'not_has': return value === false || value === undefined;
      default: return false;
    }
  }
  
  private executeActions(actions: DialogueAction[]): void {
    for (const action of actions) {
      this.onAction?.(action);
      
      if (this.actionHandler) {
        this.actionHandler(action);
        continue;
      }
      
      switch (action.type) {
        case 'set_variable':
          this.state.variables.set(action.key!, action.value);
          break;
        case 'set_flag':
          if (action.value) {
            this.state.flags.add(action.key!);
          } else {
            this.state.flags.delete(action.key!);
          }
          break;
        case 'change_relationship':
          const current = this.state.relationships.get(action.target!) ?? 0;
          this.state.relationships.set(action.target!, current + (action.amount ?? 0));
          break;
      }
    }
  }
  
  getCurrentTree(): DialogueTree | undefined {
    return this.state.currentTreeId ? this.trees.get(this.state.currentTreeId) : undefined;
  }
  
  getCurrentNode(): DialogueNode | undefined {
    const tree = this.getCurrentTree();
    return tree && this.state.currentNodeId ? tree.nodes.get(this.state.currentNodeId) : undefined;
  }
  
  getCurrentCharacter(): DialogueCharacter | undefined {
    const tree = this.getCurrentTree();
    const node = this.getCurrentNode();
    return tree && node?.speaker ? tree.characters.get(node.speaker) : undefined;
  }
  
  getText(node?: DialogueNode): string {
    const n = node || this.getCurrentNode();
    if (!n?.text) return '';
    
    if (n.localizedText && n.localizedText[this.currentLanguage]) {
      return n.localizedText[this.currentLanguage];
    }
    
    return n.text;
  }
  
  getChoiceText(choice: DialogueChoice): string {
    if (choice.localizedText && choice.localizedText[this.currentLanguage]) {
      return choice.localizedText[this.currentLanguage];
    }
    return choice.text;
  }
  
  isActive(): boolean {
    return this.state.currentTreeId !== null;
  }
  
  getState(): DialogueState {
    return {
      ...this.state,
      variables: new Map(this.state.variables),
      flags: new Set(this.state.flags),
      relationships: new Map(this.state.relationships),
    };
  }
  
  setState(state: Partial<DialogueState>): void {
    if (state.variables) this.state.variables = new Map(state.variables);
    if (state.flags) this.state.flags = new Set(state.flags);
    if (state.relationships) this.state.relationships = new Map(state.relationships);
  }
  
  setLanguage(language: string): void {
    this.currentLanguage = language;
  }
  
  setVariableProvider(provider: (key: string) => DialogueValue): void {
    this.variableProvider = provider;
  }
  
  setConditionEvaluator(evaluator: (condition: DialogueCondition) => boolean): void {
    this.conditionEvaluator = evaluator;
  }
  
  setActionHandler(handler: (action: DialogueAction) => void): void {
    this.actionHandler = handler;
  }
  
  setOnDialogueStart(callback: (tree: DialogueTree, node: DialogueNode) => void): void {
    this.onDialogueStart = callback;
  }
  
  setOnDialogueEnd(callback: (tree: DialogueTree) => void): void {
    this.onDialogueEnd = callback;
  }
  
  setOnNodeChange(callback: (node: DialogueNode) => void): void {
    this.onNodeChange = callback;
  }
  
  setOnChoicesAvailable(callback: (choices: DialogueChoice[]) => void): void {
    this.onChoicesAvailable = callback;
  }
  
  setOnAction(callback: (action: DialogueAction) => void): void {
    this.onAction = callback;
  }
}
