import type { AgentMemory, AgentTask, MemoryEntry } from './agent-mode-contracts';

export class AgentMemoryStore {
  private readonly memory: AgentMemory = {
    shortTerm: [],
    longTerm: [],
    working: new Map(),
  };

  add(type: MemoryEntry['type'], content: string, metadata?: Record<string, unknown>): void {
    const entry: MemoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      metadata,
      timestamp: new Date(),
      relevance: 1.0,
    };

    this.memory.shortTerm.push(entry);

    if (this.memory.shortTerm.length > 100) {
      const oldest = this.memory.shortTerm.shift();
      if (oldest && oldest.relevance > 0.5) this.memory.longTerm.push(oldest);
    }
  }

  relevant(query: string): MemoryEntry[] {
    const allMemory = [...this.memory.shortTerm, ...this.memory.longTerm];
    return allMemory
      .filter((entry) => entry.content.toLowerCase().includes(query.toLowerCase().slice(0, 20)))
      .slice(-10);
  }

  buildContext(task: AgentTask, subtask: AgentTask, iteration: number, maxIterations: number): string {
    const context = [
      `Main task: ${task.description}`,
      `Current subtask: ${subtask.description}`,
      `Progress: ${task.subtasks.filter((item) => item.status === 'completed').length}/${task.subtasks.length}`,
      `Iteration: ${iteration}/${maxIterations}`,
    ];

    this.memory.working.forEach((value, key) => {
      context.push(`${key}: ${JSON.stringify(value)}`);
    });

    return context.join('\n');
  }

  snapshot(): AgentMemory {
    return {
      shortTerm: [...this.memory.shortTerm],
      longTerm: [...this.memory.longTerm],
      working: new Map(this.memory.working),
    };
  }
}
