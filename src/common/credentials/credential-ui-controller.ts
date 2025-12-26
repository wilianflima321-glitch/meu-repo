/**
 * ============================================
 * AETHEL ENGINE - Credential UI Controller
 * ============================================
 * 
 * Controlador de UI para o sistema de credenciais.
 * Integra com LivePreview e Chat para uma
 * experiência fluida de autenticação.
 * 
 * Fluxo do Usuário:
 * 1. IA solicita credencial no chat
 * 2. LivePreview mostra formulário seguro
 * 3. Usuário preenche e confirma
 * 4. IA continua o trabalho automaticamente
 */

import { EventEmitter } from 'events';
import { CredentialFlowManager, REGISTERED_AGENTS } from './credential-flow-manager';
import { SecureVault } from './secure-vault';
import {
  CredentialRequest,
  SecureInputPrompt,
  PermissionRequest,
  StoredCredential,
  VaultEvent,
  CredentialCategory,
  CREDENTIAL_SCHEMAS,
  LivePreviewCredentialPanel,
} from './credential-types';

// ============================================
// UI STATE & TYPES
// ============================================

export interface CredentialUIState {
  // Panel visibility
  panelVisible: boolean;
  panelMode: 'request' | 'manage' | 'history' | 'settings';
  
  // Current interaction
  activePrompt: SecureInputPrompt | null;
  activePermission: PermissionRequest | null;
  
  // Form state
  formValues: Record<string, string>;
  formErrors: Record<string, string>;
  formSubmitting: boolean;
  
  // Vault state
  vaultLocked: boolean;
  unlockRequired: boolean;
  
  // Lists
  storedCredentials: CredentialListItem[];
  pendingRequests: CredentialRequest[];
  recentActivity: ActivityItem[];
  
  // Notifications
  notifications: UINotification[];
}

export interface CredentialListItem {
  id: string;
  name: string;
  category: CredentialCategory;
  icon: string;
  schemaName: string;
  lastUsed?: Date;
  expiresAt?: Date;
  verified: boolean;
  activeGrants: number;
}

export interface ActivityItem {
  id: string;
  type: VaultEvent['type'];
  message: string;
  timestamp: Date;
  icon: string;
  severity: VaultEvent['severity'];
}

export interface UINotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    callback: string;
  };
}

// ============================================
// CHAT MESSAGES
// ============================================

export interface ChatCredentialMessage {
  type: 'credential_request' | 'permission_request' | 'credential_success' | 'credential_error';
  content: string;
  metadata: {
    requestId?: string;
    schemaId?: string;
    agentId?: string;
    agentName?: string;
    agentIcon?: string;
  };
  actions?: ChatAction[];
}

export interface ChatAction {
  id: string;
  label: string;
  style: 'primary' | 'secondary' | 'danger';
  callback: string;
}

// ============================================
// CREDENTIAL UI CONTROLLER
// ============================================

export class CredentialUIController extends EventEmitter {
  private vault: SecureVault;
  private flowManager: CredentialFlowManager;
  private state: CredentialUIState;

  constructor(vault: SecureVault, flowManager: CredentialFlowManager) {
    super();
    this.vault = vault;
    this.flowManager = flowManager;
    this.state = this.getInitialState();
    
    this.setupEventListeners();
  }

  private getInitialState(): CredentialUIState {
    return {
      panelVisible: false,
      panelMode: 'request',
      activePrompt: null,
      activePermission: null,
      formValues: {},
      formErrors: {},
      formSubmitting: false,
      vaultLocked: this.vault.isVaultLocked(),
      unlockRequired: false,
      storedCredentials: [],
      pendingRequests: [],
      recentActivity: [],
      notifications: [],
    };
  }

  private setupEventListeners(): void {
    // Credential requests from agents
    this.flowManager.on('credentialRequested', ({ request, prompt }) => {
      this.handleCredentialRequest(request, prompt);
    });

    // Permission requests
    this.flowManager.on('permissionRequested', (request: PermissionRequest) => {
      this.handlePermissionRequest(request);
    });

    // Vault events
    this.flowManager.on('vaultEvent', (event: VaultEvent) => {
      this.handleVaultEvent(event);
    });

    // Vault lock/unlock
    this.vault.on('locked', () => {
      this.state.vaultLocked = true;
      this.emitStateChange();
    });
  }

  // ============================================
  // CREDENTIAL REQUEST HANDLING
  // ============================================

  private handleCredentialRequest(request: CredentialRequest, prompt: SecureInputPrompt): void {
    // Show panel with request
    this.state.panelVisible = true;
    this.state.panelMode = 'request';
    this.state.activePrompt = prompt;
    this.state.formValues = {};
    this.state.formErrors = {};
    this.state.pendingRequests = this.flowManager.getPendingRequests();

    // Check if vault needs unlock
    if (this.vault.isVaultLocked()) {
      this.state.unlockRequired = true;
    }

    // Create chat message
    const chatMessage = this.createCredentialRequestMessage(request, prompt);
    this.emit('chatMessage', chatMessage);

    // Create notification
    this.addNotification({
      type: 'info',
      title: `${prompt.agentInfo.icon} ${prompt.agentInfo.name}`,
      message: `Precisa de acesso a ${CREDENTIAL_SCHEMAS[request.schemaId]?.name || request.schemaId}`,
      action: {
        label: 'Configurar',
        callback: `openCredentialPrompt:${request.requestId}`,
      },
    });

    this.emitStateChange();
  }

  private handlePermissionRequest(request: PermissionRequest): void {
    this.state.activePermission = request;
    
    // Create chat message
    const agent = REGISTERED_AGENTS[request.agentId];
    const chatMessage: ChatCredentialMessage = {
      type: 'permission_request',
      content: `${agent?.icon || '🤖'} **${request.agentName}** está solicitando permissão para usar suas credenciais.\n\n_"${request.reason}"_`,
      metadata: {
        requestId: request.requestId,
        agentId: request.agentId,
        agentName: request.agentName,
        agentIcon: agent?.icon,
      },
      actions: [
        { id: 'approve', label: '✓ Aprovar', style: 'primary', callback: `approvePermission:${request.requestId}` },
        { id: 'deny', label: '✗ Negar', style: 'danger', callback: `denyPermission:${request.requestId}` },
      ],
    };

    this.emit('chatMessage', chatMessage);
    this.emitStateChange();
  }

  // ============================================
  // FORM HANDLING
  // ============================================

  /**
   * Update form field value
   */
  updateFormValue(fieldId: string, value: string): void {
    this.state.formValues[fieldId] = value;
    
    // Clear error on change
    if (this.state.formErrors[fieldId]) {
      delete this.state.formErrors[fieldId];
    }
    
    this.emitStateChange();
  }

  /**
   * Validate form before submission
   */
  validateForm(): boolean {
    if (!this.state.activePrompt) return false;

    const errors: Record<string, string> = {};
    
    for (const field of this.state.activePrompt.fields) {
      const value = this.state.formValues[field.id] || '';
      
      if (field.required && !value.trim()) {
        errors[field.id] = `${field.label} é obrigatório`;
        continue;
      }
      
      if (field.validation?.pattern && value) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          errors[field.id] = field.validation.message || `${field.label} está em formato inválido`;
        }
      }
    }

    this.state.formErrors = errors;
    this.emitStateChange();
    
    return Object.keys(errors).length === 0;
  }

  /**
   * Submit credential form
   */
  async submitCredentialForm(userId: string): Promise<void> {
    if (!this.state.activePrompt) return;
    if (!this.validateForm()) return;

    this.state.formSubmitting = true;
    this.emitStateChange();

    try {
      const response = await this.flowManager.handleCredentialInput(
        this.state.activePrompt.requestId,
        this.state.formValues,
        userId
      );

      if (response.success) {
        // Success message
        const chatMessage: ChatCredentialMessage = {
          type: 'credential_success',
          content: `✅ Credenciais configuradas com sucesso! O ${this.state.activePrompt.agentInfo.name} agora pode continuar o trabalho.`,
          metadata: {
            requestId: response.requestId,
            agentId: this.state.activePrompt.agentInfo.id,
          },
        };
        this.emit('chatMessage', chatMessage);

        // Close panel
        this.state.activePrompt = null;
        this.state.panelVisible = false;
        this.state.formValues = {};
        
        // Refresh credentials list
        this.refreshCredentialsList();
        
        this.addNotification({
          type: 'success',
          title: 'Credenciais salvas',
          message: 'Suas credenciais foram armazenadas de forma segura.',
        });
      } else {
        // Error message
        const chatMessage: ChatCredentialMessage = {
          type: 'credential_error',
          content: `❌ Erro ao salvar credenciais: ${response.error}`,
          metadata: { requestId: response.requestId },
        };
        this.emit('chatMessage', chatMessage);

        this.addNotification({
          type: 'error',
          title: 'Erro',
          message: response.error || 'Erro desconhecido',
        });
      }
    } catch (error) {
      this.addNotification({
        type: 'error',
        title: 'Erro',
        message: `Falha ao processar: ${error}`,
      });
    } finally {
      this.state.formSubmitting = false;
      this.emitStateChange();
    }
  }

  /**
   * Cancel current credential request
   */
  cancelCredentialRequest(): void {
    if (this.state.activePrompt) {
      this.flowManager.cancelRequest(this.state.activePrompt.requestId);
      this.state.activePrompt = null;
      this.state.formValues = {};
      this.state.formErrors = {};
      this.state.panelVisible = false;
      this.emitStateChange();
    }
  }

  // ============================================
  // PERMISSION HANDLING
  // ============================================

  /**
   * Approve permission request
   */
  approvePermission(requestId: string, userId: string, duration?: number): void {
    const grant = this.flowManager.grantPermission(requestId, userId, duration);
    
    if (grant) {
      this.state.activePermission = null;
      
      const chatMessage: ChatCredentialMessage = {
        type: 'credential_success',
        content: `✅ Permissão concedida até ${grant.expiresAt.toLocaleTimeString()}.`,
        metadata: { requestId },
      };
      this.emit('chatMessage', chatMessage);
    }
    
    this.emitStateChange();
  }

  /**
   * Deny permission request
   */
  denyPermission(requestId: string): void {
    this.flowManager.denyPermission(requestId);
    this.state.activePermission = null;
    
    const chatMessage: ChatCredentialMessage = {
      type: 'credential_error',
      content: '❌ Permissão negada.',
      metadata: { requestId },
    };
    this.emit('chatMessage', chatMessage);
    
    this.emitStateChange();
  }

  // ============================================
  // VAULT MANAGEMENT
  // ============================================

  /**
   * Unlock vault with master password
   */
  async unlockVault(masterPassword: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.vault.initialize(masterPassword);
    
    if (result.success) {
      this.state.vaultLocked = false;
      this.state.unlockRequired = false;
      this.refreshCredentialsList();
      
      if (result.isNew) {
        this.addNotification({
          type: 'success',
          title: 'Vault criado',
          message: 'Seu cofre seguro foi criado com sucesso!',
        });
      }
    } else {
      this.addNotification({
        type: 'error',
        title: 'Erro ao desbloquear',
        message: result.error || 'Senha incorreta',
      });
    }
    
    this.emitStateChange();
    return result;
  }

  /**
   * Lock vault manually
   */
  lockVault(): void {
    this.vault.lock();
    this.state.vaultLocked = true;
    this.state.storedCredentials = [];
    this.emitStateChange();
  }

  /**
   * Delete a stored credential
   */
  async deleteCredential(credentialId: string): Promise<boolean> {
    const deleted = await this.vault.deleteCredential(credentialId);
    if (deleted) {
      this.refreshCredentialsList();
      this.addNotification({
        type: 'success',
        title: 'Credencial removida',
        message: 'A credencial foi removida permanentemente.',
      });
    }
    return deleted;
  }

  // ============================================
  // PANEL CONTROL
  // ============================================

  /**
   * Show credential panel
   */
  showPanel(mode: CredentialUIState['panelMode'] = 'manage'): void {
    this.state.panelVisible = true;
    this.state.panelMode = mode;
    
    if (mode === 'manage') {
      this.refreshCredentialsList();
    } else if (mode === 'history') {
      this.refreshActivityList();
    }
    
    this.emitStateChange();
  }

  /**
   * Hide credential panel
   */
  hidePanel(): void {
    this.state.panelVisible = false;
    this.emitStateChange();
  }

  /**
   * Toggle panel visibility
   */
  togglePanel(): void {
    if (this.state.panelVisible) {
      this.hidePanel();
    } else {
      this.showPanel();
    }
  }

  // ============================================
  // DATA REFRESH
  // ============================================

  private refreshCredentialsList(): void {
    if (this.vault.isVaultLocked()) {
      this.state.storedCredentials = [];
      return;
    }

    const credentials = this.vault.listCredentials();
    this.state.storedCredentials = credentials.map(cred => {
      const schema = CREDENTIAL_SCHEMAS[cred.schemaId];
      return {
        id: cred.id,
        name: cred.name,
        category: cred.category,
        icon: schema?.icon || '🔐',
        schemaName: schema?.name || cred.schemaId,
        lastUsed: cred.lastUsedAt,
        expiresAt: cred.expiresAt,
        verified: cred.metadata.verified,
        activeGrants: 0, // Would need to count from flowManager
      };
    });
  }

  private refreshActivityList(): void {
    const events = this.vault.getRecentEvents(20);
    this.state.recentActivity = events.map(event => ({
      id: event.eventId,
      type: event.type,
      message: this.formatEventMessage(event),
      timestamp: event.timestamp,
      icon: this.getEventIcon(event.type),
      severity: event.severity,
    }));
  }

  // ============================================
  // VAULT EVENT HANDLING
  // ============================================

  private handleVaultEvent(event: VaultEvent): void {
    // Add to activity
    this.state.recentActivity.unshift({
      id: event.eventId,
      type: event.type,
      message: this.formatEventMessage(event),
      timestamp: event.timestamp,
      icon: this.getEventIcon(event.type),
      severity: event.severity,
    });

    // Keep only last 50
    if (this.state.recentActivity.length > 50) {
      this.state.recentActivity = this.state.recentActivity.slice(0, 50);
    }

    // Security alerts
    if (event.severity === 'critical') {
      this.addNotification({
        type: 'error',
        title: '⚠️ Alerta de Segurança',
        message: this.formatEventMessage(event),
      });
    }

    this.emitStateChange();
  }

  private formatEventMessage(event: VaultEvent): string {
    const messages: Record<string, string> = {
      'credential_requested': 'Credencial solicitada',
      'credential_provided': `Credencial "${event.details?.name || ''}" adicionada`,
      'credential_used': `Credencial acessada por ${event.details?.agentId || 'agente'}`,
      'credential_expired': 'Credencial expirou',
      'credential_revoked': 'Credencial removida',
      'permission_requested': 'Permissão solicitada',
      'permission_granted': 'Permissão concedida',
      'permission_denied': 'Permissão negada',
      'security_alert': `Alerta: ${event.details?.message || 'Atividade suspeita'}`,
      'vault_locked': 'Vault bloqueado',
      'vault_unlocked': event.details?.isNew ? 'Vault criado' : 'Vault desbloqueado',
    };
    return messages[event.type] || event.type;
  }

  private getEventIcon(type: VaultEvent['type']): string {
    const icons: Record<string, string> = {
      'credential_requested': '📝',
      'credential_provided': '✅',
      'credential_used': '🔑',
      'credential_expired': '⏰',
      'credential_revoked': '🗑️',
      'permission_requested': '🔓',
      'permission_granted': '✓',
      'permission_denied': '✗',
      'security_alert': '🚨',
      'vault_locked': '🔒',
      'vault_unlocked': '🔓',
    };
    return icons[type] || '📌';
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  private addNotification(notification: Omit<UINotification, 'id' | 'timestamp' | 'read'>): void {
    const newNotification: UINotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };
    
    this.state.notifications.unshift(newNotification);
    
    // Keep only last 20
    if (this.state.notifications.length > 20) {
      this.state.notifications = this.state.notifications.slice(0, 20);
    }

    this.emit('notification', newNotification);
  }

  markNotificationRead(notificationId: string): void {
    const notification = this.state.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.emitStateChange();
    }
  }

  clearNotifications(): void {
    this.state.notifications = [];
    this.emitStateChange();
  }

  // ============================================
  // CHAT MESSAGE HELPERS
  // ============================================

  private createCredentialRequestMessage(
    request: CredentialRequest,
    prompt: SecureInputPrompt
  ): ChatCredentialMessage {
    const schema = CREDENTIAL_SCHEMAS[request.schemaId];
    
    return {
      type: 'credential_request',
      content: `${prompt.agentInfo.icon} **${prompt.agentInfo.name}** precisa de acesso a **${schema?.name || request.schemaId}** para continuar.\n\n_"${request.reason}"_\n\n🔒 Seus dados serão criptografados com AES-256.`,
      metadata: {
        requestId: request.requestId,
        schemaId: request.schemaId,
        agentId: request.agentId,
        agentName: request.agentName,
        agentIcon: prompt.agentInfo.icon,
      },
      actions: [
        { id: 'configure', label: '🔐 Configurar Acesso', style: 'primary', callback: `openCredentialPrompt:${request.requestId}` },
        { id: 'cancel', label: 'Agora não', style: 'secondary', callback: `cancelCredentialRequest:${request.requestId}` },
      ],
    };
  }

  /**
   * Parse chat command for credential operations
   */
  parseCredentialCommand(message: string): { command: string; args: string[] } | null {
    const credentialCommands = [
      /^@credentials?\s+(.+)$/i,
      /^@vault\s+(.+)$/i,
      /^@security\s+(.+)$/i,
    ];

    for (const pattern of credentialCommands) {
      const match = message.match(pattern);
      if (match) {
        const parts = match[1].trim().split(/\s+/);
        return {
          command: parts[0].toLowerCase(),
          args: parts.slice(1),
        };
      }
    }

    return null;
  }

  /**
   * Execute chat command
   */
  async executeCommand(command: string, args: string[]): Promise<string> {
    switch (command) {
      case 'list':
      case 'listar':
        return this.cmdListCredentials();
      
      case 'status':
        return this.cmdVaultStatus();
      
      case 'lock':
      case 'bloquear':
        this.lockVault();
        return '🔒 Vault bloqueado.';
      
      case 'history':
      case 'historico':
        this.showPanel('history');
        return '📜 Exibindo histórico de atividades.';
      
      case 'manage':
      case 'gerenciar':
        this.showPanel('manage');
        return '⚙️ Abrindo gerenciador de credenciais.';
      
      case 'help':
      case 'ajuda':
        return this.cmdHelp();
      
      default:
        return `Comando não reconhecido: ${command}. Use @credentials help para ver comandos disponíveis.`;
    }
  }

  private cmdListCredentials(): string {
    if (this.vault.isVaultLocked()) {
      return '🔒 Vault está bloqueado. Desbloqueie primeiro.';
    }

    const credentials = this.vault.listCredentials();
    if (credentials.length === 0) {
      return '📭 Nenhuma credencial armazenada.';
    }

    let response = '📦 **Credenciais Armazenadas:**\n\n';
    for (const cred of credentials) {
      const schema = CREDENTIAL_SCHEMAS[cred.schemaId];
      const icon = schema?.icon || '🔐';
      const status = cred.expiresAt && cred.expiresAt < new Date() ? '⚠️ Expirada' : '✅';
      response += `${icon} **${cred.name}** (${schema?.name || cred.schemaId}) ${status}\n`;
    }

    return response;
  }

  private cmdVaultStatus(): string {
    const locked = this.vault.isVaultLocked();
    const credentials = locked ? 0 : this.vault.listCredentials().length;
    
    return `🔐 **Status do Vault:**\n\n` +
      `Estado: ${locked ? '🔒 Bloqueado' : '🔓 Desbloqueado'}\n` +
      `Credenciais: ${credentials}\n` +
      `Solicitações pendentes: ${this.flowManager.getPendingRequests().length}`;
  }

  private cmdHelp(): string {
    return `🔐 **Comandos de Credenciais:**\n\n` +
      `\`@credentials list\` - Listar credenciais\n` +
      `\`@credentials status\` - Status do vault\n` +
      `\`@credentials lock\` - Bloquear vault\n` +
      `\`@credentials history\` - Ver histórico\n` +
      `\`@credentials manage\` - Gerenciar credenciais\n` +
      `\`@credentials help\` - Esta ajuda`;
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  getState(): CredentialUIState {
    return { ...this.state };
  }

  private emitStateChange(): void {
    this.emit('stateChange', this.getState());
  }

  /**
   * Get LivePreview panel data
   */
  getLivePreviewPanel(): LivePreviewCredentialPanel {
    return {
      visible: this.state.panelVisible,
      mode: this.state.panelMode === 'request' ? 'request' : 
            this.state.panelMode === 'history' ? 'history' : 'manage',
      currentRequest: this.state.activePrompt ? 
        this.flowManager.getPendingRequests().find(r => r.requestId === this.state.activePrompt?.requestId) : 
        undefined,
      storedCredentials: this.state.storedCredentials.map(c => ({
        id: c.id,
        name: c.name,
        category: c.category,
        icon: c.icon,
        lastUsed: c.lastUsed,
        expiresAt: c.expiresAt,
        verified: c.verified,
      })),
      recentActivity: this.vault.getRecentEvents(10),
      securityStatus: {
        vaultLocked: this.state.vaultLocked,
        lastUnlock: undefined, // Would need to track
        activePermissions: 0, // Would need to count
      },
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.removeAllListeners();
  }
}
