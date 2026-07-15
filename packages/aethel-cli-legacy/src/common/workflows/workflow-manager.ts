/**
 * ============================================
 * AETHEL ENGINE - Agent Workflow System
 * ============================================
 * 
 * Sistema de workflow para agentes autônomos.
 * Gerencia fluxos de trabalho multi-etapa com
 * integração de credenciais e LivePreview.
 * 
 * Suporta:
 * - Trading (corretoras, exchanges)
 * - Freelance (Upwork, Fiverr, etc)
 * - Email (Gmail, SMTP)
 * - Desenvolvimento (GitHub, npm)
 * - Pesquisa (web, APIs)
 * - Automação (qualquer tarefa)
 */

import { EventEmitter } from 'events';
import {
  WorkflowContext,
  WorkflowStep,
  AgentCredentialAccess,
  CredentialCategory,
} from '../credentials/credential-types';
import { CredentialFlowManager } from '../credentials/credential-flow-manager';

// ============================================
// WORKFLOW TYPES
// ============================================

export type WorkflowType = 
  | 'trading'
  | 'freelance'
  | 'email'
  | 'development'
  | 'research'
  | 'automation'
  | 'custom';

export type WorkflowStatus =
  | 'idle'
  | 'planning'
  | 'awaiting_credentials'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface WorkflowDefinition {
  id: string;
  name: string;
  type: WorkflowType;
  description: string;
  icon: string;
  requiredCredentials: string[];
  optionalCredentials: string[];
  steps: WorkflowStepDefinition[];
  estimatedDuration?: number;
  category: CredentialCategory;
}

export interface WorkflowStepDefinition {
  id: string;
  name: string;
  description: string;
  action: string;
  requiredCredential?: string;
  optional?: boolean;
  timeout?: number;
  retries?: number;
}

export interface WorkflowInstance {
  instanceId: string;
  definitionId: string;
  userId: string;
  agentId: string;
  status: WorkflowStatus;
  context: WorkflowContext;
  currentStepIndex: number;
  stepResults: Map<string, WorkflowStepResult>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface WorkflowStepResult {
  stepId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
  retryCount: number;
}

export type WorkflowActionExecutor = (params: {
  action: string;
  step: WorkflowStepDefinition;
  instance: WorkflowInstance;
  agentAccess: AgentCredentialAccess;
}) => Promise<unknown>;

// ============================================
// WORKFLOW EVENTS
// ============================================

export interface WorkflowEvent {
  type: WorkflowEventType;
  instanceId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export type WorkflowEventType =
  | 'workflow_started'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'workflow_paused'
  | 'workflow_resumed'
  | 'workflow_cancelled'
  | 'step_started'
  | 'step_completed'
  | 'step_failed'
  | 'step_skipped'
  | 'credential_needed'
  | 'user_action_needed'
  | 'progress_update';

// ============================================
// PREDEFINED WORKFLOWS
// ============================================

export const WORKFLOW_DEFINITIONS: Record<string, WorkflowDefinition> = {
  // Trading
  'trading-auto': {
    id: 'trading-auto',
    name: 'Trading Autônomo',
    type: 'trading',
    description: 'Executa trades automaticamente baseado em análise de IA',
    icon: '📈',
    requiredCredentials: ['binance'],
    optionalCredentials: ['metatrader'],
    category: 'trading',
    steps: [
      { id: 'connect', name: 'Conectar à Corretora', description: 'Estabelece conexão com a corretora', action: 'broker_connect', requiredCredential: 'binance' },
      { id: 'analyze', name: 'Analisar Mercado', description: 'Analisa condições do mercado', action: 'market_analyze' },
      { id: 'strategy', name: 'Aplicar Estratégia', description: 'Seleciona e aplica estratégia de trading', action: 'strategy_apply' },
      { id: 'execute', name: 'Executar Trades', description: 'Executa ordens de compra/venda', action: 'trade_execute' },
      { id: 'monitor', name: 'Monitorar Posições', description: 'Monitora posições abertas', action: 'position_monitor' },
    ],
    estimatedDuration: 0, // Contínuo
  },

  // Freelance
  'freelance-apply': {
    id: 'freelance-apply',
    name: 'Aplicar para Projetos',
    type: 'freelance',
    description: 'Busca e aplica automaticamente para projetos freelance',
    icon: '💼',
    requiredCredentials: ['upwork'],
    optionalCredentials: ['fiverr', 'gmail'],
    category: 'freelance',
    steps: [
      { id: 'login', name: 'Login na Plataforma', description: 'Autentica na plataforma de freelance', action: 'platform_login', requiredCredential: 'upwork' },
      { id: 'search', name: 'Buscar Projetos', description: 'Busca projetos compatíveis com seu perfil', action: 'project_search' },
      { id: 'filter', name: 'Filtrar Oportunidades', description: 'Filtra projetos por relevância e valor', action: 'project_filter' },
      { id: 'analyze', name: 'Analisar Requisitos', description: 'Analisa requisitos detalhados', action: 'requirement_analyze' },
      { id: 'proposal', name: 'Criar Proposta', description: 'Cria proposta personalizada', action: 'proposal_create' },
      { id: 'submit', name: 'Enviar Aplicação', description: 'Submete a aplicação', action: 'proposal_submit' },
    ],
    estimatedDuration: 30 * 60 * 1000, // 30 min
  },

  // Email
  'email-manage': {
    id: 'email-manage',
    name: 'Gerenciar Emails',
    type: 'email',
    description: 'Lê, organiza e responde emails automaticamente',
    icon: '📧',
    requiredCredentials: ['gmail'],
    optionalCredentials: ['smtp'],
    category: 'email',
    steps: [
      { id: 'connect', name: 'Conectar ao Email', description: 'Conecta à conta de email', action: 'email_connect', requiredCredential: 'gmail' },
      { id: 'fetch', name: 'Buscar Emails', description: 'Busca novos emails', action: 'email_fetch' },
      { id: 'categorize', name: 'Categorizar', description: 'Categoriza emails por prioridade', action: 'email_categorize' },
      { id: 'respond', name: 'Rascunhar Respostas', description: 'Cria rascunhos de respostas', action: 'email_respond' },
      { id: 'organize', name: 'Organizar', description: 'Move emails para pastas', action: 'email_organize' },
    ],
    estimatedDuration: 15 * 60 * 1000, // 15 min
  },

  // Development
  'dev-deploy': {
    id: 'dev-deploy',
    name: 'Deploy Automático',
    type: 'development',
    description: 'Faz commit, push e deploy de código',
    icon: '🚀',
    requiredCredentials: ['github'],
    optionalCredentials: ['npm', 'aws'],
    category: 'development',
    steps: [
      { id: 'review', name: 'Revisar Código', description: 'Revisa mudanças pendentes', action: 'code_review' },
      { id: 'test', name: 'Rodar Testes', description: 'Executa testes automatizados', action: 'test_run' },
      { id: 'commit', name: 'Fazer Commit', description: 'Cria commit com mensagem descritiva', action: 'git_commit' },
      { id: 'push', name: 'Push', description: 'Envia para repositório remoto', action: 'git_push', requiredCredential: 'github' },
      { id: 'deploy', name: 'Deploy', description: 'Faz deploy da aplicação', action: 'deploy_run', requiredCredential: 'aws', optional: true },
    ],
    estimatedDuration: 10 * 60 * 1000, // 10 min
  },

  // Research
  'research-deep': {
    id: 'research-deep',
    name: 'Pesquisa Profunda',
    type: 'research',
    description: 'Realiza pesquisa aprofundada sobre um tema',
    icon: '🔍',
    requiredCredentials: [],
    optionalCredentials: ['openai', 'anthropic'],
    category: 'ai',
    steps: [
      { id: 'understand', name: 'Entender Tema', description: 'Compreende o escopo da pesquisa', action: 'topic_analyze' },
      { id: 'search', name: 'Buscar Fontes', description: 'Busca fontes relevantes', action: 'source_search' },
      { id: 'extract', name: 'Extrair Informações', description: 'Extrai dados relevantes', action: 'info_extract' },
      { id: 'synthesize', name: 'Sintetizar', description: 'Sintetiza informações', action: 'info_synthesize' },
      { id: 'report', name: 'Gerar Relatório', description: 'Cria relatório final', action: 'report_generate' },
    ],
    estimatedDuration: 45 * 60 * 1000, // 45 min
  },
};

// ============================================
// WORKFLOW MANAGER
// ============================================

export class WorkflowManager extends EventEmitter {
  private credentialFlow: CredentialFlowManager;
  private activeWorkflows: Map<string, WorkflowInstance> = new Map();
  private workflowHistory: WorkflowInstance[] = [];
  private actionExecutor?: WorkflowActionExecutor;

  constructor(
    credentialFlow: CredentialFlowManager,
    options?: { actionExecutor?: WorkflowActionExecutor }
  ) {
    super();
    this.credentialFlow = credentialFlow;
    this.actionExecutor = options?.actionExecutor;
  }

  setActionExecutor(executor: WorkflowActionExecutor): void {
    this.actionExecutor = executor;
  }

  // ============================================
  // WORKFLOW LIFECYCLE
  // ============================================

  /**
   * Start a new workflow instance
   */
  async startWorkflow(
    definitionId: string,
    userId: string,
    agentId: string,
    metadata?: Record<string, unknown>
  ): Promise<WorkflowInstance | null> {
    const definition = WORKFLOW_DEFINITIONS[definitionId];
    if (!definition) {
      this.emit('error', { message: `Workflow '${definitionId}' não encontrado` });
      return null;
    }

    // Create instance
    const instanceId = this.generateId();
    const instance: WorkflowInstance = {
      instanceId,
      definitionId,
      userId,
      agentId,
      status: 'planning',
      context: {
        workflowId: instanceId,
        name: definition.name,
        type: definition.type,
        description: definition.description,
        requiredCredentials: definition.requiredCredentials,
        optionalCredentials: definition.optionalCredentials,
        steps: definition.steps.map(s => ({
          stepId: s.id,
          name: s.name,
          description: s.description,
          status: 'pending' as const,
          requiresCredential: s.requiredCredential,
          estimatedTime: s.timeout,
        })),
        status: 'pending',
        progress: 0,
      },
      currentStepIndex: 0,
      stepResults: new Map(),
      startedAt: new Date(),
      metadata: metadata || {},
    };

    // Initialize step results
    for (const step of definition.steps) {
      instance.stepResults.set(step.id, {
        stepId: step.id,
        status: 'pending',
        retryCount: 0,
      });
    }

    this.activeWorkflows.set(instanceId, instance);
    this.emitEvent('workflow_started', instanceId, { definition });

    // Check credentials
    const credentialsReady = await this.checkCredentials(instance, definition);
    if (!credentialsReady) {
      instance.status = 'awaiting_credentials';
      this.emitEvent('credential_needed', instanceId, { 
        required: definition.requiredCredentials 
      });
      return instance;
    }

    // Start execution
    instance.status = 'in_progress';
    this.executeWorkflow(instance, definition);

    return instance;
  }

  /**
   * Check if required credentials are available
   */
  private async checkCredentials(
    instance: WorkflowInstance,
    definition: WorkflowDefinition
  ): Promise<boolean> {
    const agentAccess = this.credentialFlow.createAgentAccess(instance.agentId);

    for (const schemaId of definition.requiredCredentials) {
      const hasCredential = await agentAccess.hasCredential(schemaId);
      if (!hasCredential) {
        // Request credential
        await agentAccess.requestCredential(
          schemaId,
          `Necessário para ${definition.name}`,
          instance.context
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Execute workflow steps
   */
  private async executeWorkflow(
    instance: WorkflowInstance,
    definition: WorkflowDefinition
  ): Promise<void> {
    const agentAccess = this.credentialFlow.createAgentAccess(instance.agentId);

    while (instance.currentStepIndex < definition.steps.length) {
      if (instance.status === 'paused' || instance.status === 'cancelled') {
        break;
      }

      const stepDef = definition.steps[instance.currentStepIndex];
      const stepResult = instance.stepResults.get(stepDef.id)!;

      // Check if step requires credential
      if (stepDef.requiredCredential) {
        const hasCredential = await agentAccess.hasCredential(stepDef.requiredCredential);
        if (!hasCredential) {
          if (stepDef.optional) {
            stepResult.status = 'skipped';
            this.emitEvent('step_skipped', instance.instanceId, { stepId: stepDef.id });
            instance.currentStepIndex++;
            continue;
          } else {
            instance.status = 'awaiting_credentials';
            await agentAccess.requestCredential(
              stepDef.requiredCredential,
              `Necessário para: ${stepDef.name}`,
              instance.context
            );
            return;
          }
        }
      }

      // Execute step
      stepResult.status = 'in_progress';
      stepResult.startedAt = new Date();
      this.emitEvent('step_started', instance.instanceId, { stepId: stepDef.id });

      try {
        const result = await this.executeStep(stepDef, instance, agentAccess);
        stepResult.status = 'completed';
        stepResult.completedAt = new Date();
        stepResult.result = result;
        this.emitEvent('step_completed', instance.instanceId, { stepId: stepDef.id, result });
      } catch (error) {
        stepResult.retryCount++;
        
        if (stepResult.retryCount < (stepDef.retries || 3)) {
          // Retry
          continue;
        }

        stepResult.status = 'failed';
        stepResult.error = String(error);
        this.emitEvent('step_failed', instance.instanceId, { stepId: stepDef.id, error: String(error) });

        if (!stepDef.optional) {
          instance.status = 'failed';
          instance.error = `Step '${stepDef.name}' failed: ${error}`;
          this.emitEvent('workflow_failed', instance.instanceId, { error: instance.error });
          return;
        }
      }

      // Update progress
      instance.currentStepIndex++;
      instance.context.progress = (instance.currentStepIndex / definition.steps.length) * 100;
      instance.context.currentStep = instance.currentStepIndex;
      this.emitEvent('progress_update', instance.instanceId, { 
        progress: instance.context.progress,
        currentStep: instance.currentStepIndex,
      });
    }

    // Workflow completed
    instance.status = 'completed';
    instance.completedAt = new Date();
    instance.context.status = 'completed';
    instance.context.progress = 100;
    
    this.emitEvent('workflow_completed', instance.instanceId, {
      duration: instance.completedAt.getTime() - instance.startedAt.getTime(),
    });

    // Move to history
    this.activeWorkflows.delete(instance.instanceId);
    this.workflowHistory.push(instance);
  }

  /**
   * Execute a single step via action executor
   */
  private async executeStep(
    step: WorkflowStepDefinition,
    instance: WorkflowInstance,
    agentAccess: AgentCredentialAccess
  ): Promise<unknown> {
    if (!this.actionExecutor) {
      throw new Error(
        `Nenhum executor configurado para ações de workflow (action='${step.action}'). ` +
          'Configure WorkflowManager.setActionExecutor(...) para integrar com o runtime.'
      );
    }

    return this.actionExecutor({
      action: step.action,
      step,
      instance,
      agentAccess,
    });
  }

  // ============================================
  // WORKFLOW CONTROL
  // ============================================

  /**
   * Pause a running workflow
   */
  pauseWorkflow(instanceId: string): boolean {
    const instance = this.activeWorkflows.get(instanceId);
    if (instance && instance.status === 'in_progress') {
      instance.status = 'paused';
      this.emitEvent('workflow_paused', instanceId, {});
      return true;
    }
    return false;
  }

  /**
   * Resume a paused workflow
   */
  resumeWorkflow(instanceId: string): boolean {
    const instance = this.activeWorkflows.get(instanceId);
    if (instance && instance.status === 'paused') {
      instance.status = 'in_progress';
      this.emitEvent('workflow_resumed', instanceId, {});
      
      const definition = WORKFLOW_DEFINITIONS[instance.definitionId];
      if (definition) {
        this.executeWorkflow(instance, definition);
      }
      return true;
    }
    return false;
  }

  /**
   * Cancel a workflow
   */
  cancelWorkflow(instanceId: string): boolean {
    const instance = this.activeWorkflows.get(instanceId);
    if (instance) {
      instance.status = 'cancelled';
      this.emitEvent('workflow_cancelled', instanceId, {});
      this.activeWorkflows.delete(instanceId);
      this.workflowHistory.push(instance);
      return true;
    }
    return false;
  }

  /**
   * Resume workflow after credentials provided
   */
  resumeAfterCredentials(instanceId: string): void {
    const instance = this.activeWorkflows.get(instanceId);
    if (instance && instance.status === 'awaiting_credentials') {
      instance.status = 'in_progress';
      const definition = WORKFLOW_DEFINITIONS[instance.definitionId];
      if (definition) {
        this.executeWorkflow(instance, definition);
      }
    }
  }

  // ============================================
  // GETTERS
  // ============================================

  getWorkflow(instanceId: string): WorkflowInstance | undefined {
    return this.activeWorkflows.get(instanceId);
  }

  getActiveWorkflows(): WorkflowInstance[] {
    return Array.from(this.activeWorkflows.values());
  }

  getWorkflowHistory(limit: number = 50): WorkflowInstance[] {
    return this.workflowHistory.slice(-limit);
  }

  getAvailableWorkflows(): WorkflowDefinition[] {
    return Object.values(WORKFLOW_DEFINITIONS);
  }

  // ============================================
  // UTILITIES
  // ============================================

  private generateId(): string {
    return `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private emitEvent(type: WorkflowEventType, instanceId: string, data: Record<string, unknown>): void {
    const event: WorkflowEvent = {
      type,
      instanceId,
      timestamp: new Date(),
      data,
    };
    this.emit('workflowEvent', event);
    this.emit(type, event);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    for (const instance of this.activeWorkflows.values()) {
      instance.status = 'cancelled';
    }
    this.activeWorkflows.clear();
    this.removeAllListeners();
  }
}
