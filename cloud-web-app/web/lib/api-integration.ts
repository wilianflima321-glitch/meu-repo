/**
 * API Integration Layer - Real Backend Integration
 * 
 * Substitui mocks por chamadas reais via Prisma/Next-Auth
 * Padrão: Type-safe, error handling, retry logic
 */

import { eliteFetcher, ELITE_SWR_CONFIG } from './swr-config'
import { telemetry } from './telemetry'

/**
 * Tipos de Resposta
 */
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  meta?: {
    timestamp: string
    requestId: string
  }
}

/**
 * Tipos de Usuário
 */
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'owner' | 'admin' | 'developer' | 'viewer'
  plan: 'starter' | 'pro' | 'enterprise'
  createdAt: string
  updatedAt: string
}

/**
 * Tipos de Projeto
 */
export interface ProjectData {
  id: string
  name: string
  description?: string
  status: 'active' | 'archived' | 'deleted'
  type: 'web' | 'mobile' | 'game' | 'film'
  createdAt: string
  updatedAt: string
  owner: User
  members: User[]
}

/**
 * Tipos de Billing
 */
export interface BillingData {
  plan: 'starter' | 'pro' | 'enterprise'
  status: 'active' | 'trial' | 'cancelled'
  currentPeriodStart: string
  currentPeriodEnd: string
  usage: {
    tokens: number
    storage: number
    requests: number
    builds: number
  }
  limits: {
    tokens: number
    storage: number
    requests: number
    builds: number
  }
  nextBillingDate?: string
  paymentMethod?: {
    type: 'card' | 'bank'
    last4: string
  }
}

/**
 * Tipos de Deploy
 */
export interface DeployData {
  id: string
  projectId: string
  version: string
  status: 'pending' | 'building' | 'deploying' | 'success' | 'failed'
  url?: string
  logs?: string
  createdAt: string
  completedAt?: string
  duration?: number
}

export interface WebhookData {
  id: string
  url: string
  events: string[]
  active: boolean
  createdAt?: string
}

export interface APIKeyData {
  id: string
  name: string
  permissions: string[]
  createdAt?: string
  expiresAt?: string
}

export interface AuditLogData {
  id: string
  userId?: string
  action: string
  createdAt: string
  metadata?: Record<string, unknown>
}

/**
 * API Client Centralizado
 */
export class AethelAPIIntegration {
  private static instance: AethelAPIIntegration
  private baseURL = '/api'

  private constructor() {}

  static getInstance(): AethelAPIIntegration {
    if (!AethelAPIIntegration.instance) {
      AethelAPIIntegration.instance = new AethelAPIIntegration()
    }
    return AethelAPIIntegration.instance
  }

  /**
   * Fazer requisição com retry e telemetria
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const startTime = Date.now()

    try {
      const response = await eliteFetcher<APIResponse<T>>(url, {
        method,
        ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
      })

      const duration = Date.now() - startTime
      telemetry.trackApiCall(method, endpoint, duration, 200)

      return response
    } catch (error) {
      const duration = Date.now() - startTime
      telemetry.trackApiCall(method, endpoint, duration, 500, error as Error)
      telemetry.trackError(error as Error, { endpoint, method })

      throw error
    }
  }

  /**
   * GET /auth/me - Obter usuário atual
   */
  async getCurrentUser(): Promise<APIResponse<User>> {
    return this.request('GET', '/auth/me')
  }

  /**
   * GET /projects - Listar projetos
   */
  async getProjects(): Promise<APIResponse<ProjectData[]>> {
    return this.request('GET', '/projects')
  }

  /**
   * POST /projects - Criar projeto
   */
  async createProject(data: {
    name: string
    description?: string
    type: string
  }): Promise<APIResponse<ProjectData>> {
    return this.request('POST', '/projects', data)
  }

  /**
   * GET /projects/:id - Obter projeto
   */
  async getProject(projectId: string): Promise<APIResponse<ProjectData>> {
    return this.request('GET', `/projects/${projectId}`)
  }

  /**
   * PATCH /projects/:id - Atualizar projeto
   */
  async updateProject(
    projectId: string,
    data: Partial<ProjectData>
  ): Promise<APIResponse<ProjectData>> {
    return this.request('PATCH', `/projects/${projectId}`, data)
  }

  /**
   * DELETE /projects/:id - Deletar projeto
   */
  async deleteProject(projectId: string): Promise<APIResponse<{ success: boolean }>> {
    return this.request('DELETE', `/projects/${projectId}`)
  }

  /**
   * GET /billing - Obter dados de billing
   */
  async getBilling(): Promise<APIResponse<BillingData>> {
    return this.request('GET', '/billing')
  }

  /**
   * POST /billing/upgrade - Fazer upgrade de plano
   */
  async upgradePlan(planId: string): Promise<APIResponse<BillingData>> {
    return this.request('POST', '/billing/upgrade', { planId })
  }

  /**
   * POST /billing/payment - Processar pagamento
   */
  async processPayment(data: {
    amount: number
    currency: string
    paymentMethodId: string
  }): Promise<APIResponse<{ transactionId: string; status: string }>> {
    return this.request('POST', '/billing/payment', data)
  }

  /**
   * GET /billing/usage - Obter uso de recursos
   */
  async getUsage(): Promise<APIResponse<BillingData['usage']>> {
    return this.request('GET', '/billing/usage')
  }

  /**
   * POST /deploy - Iniciar deploy
   */
  async startDeploy(projectId: string): Promise<APIResponse<DeployData>> {
    return this.request('POST', '/deploy', { projectId })
  }

  /**
   * GET /deploy/:id - Obter status de deploy
   */
  async getDeployStatus(deployId: string): Promise<APIResponse<DeployData>> {
    return this.request('GET', `/deploy/${deployId}`)
  }

  /**
   * GET /deploy/:id/logs - Obter logs de deploy
   */
  async getDeployLogs(deployId: string): Promise<APIResponse<{ logs: string }>> {
    return this.request('GET', `/deploy/${deployId}/logs`)
  }

  /**
   * POST /webhooks - Criar webhook
   */
  async createWebhook(data: {
    url: string
    events: string[]
    active: boolean
  }): Promise<APIResponse<{ id: string; secret: string }>> {
    return this.request('POST', '/webhooks', data)
  }

  /**
   * GET /webhooks - Listar webhooks
   */
  async getWebhooks(): Promise<APIResponse<WebhookData[]>> {
    return this.request('GET', '/webhooks')
  }

  /**
   * POST /api-keys - Criar API Key
   */
  async createAPIKey(data: {
    name: string
    permissions: string[]
    expiresIn?: number
  }): Promise<APIResponse<{ key: string; secret: string }>> {
    return this.request('POST', '/api-keys', data)
  }

  /**
   * GET /api-keys - Listar API Keys
   */
  async getAPIKeys(): Promise<APIResponse<APIKeyData[]>> {
    return this.request('GET', '/api-keys')
  }

  /**
   * DELETE /api-keys/:id - Revogar API Key
   */
  async revokeAPIKey(keyId: string): Promise<APIResponse<{ success: boolean }>> {
    return this.request('DELETE', `/api-keys/${keyId}`)
  }

  /**
   * GET /team - Obter membros do time
   */
  async getTeamMembers(): Promise<APIResponse<User[]>> {
    return this.request('GET', '/team')
  }

  /**
   * POST /team/invite - Convidar membro
   */
  async inviteTeamMember(data: {
    email: string
    role: string
  }): Promise<APIResponse<{ invitationId: string }>> {
    return this.request('POST', '/team/invite', data)
  }

  /**
   * PATCH /team/:userId/role - Alterar role
   */
  async updateTeamMemberRole(userId: string, role: string): Promise<APIResponse<User>> {
    return this.request('PATCH', `/team/${userId}/role`, { role })
  }

  /**
   * DELETE /team/:userId - Remover membro
   */
  async removeTeamMember(userId: string): Promise<APIResponse<{ success: boolean }>> {
    return this.request('DELETE', `/team/${userId}`)
  }

  /**
   * GET /audit - Obter logs de auditoria
   */
  async getAuditLogs(filters?: {
    userId?: string
    action?: string
    limit?: number
  }): Promise<APIResponse<AuditLogData[]>> {
    const params = new URLSearchParams()
    if (filters?.userId) params.append('userId', filters.userId)
    if (filters?.action) params.append('action', filters.action)
    if (filters?.limit) params.append('limit', filters.limit.toString())

    return this.request('GET', `/audit?${params.toString()}`)
  }

  /**
   * GET /health - Health check
   */
  async healthCheck(): Promise<APIResponse<{ status: string; uptime: number }>> {
    return this.request('GET', '/health')
  }
}

/**
 * Instância global
 */
export const aethelAPI = AethelAPIIntegration.getInstance()

/**
 * Hook para usar API
 */
export function useAethelAPI() {
  return {
    getCurrentUser: () => aethelAPI.getCurrentUser(),
    getProjects: () => aethelAPI.getProjects(),
    createProject: (data: Parameters<AethelAPIIntegration['createProject']>[0]) => aethelAPI.createProject(data),
    getProject: (id: string) => aethelAPI.getProject(id),
    updateProject: (id: string, data: Parameters<AethelAPIIntegration['updateProject']>[1]) => aethelAPI.updateProject(id, data),
    deleteProject: (id: string) => aethelAPI.deleteProject(id),
    getBilling: () => aethelAPI.getBilling(),
    upgradePlan: (planId: string) => aethelAPI.upgradePlan(planId),
    processPayment: (data: Parameters<AethelAPIIntegration['processPayment']>[0]) => aethelAPI.processPayment(data),
    getUsage: () => aethelAPI.getUsage(),
    startDeploy: (projectId: string) => aethelAPI.startDeploy(projectId),
    getDeployStatus: (deployId: string) => aethelAPI.getDeployStatus(deployId),
    getDeployLogs: (deployId: string) => aethelAPI.getDeployLogs(deployId),
    createWebhook: (data: Parameters<AethelAPIIntegration['createWebhook']>[0]) => aethelAPI.createWebhook(data),
    getWebhooks: () => aethelAPI.getWebhooks(),
    createAPIKey: (data: Parameters<AethelAPIIntegration['createAPIKey']>[0]) => aethelAPI.createAPIKey(data),
    getAPIKeys: () => aethelAPI.getAPIKeys(),
    revokeAPIKey: (keyId: string) => aethelAPI.revokeAPIKey(keyId),
    getTeamMembers: () => aethelAPI.getTeamMembers(),
    inviteTeamMember: (data: Parameters<AethelAPIIntegration['inviteTeamMember']>[0]) => aethelAPI.inviteTeamMember(data),
    updateTeamMemberRole: (userId: string, role: string) =>
      aethelAPI.updateTeamMemberRole(userId, role),
    removeTeamMember: (userId: string) => aethelAPI.removeTeamMember(userId),
    getAuditLogs: (filters?: Parameters<AethelAPIIntegration['getAuditLogs']>[0]) => aethelAPI.getAuditLogs(filters),
    healthCheck: () => aethelAPI.healthCheck(),
  }
}
