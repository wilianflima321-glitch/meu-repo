/**
 * ============================================
 * MISSION SYSTEM - AUTONOMOUS TASK COMPLETION
 * ============================================
 * 
 * Sistema de missões para execução autônoma de tarefas complexas
 * Permite que a IA complete objetivos multi-passo de forma independente
 * 
 * Recursos:
 * - Decomposição automática de tarefas COM LLM REAL
 * - Execução paralela quando possível
 * - Recovery automático de falhas
 * - Aprendizado com missões anteriores
 * - Planejamento inteligente via LLM Integration Bridge
 */

import { EventEmitter } from 'events';
import type { BrowserClient } from '../web-automation/browser-client';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import type { LLMIntegrationBridge, PlanningResult, PlanStep } from '../llm/llm-integration-bridge';

// ============================================
// TYPES
// ============================================

export type MissionPriority = 'critical' | 'high' | 'normal' | 'low';
export type MissionStatus = 
  | 'pending'
  | 'planning'
  | 'executing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TaskStatus = 
  | 'pending'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export type TaskType = 
  | 'navigate'
  | 'click'
  | 'type'
  | 'fill_form'
  | 'login'
  | 'create_account'
  | 'deploy'
  | 'download'
  | 'upload'
  | 'extract_data'
  | 'execute_code'
  | 'api_call'
  | 'wait'
  | 'decision'
  | 'loop'
  | 'custom';

export interface Mission {
  id: string;
  name: string;
  description: string;
  objective: string;
  priority: MissionPriority;
  status: MissionStatus;
  
  // Planning
  tasks: Task[];
  dependencies: Map<string, string[]>;
  
  // Execution
  currentTaskId?: string;
  startTime?: number;
  endTime?: number;
  
  // Results
  results: Map<string, unknown>;
  errors: MissionError[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  retryCount: number;
  maxRetries: number;
}

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  status: TaskStatus;
  
  // Execution
  action: TaskAction;
  parameters: Record<string, unknown>;
  
  // Dependencies
  dependsOn: string[];
  
  // Timing
  startTime?: number;
  endTime?: number;
  timeout: number;
  
  // Results
  result?: unknown;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface TaskAction {
  type: TaskType;
  target?: string;
  value?: string | number | boolean;
  selector?: string;
  url?: string;
  code?: string;
  condition?: string;
  iterations?: number;
  waitTime?: number;
  customHandler?: string;
}

export interface MissionError {
  taskId: string;
  error: string;
  timestamp: Date;
  recovered: boolean;
}

export interface MissionTemplate {
  id: string;
  name: string;
  description: string;
  category: MissionCategory;
  tasks: TaskTemplate[];
  variables: TemplateVariable[];
}

export type MissionCategory = 
  | 'web_automation'
  | 'account_management'
  | 'data_extraction'
  | 'deployment'
  | 'trading'
  | 'freelance'
  | 'custom';

export interface TaskTemplate {
  id: string;
  name: string;
  type: TaskType;
  action: Partial<TaskAction>;
  parameters: Record<string, string>; // pode conter variáveis {{var}}
  dependsOn: string[];
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: unknown;
  description: string;
}

export interface ExecutionContext {
  missionId: string;
  variables: Map<string, unknown>;
  results: Map<string, unknown>;
  browser?: unknown; // AutonomousBrowserController
  currentUrl?: string;
}

export interface MissionPlan {
  tasks: Task[];
  executionOrder: string[];
  parallelGroups: string[][];
  estimatedDuration: number;
}

// ============================================
// MISSION TEMPLATES
// ============================================

export const MISSION_TEMPLATES: MissionTemplate[] = [
  // Web Scraping
  {
    id: 'web_scrape',
    name: 'Web Scraping',
    description: 'Extrair dados de uma página web',
    category: 'data_extraction',
    tasks: [
      {
        id: 'navigate',
        name: 'Navigate to URL',
        type: 'navigate',
        action: { type: 'navigate' },
        parameters: { url: '{{url}}' },
        dependsOn: [],
      },
      {
        id: 'wait',
        name: 'Wait for page load',
        type: 'wait',
        action: { type: 'wait', waitTime: 2000 },
        parameters: {},
        dependsOn: ['navigate'],
      },
      {
        id: 'extract',
        name: 'Extract data',
        type: 'extract_data',
        action: { type: 'extract_data' },
        parameters: { selectors: '{{selectors}}' },
        dependsOn: ['wait'],
      },
    ],
    variables: [
      { name: 'url', type: 'string', required: true, description: 'URL to scrape' },
      { name: 'selectors', type: 'object', required: true, description: 'CSS selectors for data extraction' },
    ],
  },

  // Deploy to Cloud
  {
    id: 'deploy_cloud',
    name: 'Deploy to Cloud',
    description: 'Deploy aplicação para cloud provider',
    category: 'deployment',
    tasks: [
      {
        id: 'login',
        name: 'Login to provider',
        type: 'login',
        action: { type: 'login' },
        parameters: {
          service: '{{provider}}',
          email: '{{email}}',
          password: '{{password}}',
        },
        dependsOn: [],
      },
      {
        id: 'navigate_dashboard',
        name: 'Go to dashboard',
        type: 'navigate',
        action: { type: 'navigate' },
        parameters: { url: '{{dashboardUrl}}' },
        dependsOn: ['login'],
      },
      {
        id: 'create_project',
        name: 'Create new project',
        type: 'click',
        action: { type: 'click', selector: '[data-testid="new-project"]' },
        parameters: {},
        dependsOn: ['navigate_dashboard'],
      },
      {
        id: 'connect_repo',
        name: 'Connect repository',
        type: 'fill_form',
        action: { type: 'fill_form' },
        parameters: { repository: '{{repository}}' },
        dependsOn: ['create_project'],
      },
      {
        id: 'deploy',
        name: 'Trigger deployment',
        type: 'click',
        action: { type: 'click', selector: '[data-testid="deploy"]' },
        parameters: {},
        dependsOn: ['connect_repo'],
      },
      {
        id: 'wait_deploy',
        name: 'Wait for deployment',
        type: 'wait',
        action: { type: 'wait', waitTime: 60000 },
        parameters: {},
        dependsOn: ['deploy'],
      },
    ],
    variables: [
      { name: 'provider', type: 'string', required: true, description: 'Cloud provider name' },
      { name: 'email', type: 'string', required: true, description: 'Account email' },
      { name: 'password', type: 'string', required: true, description: 'Account password' },
      { name: 'dashboardUrl', type: 'string', required: true, description: 'Dashboard URL' },
      { name: 'repository', type: 'string', required: true, description: 'Git repository URL' },
    ],
  },
  
  // Freelance Job Application
  {
    id: 'apply_freelance',
    name: 'Apply to Freelance Job',
    description: 'Aplicar para trabalho em plataforma freelance',
    category: 'freelance',
    tasks: [
      {
        id: 'login',
        name: 'Login to platform',
        type: 'login',
        action: { type: 'login' },
        parameters: {
          service: '{{platform}}',
          email: '{{email}}',
          password: '{{password}}',
        },
        dependsOn: [],
      },
      {
        id: 'navigate_job',
        name: 'Go to job listing',
        type: 'navigate',
        action: { type: 'navigate' },
        parameters: { url: '{{jobUrl}}' },
        dependsOn: ['login'],
      },
      {
        id: 'click_apply',
        name: 'Click apply button',
        type: 'click',
        action: { type: 'click', selector: '[data-testid="apply-btn"]' },
        parameters: {},
        dependsOn: ['navigate_job'],
      },
      {
        id: 'fill_proposal',
        name: 'Fill proposal',
        type: 'fill_form',
        action: { type: 'fill_form' },
        parameters: {
          coverLetter: '{{coverLetter}}',
          rate: '{{rate}}',
          duration: '{{duration}}',
        },
        dependsOn: ['click_apply'],
      },
      {
        id: 'submit_proposal',
        name: 'Submit proposal',
        type: 'click',
        action: { type: 'click', selector: '[data-testid="submit-proposal"]' },
        parameters: {},
        dependsOn: ['fill_proposal'],
      },
    ],
    variables: [
      { name: 'platform', type: 'string', required: true, description: 'Freelance platform' },
      { name: 'email', type: 'string', required: true, description: 'Account email' },
      { name: 'password', type: 'string', required: true, description: 'Account password' },
      { name: 'jobUrl', type: 'string', required: true, description: 'Job listing URL' },
      { name: 'coverLetter', type: 'string', required: true, description: 'Cover letter text' },
      { name: 'rate', type: 'number', required: true, description: 'Hourly rate' },
      { name: 'duration', type: 'string', required: false, description: 'Estimated duration' },
    ],
  },
];

// ============================================
// AI PLANNER (COM LLM REAL!)
// ============================================

export class AIPlanner {
  private templates: Map<string, MissionTemplate> = new Map();
  private llmBridge?: LLMIntegrationBridge;
  private useLLM: boolean = true; // Habilitar LLM por padrão

  private async getOrLoadLLMBridge(): Promise<LLMIntegrationBridge | undefined> {
    if (this.llmBridge) return this.llmBridge;

    try {
      const mod = await import('../llm/llm-integration-bridge');
      this.llmBridge = mod.getLLMBridge();
      return this.llmBridge;
    } catch (error) {
      console.warn('[AIPlanner] ⚠️ Não foi possível carregar LLM bridge (seguindo com heurísticas):', error);
      return undefined;
    }
  }
  
  constructor(options?: { useLLM?: boolean }) {
    // Carregar templates
    for (const template of MISSION_TEMPLATES) {
      this.templates.set(template.id, template);
    }
    
    this.useLLM = options?.useLLM ?? true;
  }
  
  async planMission(objective: string, context: Record<string, unknown>): Promise<MissionPlan> {
    // ============================================
    // TENTAR USAR LLM REAL PRIMEIRO
    // ============================================
    if (this.useLLM) {
      const bridge = await this.getOrLoadLLMBridge();
      if (!bridge?.isReady()) {
        console.warn('[AIPlanner] LLM não disponível - usando fallback com heurísticas');
        this.useLLM = false;
      }
    }

    if (this.useLLM && this.llmBridge?.isReady()) {
      try {
        console.log('[AIPlanner] 🧠 Usando LLM real para planejamento...');
        
        // Preparar lista de ferramentas disponíveis
        const availableTools = [
          'navigate - navegar para URL',
          'click - clicar em elemento',
          'type - digitar texto',
          'fill_form - preencher formulário',
          'login - fazer login',
          'deploy - fazer deploy',
          'download - baixar arquivo',
          'upload - fazer upload',
          'extract_data - extrair dados',
          'execute_code - executar código',
          'api_call - chamada de API',
          'wait - aguardar',
        ];
        
        // Preparar contexto adicional
        const contextStr = Object.entries(context)
          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
          .join('\n');
        
        // Chamar LLM Bridge para planejamento
        const llmPlan = await this.llmBridge.planMission({
          objective,
          context: contextStr || undefined,
          availableTools,
          maxSteps: 20,
          constraints: [
            'Cada passo deve ser atômico',
            'Considere tratamento de erros',
            'Minimize número de passos'
          ]
        });
        
        // Converter plano do LLM para formato interno
        const tasks = this.convertLLMPlanToTasks(llmPlan);
        const executionOrder = this.topologicalSort(tasks);
        const parallelGroups = this.findParallelGroups(tasks, executionOrder);
        const estimatedDuration = this.estimateDuration(tasks);
        
        console.log(`[AIPlanner] ✅ Plano gerado com LLM: ${tasks.length} tasks, confiança: ${llmPlan.confidence}%`);
        
        return {
          tasks,
          executionOrder,
          parallelGroups,
          estimatedDuration,
        };
        
      } catch (error) {
        console.warn('[AIPlanner] ⚠️ Erro ao usar LLM, usando fallback:', error);
        // Continua com fallback heurístico
      }
    }
    
    // ============================================
    // FALLBACK: USAR HEURÍSTICAS
    // ============================================
    console.log('[AIPlanner] 📋 Usando planejamento por heurísticas...');
    
    // 1. Analisar objetivo
    const analysis = this.analyzeObjective(objective);
    
    // 2. Encontrar template mais adequado
    const template = this.findBestTemplate(analysis);
    
    // 3. Gerar tasks
    const tasks = this.generateTasks(template, context, analysis);
    
    // 4. Determinar ordem de execução
    const executionOrder = this.topologicalSort(tasks);
    
    // 5. Identificar grupos paralelos
    const parallelGroups = this.findParallelGroups(tasks, executionOrder);
    
    // 6. Estimar duração
    const estimatedDuration = this.estimateDuration(tasks);
    
    return {
      tasks,
      executionOrder,
      parallelGroups,
      estimatedDuration,
    };
  }
  
  /**
   * Converte plano do LLM para formato de Tasks interno
   */
  private convertLLMPlanToTasks(llmPlan: PlanningResult): Task[] {
    return llmPlan.plan.map((step: PlanStep) => {
      // Mapear tool do LLM para TaskType
      const taskType = this.mapToolToTaskType(step.tool || 'custom');
      
      return {
        id: `step_${step.id}`,
        name: step.action,
        type: taskType,
        status: 'pending' as TaskStatus,
        action: {
          type: taskType,
          ...(step.parameters || {}),
        },
        parameters: step.parameters || {},
        dependsOn: (step.dependencies || []).map(d => `step_${d}`),
        timeout: this.getTimeoutForType(taskType),
        retryCount: 0,
        maxRetries: 3,
      };
    });
  }
  
  /**
   * Mapeia nome de ferramenta para TaskType
   */
  private mapToolToTaskType(tool: string): TaskType {
    const mapping: Record<string, TaskType> = {
      'navigate': 'navigate',
      'browser': 'navigate',
      'click': 'click',
      'type': 'type',
      'fill_form': 'fill_form',
      'form': 'fill_form',
      'login': 'login',
      'deploy': 'deploy',
      'download': 'download',
      'upload': 'upload',
      'extract_data': 'extract_data',
      'extract': 'extract_data',
      'scrape': 'extract_data',
      'execute_code': 'execute_code',
      'code': 'execute_code',
      'terminal': 'execute_code',
      'api_call': 'api_call',
      'api': 'api_call',
      'wait': 'wait',
      'decision': 'decision',
      'loop': 'loop',
    };
    
    return mapping[tool.toLowerCase()] || 'custom';
  }
  
  /**
   * Retorna timeout apropriado para cada tipo de task
   */
  private getTimeoutForType(type: TaskType): number {
    const timeouts: Record<TaskType, number> = {
      navigate: 30000,
      click: 5000,
      type: 10000,
      fill_form: 30000,
      login: 60000,
      create_account: 120000,
      deploy: 300000,
      download: 60000,
      upload: 60000,
      extract_data: 30000,
      execute_code: 60000,
      api_call: 30000,
      wait: 60000,
      decision: 5000,
      loop: 120000,
      custom: 60000,
    };
    
    return timeouts[type] || 60000;
  }
  
  private analyzeObjective(objective: string): {
    category: MissionCategory;
    keywords: string[];
    entities: string[];
  } {
    const lowerObjective = objective.toLowerCase();
    
    // Detectar categoria
    let category: MissionCategory = 'custom';

    if (/deploy|publicar|upload|vercel|netlify|aws/i.test(objective)) {
      category = 'deployment';
    } else if (/extrair|scrape|coletar|dados/i.test(objective)) {
      category = 'data_extraction';
    } else if (/freelanc|upwork|fiverr|aplicar.*trabalho/i.test(objective)) {
      category = 'freelance';
    } else if (/trad|comprar|vender|bitcoin|crypto/i.test(objective)) {
      category = 'trading';
    } else if (/navegar|clicar|preencher|login/i.test(objective)) {
      category = 'web_automation';
    }
    
    // Extrair keywords
    const keywords = lowerObjective
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !['para', 'como', 'onde', 'quando', 'porque'].includes(w));
    
    // Extrair entidades (URLs, emails, etc)
    const entities: string[] = [];
    const urlMatch = objective.match(/https?:\/\/[^\s]+/g);
    if (urlMatch) entities.push(...urlMatch);
    const emailMatch = objective.match(/[\w.-]+@[\w.-]+\.\w+/g);
    if (emailMatch) entities.push(...emailMatch);
    
    return { category, keywords, entities };
  }
  
  private findBestTemplate(analysis: {
    category: MissionCategory;
    keywords: string[];
    entities: string[];
  }): MissionTemplate | null {
    // Encontrar templates da mesma categoria
    const categoryTemplates = Array.from(this.templates.values())
      .filter(t => t.category === analysis.category);
    
    if (categoryTemplates.length === 0) {
      return null;
    }
    
    // Scoring baseado em keywords
    let bestTemplate = categoryTemplates[0];
    let bestScore = 0;
    
    for (const template of categoryTemplates) {
      let score = 0;
      const templateText = `${template.name} ${template.description}`.toLowerCase();
      
      for (const keyword of analysis.keywords) {
        if (templateText.includes(keyword)) {
          score++;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestTemplate = template;
      }
    }
    
    return bestTemplate;
  }
  
  private generateTasks(
    template: MissionTemplate | null,
    context: Record<string, unknown>,
    analysis: { category: MissionCategory; keywords: string[]; entities: string[] }
  ): Task[] {
    if (template) {
      return this.instantiateTemplate(template, context);
    }
    
    // Gerar tasks genéricos baseado na análise
    return this.generateCustomTasks(analysis, context);
  }
  
  private instantiateTemplate(
    template: MissionTemplate,
    context: Record<string, unknown>
  ): Task[] {
    return template.tasks.map(taskTemplate => {
      // Substituir variáveis nos parâmetros
      const parameters: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(taskTemplate.parameters)) {
        if (typeof value === 'string' && value.includes('{{')) {
          // Substituir variáveis
          parameters[key] = value.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
            return String(context[varName] || '');
          });
        } else {
          parameters[key] = value;
        }
      }
      
      return {
        id: taskTemplate.id,
        name: taskTemplate.name,
        type: taskTemplate.type,
        status: 'pending' as TaskStatus,
        action: {
          ...taskTemplate.action,
          type: taskTemplate.type,
        },
        parameters,
        dependsOn: taskTemplate.dependsOn,
        timeout: 30000,
        retryCount: 0,
        maxRetries: 3,
      };
    });
  }
  
  private generateCustomTasks(
    analysis: { category: MissionCategory; keywords: string[]; entities: string[] },
    context: Record<string, unknown>
  ): Task[] {
    const tasks: Task[] = [];
    
    // Gerar task de navegação se tiver URL
    const urls = analysis.entities.filter(e => e.startsWith('http'));
    if (urls.length > 0) {
      tasks.push({
        id: 'navigate_1',
        name: 'Navigate to URL',
        type: 'navigate',
        status: 'pending',
        action: { type: 'navigate', url: urls[0] },
        parameters: { url: urls[0] },
        dependsOn: [],
        timeout: 30000,
        retryCount: 0,
        maxRetries: 3,
      });
    }
    
    // Adicionar wait após navegação
    if (tasks.length > 0) {
      tasks.push({
        id: 'wait_1',
        name: 'Wait for page load',
        type: 'wait',
        status: 'pending',
        action: { type: 'wait', waitTime: 2000 },
        parameters: {},
        dependsOn: [tasks[tasks.length - 1].id],
        timeout: 5000,
        retryCount: 0,
        maxRetries: 1,
      });
    }

    // Heurística: missões de Git (sem URL) -> comandos executáveis
    if (tasks.length === 0) {
      const keywordsText = (analysis.keywords || []).join(' ').toLowerCase();
      const isGitMission = /\bgit\b|\bcommit\b|reposit|repo|branch|clonar|clone/i.test(keywordsText);
      if (isGitMission) {
        const repoPath = typeof context.repoPath === 'string' ? (context.repoPath as string) : '.';
        const message = typeof context.message === 'string' ? (context.message as string) : 'chore: initial commit';
        const safeMessage = message.replace(/\r?\n/g, ' ').replace(/"/g, '\\"');

        tasks.push({
          id: 'git_init',
          name: 'Initialize git repository',
          type: 'execute_code',
          status: 'pending',
          action: { type: 'execute_code', code: `git -C "${repoPath}" init` },
          parameters: { repoPath },
          dependsOn: [],
          timeout: 60000,
          retryCount: 0,
          maxRetries: 1,
        });

        tasks.push({
          id: 'git_add',
          name: 'Stage changes',
          type: 'execute_code',
          status: 'pending',
          action: { type: 'execute_code', code: `git -C "${repoPath}" add -A` },
          parameters: { repoPath },
          dependsOn: ['git_init'],
          timeout: 60000,
          retryCount: 0,
          maxRetries: 1,
        });

        tasks.push({
          id: 'git_commit',
          name: 'Create commit',
          type: 'execute_code',
          status: 'pending',
          action: { type: 'execute_code', code: `git -C "${repoPath}" commit -m "${safeMessage}"` },
          parameters: { repoPath, message },
          dependsOn: ['git_add'],
          timeout: 60000,
          retryCount: 0,
          maxRetries: 1,
        });
      }
    }
    
    return tasks;
  }
  
  private topologicalSort(tasks: Task[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Construir grafo
    for (const task of tasks) {
      graph.set(task.id, []);
      inDegree.set(task.id, task.dependsOn.length);
    }
    
    for (const task of tasks) {
      for (const dep of task.dependsOn) {
        const deps = graph.get(dep) || [];
        deps.push(task.id);
        graph.set(dep, deps);
      }
    }
    
    // Kahn's algorithm
    const queue: string[] = [];
    const result: string[] = [];
    
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      
      for (const neighbor of (graph.get(current) || [])) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }
    
    return result;
  }
  
  private findParallelGroups(tasks: Task[], executionOrder: string[]): string[][] {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const groups: string[][] = [];
    const processed = new Set<string>();
    
    for (const taskId of executionOrder) {
      if (processed.has(taskId)) continue;
      
      const task = taskMap.get(taskId)!;
      const group: string[] = [taskId];
      processed.add(taskId);
      
      // Encontrar tasks que podem rodar em paralelo
      for (const otherId of executionOrder) {
        if (processed.has(otherId)) continue;
        
        const other = taskMap.get(otherId)!;
        
        // Pode rodar em paralelo se não depende do task atual
        // e não é dependência de tasks já no grupo
        const canParallel = !other.dependsOn.includes(taskId) &&
          !group.some(g => other.dependsOn.includes(g));
        
        if (canParallel) {
          group.push(otherId);
          processed.add(otherId);
        }
      }
      
      groups.push(group);
    }
    
    return groups;
  }
  
  private estimateDuration(tasks: Task[]): number {
    // Estimativa baseada no tipo de task
    const estimates: Record<TaskType, number> = {
      navigate: 3000,
      click: 500,
      type: 1000,
      fill_form: 5000,
      login: 10000,
      create_account: 30000,
      deploy: 120000,
      download: 10000,
      upload: 10000,
      extract_data: 5000,
      execute_code: 5000,
      api_call: 2000,
      wait: 0, // usa o valor configurado
      decision: 1000,
      loop: 10000,
      custom: 5000,
    };
    
    let total = 0;
    for (const task of tasks) {
      if (task.type === 'wait' && task.action.waitTime) {
        total += task.action.waitTime;
      } else {
        total += estimates[task.type] || 5000;
      }
    }
    
    return total;
  }
  
  registerTemplate(template: MissionTemplate): void {
    this.templates.set(template.id, template);
  }
}

// ============================================
// MISSION EXECUTOR
// ============================================

export class MissionExecutor extends EventEmitter {
  private planner: AIPlanner;
  private missions: Map<string, Mission> = new Map();
  private executionQueue: Mission[] = [];
  private isExecuting: boolean = false;
  private browser?: BrowserClient;
  
  // Handlers para diferentes tipos de tasks
  private taskHandlers: Map<TaskType, TaskHandler> = new Map();
  
  constructor(options?: { browser?: BrowserClient }) {
    super();
    
    this.planner = new AIPlanner();
    this.browser = options?.browser;
    
    // Registrar handlers padrão
    this.registerDefaultHandlers();
  }
  
  private registerDefaultHandlers(): void {
    this.taskHandlers.set('navigate', new NavigateHandler(this.browser));
    this.taskHandlers.set('click', new ClickHandler(this.browser));
    this.taskHandlers.set('type', new TypeHandler(this.browser));
    this.taskHandlers.set('fill_form', new FillFormHandler(this.browser));
    this.taskHandlers.set('wait', new WaitHandler());
    this.taskHandlers.set('extract_data', new ExtractDataHandler(this.browser));
    this.taskHandlers.set('decision', new DecisionHandler());
    this.taskHandlers.set('execute_code', new ExecuteCodeHandler());
    this.taskHandlers.set('api_call', new ApiCallHandler());
  }

  // ============================================
  // MISSION CREATION
  // ============================================

  async createMission(
    name: string,
    objective: string,
    context: Record<string, unknown> = {},
    options: {
      priority?: MissionPriority;
      maxRetries?: number;
    } = {}
  ): Promise<Mission> {
    // Planejar missão
    const plan = await this.planner.planMission(objective, context);
    
    const mission: Mission = {
      id: this.generateMissionId(),
      name,
      description: objective,
      objective,
      priority: options.priority || 'normal',
      status: 'pending',
      tasks: plan.tasks,
      dependencies: new Map(),
      results: new Map(),
      errors: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
    };
    
    // Construir mapa de dependências
    for (const task of plan.tasks) {
      mission.dependencies.set(task.id, task.dependsOn);
    }
    
    this.missions.set(mission.id, mission);
    
    this.emit('mission_created', { mission });
    
    return mission;
  }

  async createMissionFromTemplate(
    templateId: string,
    variables: Record<string, unknown>,
    options: {
      name?: string;
      priority?: MissionPriority;
    } = {}
  ): Promise<Mission | null> {
    const template = MISSION_TEMPLATES.find(t => t.id === templateId);
    
    if (!template) {
      return null;
    }
    
    return this.createMission(
      options.name || template.name,
      template.description,
      variables,
      { priority: options.priority }
    );
  }

  // ============================================
  // MISSION EXECUTION
  // ============================================

  async executeMission(missionId: string): Promise<boolean> {
    const mission = this.missions.get(missionId);
    if (!mission) return false;
    
    if (mission.status !== 'pending') {
      this.emit('error', { missionId, error: 'Mission already started' });
      return false;
    }
    
    mission.status = 'executing';
    mission.startTime = Date.now();
    mission.updatedAt = new Date();
    
    this.emit('mission_started', { mission });
    
    try {
      const context: ExecutionContext = {
        missionId,
        variables: new Map(),
        results: mission.results,
      };
      
      // Obter ordem de execução
      const executionOrder = this.getExecutionOrder(mission);
      
      // Executar tasks
      for (const taskId of executionOrder) {
        const task = mission.tasks.find(t => t.id === taskId);
        if (!task) continue;
        
        // Verificar se missão foi pausada ou cancelada
        if (mission.status !== 'executing') {
          break;
        }
        
        // Verificar dependências
        const dependenciesMet = this.checkDependencies(task, mission);
        if (!dependenciesMet) {
          task.status = 'skipped';
          continue;
        }
        
        // Executar task
        mission.currentTaskId = taskId;
        const success = await this.executeTask(task, context);
        
        if (!success && task.retryCount < task.maxRetries) {
          // Retry
          task.retryCount++;
          await this.delay(1000 * task.retryCount);
          const retrySuccess = await this.executeTask(task, context);
          
          if (!retrySuccess) {
            // Falha definitiva
            mission.errors.push({
              taskId,
              error: task.error || 'Unknown error',
              timestamp: new Date(),
              recovered: false,
            });
            
            // Tentar recovery
            const recovered = await this.tryRecovery(mission, task);
            if (!recovered) {
              mission.status = 'failed';
              break;
            }
          }
        } else if (!success) {
          mission.status = 'failed';
          break;
        }
        
        // Armazenar resultado
        if (task.result !== undefined) {
          mission.results.set(taskId, task.result);
        }
      }
      
      // Finalizar
      if (mission.status === 'executing') {
        mission.status = 'completed';
      }
      
      mission.endTime = Date.now();
      mission.updatedAt = new Date();
      
      this.emit(mission.status === 'completed' ? 'mission_completed' : 'mission_failed', { mission });
      
      return mission.status === 'completed';
    } catch (error) {
      mission.status = 'failed';
      mission.endTime = Date.now();
      mission.updatedAt = new Date();
      
      this.emit('mission_failed', { 
        mission, 
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return false;
    }
  }

  private async executeTask(task: Task, context: ExecutionContext): Promise<boolean> {
    task.status = 'running';
    task.startTime = Date.now();
    
    this.emit('task_started', { task, context });
    
    try {
      const handler = this.taskHandlers.get(task.type);
      
      if (!handler) {
        throw new Error(`No handler for task type: ${task.type}`);
      }
      
      // Executar com timeout
      const result = await Promise.race([
        handler.execute(task, context),
        this.timeout(task.timeout),
      ]);
      
      task.result = result;
      task.status = 'completed';
      task.endTime = Date.now();
      
      this.emit('task_completed', { task, result });
      
      return true;
    } catch (error) {
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.status = 'failed';
      task.endTime = Date.now();
      
      this.emit('task_failed', { task, error: task.error });
      
      return false;
    }
  }

  private getExecutionOrder(mission: Mission): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    
    const visit = (taskId: string) => {
      if (visited.has(taskId)) return;
      
      const task = mission.tasks.find(t => t.id === taskId);
      if (!task) return;
      
      for (const dep of task.dependsOn) {
        visit(dep);
      }
      
      visited.add(taskId);
      result.push(taskId);
    };
    
    for (const task of mission.tasks) {
      visit(task.id);
    }
    
    return result;
  }

  private checkDependencies(task: Task, mission: Mission): boolean {
    for (const depId of task.dependsOn) {
      const depTask = mission.tasks.find(t => t.id === depId);
      if (!depTask || depTask.status !== 'completed') {
        return false;
      }
    }
    return true;
  }

  private async tryRecovery(mission: Mission, failedTask: Task): Promise<boolean> {
    this.emit('recovery_attempt', { mission, failedTask });
    
    // Estratégias de recovery baseadas no tipo de falha
    
    // 1. Tentar refrescar página
    if (failedTask.type === 'click' || failedTask.type === 'fill_form') {
      // Refrescar e tentar novamente
      return false; // Simplificação
    }
    
    // 2. Pular task opcional
    if (!this.isTaskCritical(failedTask, mission)) {
      failedTask.status = 'skipped';
      mission.errors[mission.errors.length - 1].recovered = true;
      return true;
    }
    
    return false;
  }

  private isTaskCritical(task: Task, mission: Mission): boolean {
    // Task é crítico se outros tasks dependem dele
    for (const t of mission.tasks) {
      if (t.dependsOn.includes(task.id) && t.status === 'pending') {
        return true;
      }
    }
    return false;
  }

  // ============================================
  // MISSION CONTROL
  // ============================================

  pauseMission(missionId: string): boolean {
    const mission = this.missions.get(missionId);
    if (!mission || mission.status !== 'executing') return false;
    
    mission.status = 'paused';
    mission.updatedAt = new Date();
    
    this.emit('mission_paused', { mission });
    return true;
  }

  resumeMission(missionId: string): boolean {
    const mission = this.missions.get(missionId);
    if (!mission || mission.status !== 'paused') return false;
    
    mission.status = 'executing';
    mission.updatedAt = new Date();
    
    this.emit('mission_resumed', { mission });
    
    // Retomar execução
    this.executeMission(missionId);
    return true;
  }

  cancelMission(missionId: string): boolean {
    const mission = this.missions.get(missionId);
    if (!mission) return false;
    
    mission.status = 'cancelled';
    mission.endTime = Date.now();
    mission.updatedAt = new Date();
    
    this.emit('mission_cancelled', { mission });
    return true;
  }

  // ============================================
  // QUERIES
  // ============================================

  getMission(missionId: string): Mission | undefined {
    return this.missions.get(missionId);
  }

  getAllMissions(): Mission[] {
    return Array.from(this.missions.values());
  }

  getMissionsByStatus(status: MissionStatus): Mission[] {
    return Array.from(this.missions.values())
      .filter(m => m.status === status);
  }

  getActiveMissions(): Mission[] {
    return this.getMissionsByStatus('executing');
  }

  // ============================================
  // UTILITIES
  // ============================================

  private generateMissionId(): string {
    return `mission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Task timeout')), ms)
    );
  }

  registerTaskHandler(type: TaskType, handler: TaskHandler): void {
    this.taskHandlers.set(type, handler);
  }
}

// ============================================
// TASK HANDLERS
// ============================================

interface TaskHandler {
  execute(task: Task, context: ExecutionContext): Promise<unknown>;
}

class NavigateHandler implements TaskHandler {
  constructor(private browser?: BrowserClient) {}

  async execute(task: Task, context: ExecutionContext): Promise<unknown> {
    const url = task.parameters.url as string || task.action.url;
    
    if (!url) throw new Error('No URL provided');

    if (!this.browser) {
      throw new Error('BrowserClient não configurado para tasks web (navigate).');
    }

    await this.browser.initialize();
    const result = await this.browser.navigateTo(url);
    context.currentUrl = result.url;
    return result;
  }
}

class ClickHandler implements TaskHandler {
  constructor(private browser?: BrowserClient) {}

  async execute(task: Task, context: ExecutionContext): Promise<unknown> {
    const selector = task.action.selector;
    
    if (!selector) throw new Error('No selector provided');

    if (!this.browser) {
      throw new Error('BrowserClient não configurado para tasks web (click).');
    }

    await this.browser.initialize();
    const result = await this.browser.click(selector);
    if (!result.success) throw new Error(result.error || 'Click failed');
    return { clicked: true, selector };
  }
}

class TypeHandler implements TaskHandler {
  constructor(private browser?: BrowserClient) {}

  async execute(task: Task, context: ExecutionContext): Promise<unknown> {
    const selector = task.action.selector;
    const value = task.action.value;
    
    if (!selector || !value) throw new Error('Missing selector or value');

    if (!this.browser) {
      throw new Error('BrowserClient não configurado para tasks web (type).');
    }

    await this.browser.initialize();
    const result = await this.browser.type(selector, String(value));
    if (!result.success) throw new Error(result.error || 'Type failed');
    return { typed: true, selector, value };
  }
}

class FillFormHandler implements TaskHandler {
  constructor(private browser?: BrowserClient) {}

  async execute(task: Task, context: ExecutionContext): Promise<unknown> {
    const formData = task.parameters;

    if (!this.browser) {
      throw new Error('BrowserClient não configurado para tasks web (fill_form).');
    }

    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(formData || {})) {
      if (typeof v === 'string') data[k] = v;
    }

    await this.browser.initialize();
    const result = await this.browser.fillForm(data);
    if (!result.success) {
      throw new Error(`Falha ao preencher campos: ${result.failed.join(', ')}`);
    }
    return result;
  }
}

class WaitHandler implements TaskHandler {
  async execute(task: Task, context: ExecutionContext): Promise<unknown> {
    const waitTime = task.action.waitTime || 1000;
    
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    return { waited: true, duration: waitTime };
  }
}

class ExtractDataHandler implements TaskHandler {
  constructor(private browser?: BrowserClient) {}

  async execute(task: Task, context: ExecutionContext): Promise<unknown> {
    const selectors = task.parameters.selectors as Record<string, string>;

    if (!selectors || Object.keys(selectors).length === 0) throw new Error('No selectors provided');
    if (!this.browser) throw new Error('BrowserClient não configurado para tasks web (extract_data).');

    await this.browser.initialize();
    return await this.browser.extractData(selectors);
  }
}

class DecisionHandler implements TaskHandler {
  async execute(task: Task, context: ExecutionContext): Promise<unknown> {
    const condition = task.action.condition;

    // Decisão determinística: usar valor explícito.
    if (typeof (task.parameters as any)?.value === 'boolean') {
      return { condition, result: (task.parameters as any).value };
    }

    if (typeof condition === 'string') {
      const maybe = (context.results as any)?.get?.(condition);
      if (typeof maybe === 'boolean') {
        return { condition, result: maybe };
      }
    }

    throw new Error('DecisionHandler requer parameters.value boolean ou uma chave booleana em context.results.');
  }
}

class ExecuteCodeHandler implements TaskHandler {
  async execute(task: Task, context: ExecutionContext): Promise<unknown> {
    const code = task.action.code;
    
    if (!code) throw new Error('No code provided');

    if (process.env.AETHEL_ENABLE_EXECUTE_CODE !== '1') {
      throw new Error('execute_code está desabilitado por padrão. Defina AETHEL_ENABLE_EXECUTE_CODE=1 para habilitar.');
    }

    const exec = promisify(execCb);
    const timeout = typeof task.timeout === 'number' ? task.timeout : 60000;
    const result = await exec(String(code), { timeout, maxBuffer: 10 * 1024 * 1024 });

    return {
      executed: true,
      stdout: (result.stdout || '').toString(),
      stderr: (result.stderr || '').toString(),
    };
  }
}

class ApiCallHandler implements TaskHandler {
  async execute(task: Task, context: ExecutionContext): Promise<unknown> {
    const url = task.parameters.url as string;
    const method = task.parameters.method as string || 'GET';
    const body = task.parameters.body;
    
    if (!url) throw new Error('No URL provided');

    const fetchFn = (globalThis as any).fetch as undefined | ((input: any, init?: any) => Promise<any>);
    if (!fetchFn) {
      throw new Error('fetch não disponível neste runtime para api_call.');
    }

    const headers = (task.parameters as any).headers as Record<string, string> | undefined;
    const init: any = { method, headers: headers ? { ...headers } : undefined };
    if (body !== undefined) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
      init.headers = init.headers || {};
      if (!('content-type' in Object.fromEntries(Object.entries(init.headers).map(([k, v]) => [k.toLowerCase(), v])))) {
        init.headers['content-type'] = 'application/json';
      }
    }

    const res = await fetchFn(url, init);
    const text = await res.text();
    return {
      called: true,
      url,
      method,
      status: res.status,
      ok: res.ok,
      body: String(text).slice(0, 50_000),
    };
  }
}

// ============================================
// FACTORY
// ============================================

export function createMissionSystem(): MissionExecutor {
  return new MissionExecutor();
}

// AIPlanner já é exportado na declaração (linha 417)
export default MissionExecutor;
