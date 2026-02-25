/**
 * Runtime primitives used by DialogueManager.
 */
import type { DialogueCharacter, DialogueCondition } from './dialogue-types';

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

