/**
 * Aethel Agent Mode - Autonomous AI Agent
 *
 * Autonomous agent runtime aligned with Manus/Devin-grade workflows:
 * - Task decomposition e planning
 * - Tool orchestration
 * - Self-correction e retry logic
 * - Memory management
 * - Progress reporting
 * - Human-in-the-loop controls
 */

import { executeTool } from '@/lib/ai-tools-registry';
import { EventEmitter } from 'events';

import type {
  AgentTask,
  AgentStep,
  ToolCall,
  AgentMemory,
  MemoryEntry,
  AgentConfig,
  AgentToolContextProvider,
  AgentAction,
  AgentPlan,
  AgentThinking,
  AgentReflection,
  AgentToolDescriptor
} from './agent-mode-contracts';

import { planAgentTask, reflectAgentAction, thinkAgentNextStep } from './agent-mode-ai-phases';
import { AgentMemoryStore } from './agent-mode-memory';
import { reviewAgentExecution } from './agent-mode-review';
import { getAvailableAgentTools } from './agent-mode-tools';

export type {
  AgentTask,
  AgentStep,
  ToolCall,
  AgentMemory,
  MemoryEntry,
  AgentConfig,
  AgentToolContextProvider,
  AgentAction
} from './agent-mode-contracts';

// ============================================================================
// AUTONOMOUS AGENT CLASS
// ============================================================================

export class AutonomousAgent extends EventEmitter {
  private config: AgentConfig;
  private toolContextProvider: AgentToolContextProvider | null = null;
  private memoryStore: AgentMemoryStore;
  private currentTask: AgentTask | null = null;
  private steps: AgentStep[] = [];
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private iterationCount: number = 0;

  constructor(config: Partial<AgentConfig> = {}) {
    super();

    this.config = {
      maxIterations: config.maxIterations || 50,
      maxRetries: config.maxRetries || 3,
      thinkingBudget: config.thinkingBudget || 4000,
      autonomyLevel: config.autonomyLevel || 'semi-autonomous',
      requireApproval: config.requireApproval ?? true,
      enableSelfCorrection: config.enableSelfCorrection ?? true,
      enableParallelExecution: config.enableParallelExecution ?? false,
      model: config.model || 'gpt-4',
    };

    this.toolContextProvider = config.toolContextProvider || null;

    this.memoryStore = new AgentMemoryStore();
  }

  /**
   * Starts task execution
   */
  async execute(taskDescription: string): Promise<AgentTask> {
    const task: AgentTask = {
      id: this.generateId(),
      description: taskDescription,
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
      subtasks: [],
    };

    this.currentTask = task;
    this.isRunning = true;
    this.iterationCount = 0;
    this.steps = [];

    this.emit('task:started', task);

    try {
      // Phase 1: Planning
      task.status = 'planning';
      this.emit('task:planning', task);

      const plan = await this.planTask(task);
      task.subtasks = plan.subtasks.map(st => ({
        id: st.id,
        description: st.description,
        status: 'pending' as const,
        priority: 'medium' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        subtasks: [],
      }));

      this.addMemory('fact', `Plan created: ${plan.approach}`, { plan });

      // Phase 2: Execution
      task.status = 'executing';
      this.emit('task:executing', task);

      await this.executeTaskLoop(task, plan);

      // Phase 3: Review
      task.status = 'reviewing';
      this.emit('task:reviewing', task);

      const review = reviewAgentExecution(task, this.steps, this.iterationCount);

      if (review.success) {
        task.status = 'completed';
        task.completedAt = new Date();
        task.result = review.result;
        this.emit('task:completed', task);
      } else {
        task.status = 'failed';
        task.error = review.error;
        this.emit('task:failed', task);
      }

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('task:failed', task);
    } finally {
      this.isRunning = false;
      task.updatedAt = new Date();
    }

    return task;
  }

  /**
   * Planning phase - decomposes the task
   */
  private async planTask(task: AgentTask): Promise<AgentPlan> {
    return planAgentTask({
      addStep: (taskId, type, content) => this.addStep(taskId, type, content),
      onPlanned: (plan) => this.emit('agent:planned', { task, plan }),
      task,
      thinkingBudget: this.config.thinkingBudget,
      tools: this.getAvailableTools(),
    });
  }

  /**
   * Main execution loop
   */
  private async executeTaskLoop(task: AgentTask, plan: AgentPlan): Promise<void> {
    while (this.isRunning && !this.isPaused && this.iterationCount < this.config.maxIterations) {
      this.iterationCount++;

      // Check if all subtasks are complete
      const pendingSubtasks = task.subtasks.filter(st => st.status !== 'completed');
      if (pendingSubtasks.length === 0) {
        break;
      }

      // Get current subtask
      const currentSubtask = pendingSubtasks[0];
      currentSubtask.status = 'executing';

      // Think about next action
      const thinking = await this.think(task, currentSubtask);

      this.emit('agent:thinking', { task, thinking });

      // Request approval if needed
      if (this.config.requireApproval && thinking.action.type === 'tool_call') {
        const approved = await this.requestApproval(thinking);
        if (!approved) {
          this.isPaused = true;
          this.emit('agent:paused', { reason: 'User declined approval' });
          break;
        }
      }

      // Execute action
      if (thinking.action.type === 'tool_call') {
        const result = await this.executeToolCall(task.id, thinking.action);

        // Reflect on result
        const reflection = await this.reflect(task, thinking.action, result);

        this.emit('agent:reflected', { task, reflection });

        // Handle reflection outcome
        if (reflection.nextAction === 'complete') {
          currentSubtask.status = 'completed';
          currentSubtask.completedAt = new Date();
        } else if (reflection.nextAction === 'abort') {
          currentSubtask.status = 'failed';
          currentSubtask.error = reflection.issues.join(', ');
          break;
        } else if (reflection.nextAction === 'retry' && this.config.enableSelfCorrection) {
          // Self-correction
          await this.selfCorrect(task, reflection);
        }

      } else if (thinking.action.type === 'ask_human') {
        this.isPaused = true;
        this.emit('agent:needs_input', {
          task,
          question: thinking.action.reason
        });
        break;

      } else if (thinking.action.type === 'complete') {
        currentSubtask.status = 'completed';
        currentSubtask.completedAt = new Date();

      } else if (thinking.action.type === 'error') {
        currentSubtask.status = 'failed';
        currentSubtask.error = thinking.action.reason;
        break;
      }

      // Progress update
      const completed = task.subtasks.filter(st => st.status === 'completed').length;
      const progress = Math.round((completed / task.subtasks.length) * 100);

      this.emit('agent:progress', { task, progress, iteration: this.iterationCount });
    }

    if (this.iterationCount >= this.config.maxIterations) {
      this.emit('agent:max_iterations', { task, iterations: this.iterationCount });
    }
  }

  /**
   * Thinks about the next step
   */
  private async think(task: AgentTask, subtask: AgentTask): Promise<AgentThinking> {
    return thinkAgentNextStep({
      addStep: (taskId, type, content) => this.addStep(taskId, type, content),
      context: this.buildContext(task, subtask),
      memory: this.getRelevantMemory(subtask.description),
      subtask,
      task,
      tools: this.getAvailableTools(),
    });
  }

  /**
   * Executa uma chamada de ferramenta
   */
  private async executeToolCall(taskId: string, action: AgentAction): Promise<unknown> {
    if (!action.tool) {
      return { error: 'Missing tool name' };
    }

    const providedContext = await this.resolveToolContext(action)
    const input = {
      ...(action.input || {}),
      ...(providedContext || {}),
    };
    const step = this.addStep(taskId, 'execute', `Executing ${action.tool}...`);

    const toolCall: ToolCall = {
      id: this.generateId(),
      tool: action.tool,
      input,
      status: 'running',
      startTime: new Date(),
    };

    step.toolCalls = [toolCall];

    this.emit('tool:started', toolCall);

    try {
      const result = await executeTool(action.tool, input);

      toolCall.status = 'success';
      toolCall.output = result;
      toolCall.endTime = new Date();

      this.emit('tool:completed', toolCall);

      this.addMemory('success', `Tool ${action.tool} executed successfully`, {
        tool: action.tool,
        input,
        output: result,
      });

      return result;
    } catch (error) {
      toolCall.status = 'failed';
      toolCall.error = error instanceof Error ? error.message : 'Unknown error';
      toolCall.endTime = new Date();

      this.emit('tool:failed', toolCall);

      this.addMemory('error', `Tool ${action.tool} failed: ${toolCall.error}`, {
        tool: action.tool,
        input,
        error: toolCall.error,
      });

      return { error: toolCall.error };
    }
  }

  private async resolveToolContext(
    action: AgentAction
  ): Promise<Record<string, unknown> | null> {
    if (!this.toolContextProvider) {
      return null
    }

    try {
      const context = await this.toolContextProvider(action)
      if (!context || typeof context !== 'object') {
        return null
      }
      return context
    } catch (error) {
      this.addMemory('error', `Tool context provider failed: ${error instanceof Error ? error.message : 'unknown'}`)
      return null
    }
  }

  /**
   * Reflects on an action result
   */
  private async reflect(task: AgentTask, action: AgentAction, result: unknown): Promise<AgentReflection> {
    return reflectAgentAction({
      action,
      addStep: (taskId, type, content) => this.addStep(taskId, type, content),
      result,
      steps: this.steps,
      task,
    });
  }

  /**
   * Self-correction after failure
   */
  private async selfCorrect(task: AgentTask, reflection: AgentReflection): Promise<void> {
    const step = this.addStep(task.id, 'correct', 'Applying self-correction...');

    this.addMemory('decision', `Self-correction: ${reflection.adjustments}`, {
      issues: reflection.issues,
      corrections: reflection.corrections,
    });

    step.content = `Corrections applied: ${reflection.corrections.join(', ')}`;

    this.emit('agent:self_corrected', { task, reflection });
  }

  /**
   * Requests user approval
   */
  private async requestApproval(thinking: AgentThinking): Promise<boolean> {
    return new Promise((resolve) => {
      this.emit('agent:approval_needed', {
        action: thinking.action,
        thinking: thinking.thinking,
        confidence: thinking.confidence,
        approve: () => resolve(true),
        reject: () => resolve(false),
      });

      // Auto-approve in autonomous mode
      if (this.config.autonomyLevel === 'autonomous') {
        setTimeout(() => resolve(true), 100);
      }
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private addStep(taskId: string, type: AgentStep['type'], content: string): AgentStep {
    const step: AgentStep = {
      id: this.generateId(),
      taskId,
      type,
      content,
      timestamp: new Date(),
    };

    this.steps.push(step);
    this.emit('step:added', step);

    return step;
  }

  private addMemory(type: MemoryEntry['type'], content: string, metadata?: Record<string, unknown>): void {
    this.memoryStore.add(type, content, metadata);
  }

  private getRelevantMemory(query: string): MemoryEntry[] {
    return this.memoryStore.relevant(query);
  }

  private buildContext(task: AgentTask, subtask: AgentTask): string {
    return this.memoryStore.buildContext(task, subtask, this.iterationCount, this.config.maxIterations);
  }

  private getAvailableTools(): AgentToolDescriptor[] {
    return getAvailableAgentTools();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // PUBLIC CONTROL METHODS
  // ============================================================================

  pause(): void {
    this.isPaused = true;
    this.emit('agent:paused', { reason: 'User requested pause' });
  }

  setToolContextProvider(provider: AgentToolContextProvider | null): void {
    this.toolContextProvider = provider
  }

  resume(): void {
    this.isPaused = false;
    this.emit('agent:resumed', {});
  }

  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.emit('agent:stopped', {});
  }

  provideInput(input: string): void {
    this.addMemory('context', `User input: ${input}`);
    this.emit('agent:input_received', { input });
    this.isPaused = false;
  }

  getStatus(): {
    isRunning: boolean;
    isPaused: boolean;
    currentTask: AgentTask | null;
    iteration: number;
    steps: number;
  } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentTask: this.currentTask,
      iteration: this.iterationCount,
      steps: this.steps.length,
    };
  }

  getSteps(): AgentStep[] {
    return [...this.steps];
  }

  getMemory(): AgentMemory {
    return this.memoryStore.snapshot();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const autonomousAgent = new AutonomousAgent({
  maxIterations: 50,
  maxRetries: 3,
  autonomyLevel: 'semi-autonomous',
  requireApproval: true,
  enableSelfCorrection: true,
});

export default AutonomousAgent;
