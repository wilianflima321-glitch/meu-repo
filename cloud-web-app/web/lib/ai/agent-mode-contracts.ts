/**
 * Contracts for the autonomous agent runtime.
 *
 * Kept type-only so UI, telemetry and tests can depend on the agent shape
 * without importing the full execution loop and tool registry side effects.
 */

export interface AgentTask {
  id: string;
  description: string;
  status: 'pending' | 'planning' | 'executing' | 'reviewing' | 'completed' | 'failed' | 'paused';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  parentTaskId?: string;
  subtasks: AgentTask[];
  result?: unknown;
  error?: string;
}

export interface AgentStep {
  id: string;
  taskId: string;
  type: 'think' | 'plan' | 'execute' | 'observe' | 'reflect' | 'correct';
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
  duration?: number;
}

export interface ToolCall {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startTime: Date;
  endTime?: Date;
}

export interface AgentMemory {
  shortTerm: MemoryEntry[];  // Current task context
  longTerm: MemoryEntry[];   // Persistent knowledge
  working: Map<string, unknown>; // Active variables/state
}

export interface MemoryEntry {
  id: string;
  type: 'fact' | 'decision' | 'error' | 'success' | 'context';
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  relevance: number;
}

export interface AgentConfig {
  maxIterations: number;
  maxRetries: number;
  thinkingBudget: number;  // Max tokens for reasoning
  autonomyLevel: 'supervised' | 'semi-autonomous' | 'autonomous';
  requireApproval: boolean;
  enableSelfCorrection: boolean;
  enableParallelExecution: boolean;
  model: string;
  toolContextProvider?: AgentToolContextProvider | null;
}

export type AgentToolContextProvider = (
  action: AgentAction
) => Record<string, unknown> | null | undefined | Promise<Record<string, unknown> | null | undefined>;

interface AgentPlan {
  analysis: string;
  approach: string;
  subtasks: Array<{
    id: string;
    description: string;
    tools: string[];
    dependencies: string[];
    estimatedSteps: number;
    riskLevel: string;
  }>;
  successCriteria: string;
  potentialIssues: string[];
}

export interface AgentAction {
  type: 'tool_call' | 'ask_human' | 'complete' | 'error';
  tool?: string;
  input?: Record<string, unknown>;
  reason: string;
}

interface AgentThinking {
  thinking: string;
  action: AgentAction;
  confidence: number;
  nextSteps: string[];
}

interface AgentReflection {
  assessment: string;
  success: boolean;
  progress: number;
  issues: string[];
  corrections: string[];
  nextAction: 'continue' | 'retry' | 'adjust' | 'complete' | 'abort';
  adjustments: string;
}

interface AgentReview {
  success: boolean;
  result?: unknown;
  error?: string;
}

interface AgentToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
