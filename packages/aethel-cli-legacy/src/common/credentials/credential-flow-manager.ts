/**
 * ============================================
 * AETHEL ENGINE - Credential Flow Manager
 * ============================================
 * 
 * Gerencia o fluxo de solicitação de credenciais
 * entre os agentes IA e os usuários.
 * 
 * Fluxo:
 * 1. Agente precisa de credencial
 * 2. Verifica se já existe no vault
 * 3. Se não, cria solicitação
 * 4. UI mostra prompt seguro ao usuário
 * 5. Usuário fornece dados
 * 6. Dados são armazenados criptografados
 * 7. Agente recebe acesso temporário
 */

import { EventEmitter } from 'events';
import { SecureVault } from './secure-vault';
import {
  CredentialRequest,
  CredentialResponse,
  CredentialSchema,
  SecureInputPrompt,
  SecureInputResult,
  PermissionRequest,
  PermissionGrant,
  CredentialPermission,
  WorkflowContext,
  AgentCredentialAccess,
  CREDENTIAL_SCHEMAS,
  VaultEvent,
} from './credential-types';

// ============================================
// AGENT REGISTRY
// ============================================

export interface RegisteredAgent {
  id: string;
  name: string;
  icon: string;
  description: string;
  trustLevel: 'verified' | 'trusted' | 'unknown';
  capabilities: string[];
  requiredCredentials: string[];
  optionalCredentials: string[];
}

// Agentes pré-registrados
export const REGISTERED_AGENTS: Record<string, RegisteredAgent> = {
  'trading-ai': {
    id: 'trading-ai',
    name: 'Trading AI',
    icon: '📈',
    description: 'Sistema autônomo de trading',
    trustLevel: 'verified',
    capabilities: ['trade', 'analyze', 'monitor'],
    requiredCredentials: ['binance', 'metatrader'],
    optionalCredentials: [],
  },
  'freelance-ai': {
    id: 'freelance-ai',
    name: 'Freelance AI',
    icon: '💼',
    description: 'Assistente de freelancing',
    trustLevel: 'verified',
    capabilities: ['apply', 'communicate', 'invoice'],
    requiredCredentials: ['upwork', 'fiverr'],
    optionalCredentials: ['gmail'],
  },
  'email-ai': {
    id: 'email-ai',
    name: 'Email AI',
    icon: '📧',
    description: 'Gerenciador de emails inteligente',
    trustLevel: 'verified',
    capabilities: ['read', 'compose', 'organize'],
    requiredCredentials: ['gmail'],
    optionalCredentials: ['smtp'],
  },
  'dev-ai': {
    id: 'dev-ai',
    name: 'Dev AI',
    icon: '🛠️',
    description: 'Assistente de desenvolvimento',
    trustLevel: 'verified',
    capabilities: ['code', 'commit', 'deploy'],
    requiredCredentials: ['github'],
    optionalCredentials: ['npm', 'aws'],
  },
  'research-ai': {
    id: 'research-ai',
    name: 'Research AI',
    icon: '🔍',
    description: 'Pesquisador autônomo',
    trustLevel: 'verified',
    capabilities: ['search', 'analyze', 'summarize'],
    requiredCredentials: [],
    optionalCredentials: ['openai', 'anthropic'],
  },
};

// ============================================
// CREDENTIAL FLOW MANAGER
// ============================================

interface FlowConfig {
  requestTimeout: number;          // ms
  maxPendingRequests: number;
  autoApproveForTrusted: boolean;
  requireConfirmation: boolean;
}

const DEFAULT_FLOW_CONFIG: FlowConfig = {
  requestTimeout: 5 * 60 * 1000,   // 5 minutes
  maxPendingRequests: 10,
  autoApproveForTrusted: false,
  requireConfirmation: true,
};

export class CredentialFlowManager extends EventEmitter {
  private vault: SecureVault;
  private config: FlowConfig;
  
  // Request tracking
  private pendingRequests: Map<string, CredentialRequest> = new Map();
  private pendingPermissions: Map<string, PermissionRequest> = new Map();
  private activeGrants: Map<string, PermissionGrant[]> = new Map();
  
  // Timeouts
  private requestTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(vault: SecureVault, config: Partial<FlowConfig> = {}) {
    super();
    this.vault = vault;
    this.config = { ...DEFAULT_FLOW_CONFIG, ...config };
    
    // Listen to vault events
    this.vault.on('event', (event: VaultEvent) => {
      this.emit('vaultEvent', event);
    });
  }

  // ============================================
  // CREDENTIAL REQUEST FLOW
  // ============================================

  /**
   * Request a credential from the user
   * Called by agents when they need access to a service
   */
  async requestCredential(
    schemaId: string,
    agentId: string,
    reason: string,
    context: WorkflowContext
  ): Promise<CredentialResponse> {
    // Validate schema
    const schema = CREDENTIAL_SCHEMAS[schemaId];
    if (!schema) {
      return {
        requestId: '',
        success: false,
        error: `Schema '${schemaId}' não encontrado.`,
        timestamp: new Date(),
      };
    }

    // Validate agent
    const agent = REGISTERED_AGENTS[agentId];
    if (!agent) {
      return {
        requestId: '',
        success: false,
        error: `Agente '${agentId}' não registrado.`,
        timestamp: new Date(),
      };
    }

    // Check if credential already exists
    if (this.vault.hasCredentialForSchema(schemaId)) {
      const existing = this.vault.getCredentialsByCategory(schema.category)
        .find(c => c.schemaId === schemaId);
      
      if (existing) {
        return {
          requestId: '',
          success: true,
          credentialId: existing.id,
          timestamp: new Date(),
        };
      }
    }

    // Check pending requests limit
    if (this.pendingRequests.size >= this.config.maxPendingRequests) {
      return {
        requestId: '',
        success: false,
        error: 'Limite de solicitações pendentes atingido.',
        timestamp: new Date(),
      };
    }

    // Create request
    const requestId = this.generateId();
    const request: CredentialRequest = {
      requestId,
      schemaId,
      agentId,
      agentName: agent.name,
      reason,
      context: {
        task: context.name,
        workflow: context.type,
        priority: this.determinePriority(context),
      },
      requiredFields: schema.fields.filter(f => f.required).map(f => f.id),
      optionalFields: schema.fields.filter(f => !f.required).map(f => f.id),
      suggestedName: `${schema.name} - ${context.name}`,
      timestamp: new Date(),
      status: 'pending',
      timeout: this.config.requestTimeout,
    };

    this.pendingRequests.set(requestId, request);
    
    // Set timeout
    const timeout = setTimeout(() => {
      this.handleRequestTimeout(requestId);
    }, this.config.requestTimeout);
    this.requestTimeouts.set(requestId, timeout);

    // Emit event for UI
    this.emit('credentialRequested', {
      request,
      prompt: this.createInputPrompt(request, schema, agent),
    });

    // Wait for user response
    return new Promise((resolve) => {
      const handler = (response: CredentialResponse) => {
        if (response.requestId === requestId) {
          this.removeListener('credentialResponse', handler);
          resolve(response);
        }
      };
      this.on('credentialResponse', handler);
    });
  }

  /**
   * Handle user providing credential values
   */
  async handleCredentialInput(
    requestId: string,
    values: Record<string, string>,
    userId: string
  ): Promise<CredentialResponse> {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      return {
        requestId,
        success: false,
        error: 'Solicitação não encontrada ou expirada.',
        timestamp: new Date(),
      };
    }

    // Clear timeout
    const timeout = this.requestTimeouts.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      this.requestTimeouts.delete(requestId);
    }

    // Store credential
    const result = await this.vault.storeCredential(
      request.schemaId,
      request.suggestedName || `${request.schemaId} credential`,
      values,
      userId
    );

    // Update request status
    request.status = result.success ? 'completed' : 'cancelled';
    this.pendingRequests.delete(requestId);

    const response: CredentialResponse = {
      requestId,
      success: result.success,
      credentialId: result.credentialId,
      error: result.error,
      timestamp: new Date(),
    };

    // Emit response
    this.emit('credentialResponse', response);
    
    return response;
  }

  /**
   * Cancel a pending request
   */
  cancelRequest(requestId: string): void {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.status = 'cancelled';
      this.pendingRequests.delete(requestId);
      
      const timeout = this.requestTimeouts.get(requestId);
      if (timeout) {
        clearTimeout(timeout);
        this.requestTimeouts.delete(requestId);
      }

      this.emit('credentialResponse', {
        requestId,
        success: false,
        error: 'Solicitação cancelada pelo usuário.',
        timestamp: new Date(),
      });
    }
  }

  private handleRequestTimeout(requestId: string): void {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.status = 'timeout';
      this.pendingRequests.delete(requestId);
      this.requestTimeouts.delete(requestId);

      this.emit('credentialResponse', {
        requestId,
        success: false,
        error: 'Tempo limite excedido.',
        timestamp: new Date(),
      });
    }
  }

  // ============================================
  // PERMISSION MANAGEMENT
  // ============================================

  /**
   * Request permission to use a credential
   */
  async requestPermission(
    credentialId: string,
    agentId: string,
    permissions: CredentialPermission[],
    reason: string
  ): Promise<PermissionGrant | null> {
    const agent = REGISTERED_AGENTS[agentId];
    if (!agent) return null;

    const credential = this.vault.getCredential(credentialId);
    if (!credential) return null;

    const requestId = this.generateId();
    const request: PermissionRequest = {
      requestId,
      agentId,
      agentName: agent.name,
      credentialId,
      permissions,
      reason,
      context: `${agent.name} precisa de acesso a ${credential.name}`,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.config.requestTimeout),
      status: 'pending',
    };

    this.pendingPermissions.set(requestId, request);

    // Emit for UI
    this.emit('permissionRequested', request);

    // Wait for user approval
    return new Promise((resolve) => {
      const handler = (grant: PermissionGrant | null) => {
        if (grant?.requestId === requestId || !grant) {
          this.removeListener('permissionResponse', handler);
          resolve(grant);
        }
      };
      this.on('permissionResponse', handler);

      // Timeout
      setTimeout(() => {
        if (this.pendingPermissions.has(requestId)) {
          this.pendingPermissions.delete(requestId);
          this.removeListener('permissionResponse', handler);
          resolve(null);
        }
      }, this.config.requestTimeout);
    });
  }

  /**
   * Grant permission
   */
  grantPermission(
    requestId: string,
    userId: string,
    expiresIn: number = 3600000, // 1 hour default
    scope?: PermissionGrant['scope']
  ): PermissionGrant | null {
    const request = this.pendingPermissions.get(requestId);
    if (!request) return null;

    request.status = 'approved';
    this.pendingPermissions.delete(requestId);

    const grant: PermissionGrant = {
      grantId: this.generateId(),
      requestId,
      userId,
      credentialId: request.credentialId,
      permissions: request.permissions,
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + expiresIn),
      scope: scope || {},
    };

    // Store active grant
    const agentGrants = this.activeGrants.get(request.agentId) || [];
    agentGrants.push(grant);
    this.activeGrants.set(request.agentId, agentGrants);

    this.emit('permissionResponse', grant);
    return grant;
  }

  /**
   * Deny permission
   */
  denyPermission(requestId: string): void {
    const request = this.pendingPermissions.get(requestId);
    if (request) {
      request.status = 'denied';
      this.pendingPermissions.delete(requestId);
      this.emit('permissionResponse', null);
    }
  }

  /**
   * Revoke all permissions for an agent
   */
  revokeAgentPermissions(agentId: string): void {
    this.activeGrants.delete(agentId);
  }

  /**
   * Check if agent has permission
   */
  hasPermission(
    agentId: string,
    credentialId: string,
    permission: CredentialPermission
  ): boolean {
    const grants = this.activeGrants.get(agentId) || [];
    const now = new Date();

    return grants.some(g => 
      g.credentialId === credentialId &&
      g.permissions.includes(permission) &&
      g.expiresAt > now
    );
  }

  // ============================================
  // AGENT ACCESS INTERFACE
  // ============================================

  /**
   * Create an access interface for an agent
   */
  createAgentAccess(agentId: string): AgentCredentialAccess {
    const self = this;
    const agent = REGISTERED_AGENTS[agentId];
    
    if (!agent) {
      throw new Error(`Agente '${agentId}' não registrado.`);
    }

    return {
      async requestCredential(
        schema: string,
        reason: string,
        context: WorkflowContext
      ): Promise<CredentialResponse> {
        return self.requestCredential(schema, agentId, reason, context);
      },

      async useCredential(
        credentialId: string,
        permission: CredentialPermission
      ): Promise<{ success: boolean; value?: Record<string, string>; error?: string }> {
        // Check permission
        if (!self.hasPermission(agentId, credentialId, permission)) {
          // Request permission
          const grant = await self.requestPermission(
            credentialId,
            agentId,
            [permission],
            `${agent.name} precisa de permissão '${permission}'`
          );

          if (!grant) {
            return { success: false, error: 'Permissão negada.' };
          }
        }

        // Get values
        return self.vault.getCredentialValues(credentialId, agentId, `Usando para ${permission}`);
      },

      async hasCredential(schema: string): Promise<boolean> {
        return self.vault.hasCredentialForSchema(schema);
      },

      async requestPermission(
        credentialId: string,
        permissions: CredentialPermission[],
        reason: string
      ): Promise<PermissionGrant | null> {
        return self.requestPermission(credentialId, agentId, permissions, reason);
      },

      async revokeAccess(credentialId: string): Promise<void> {
        const grants = self.activeGrants.get(agentId) || [];
        self.activeGrants.set(
          agentId,
          grants.filter(g => g.credentialId !== credentialId)
        );
      },
    };
  }

  // ============================================
  // UI HELPERS
  // ============================================

  /**
   * Create input prompt for UI
   */
  private createInputPrompt(
    request: CredentialRequest,
    schema: CredentialSchema,
    agent: RegisteredAgent
  ): SecureInputPrompt {
    return {
      promptId: request.requestId,
      requestId: request.requestId,
      title: `${agent.icon} ${agent.name} precisa de acesso`,
      description: `Para continuar com "${request.context.task}", ${agent.name} precisa das credenciais do ${schema.name}.`,
      fields: schema.fields.map(f => ({
        id: f.id,
        label: f.label,
        type: f.sensitive ? 'password' : 'text',
        placeholder: f.placeholder,
        description: f.description,
        required: f.required,
        validation: f.validation ? {
          pattern: f.validation.pattern,
          message: `Formato inválido para ${f.label}`,
        } : undefined,
      })),
      agentInfo: {
        id: agent.id,
        name: agent.name,
        icon: agent.icon,
        trustLevel: agent.trustLevel,
      },
      securityInfo: {
        encryption: 'AES-256-GCM',
        storage: schema.securityLevel === 'critical' ? 'Nunca persistido' : 'Criptografado localmente',
        retention: schema.expiresIn 
          ? `Expira em ${Math.round(schema.expiresIn / 86400000)} dias`
          : 'Até revogação manual',
      },
      actions: {
        submit: 'Autorizar',
        cancel: 'Cancelar',
        moreInfo: schema.documentation,
      },
    };
  }

  /**
   * Get all pending requests
   */
  getPendingRequests(): CredentialRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  /**
   * Get all pending permissions
   */
  getPendingPermissions(): PermissionRequest[] {
    return Array.from(this.pendingPermissions.values());
  }

  /**
   * Get active grants for an agent
   */
  getAgentGrants(agentId: string): PermissionGrant[] {
    const now = new Date();
    return (this.activeGrants.get(agentId) || [])
      .filter(g => g.expiresAt > now);
  }

  // ============================================
  // UTILITIES
  // ============================================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private determinePriority(context: WorkflowContext): 'low' | 'medium' | 'high' | 'urgent' {
    if (context.type === 'trading') return 'high';
    if (context.status === 'in_progress') return 'medium';
    return 'low';
  }

  /**
   * Cleanup
   */
  destroy(): void {
    for (const timeout of this.requestTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.requestTimeouts.clear();
    this.pendingRequests.clear();
    this.pendingPermissions.clear();
    this.activeGrants.clear();
    this.removeAllListeners();
  }
}
