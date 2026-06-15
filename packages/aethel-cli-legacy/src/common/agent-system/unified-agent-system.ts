/**
 * ============================================
 * AETHEL ENGINE - Unified Agent System
 * ============================================
 * 
 * Sistema unificado que integra todos os componentes
 * para uma experiência fluida de agentes autônomos.
 * 
 * Componentes:
 * - Secure Vault (credenciais criptografadas)
 * - Credential Flow (solicitação/aprovação)
 * - Workflow Manager (fluxos multi-etapa)
 * - LivePreview Integration (visualização)
 * - Chat Integration (comandos e notificações)
 */

import { EventEmitter } from 'events';

// Credentials
import { SecureVault } from '../credentials/secure-vault';
import { CredentialFlowManager, REGISTERED_AGENTS } from '../credentials/credential-flow-manager';
import { CredentialUIController, ChatCredentialMessage } from '../credentials/credential-ui-controller';

// Workflows
import { WorkflowManager, WORKFLOW_DEFINITIONS } from '../workflows/workflow-manager';
import { WorkflowLivePreview } from '../workflows/workflow-livepreview';

// ============================================
// UNIFIED SYSTEM TYPES
// ============================================

export interface UnifiedSystemConfig {
  // Vault
  vaultAutoLockTimeout?: number;
  vaultStorageKey?: string;
  
  // Credentials
  credentialRequestTimeout?: number;
  autoApproveForTrusted?: boolean;
  
  // UI
  showNotifications?: boolean;
  showWorkflowPanel?: boolean;
  showCredentialPanel?: boolean;
}

export interface SystemStatus {
  initialized: boolean;
  vaultLocked: boolean;
  activeWorkflows: number;
  pendingCredentials: number;
  pendingPermissions: number;
  storedCredentials: number;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'credential' | 'workflow';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  actions?: ChatAction[];
}

export interface ChatAction {
  id: string;
  label: string;
  style: 'primary' | 'secondary' | 'success' | 'danger';
  callback: string;
}

// ============================================
// UNIFIED AGENT SYSTEM
// ============================================

const DEFAULT_CONFIG: UnifiedSystemConfig = {
  vaultAutoLockTimeout: 15 * 60 * 1000, // 15 min
  vaultStorageKey: 'aethel_vault',
  credentialRequestTimeout: 5 * 60 * 1000, // 5 min
  autoApproveForTrusted: false,
  showNotifications: true,
  showWorkflowPanel: true,
  showCredentialPanel: true,
};

export class UnifiedAgentSystem extends EventEmitter {
  private config: UnifiedSystemConfig;
  
  // Core components
  private vault: SecureVault;
  private credentialFlow: CredentialFlowManager;
  private credentialUI: CredentialUIController;
  private workflowManager: WorkflowManager;
  private workflowPreview: WorkflowLivePreview;
  
  // State
  private initialized: boolean = false;
  private userId: string = '';
  private chatHistory: ChatMessage[] = [];

  constructor(config: Partial<UnifiedSystemConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize components
    this.vault = new SecureVault({
      autoLockTimeout: this.config.vaultAutoLockTimeout,
      storageKey: this.config.vaultStorageKey,
    });
    
    this.credentialFlow = new CredentialFlowManager(this.vault, {
      requestTimeout: this.config.credentialRequestTimeout,
      autoApproveForTrusted: this.config.autoApproveForTrusted,
    });
    
    this.credentialUI = new CredentialUIController(this.vault, this.credentialFlow);
    this.workflowManager = new WorkflowManager(this.credentialFlow);
    this.workflowPreview = new WorkflowLivePreview(this.workflowManager, this.credentialUI);
    
    this.setupEventListeners();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize the system with master password
   */
  async initialize(userId: string, masterPassword: string): Promise<{ success: boolean; isNew: boolean; error?: string }> {
    this.userId = userId;
    
    const result = await this.vault.initialize(masterPassword);
    
    if (result.success) {
      this.initialized = true;
      
      this.addChatMessage({
        type: 'system',
        content: result.isNew 
          ? '🔐 Vault criado com sucesso! Suas credenciais serão armazenadas de forma segura.'
          : '🔓 Vault desbloqueado. Pronto para usar.',
      });
      
      this.emit('initialized', { isNew: result.isNew });
    }
    
    return result;
  }

  /**
   * Check if system is initialized and unlocked
   */
  isReady(): boolean {
    return this.initialized && !this.vault.isVaultLocked();
  }

  /**
   * Get system status
   */
  getStatus(): SystemStatus {
    return {
      initialized: this.initialized,
      vaultLocked: this.vault.isVaultLocked(),
      activeWorkflows: this.workflowManager.getActiveWorkflows().length,
      pendingCredentials: this.credentialFlow.getPendingRequests().length,
      pendingPermissions: this.credentialFlow.getPendingPermissions().length,
      storedCredentials: this.vault.listCredentials().length,
    };
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  private setupEventListeners(): void {
    // Credential UI events
    this.credentialUI.on('chatMessage', (msg: ChatCredentialMessage) => {
      this.addChatMessage({
        type: 'credential',
        content: msg.content,
        metadata: msg.metadata,
        actions: msg.actions,
      });
    });

    this.credentialUI.on('notification', (notif) => {
      this.emit('notification', notif);
    });

    this.credentialUI.on('stateChange', (state) => {
      this.emit('credentialStateChange', state);
    });

    // Workflow preview events
    this.workflowPreview.on('chatMessage', (msg) => {
      this.addChatMessage({
        type: 'workflow',
        content: msg.content,
        metadata: { workflowId: msg.workflowId, stepId: msg.stepId },
      });
    });

    this.workflowPreview.on('notification', (notif) => {
      this.emit('notification', notif);
    });

    this.workflowPreview.on('stateChange', (state) => {
      this.emit('workflowStateChange', state);
    });

    // Vault events
    this.vault.on('locked', () => {
      this.addChatMessage({
        type: 'system',
        content: '🔒 Vault bloqueado por inatividade.',
      });
    });
  }

  // ============================================
  // CHAT INTERFACE
  // ============================================

  /**
   * Process user message
   */
  async processMessage(message: string): Promise<ChatMessage> {
    // Add user message
    this.addChatMessage({ type: 'user', content: message });

    // Check for credential commands
    const credentialCmd = this.credentialUI.parseCredentialCommand(message);
    if (credentialCmd) {
      const response = await this.credentialUI.executeCommand(credentialCmd.command, credentialCmd.args);
      return this.addChatMessage({ type: 'assistant', content: response });
    }

    // Check for workflow commands
    const workflowCmd = this.parseWorkflowCommand(message);
    if (workflowCmd) {
      const response = await this.executeWorkflowCommand(workflowCmd.command, workflowCmd.args);
      return this.addChatMessage({ type: 'assistant', content: response });
    }

    // Check for system commands
    const systemCmd = this.parseSystemCommand(message);
    if (systemCmd) {
      const response = await this.executeSystemCommand(systemCmd.command, systemCmd.args);
      return this.addChatMessage({ type: 'assistant', content: response });
    }

    // Default: return help or pass to external AI
    return this.addChatMessage({
      type: 'assistant',
      content: 'Comando não reconhecido. Use `@help` para ver comandos disponíveis.',
    });
  }

  private parseWorkflowCommand(message: string): { command: string; args: string[] } | null {
    const patterns = [
      /^@workflow\s+(.+)$/i,
      /^@wf\s+(.+)$/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const parts = match[1].trim().split(/\s+/);
        return { command: parts[0].toLowerCase(), args: parts.slice(1) };
      }
    }
    return null;
  }

  private parseSystemCommand(message: string): { command: string; args: string[] } | null {
    const patterns = [
      /^@system\s+(.+)$/i,
      /^@status$/i,
      /^@help$/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        if (message.toLowerCase().startsWith('@status')) {
          return { command: 'status', args: [] };
        }
        if (message.toLowerCase().startsWith('@help')) {
          return { command: 'help', args: [] };
        }
        const parts = (match[1] || '').trim().split(/\s+/);
        return { command: parts[0]?.toLowerCase() || 'help', args: parts.slice(1) };
      }
    }
    return null;
  }

  private async executeWorkflowCommand(command: string, args: string[]): Promise<string> {
    switch (command) {
      case 'list':
        return this.cmdListWorkflows();
      
      case 'start':
        return await this.cmdStartWorkflow(args[0]);
      
      case 'status':
        return this.cmdWorkflowStatus(args[0]);
      
      case 'pause':
        return this.cmdPauseWorkflow(args[0]);
      
      case 'resume':
        return this.cmdResumeWorkflow(args[0]);
      
      case 'cancel':
        return this.cmdCancelWorkflow(args[0]);
      
      case 'help':
      default:
        return this.cmdWorkflowHelp();
    }
  }

  private async executeSystemCommand(command: string, args: string[]): Promise<string> {
    switch (command) {
      case 'status':
        return this.cmdSystemStatus();
      
      case 'lock':
        this.vault.lock();
        return '🔒 Vault bloqueado.';
      
      case 'help':
      default:
        return this.cmdHelp();
    }
  }

  // ============================================
  // COMMAND HANDLERS
  // ============================================

  private cmdListWorkflows(): string {
    const workflows = Object.values(WORKFLOW_DEFINITIONS);
    let response = '📋 **Workflows Disponíveis:**\n\n';
    
    for (const wf of workflows) {
      response += `${wf.icon} **${wf.name}** (\`${wf.id}\`)\n`;
      response += `   _${wf.description}_\n\n`;
    }
    
    response += '\nUse `@workflow start <id>` para iniciar.';
    return response;
  }

  private async cmdStartWorkflow(workflowId: string): Promise<string> {
    if (!workflowId) {
      return '❌ Especifique o ID do workflow. Use `@workflow list` para ver opções.';
    }

    if (!this.isReady()) {
      return '🔒 Sistema bloqueado. Desbloqueie o vault primeiro.';
    }

    const definition = WORKFLOW_DEFINITIONS[workflowId];
    if (!definition) {
      return `❌ Workflow '${workflowId}' não encontrado.`;
    }

    const instance = await this.workflowManager.startWorkflow(
      workflowId,
      this.userId,
      definition.type === 'trading' ? 'trading-ai' :
      definition.type === 'freelance' ? 'freelance-ai' :
      definition.type === 'email' ? 'email-ai' :
      definition.type === 'development' ? 'dev-ai' : 'research-ai'
    );

    if (instance) {
      this.workflowPreview.show();
      return `🚀 **${definition.name}** iniciado!\n\nAcompanhe o progresso no painel lateral.`;
    }

    return '❌ Falha ao iniciar workflow.';
  }

  private cmdWorkflowStatus(instanceId?: string): string {
    const active = this.workflowManager.getActiveWorkflows();
    
    if (active.length === 0) {
      return '📭 Nenhum workflow ativo no momento.';
    }

    let response = '📊 **Workflows Ativos:**\n\n';
    
    for (const wf of active) {
      const def = WORKFLOW_DEFINITIONS[wf.definitionId];
      const progress = Math.round(wf.context.progress);
      response += `${def?.icon || '📋'} **${def?.name || wf.definitionId}**\n`;
      response += `   Status: ${wf.status} | Progresso: ${progress}%\n`;
      response += `   ID: \`${wf.instanceId}\`\n\n`;
    }

    return response;
  }

  private cmdPauseWorkflow(instanceId: string): string {
    if (!instanceId) {
      return '❌ Especifique o ID do workflow.';
    }
    
    const paused = this.workflowManager.pauseWorkflow(instanceId);
    return paused ? '⏸️ Workflow pausado.' : '❌ Não foi possível pausar.';
  }

  private cmdResumeWorkflow(instanceId: string): string {
    if (!instanceId) {
      return '❌ Especifique o ID do workflow.';
    }
    
    const resumed = this.workflowManager.resumeWorkflow(instanceId);
    return resumed ? '▶️ Workflow retomado.' : '❌ Não foi possível retomar.';
  }

  private cmdCancelWorkflow(instanceId: string): string {
    if (!instanceId) {
      return '❌ Especifique o ID do workflow.';
    }
    
    const cancelled = this.workflowManager.cancelWorkflow(instanceId);
    return cancelled ? '⏹️ Workflow cancelado.' : '❌ Não foi possível cancelar.';
  }

  private cmdWorkflowHelp(): string {
    return `📋 **Comandos de Workflow:**\n\n` +
      `\`@workflow list\` - Listar workflows disponíveis\n` +
      `\`@workflow start <id>\` - Iniciar workflow\n` +
      `\`@workflow status\` - Ver workflows ativos\n` +
      `\`@workflow pause <id>\` - Pausar workflow\n` +
      `\`@workflow resume <id>\` - Retomar workflow\n` +
      `\`@workflow cancel <id>\` - Cancelar workflow`;
  }

  private cmdSystemStatus(): string {
    const status = this.getStatus();
    
    return `🔧 **Status do Sistema:**\n\n` +
      `Vault: ${status.vaultLocked ? '🔒 Bloqueado' : '🔓 Desbloqueado'}\n` +
      `Credenciais: ${status.storedCredentials}\n` +
      `Workflows ativos: ${status.activeWorkflows}\n` +
      `Solicitações pendentes: ${status.pendingCredentials}\n` +
      `Permissões pendentes: ${status.pendingPermissions}`;
  }

  private cmdHelp(): string {
    return `🔧 **Comandos Disponíveis:**\n\n` +
      `**Sistema:**\n` +
      `\`@status\` - Status do sistema\n` +
      `\`@help\` - Esta ajuda\n\n` +
      `**Credenciais:**\n` +
      `\`@credentials list\` - Listar credenciais\n` +
      `\`@credentials manage\` - Gerenciar credenciais\n\n` +
      `**Workflows:**\n` +
      `\`@workflow list\` - Listar workflows\n` +
      `\`@workflow start <id>\` - Iniciar workflow\n\n` +
      `**Agentes:**\n` +
      `\`@trader\` - Comandos de trading\n` +
      `\`@freelance\` - Comandos de freelance\n` +
      `\`@email\` - Comandos de email`;
  }

  // ============================================
  // CHAT HISTORY
  // ============================================

  private addChatMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const message: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.chatHistory.push(message);
    
    // Keep only last 1000 messages
    if (this.chatHistory.length > 1000) {
      this.chatHistory = this.chatHistory.slice(-1000);
    }

    this.emit('chatMessage', message);
    return message;
  }

  getChatHistory(limit?: number): ChatMessage[] {
    return limit ? this.chatHistory.slice(-limit) : [...this.chatHistory];
  }

  // ============================================
  // ACTION HANDLERS
  // ============================================

  /**
   * Handle action from UI (buttons, etc)
   */
  async handleAction(callback: string): Promise<void> {
    const [action, ...args] = callback.split(':');

    switch (action) {
      case 'openCredentialPrompt':
        this.credentialUI.showPanel('request');
        break;

      case 'cancelCredentialRequest':
        this.credentialUI.cancelCredentialRequest();
        break;

      case 'approvePermission':
        this.credentialUI.approvePermission(args[0], this.userId);
        break;

      case 'denyPermission':
        this.credentialUI.denyPermission(args[0]);
        break;

      case 'openCredentials':
        this.credentialUI.showPanel('manage');
        break;

      case 'cancelWorkflow':
        this.workflowManager.cancelWorkflow(args[0]);
        break;

      case 'pauseWorkflow':
        this.workflowManager.pauseWorkflow(args[0]);
        break;

      case 'resumeWorkflow':
        this.workflowManager.resumeWorkflow(args[0]);
        break;

      default:
        // Pass to workflow preview
        this.workflowPreview.handleAction(callback);
    }
  }

  // ============================================
  // QUICK ACTIONS
  // ============================================

  /**
   * Quick start trading
   */
  async startTrading(): Promise<void> {
    await this.processMessage('@workflow start trading-auto');
  }

  /**
   * Quick start freelance
   */
  async startFreelance(): Promise<void> {
    await this.processMessage('@workflow start freelance-apply');
  }

  /**
   * Quick start email management
   */
  async startEmailManagement(): Promise<void> {
    await this.processMessage('@workflow start email-manage');
  }

  /**
   * Quick start research
   */
  async startResearch(topic?: string): Promise<void> {
    await this.processMessage('@workflow start research-deep');
  }

  // ============================================
  // GETTERS
  // ============================================

  getVault(): SecureVault {
    return this.vault;
  }

  getCredentialFlow(): CredentialFlowManager {
    return this.credentialFlow;
  }

  getCredentialUI(): CredentialUIController {
    return this.credentialUI;
  }

  getWorkflowManager(): WorkflowManager {
    return this.workflowManager;
  }

  getWorkflowPreview(): WorkflowLivePreview {
    return this.workflowPreview;
  }

  /**
   * Get available agents
   */
  getAvailableAgents(): typeof REGISTERED_AGENTS {
    return REGISTERED_AGENTS;
  }

  /**
   * Get available workflows
   */
  getAvailableWorkflows(): typeof WORKFLOW_DEFINITIONS {
    return WORKFLOW_DEFINITIONS;
  }

  // ============================================
  // CLEANUP
  // ============================================

  destroy(): void {
    this.vault.destroy();
    this.credentialFlow.destroy();
    this.credentialUI.destroy();
    this.workflowManager.destroy();
    this.workflowPreview.destroy();
    this.removeAllListeners();
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createUnifiedSystem(config?: Partial<UnifiedSystemConfig>): UnifiedAgentSystem {
  return new UnifiedAgentSystem(config);
}
