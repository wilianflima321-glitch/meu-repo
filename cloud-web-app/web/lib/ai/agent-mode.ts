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
import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

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
  result?: any;
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
  input: Record<string, any>;
  output?: any;
  error?: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startTime: Date;
  endTime?: Date;
}

export interface AgentMemory {
  shortTerm: MemoryEntry[];  // Current task context
  longTerm: MemoryEntry[];   // Persistent knowledge
  working: Map<string, any>; // Active variables/state
}

export interface MemoryEntry {
  id: string;
  type: 'fact' | 'decision' | 'error' | 'success' | 'context';
  content: string;
  metadata?: Record<string, any>;
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
}

// ============================================================================
// AGENT PROMPTS
// ============================================================================

const PLANNER_PROMPT = `Você é um agente de planejamento especializado em decomposição de tarefas complexas.

OBJETIVO: Analisar uma tarefa e criar um plano de execução detalhado.

REGRAS:
1. Divida tarefas complexas em subtarefas atômicas e executáveis
2. Identifique dependências entre subtarefas
3. Estime complexidade e risco de cada etapa
4. Sempre inclua etapas de verificação/teste
5. Considere edge cases e possíveis falhas

FORMATO DE RESPOSTA (JSON):
{
  "analysis": "Análise da tarefa e contexto necessário",
  "approach": "Estratégia geral de abordagem",
  "subtasks": [
    {
      "id": "1",
      "description": "Descrição clara da subtarefa",
      "tools": ["tool1", "tool2"],
      "dependencies": [],
      "estimatedSteps": 3,
      "riskLevel": "low|medium|high"
    }
  ],
  "successCriteria": "Como verificar que a tarefa foi completada",
  "potentialIssues": ["Issue 1", "Issue 2"]
}`;

const EXECUTOR_PROMPT = `Você é um agente executor especializado em completar tarefas usando ferramentas.

CONTEXTO ATUAL:
{context}

TAREFA:
{task}

FERRAMENTAS DISPONÍVEIS:
{tools}

MEMÓRIA RELEVANTE:
{memory}

REGRAS:
1. Execute uma ação por vez
2. Observe o resultado antes de prosseguir
3. Se encontrar erro, tente corrigir (máx 3 tentativas)
4. Documente suas decisões
5. Pare e peça ajuda se estiver travado

FORMATO DE RESPOSTA (JSON):
{
  "thinking": "Seu raciocínio sobre o próximo passo",
  "action": {
    "type": "tool_call|ask_human|complete|error",
    "tool": "nome_da_ferramenta",
    "input": { ... },
    "reason": "Por que esta ação"
  },
  "confidence": 0.0-1.0,
  "nextSteps": ["Passo 1", "Passo 2"]
}`;

const REFLECTOR_PROMPT = `Você é um agente de reflexão que analisa resultados e decide próximos passos.

TAREFA ORIGINAL:
{task}

AÇÃO EXECUTADA:
{action}

RESULTADO:
{result}

HISTÓRICO:
{history}

ANALISE:
1. A ação foi bem sucedida?
2. O resultado nos aproxima do objetivo?
3. Há erros que precisam ser corrigidos?
4. Devemos continuar, ajustar ou parar?

FORMATO DE RESPOSTA (JSON):
{
  "assessment": "Avaliação do resultado",
  "success": true|false,
  "progress": 0-100,
  "issues": ["Issue 1"],
  "corrections": ["Correção 1"],
  "nextAction": "continue|retry|adjust|complete|abort",
  "adjustments": "O que ajustar se necessário"
}`;

// ============================================================================
// AUTONOMOUS AGENT CLASS
// ============================================================================

export class AutonomousAgent extends EventEmitter {
  private config: AgentConfig;
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
  private async planTask(task: AgentTask): Promise<{
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
  }> {
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
      
      const plan = JSON.parse(jsonMatch[0]);
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
  private async executeTaskLoop(task: AgentTask, plan: any): Promise<void> {
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
  private async think(task: AgentTask, subtask: AgentTask): Promise<{
    thinking: string;
    action: {
      type: 'tool_call' | 'ask_human' | 'complete' | 'error';
      tool?: string;
      input?: Record<string, any>;
      reason: string;
    };
    confidence: number;
    nextSteps: string[];
  }> {
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
      
      const thinking = JSON.parse(jsonMatch[0]);
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
  private async executeToolCall(taskId: string, action: any): Promise<any> {
    const step = this.addStep(taskId, 'execute', `Executando ${action.tool}...`);
    
    const toolCall: ToolCall = {
      id: this.generateId(),
      tool: action.tool,
      input: action.input || {},
      status: 'running',
      startTime: new Date(),
    };
    
    step.toolCalls = [toolCall];
    
    this.emit('tool:started', toolCall);
    
    try {
      const result = await executeTool(action.tool, action.input);
      
      toolCall.status = 'success';
      toolCall.output = result;
      toolCall.endTime = new Date();
      
      this.emit('tool:completed', toolCall);
      
      this.addMemory('success', `Tool ${action.tool} executada com sucesso`, {
        tool: action.tool,
        input: action.input,
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
        input: action.input,
        error: toolCall.error,
      });
      
      return { error: toolCall.error };
    }
  }
  
  /**
   * Reflete sobre o resultado de uma ação
   */
  private async reflect(task: AgentTask, action: any, result: any): Promise<{
    assessment: string;
    success: boolean;
    progress: number;
    issues: string[];
    corrections: string[];
    nextAction: 'continue' | 'retry' | 'adjust' | 'complete' | 'abort';
    adjustments: string;
  }> {
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
      
      const reflection = JSON.parse(jsonMatch[0]);
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
  private async selfCorrect(task: AgentTask, reflection: any): Promise<void> {
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
  private async reviewExecution(task: AgentTask): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
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
  private async requestApproval(thinking: any): Promise<boolean> {
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
  
  private addMemory(type: MemoryEntry['type'], content: string, metadata?: any): void {
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
  
  private getAvailableTools(): Array<{ name: string; description: string; inputSchema: any }> {
    // Get tools from registry
    const registeredTools: Array<{ name: string; description: string; inputSchema: any }> = [];
    
    // Core tools always available
    registeredTools.push(
      { 
        name: 'read_file', 
        description: 'Lê conteúdo de um arquivo',
        inputSchema: { path: 'string' }
      },
      { 
        name: 'write_file', 
        description: 'Escreve conteúdo em um arquivo',
        inputSchema: { path: 'string', content: 'string' }
      },
      { 
        name: 'edit_file', 
        description: 'Edita parte de um arquivo',
        inputSchema: { path: 'string', search: 'string', replace: 'string' }
      },
      { 
        name: 'run_command', 
        description: 'Executa comando no terminal',
        inputSchema: { command: 'string' }
      },
      { 
        name: 'search_code', 
        description: 'Busca texto nos arquivos',
        inputSchema: { query: 'string' }
      },
      { 
        name: 'web_search', 
        description: 'Pesquisa na internet',
        inputSchema: { query: 'string' }
      },
      { 
        name: 'list_directory', 
        description: 'Lista arquivos em um diretório',
        inputSchema: { path: 'string' }
      },
      { 
        name: 'git_status', 
        description: 'Mostra status do Git',
        inputSchema: {}
      },
      { 
        name: 'git_commit', 
        description: 'Cria um commit',
        inputSchema: { message: 'string' }
      },
    );
    
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
