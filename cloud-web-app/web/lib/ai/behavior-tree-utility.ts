import type { BehaviorContext, NodeStatus } from './behavior-tree-system';

export interface UtilityAction {
  name: string;
  considerations: UtilityConsideration[];
  action: (context: BehaviorContext) => NodeStatus;
}

export interface UtilityConsideration {
  name: string;
  evaluate: (context: BehaviorContext) => number; // Returns 0-1
  weight: number;
}

export class UtilityAI {
  private actions: UtilityAction[] = [];
  private currentAction: UtilityAction | null = null;
  
  addAction(action: UtilityAction): void {
    this.actions.push(action);
  }
  
  removeAction(name: string): void {
    const index = this.actions.findIndex((a) => a.name === name);
    if (index >= 0) {
      this.actions.splice(index, 1);
    }
  }
  
  evaluate(context: BehaviorContext): UtilityAction | null {
    let bestAction: UtilityAction | null = null;
    let bestScore = -Infinity;
    
    for (const action of this.actions) {
      let score = 1;
      
      for (const consideration of action.considerations) {
        const value = consideration.evaluate(context);
        const weighted = Math.pow(value, consideration.weight);
        score *= weighted;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }
    
    return bestAction;
  }
  
  tick(context: BehaviorContext): NodeStatus {
    // Re-evaluate if no current action or current action finished
    if (!this.currentAction) {
      this.currentAction = this.evaluate(context);
    }
    
    if (!this.currentAction) {
      return 'failure';
    }
    
    const status = this.currentAction.action(context);
    
    if (status !== 'running') {
      this.currentAction = null;
    }
    
    return status;
  }
  
  getCurrentAction(): string | null {
    return this.currentAction?.name || null;
  }
}
