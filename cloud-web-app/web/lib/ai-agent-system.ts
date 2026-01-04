/**
 * AI Agent System - Sistema de Agentes IA
 * 
 * Agentes especializados que podem usar as ferramentas do Aethel Engine
 * para completar tarefas complexas de forma autônoma.
 * 
 * DIFERENCIAL: IA que REALMENTE controla o editor, não apenas sugere código.
 */

import { aiTools, AITool, ToolResult, Artifact } from './ai-tools-registry';
import { aiService } from './ai-service';

// ============================================================================
// TIPOS
// ============================================================================

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  systemPrompt: string;
  tools: string[]; // Nomes das ferramentas que pode usar
  maxIterations: number;
}

export type AgentRole = 
  | 'coder'           // Escreve e edita código
  | 'artist'          // Cria assets visuais
  | 'sound-designer'  // Cria áudio e música
  | 'game-designer'   // Design de levels e mecânicas
  | 'qa'              // Testa e encontra bugs
  | 'architect'       // Planeja estrutura do projeto
  | 'video-editor'    // Edita vídeos
  | 'universal';      // Pode fazer tudo

export interface AgentTask {
  id: string;
  description: string;
  context?: string;
  executionContext?: {
    userId: string;
    projectId?: string;
  };
  constraints?: string[];
  expectedOutput?: string;
}

export interface AgentStep {
  thought: string;
  action?: {
    tool: string;
    params: Record<string, unknown>;
  };
  observation?: string;
  result?: ToolResult;
}

export interface AgentExecution {
  taskId: string;
  agentId: string;
  steps: AgentStep[];
  status: 'running' | 'completed' | 'failed' | 'paused';
  artifacts: Artifact[];
  finalAnswer?: string;
  error?: string;
}

// ============================================================================
// AGENTES PRÉ-DEFINIDOS
// ============================================================================

export const AGENTS: Record<string, Agent> = {
  coder: {
    id: 'coder',
    name: 'Aethel Coder',
    role: 'coder',
    description: 'Especialista em escrever código limpo e eficiente',
    systemPrompt: `Você é um desenvolvedor expert especializado em criar código de alta qualidade.
Você pode criar, editar e analisar arquivos de código.
Sempre siga as melhores práticas e padrões do projeto.
Use TypeScript por padrão, a menos que especificado de outra forma.
Documente seu código adequadamente.`,
    tools: ['create_file', 'edit_file', 'analyze_code'],
    maxIterations: 10,
  },

  artist: {
    id: 'artist',
    name: 'Aethel Artist',
    role: 'artist',
    description: 'Artista digital que cria sprites, texturas e arte conceitual',
    systemPrompt: `Você é um artista digital especializado em game art.
Você pode gerar imagens, criar sprite sheets e editar assets visuais.
Entenda estilos visuais e mantenha consistência no projeto.
Otimize assets para performance em jogos.`,
    tools: ['generate_image', 'edit_image', 'create_sprite_sheet', 'generate_texture'],
    maxIterations: 10,
  },

  soundDesigner: {
    id: 'sound-designer',
    name: 'Aethel Sound',
    role: 'sound-designer',
    description: 'Designer de som que cria música e efeitos sonoros',
    systemPrompt: `Você é um designer de som especializado em áudio para jogos.
Você pode criar músicas, efeitos sonoros e vozes.
Entenda teoria musical e design de áudio interativo.
Crie áudio que combine com a atmosfera do jogo.`,
    tools: ['generate_music', 'generate_sfx', 'text_to_speech'],
    maxIterations: 10,
  },

  gameDesigner: {
    id: 'game-designer',
    name: 'Aethel Designer',
    role: 'game-designer',
    description: 'Game designer que cria levels e mecânicas',
    systemPrompt: `Você é um game designer experiente.
Você pode criar objetos de jogo, adicionar componentes e gerar levels.
Entenda balanceamento, progressão e game feel.
Crie experiências divertidas e engajantes.`,
    tools: ['create_game_object', 'add_component', 'create_game_script', 'generate_level'],
    maxIterations: 15,
  },

  videoEditor: {
    id: 'video-editor',
    name: 'Aethel Editor',
    role: 'video-editor',
    description: 'Editor de vídeo profissional',
    systemPrompt: `Você é um editor de vídeo profissional.
Você pode criar clips, adicionar efeitos e renderizar vídeos.
Entenda ritmo, timing e storytelling visual.
Crie vídeos com qualidade profissional.`,
    tools: ['create_video_clip', 'add_video_effect', 'render_video'],
    maxIterations: 15,
  },

  architect: {
    id: 'architect',
    name: 'Aethel Architect',
    role: 'architect',
    description: 'Arquiteto de software que planeja estruturas complexas',
    systemPrompt: `Você é um arquiteto de software sênior.
Você planeja a estrutura de projetos e analisa código.
Entenda padrões de design, escalabilidade e manutenibilidade.
Crie arquiteturas robustas e bem documentadas.`,
    tools: ['create_file', 'analyze_code', 'create_project'],
    maxIterations: 10,
  },

  universal: {
    id: 'universal',
    name: 'Aethel Universal',
    role: 'universal',
    description: 'Agente completo que pode fazer qualquer tarefa',
    systemPrompt: `Você é um agente universal com acesso a todas as ferramentas do Aethel Engine.
Você pode criar jogos completos, editar mídia, escrever código e muito mais.
Analise a tarefa e use as ferramentas apropriadas para completá-la.
Seja criativo e eficiente.`,
    tools: [], // Será preenchido com todas as ferramentas
    maxIterations: 20,
  },
};

// Universal tem todas as ferramentas
AGENTS.universal.tools = aiTools.getAll().map(t => t.name);

// ============================================================================
// AGENT EXECUTOR
// ============================================================================

export class AgentExecutor {
  private agent: Agent;
  private execution: AgentExecution;
  private availableTools: AITool[];

  constructor(agentId: string) {
    const agent = AGENTS[agentId];
    if (!agent) {
      throw new Error(`Agent "${agentId}" not found`);
    }

    this.agent = agent;
    this.availableTools = agent.tools.map(name => aiTools.get(name)).filter(Boolean) as AITool[];
    this.execution = {
      taskId: '',
      agentId: agentId,
      steps: [],
      status: 'running',
      artifacts: [],
    };
  }

  async execute(task: AgentTask): Promise<AgentExecution> {
    this.execution.taskId = task.id;
    this.execution.status = 'running';
    this.execution.steps = [];
    this.execution.artifacts = [];

    try {
      let iteration = 0;

      while (iteration < this.agent.maxIterations && this.execution.status === 'running') {
        iteration++;

        // Construir prompt com contexto atual
        const prompt = this.buildPrompt(task, iteration);

        // Chamar IA para decidir próxima ação
        const response = await this.thinkAndAct(prompt);

        if (response.finalAnswer) {
          this.execution.finalAnswer = response.finalAnswer;
          this.execution.status = 'completed';
          break;
        }

        // Executar ação se houver
        if (response.action) {
          const enrichedParams: Record<string, unknown> = {
            ...(response.action.params && typeof response.action.params === 'object' ? response.action.params : {}),
            ...(task.executionContext ? { __aethelContext: task.executionContext } : {}),
          };

          const result = await aiTools.execute(response.action.tool, enrichedParams);
          
          const step: AgentStep = {
            thought: response.thought,
            action: response.action,
            observation: this.formatObservation(result),
            result,
          };

          this.execution.steps.push(step);

          // Coletar artifacts
          if (result.artifacts) {
            this.execution.artifacts.push(...result.artifacts);
          }

          // Verificar se falhou
          if (!result.success) {
            console.warn(`Tool ${response.action.tool} failed:`, result.error);
          }
        } else {
          // Apenas pensamento, sem ação
          this.execution.steps.push({
            thought: response.thought,
          });
        }
      }

      if (this.execution.status === 'running') {
        this.execution.status = 'completed';
        this.execution.finalAnswer = 'Tarefa concluída após máximo de iterações.';
      }

    } catch (error) {
      this.execution.status = 'failed';
      this.execution.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return this.execution;
  }

  private buildPrompt(task: AgentTask, iteration: number): string {
    const toolDescriptions = this.availableTools.map(tool => 
      `- ${tool.name}: ${tool.description}`
    ).join('\n');

    const previousSteps = this.execution.steps.map((step, i) => 
      `Step ${i + 1}:
Thought: ${step.thought}
${step.action ? `Action: ${step.action.tool}(${JSON.stringify(step.action.params)})` : ''}
${step.observation ? `Observation: ${step.observation}` : ''}`
    ).join('\n\n');

    return `# Task
${task.description}

${task.context ? `# Context\n${task.context}\n` : ''}
${task.constraints ? `# Constraints\n${task.constraints.join('\n')}\n` : ''}

# Available Tools
${toolDescriptions}

# Previous Steps
${previousSteps || 'None yet'}

# Instructions
Think step by step about what to do next.
If you need to use a tool, specify which one and with what parameters.
If you have completed the task, provide a final answer.

Respond in this format:
THOUGHT: [your reasoning]
ACTION: [tool_name] or FINAL_ANSWER
PARAMS: [JSON parameters if using a tool]
ANSWER: [final answer if done]`;
  }

  private async thinkAndAct(prompt: string): Promise<{
    thought: string;
    action?: { tool: string; params: Record<string, unknown> };
    finalAnswer?: string;
  }> {
    const fullPrompt = `${this.agent.systemPrompt}\n\n${prompt}`;

    // Chamar IA
    const response = await aiService.query(fullPrompt, undefined, {
      model: 'gpt-4o', // Usar modelo mais capaz para agentes
    });

    // Parse da resposta
    const content = response.content;
    
    const thoughtMatch = content.match(/THOUGHT:\s*(.+?)(?=\nACTION:|$)/s);
    const actionMatch = content.match(/ACTION:\s*(\w+)/);
    const paramsMatch = content.match(/PARAMS:\s*({.+?})/s);
    const answerMatch = content.match(/ANSWER:\s*(.+)/s);

    const thought = thoughtMatch?.[1]?.trim() || 'Processing...';
    
    if (actionMatch?.[1] === 'FINAL_ANSWER' || answerMatch) {
      return {
        thought,
        finalAnswer: answerMatch?.[1]?.trim() || 'Task completed.',
      };
    }

    if (actionMatch?.[1]) {
      let params = {};
      if (paramsMatch?.[1]) {
        try {
          params = JSON.parse(paramsMatch[1]);
        } catch {
          // Ignore parse errors
        }
      }

      return {
        thought,
        action: {
          tool: actionMatch[1],
          params,
        },
      };
    }

    return { thought };
  }

  private formatObservation(result: ToolResult): string {
    if (!result.success) {
      return `Error: ${result.error}`;
    }

    if (result.artifacts && result.artifacts.length > 0) {
      return `Success. Created ${result.artifacts.length} artifact(s): ${result.artifacts.map(a => a.name).join(', ')}`;
    }

    return `Success: ${JSON.stringify(result.data)}`;
  }

  pause(): void {
    this.execution.status = 'paused';
  }

  resume(): void {
    if (this.execution.status === 'paused') {
      this.execution.status = 'running';
    }
  }

  getExecution(): AgentExecution {
    return this.execution;
  }
}

// ============================================================================
// MULTI-AGENT ORCHESTRATOR
// ============================================================================

export interface MultiAgentTask {
  id: string;
  description: string;
  subtasks?: {
    agentId: string;
    description: string;
    dependsOn?: string[];
  }[];
}

export class AgentOrchestrator {
  private executions: Map<string, AgentExecution> = new Map();

  async executeMultiAgent(task: MultiAgentTask): Promise<Map<string, AgentExecution>> {
    // Se não houver subtasks definidas, usar agente universal
    if (!task.subtasks || task.subtasks.length === 0) {
      const executor = new AgentExecutor('universal');
      const execution = await executor.execute({
        id: task.id,
        description: task.description,
      });
      this.executions.set(task.id, execution);
      return this.executions;
    }

    // Executar subtasks respeitando dependências
    const completed = new Set<string>();
    const pending = new Map<string, { agentId: string; description: string; dependsOn?: string[] }>();
    task.subtasks.forEach((st, i) => {
      pending.set(`${task.id}-${i}`, st);
    });

    while (pending.size > 0) {
      // Encontrar tasks que podem executar (sem dependências pendentes)
      const ready: string[] = [];
      for (const [id, subtask] of pending) {
        const deps = subtask.dependsOn || [];
        if (deps.every(d => completed.has(d))) {
          ready.push(id);
        }
      }

      if (ready.length === 0 && pending.size > 0) {
        throw new Error('Circular dependency detected in subtasks');
      }

      // Executar em paralelo as tasks prontas
      await Promise.all(ready.map(async (id) => {
        const subtask = pending.get(id)!;
        const executor = new AgentExecutor(subtask.agentId);
        
        // Coletar contexto de dependências
        const context = (subtask.dependsOn || [])
          .map(depId => {
            const exec = this.executions.get(depId);
            return exec?.finalAnswer ? `${depId}: ${exec.finalAnswer}` : '';
          })
          .filter(Boolean)
          .join('\n');

        const execution = await executor.execute({
          id,
          description: subtask.description,
          context: context || undefined,
        });

        this.executions.set(id, execution);
        completed.add(id);
        pending.delete(id);
      }));
    }

    return this.executions;
  }

  getExecutions(): Map<string, AgentExecution> {
    return this.executions;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export async function runAgent(agentId: string, taskDescription: string): Promise<AgentExecution> {
  const executor = new AgentExecutor(agentId);
  return executor.execute({
    id: `task-${Date.now()}`,
    description: taskDescription,
  });
}

export async function createGame(description: string): Promise<AgentExecution> {
  return runAgent('universal', `Create a complete game: ${description}`);
}

export async function generateAssets(description: string): Promise<AgentExecution> {
  return runAgent('artist', `Generate game assets: ${description}`);
}

export async function composeMusic(description: string): Promise<AgentExecution> {
  return runAgent('sound-designer', `Compose music and sound effects: ${description}`);
}

const aiAgentSystem = {
  AgentExecutor,
  AgentOrchestrator,
  AGENTS,
  runAgent,
  createGame,
  generateAssets,
  composeMusic,
};

export default aiAgentSystem;
