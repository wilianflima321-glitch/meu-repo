/**
 * ============================================
 * AETHEL SUPREME AI ORCHESTRATOR
 * ============================================
 * 
 * Orquestrador central que integra todos os sistemas
 * para criar uma IA superior ao Manus e outras
 * 
 * Capacidades Integradas:
 * - Automação Web Autônoma
 * - Trading de Alta Frequência
 * - Gerenciamento de Contas
 * - Deploy em Cloud
 * - Sistema de Missões
 * - Aprendizado Contínuo
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// Imports dos sistemas core
import { 
  BrowserClient,
  createBrowserClient,
  BrowserConfig,
  PageAnalysis,
  LoginResult,
} from '../web-automation/browser-client';

import { 
  ScalpingEngine, 
  createScalpingEngine,
  ScalpingConfig,
  ScalpingTrade,
  EngineStatus as TradingStatus,
} from '../trading/hft/scalping-engine';

import { 
  MissionExecutor, 
  createMissionSystem,
  Mission,
  MissionStatus,
} from '../mission-system/mission-executor';

import { 
  CloudDeployer, 
  createCloudDeployer,
  CloudProvider,
  DeployConfig,
  DeployResult,
  ProjectType,
} from '../cloud-deploy/cloud-deployer';

import { 
  LearningSystem, 
  createLearningSystem,
  LearningConfig,
  Experience,
  LearningMetrics,
} from '../learning-system/learning-system';

// ============================================
// TYPES
// ============================================

export interface OrchestratorConfig {
  // Features habilitadas
  enableWebAutomation: boolean;
  enableTrading: boolean;
  enableCloudDeploy: boolean;
  enableMissions: boolean;
  enableLearning: boolean;
  
  // Configurações específicas
  browser?: Partial<BrowserConfig>;
  trading?: Partial<ScalpingConfig>;
  learning?: Partial<LearningConfig>;
  
  // Limites
  maxConcurrentMissions: number;
  maxConcurrentTrades: number;

  // Backpressure
  maxQueuedTasks: number;
  
  // Modo de operação
  mode: 'autonomous' | 'supervised' | 'manual';
}

export interface SystemStatus {
  initialized: boolean;
  running: boolean;
  mode: OrchestratorConfig['mode'];
  
  webAutomation: {
    enabled: boolean;
    browserReady: boolean;
    currentUrl?: string;
  };
  
  trading: {
    enabled: boolean;
    running: boolean;
    activeTrades: number;
    todayPnL: number;
  };
  
  accounts: {
    enabled: boolean;
    totalAccounts: number;
    activeServices: string[];
  };
  
  cloudDeploy: {
    enabled: boolean;
    deployments: number;
    providers: CloudProvider[];
  };
  
  missions: {
    enabled: boolean;
    activeMissions: number;
    completedToday: number;
  };
  
  learning: {
    enabled: boolean;
    totalExperiences: number;
    patternsLearned: number;
    improvementRate: number;
  };
}

export interface Task {
  id: string;
  type: 'web' | 'trading' | 'account' | 'deploy' | 'mission' | 'custom';
  description: string;
  parameters: Record<string, unknown>;
  priority: 'critical' | 'high' | 'normal' | 'low';
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

// ============================================
// SUPREME ORCHESTRATOR
// ============================================

export class SupremeOrchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  
  // Core Systems
  private browser: BrowserClient | null = null;
  private scalpingEngine: ScalpingEngine | null = null;
  private missionExecutor: MissionExecutor | null = null;
  private cloudDeployer: CloudDeployer | null = null;
  private learningSystem: LearningSystem | null = null;
  
  // State
  private initialized: boolean = false;
  private running: boolean = false;
  private taskQueue: Task[] = [];
  private activeTasks: Map<string, Task> = new Map();
  
  constructor(config: Partial<OrchestratorConfig> = {}) {
    super();
    
    this.config = {
      enableWebAutomation: true,
      // HFT atual é um engine local/simplificado; habilite explicitamente quando estiver integrado a dados/execução reais.
      enableTrading: false,
      enableCloudDeploy: true,
      enableMissions: true,
      enableLearning: true,
      maxConcurrentMissions: 5,
      maxConcurrentTrades: 3,
      maxQueuedTasks: 1000,
      mode: 'supervised',
      ...config,
    };
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    this.emit('initializing');
    
    try {
      // Inicializar sistemas habilitados
      
      if (this.config.enableWebAutomation) {
        this.browser = createBrowserClient(this.config.browser);
        await this.browser.initialize();
        
        this.emit('web_automation_ready');
      }
      
      if (this.config.enableTrading) {
        if (process.env.AETHEL_ENABLE_HFT !== '1') {
          throw new Error(
            'Trading HFT está desabilitado por segurança. Defina AETHEL_ENABLE_HFT=1 para habilitar explicitamente.'
          );
        }
        this.scalpingEngine = createScalpingEngine(this.config.trading);
        this.setupTradingListeners();
        this.emit('trading_ready');
      }
      
      if (this.config.enableMissions) {
        this.missionExecutor = createMissionSystem();
        this.setupMissionListeners();
        this.emit('missions_ready');
      }
      
      if (this.config.enableCloudDeploy) {
        this.cloudDeployer = createCloudDeployer();
        this.emit('cloud_deploy_ready');
      }
      
      if (this.config.enableLearning) {
        this.learningSystem = createLearningSystem(this.config.learning);
        this.setupLearningListeners();
        this.emit('learning_ready');
      }
      
      this.initialized = true;
      this.emit('initialized');
      
      return true;
    } catch (error) {
      this.emit('initialization_error', { error });
      return false;
    }
  }

  async start(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    this.running = true;
    
    // Iniciar trading se habilitado
    if (this.scalpingEngine && this.config.enableTrading) {
      await this.scalpingEngine.start();
    }
    
    // Iniciar processamento de tasks
    this.processTaskQueue();
    
    this.emit('started');
  }

  async stop(): Promise<void> {
    this.running = false;
    
    // Parar trading
    if (this.scalpingEngine) {
      await this.scalpingEngine.stop();
    }
    
    // Fechar browser
    if (this.browser) {
      await this.browser.close();
    }
    
    this.emit('stopped');
  }

  // ============================================
  // TASK PROCESSING
  // ============================================

  async executeTask(task: Omit<Task, 'id' | 'status'>): Promise<Task> {
    const newTask: Task = {
      ...task,
      id: this.generateTaskId(),
      status: 'pending',
    };
    
    if (this.config.mode === 'autonomous') {
      if (this.taskQueue.length >= this.config.maxQueuedTasks) {
        throw new Error(
          `Task queue cheia (maxQueuedTasks=${this.config.maxQueuedTasks}). Aplique backpressure no chamador.`
        );
      }
      this.taskQueue.push(newTask);
      this.emit('task_queued', { task: newTask });
    } else {
      // Modo supervised/manual: executar diretamente
      return this.processTask(newTask);
    }
    
    return newTask;
  }

  private async processTaskQueue(): Promise<void> {
    while (this.running) {
      if (this.taskQueue.length > 0) {
        const nextIndex = this.taskQueue.findIndex(t => this.canStartTask(t));
        if (nextIndex >= 0) {
          const task = this.taskQueue.splice(nextIndex, 1)[0]!;
          void this.processTask(task);
        }
      }
      
      await this.delay(100);
    }
  }

  private canStartTask(task: Task): boolean {
    const activeByType = (type: Task['type']): number =>
      Array.from(this.activeTasks.values()).filter(t => t.type === type).length;

    switch (task.type) {
      case 'mission':
        return activeByType('mission') < this.config.maxConcurrentMissions;
      case 'trading':
        return activeByType('trading') < this.config.maxConcurrentTrades;
      default:
        // Outras tasks respeitam um limite global simples (evita saturar o event loop)
        return this.activeTasks.size < (this.config.maxConcurrentMissions + this.config.maxConcurrentTrades);
    }
  }

  private async processTask(task: Task): Promise<Task> {
    task.status = 'running';
    this.activeTasks.set(task.id, task);
    
    this.emit('task_started', { task });
    
    try {
      let result: unknown;
      
      switch (task.type) {
        case 'web':
          result = await this.executeWebTask(task);
          break;
        case 'trading':
          result = await this.executeTradingTask(task);
          break;
        case 'account':
          throw new Error('Account tasks não são suportadas no core runtime (não há criação/login automatizado de contas).');
        case 'deploy':
          result = await this.executeDeployTask(task);
          break;
        case 'mission':
          result = await this.executeMissionTask(task);
          break;
        default:
          result = await this.executeCustomTask(task);
      }
      
      task.result = result;
      task.status = 'completed';
      
      // Registrar experiência para aprendizado
      this.recordExperience(task, true);
      
      this.emit('task_completed', { task });
    } catch (error) {
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.status = 'failed';
      
      // Registrar experiência de falha
      this.recordExperience(task, false);
      
      this.emit('task_failed', { task });
    } finally {
      this.activeTasks.delete(task.id);
    }
    
    return task;
  }

  // ============================================
  // WEB AUTOMATION
  // ============================================

  private async executeWebTask(task: Task): Promise<unknown> {
    if (!this.browser) throw new Error('Web automation not enabled');
    
    const action = task.parameters.action as string;
    
    switch (action) {
      case 'navigate':
        return this.browser.navigateTo(task.parameters.url as string);
        
      case 'click':
        return this.browser.click(task.parameters.selector as string);
        
      case 'type':
        return this.browser.type(
          task.parameters.selector as string,
          task.parameters.text as string
        );
        
      case 'fill_form':
        return this.browser.fillForm(task.parameters.data as Record<string, string>);
        
      case 'login':
        return this.browser.login({
          email: task.parameters.email as string,
          password: task.parameters.password as string,
        });
        
      case 'analyze':
        return this.browser.analyzePageWithAI();
        
      case 'screenshot':
        return this.browser.screenshot();
        
      default:
        throw new Error(`Unknown web action: ${action}`);
    }
  }

  // ============================================
  // TRADING
  // ============================================

  private async executeTradingTask(task: Task): Promise<unknown> {
    if (!this.scalpingEngine) throw new Error('Trading not enabled');
    
    const action = task.parameters.action as string;
    
    switch (action) {
      case 'start':
        await this.scalpingEngine.start();
        return { started: true };
        
      case 'stop':
        await this.scalpingEngine.stop();
        return { stopped: true };
        
      case 'status':
        return this.scalpingEngine.getStatus();
        
      case 'trades':
        return this.scalpingEngine.getActiveTrades();
        
      case 'history':
        return this.scalpingEngine.getClosedTrades(task.parameters.limit as number);
        
      default:
        throw new Error(`Unknown trading action: ${action}`);
    }
  }

  // ============================================
  // CLOUD DEPLOY
  // ============================================

  private async executeDeployTask(task: Task): Promise<unknown> {
    if (!this.cloudDeployer) throw new Error('Cloud deploy not enabled');
    
    const action = task.parameters.action as string;
    
    switch (action) {
      case 'deploy':
        return this.cloudDeployer.deploy(task.parameters.config as DeployConfig);
        
      case 'rollback':
        return this.cloudDeployer.rollback(task.parameters.deployId as string);
        
      case 'cancel':
        return this.cloudDeployer.cancelDeploy(task.parameters.deployId as string);
        
      case 'status':
        return this.cloudDeployer.getDeployment(task.parameters.deployId as string);
        
      case 'list':
        return this.cloudDeployer.getDeployments(task.parameters.filter as Record<string, unknown>);
        
      case 'detect':
        return this.cloudDeployer.detectProjectType(task.parameters.sourceDir as string);
        
      case 'recommend':
        return this.cloudDeployer.recommendProvider(task.parameters.projectType as ProjectType);
        
      default:
        throw new Error(`Unknown deploy action: ${action}`);
    }
  }

  // ============================================
  // MISSIONS
  // ============================================

  private async executeMissionTask(task: Task): Promise<unknown> {
    if (!this.missionExecutor) throw new Error('Missions not enabled');
    
    const action = task.parameters.action as string;
    
    switch (action) {
      case 'create':
        return this.missionExecutor.createMission(
          task.parameters.name as string,
          task.parameters.objective as string,
          task.parameters.context as Record<string, unknown>
        );
        
      case 'execute':
        return this.missionExecutor.executeMission(task.parameters.missionId as string);
        
      case 'pause':
        return this.missionExecutor.pauseMission(task.parameters.missionId as string);
        
      case 'resume':
        return this.missionExecutor.resumeMission(task.parameters.missionId as string);
        
      case 'cancel':
        return this.missionExecutor.cancelMission(task.parameters.missionId as string);
        
      case 'status':
        return this.missionExecutor.getMission(task.parameters.missionId as string);
        
      case 'list':
        return this.missionExecutor.getAllMissions();
        
      default:
        throw new Error(`Unknown mission action: ${action}`);
    }
  }

  // ============================================
  // CUSTOM TASKS
  // ============================================

  private async executeCustomTask(task: Task): Promise<unknown> {
    // Usar learning system para sugerir ação
    if (this.learningSystem) {
      const suggestion = this.learningSystem.suggestAction(task.parameters);
      
      if (suggestion) {
        this.emit('action_suggested', { task, suggestion });
        // Em modo autônomo, executar sugestão
        // Por enquanto, apenas retornar sugestão
        return suggestion;
      }
    }
    
    return { custom: true, parameters: task.parameters };
  }

  // ============================================
  // LEARNING
  // ============================================

  private recordExperience(task: Task, success: boolean): void {
    if (!this.learningSystem) return;
    
    this.learningSystem.recordExperience({
      type: 'task_completion',
      context: task.parameters,
      action: `${task.type}_${task.parameters.action || 'execute'}`,
      result: {
        success,
        outcome: task.result,
        error: task.error,
      },
      reward: success ? 1 : -0.5,
      tags: [task.type, task.priority],
    });
  }

  // ============================================
  // LISTENERS
  // ============================================

  private setupTradingListeners(): void {
    if (!this.scalpingEngine) return;
    
    this.scalpingEngine.on('trade:opened', (data: ScalpingTrade) => {
      this.emit('trade_opened', data);
      this.recordExperience({
        id: 'trade',
        type: 'trading',
        description: 'Trade opened',
        parameters: { trade: data },
        priority: 'high',
        status: 'completed',
        result: data,
      }, true);
    });
    
    this.scalpingEngine.on('trade:closed', (data: ScalpingTrade) => {
      this.emit('trade_closed', data);
      const success = (data.pnl || 0) > 0;
      this.recordExperience({
        id: 'trade',
        type: 'trading',
        description: 'Trade closed',
        parameters: { trade: data },
        priority: 'high',
        status: 'completed',
        result: data,
      }, success);
    });
  }

  private setupMissionListeners(): void {
    if (!this.missionExecutor) return;
    
    this.missionExecutor.on('mission_completed', (data) => {
      this.emit('mission_completed', data);
    });
    
    this.missionExecutor.on('mission_failed', (data) => {
      this.emit('mission_failed', data);
    });
  }

  private setupLearningListeners(): void {
    if (!this.learningSystem) return;
    
    this.learningSystem.on('pattern_learned', (data) => {
      this.emit('pattern_learned', data);
    });
    
    this.learningSystem.on('strategy_created', (data) => {
      this.emit('strategy_created', data);
    });
  }

  // ============================================
  // STATUS
  // ============================================

  getStatus(): SystemStatus {
    const tradingStatus = this.scalpingEngine?.getStatus();
    const learningMetrics = this.learningSystem?.getMetrics();
    
    return {
      initialized: this.initialized,
      running: this.running,
      mode: this.config.mode,
      
      webAutomation: {
        enabled: this.config.enableWebAutomation,
        browserReady: this.browser?.isInitialized() || false,
        currentUrl: this.browser?.getCurrentUrl(),
      },
      
      trading: {
        enabled: this.config.enableTrading,
        running: tradingStatus?.isRunning || false,
        activeTrades: tradingStatus?.activeTrades || 0,
        todayPnL: tradingStatus?.totalPnl || 0,
      },
      
      accounts: {
        enabled: false,
        totalAccounts: 0,
        activeServices: [],
      },
      
      cloudDeploy: {
        enabled: this.config.enableCloudDeploy,
        deployments: this.cloudDeployer?.getDeployments().length || 0,
        providers: this.cloudDeployer?.getAllProviders().map(p => p.name as CloudProvider) || [],
      },
      
      missions: {
        enabled: this.config.enableMissions,
        activeMissions: this.missionExecutor?.getActiveMissions().length || 0,
        completedToday: this.missionExecutor?.getMissionsByStatus('completed')
          .filter(m => m.endTime && m.endTime > Date.now() - 86400000).length || 0,
      },
      
      learning: {
        enabled: this.config.enableLearning,
        totalExperiences: learningMetrics?.totalExperiences || 0,
        patternsLearned: learningMetrics?.patternsLearned || 0,
        improvementRate: learningMetrics?.improvementRate || 0,
      },
    };
  }

  // ============================================
  // DIRECT ACCESS
  // ============================================

  getBrowser(): BrowserClient | null {
    return this.browser;
  }


  getTradingEngine(): ScalpingEngine | null {
    return this.scalpingEngine;
  }

  getMissionExecutor(): MissionExecutor | null {
    return this.missionExecutor;
  }

  getCloudDeployer(): CloudDeployer | null {
    return this.cloudDeployer;
  }

  getLearningSystem(): LearningSystem | null {
    return this.learningSystem;
  }

  // ============================================
  // UTILITIES
  // ============================================

  private generateTaskId(): string {
    return uuidv4();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setMode(mode: OrchestratorConfig['mode']): void {
    this.config.mode = mode;
    this.emit('mode_changed', { mode });
  }
}

// ============================================
// FACTORY
// ============================================

export function createSupremeOrchestrator(
  config?: Partial<OrchestratorConfig>
): SupremeOrchestrator {
  return new SupremeOrchestrator(config);
}

// ============================================
// EXPORTS
// ============================================

export {
  // Web Automation
  BrowserClient,
  createBrowserClient,
  
  // Trading
  ScalpingEngine,
  createScalpingEngine,
  
  // Missions
  MissionExecutor,
  createMissionSystem,
  
  // Cloud Deploy
  CloudDeployer,
  createCloudDeployer,
  
  // Learning
  LearningSystem,
  createLearningSystem,
};

export default SupremeOrchestrator;
