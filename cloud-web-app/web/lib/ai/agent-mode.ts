/**
 * Aethel Agent Mode - Autonomous AI Agent
 * 
 * Sistema de agente autônomo nível Manus/Devin com:
 * - Task decomposition e planning
 * - Tool orchestration
 * - Self-correction e retry logic
 * - Memory management
 * - Progress reporting
 * - Human-in-the-loop controls
 */

import { aiService } from '@/lib/ai-service';
import { toolsRegistry, executeTool } from '@/lib/ai-tools-registry';
import '@/lib/ai-web-tools'
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
  AgentReview,
  AgentToolDescriptor
} from './agent-mode-contracts';

import { EXECUTOR_PROMPT, PLANNER_PROMPT, REFLECTOR_PROMPT } from './agent-mode-prompts';

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

function parseJsonObject<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

// ============================================================================
// AUTONOMOUS AGENT CLASS
// ============================================================================

export class AutonomousAgent extends EventEmitter {
  private config: AgentConfig;
  private toolContextProvider: AgentToolContextProvider | null = null;
  private memory: AgentMemory;
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
    
    this.memory = {
      shortTerm: [],
      longTerm: [],
      working: new Map(),
    };
  }
  
  /**
   * Inicia execução de uma tarefa
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
      
      this.addMemory('fact', `Plano criado: ${plan.approach}`, { plan });
      
      // Phase 2: Execution
      task.status = 'executing';
      this.emit('task:executing', task);
      
      await this.executeTaskLoop(task, plan);
      
      // Phase 3: Review
      task.status = 'reviewing';
      this.emit('task:reviewing', task);
      
      const review = await this.reviewExecution(task);
      
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
   * Fase de planejamento - decompõe a tarefa
   */
  private async planTask(task: AgentTask): Promise<AgentPlan> {
    const step = this.addStep(task.id, 'plan', 'Analisando tarefa e criando plano...');
    
    const availableTools = this.getAvailableTools();
    
    const response = await aiService.chat({
      messages: [
        { role: 'system', content: PLANNER_PROMPT },
        { 
          role: 'user', 
          content: `TAREFA: ${task.description}\n\nFERRAMENTAS DISPONÍVEIS:\n${availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}`
        },
      ],
      temperature: 0.3,
      maxTokens: this.config.thinkingBudget,
    });
    
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid plan format');
      
      const plan = parseJsonObject<AgentPlan>(jsonMatch[0]);
      step.content = `Plano criado: ${plan.subtasks.length} subtarefas`;
      
      this.emit('agent:planned', { task, plan });
      
      return plan;
    } catch (e) {
      // Fallback: single task
      return {
        analysis: 'Tarefa simples, execução direta',
        approach: 'Execução sequencial',
        subtasks: [{
          id: '1',
          description: task.description,
          tools: [],
          dependencies: [],
          estimatedSteps: 5,
          riskLevel: 'medium',
        }],
        successCriteria: 'Tarefa completada sem erros',
        potentialIssues: [],
      };
    }
  }
  
  /**
   * Loop principal de execução
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
   * Pensa sobre o próximo passo
   */
  private async think(task: AgentTask, subtask: AgentTask): Promise<AgentThinking> {
    const step = this.addStep(task.id, 'think', 'Pensando sobre próximo passo...');
    
    const context = this.buildContext(task, subtask);
    const tools = this.getAvailableTools();
    const memory = this.getRelevantMemory(subtask.description);
    
    const prompt = EXECUTOR_PROMPT
      .replace('{context}', context)
      .replace('{task}', subtask.description)
      .replace('{tools}', tools.map(t => `- ${t.name}: ${t.description}\n  Input: ${JSON.stringify(t.inputSchema)}`).join('\n\n'))
      .replace('{memory}', memory.map(m => `- [${m.type}] ${m.content}`).join('\n'));
    
    const response = await aiService.chat({
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Qual é o próximo passo?' },
      ],
      temperature: 0.2,
      maxTokens: 2000,
    });
    
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid thinking format');
      
      const thinking = parseJsonObject<AgentThinking>(jsonMatch[0]);
      step.content = thinking.thinking;
      
      return thinking;
    } catch (e) {
      return {
        thinking: 'Erro ao processar pensamento',
        action: {
          type: 'error',
          reason: 'Failed to parse thinking response',
        },
        confidence: 0,
        nextSteps: [],
      };
    }
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
    const step = this.addStep(taskId, 'execute', `Executando ${action.tool}...`);
    
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
      
      this.addMemory('success', `Tool ${action.tool} executada com sucesso`, {
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
      
      this.addMemory('error', `Tool ${action.tool} falhou: ${toolCall.error}`, {
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
      this.addMemory('error', `Tool context provider falhou: ${error instanceof Error ? error.message : 'unknown'}`)
      return null
    }
  }
  
  /**
   * Reflete sobre o resultado de uma ação
   */
  private async reflect(task: AgentTask, action: AgentAction, result: unknown): Promise<AgentReflection> {
    const step = this.addStep(task.id, 'reflect', 'Analisando resultado...');
    
    const history = this.steps.slice(-10).map(s => 
      `[${s.type}] ${s.content}`
    ).join('\n');
    
    const prompt = REFLECTOR_PROMPT
      .replace('{task}', task.description)
      .replace('{action}', JSON.stringify(action))
      .replace('{result}', JSON.stringify(result))
      .replace('{history}', history);
    
    const response = await aiService.chat({
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Analise o resultado e decida o próximo passo.' },
      ],
      temperature: 0.2,
      maxTokens: 1500,
    });
    
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid reflection format');
      
      const reflection = parseJsonObject<AgentReflection>(jsonMatch[0]);
      step.content = reflection.assessment;
      
      return reflection;
    } catch (e) {
      return {
        assessment: 'Erro ao processar reflexão',
        success: false,
        progress: 0,
        issues: ['Failed to parse reflection'],
        corrections: [],
        nextAction: 'abort',
        adjustments: '',
      };
    }
  }
  
  /**
   * Auto-correção após falha
   */
  private async selfCorrect(task: AgentTask, reflection: AgentReflection): Promise<void> {
    const step = this.addStep(task.id, 'correct', 'Aplicando auto-correção...');
    
    this.addMemory('decision', `Auto-correção: ${reflection.adjustments}`, {
      issues: reflection.issues,
      corrections: reflection.corrections,
    });
    
    step.content = `Correções aplicadas: ${reflection.corrections.join(', ')}`;
    
    this.emit('agent:self_corrected', { task, reflection });
  }
  
  /**
   * Review final da execução
   */
  private async reviewExecution(task: AgentTask): Promise<AgentReview> {
    const completedSubtasks = task.subtasks.filter(st => st.status === 'completed');
    const failedSubtasks = task.subtasks.filter(st => st.status === 'failed');
    
    if (failedSubtasks.length > 0) {
      return {
        success: false,
        error: `${failedSubtasks.length} subtarefas falharam`,
      };
    }
    
    if (completedSubtasks.length === task.subtasks.length) {
      return {
        success: true,
        result: {
          completedSubtasks: completedSubtasks.length,
          totalSteps: this.steps.length,
          iterations: this.iterationCount,
        },
      };
    }
    
    return {
      success: false,
      error: 'Execução incompleta',
    };
  }
  
  /**
   * Solicita aprovação do usuário
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
    const entry: MemoryEntry = {
      id: this.generateId(),
      type,
      content,
      metadata,
      timestamp: new Date(),
      relevance: 1.0,
    };
    
    this.memory.shortTerm.push(entry);
    
    // Keep short-term memory bounded
    if (this.memory.shortTerm.length > 100) {
      const oldest = this.memory.shortTerm.shift();
      if (oldest && oldest.relevance > 0.5) {
        this.memory.longTerm.push(oldest);
      }
    }
  }
  
  private getRelevantMemory(query: string): MemoryEntry[] {
    // Simple relevance - in production, use embeddings
    const allMemory = [...this.memory.shortTerm, ...this.memory.longTerm];
    return allMemory
      .filter(m => m.content.toLowerCase().includes(query.toLowerCase().slice(0, 20)))
      .slice(-10);
  }
  
  private buildContext(task: AgentTask, subtask: AgentTask): string {
    const context = [
      `Tarefa principal: ${task.description}`,
      `Subtarefa atual: ${subtask.description}`,
      `Progresso: ${task.subtasks.filter(st => st.status === 'completed').length}/${task.subtasks.length}`,
      `Iteração: ${this.iterationCount}/${this.config.maxIterations}`,
    ];
    
    // Add working memory
    this.memory.working.forEach((value, key) => {
      context.push(`${key}: ${JSON.stringify(value)}`);
    });
    
    return context.join('\n');
  }
  
  private getAvailableTools(): AgentToolDescriptor[] {
    // Get tools from registry dynamically
    const registeredTools: AgentToolDescriptor[] = [];
    
    // Try to get tools from MCP server if available
    try {
      // Dynamically import MCP server tools
      const mcpTools = toolsRegistry?.getAll?.() || [];
      for (const tool of mcpTools) {
        const inputSchema = {
          type: 'object',
          properties: tool.parameters.reduce((acc, param) => {
            acc[param.name] = {
              type: param.type,
              description: param.description,
              ...(param.enum ? { enum: param.enum } : {}),
            };
            return acc;
          }, {} as Record<string, unknown>),
          required: tool.parameters.filter((p) => p.required).map((p) => p.name),
        };
        registeredTools.push({
          name: tool.name,
          description: tool.description,
          inputSchema
        });
      }
    } catch {
      // MCP not available, use core tools
    }
    
    // Core tools always available (fallback)
    if (registeredTools.length === 0) {
      registeredTools.push(
        { 
          name: 'read_file', 
          description: 'Lê conteúdo de um arquivo do projeto',
          inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
        },
        { 
          name: 'write_file', 
          description: 'Escreve/cria um arquivo no projeto',
          inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] }
        },
        { 
          name: 'edit_file', 
          description: 'Edita parte específica de um arquivo (replace, insert)',
          inputSchema: { type: 'object', properties: { path: { type: 'string' }, operation: { type: 'string' }, search: { type: 'string' }, replace: { type: 'string' } }, required: ['path', 'operation', 'search'] }
        },
        { 
          name: 'delete_file', 
          description: 'Deleta um arquivo ou diretório',
          inputSchema: { type: 'object', properties: { path: { type: 'string' }, recursive: { type: 'boolean' } }, required: ['path'] }
        },
        { 
          name: 'create_directory', 
          description: 'Cria um novo diretório',
          inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
        },
        { 
          name: 'rename_file', 
          description: 'Renomeia ou move um arquivo',
          inputSchema: { type: 'object', properties: { oldPath: { type: 'string' }, newPath: { type: 'string' } }, required: ['oldPath', 'newPath'] }
        },
        { 
          name: 'run_command', 
          description: 'Executa comando no terminal (com segurança)',
          inputSchema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] }
        },
        { 
          name: 'search_code', 
          description: 'Busca texto/regex nos arquivos do projeto',
          inputSchema: { type: 'object', properties: { query: { type: 'string' }, isRegex: { type: 'boolean' } }, required: ['query'] }
        },
        { 
          name: 'web_search', 
          description: 'Pesquisa na internet via DuckDuckGo',
          inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
        },
        { 
          name: 'fetch_url', 
          description: 'Busca conteúdo de uma URL',
          inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
        },
        { 
          name: 'list_directory', 
          description: 'Lista arquivos e pastas em um diretório',
          inputSchema: { type: 'object', properties: { path: { type: 'string' }, recursive: { type: 'boolean' } }, required: ['path'] }
        },
        { 
          name: 'git_status', 
          description: 'Mostra status atual do Git',
          inputSchema: { type: 'object', properties: {} }
        },
        { 
          name: 'git_diff', 
          description: 'Mostra diferenças de arquivos',
          inputSchema: { type: 'object', properties: { file: { type: 'string' } } }
        },
        { 
          name: 'git_commit', 
          description: 'Cria um commit com mensagem',
          inputSchema: { type: 'object', properties: { message: { type: 'string' }, files: { type: 'array' } }, required: ['message'] }
        },
        { 
          name: 'get_definitions', 
          description: 'Encontra definições de funções/classes/variáveis',
          inputSchema: { type: 'object', properties: { symbol: { type: 'string' } }, required: ['symbol'] }
        },
        { 
          name: 'create_blueprint', 
          description: 'Cria um blueprint visual para jogo',
          inputSchema: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string' } }, required: ['name', 'type'] }
        },
        { 
          name: 'create_level', 
          description: 'Cria um novo level/cena de jogo',
          inputSchema: { type: 'object', properties: { name: { type: 'string' }, template: { type: 'string' } }, required: ['name'] }
        },
      );
    }
    
    return registeredTools;
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
    return {
      shortTerm: [...this.memory.shortTerm],
      longTerm: [...this.memory.longTerm],
      working: new Map(this.memory.working),
    };
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
