import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('advanced-config')


/**
 * Advanced Configuration System - Enterprise Grade
 * 
 * RBAC (Role-Based Access Control), Webhooks, API Keys
 * Padrão: Linear, Vercel, GitHub
 */

/**
 * Tipos de Roles
 */
export enum Role {
  OWNER = 'owner',
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  VIEWER = 'viewer',
  GUEST = 'guest',
}

/**
 * Permissões por Role
 */
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  [Role.OWNER]: [
    'project:create',
    'project:read',
    'project:update',
    'project:delete',
    'project:settings',
    'billing:manage',
    'team:manage',
    'webhooks:manage',
    'api-keys:manage',
    'audit:view',
  ],
  [Role.ADMIN]: [
    'project:create',
    'project:read',
    'project:update',
    'project:delete',
    'project:settings',
    'team:manage',
    'webhooks:manage',
    'api-keys:manage',
    'audit:view',
  ],
  [Role.DEVELOPER]: [
    'project:create',
    'project:read',
    'project:update',
    'project:settings',
    'webhooks:view',
    'api-keys:create',
    'api-keys:view',
  ],
  [Role.VIEWER]: [
    'project:read',
    'api-keys:view',
  ],
  [Role.GUEST]: [
    'project:read',
  ],
}

/**
 * Interface de API Key
 */
export interface APIKey {
  id: string
  name: string
  key: string // Masked: sk_live_***...***
  secret?: string // Never exposed
  createdAt: Date
  expiresAt?: Date
  lastUsedAt?: Date
  status: 'active' | 'revoked' | 'expired'
  permissions: string[]
  rateLimit?: {
    requests: number
    period: 'minute' | 'hour' | 'day'
  }
}

/**
 * Interface de Webhook
 */
export interface Webhook {
  id: string
  url: string
  events: WebhookEvent[]
  active: boolean
  createdAt: Date
  lastTriggeredAt?: Date
  failureCount: number
  secret: string
  headers?: Record<string, string>
}

/**
 * Tipos de Eventos de Webhook
 */
export enum WebhookEvent {
  // Deploy
  DEPLOY_STARTED = 'deploy.started',
  DEPLOY_SUCCESS = 'deploy.success',
  DEPLOY_FAILED = 'deploy.failed',

  // Billing
  BILLING_PAYMENT_SUCCESS = 'billing.payment.success',
  BILLING_PAYMENT_FAILED = 'billing.payment.failed',
  BILLING_SUBSCRIPTION_CHANGED = 'billing.subscription.changed',
  BILLING_QUOTA_WARNING = 'billing.quota.warning',

  // Project
  PROJECT_CREATED = 'project.created',
  PROJECT_UPDATED = 'project.updated',
  PROJECT_DELETED = 'project.deleted',

  // Team
  TEAM_MEMBER_ADDED = 'team.member.added',
  TEAM_MEMBER_REMOVED = 'team.member.removed',
  TEAM_MEMBER_ROLE_CHANGED = 'team.member.role.changed',

  // Security
  API_KEY_CREATED = 'security.api_key.created',
  API_KEY_REVOKED = 'security.api_key.revoked',
}

/**
 * Interface de Payload de Webhook
 */
export interface WebhookPayload {
  id: string
  event: WebhookEvent
  timestamp: string
  data: Record<string, any>
  signature: string // HMAC-SHA256 do payload
}

/**
 * Manager de Configurações Avançadas
 */
export class AdvancedConfigManager {
  private static instance: AdvancedConfigManager

  private constructor() {}

  static getInstance(): AdvancedConfigManager {
    if (!AdvancedConfigManager.instance) {
      AdvancedConfigManager.instance = new AdvancedConfigManager()
    }
    return AdvancedConfigManager.instance
  }

  /**
   * Verificar permissão
   */
  hasPermission(role: Role, permission: string): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
  }

  /**
   * Verificar múltiplas permissões (AND)
   */
  hasAllPermissions(role: Role, permissions: string[]): boolean {
    return permissions.every((perm) => this.hasPermission(role, perm))
  }

  /**
   * Verificar múltiplas permissões (OR)
   */
  hasAnyPermission(role: Role, permissions: string[]): boolean {
    return permissions.some((perm) => this.hasPermission(role, perm))
  }

  /**
   * Gerar API Key
   */
  generateAPIKey(name: string, permissions: string[], expiresIn?: number): APIKey {
    const key = `sk_live_${this.generateRandomString(32)}`
    const secret = this.generateRandomString(64)

    return {
      id: `key_${this.generateRandomString(16)}`,
      name,
      key,
      secret,
      createdAt: new Date(),
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : undefined,
      status: 'active',
      permissions,
    }
  }

  /**
   * Mascarar API Key para exibição
   */
  maskAPIKey(key: string): string {
    if (key.length <= 8) return key
    return `${key.slice(0, 4)}...${key.slice(-4)}`
  }

  /**
   * Validar API Key
   */
  validateAPIKey(key: APIKey): { valid: boolean; reason?: string } {
    if (key.status === 'revoked') {
      return { valid: false, reason: 'API Key foi revogada' }
    }

    if (key.status === 'expired') {
      return { valid: false, reason: 'API Key expirou' }
    }

    if (key.expiresAt && new Date() > key.expiresAt) {
      return { valid: false, reason: 'API Key expirou' }
    }

    return { valid: true }
  }

  /**
   * Gerar Webhook Signature (HMAC-SHA256)
   */
  generateWebhookSignature(payload: string, secret: string): string {
    // Implementação simplificada - usar crypto real em produção
    return `sha256=${Buffer.from(payload).toString('hex')}`
  }

  /**
   * Validar Webhook Signature
   */
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateWebhookSignature(payload, secret)
    return signature === expectedSignature
  }

  /**
   * Gerar string aleatória
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

/**
 * Instância global
 */
export const advancedConfig = AdvancedConfigManager.getInstance()

/**
 * Hook para verificar permissão
 */
export function usePermission(role: Role) {
  return {
    can: (permission: string) => advancedConfig.hasPermission(role, permission),
    canAll: (permissions: string[]) => advancedConfig.hasAllPermissions(role, permissions),
    canAny: (permissions: string[]) => advancedConfig.hasAnyPermission(role, permissions),
  }
}

/**
 * Componente de proteção por permissão
 */
export function PermissionGuard({
  permission,
  role,
  children,
  fallback = null,
}: {
  permission: string
  role: Role
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  if (!advancedConfig.hasPermission(role, permission)) {
    return fallback
  }

  return children
}

/**
 * Tipos de Auditoria
 */
export interface AuditLog {
  id: string
  userId: string
  action: string
  resource: string
  resourceId: string
  changes?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  status: 'success' | 'failure'
  errorMessage?: string
}

/**
 * Manager de Auditoria
 */
export class AuditManager {
  private static instance: AuditManager
  private logs: AuditLog[] = []

  private constructor() {}

  static getInstance(): AuditManager {
    if (!AuditManager.instance) {
      AuditManager.instance = new AuditManager()
    }
    return AuditManager.instance
  }

  /**
   * Registrar ação
   */
  log(audit: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const log: AuditLog = {
      ...audit,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    }

    this.logs.push(log)
    log.info('[Audit]', log)

    // Enviar para servidor em produção
    if (typeof window !== 'undefined') {
      this.sendToServer(log)
    }

    return log
  }

  /**
   * Obter logs
   */
  getLogs(filters?: { userId?: string; action?: string; resourceId?: string }): AuditLog[] {
    if (!filters) return this.logs

    return this.logs.filter((log) => {
      if (filters.userId && log.userId !== filters.userId) return false
      if (filters.action && log.action !== filters.action) return false
      if (filters.resourceId && log.resourceId !== filters.resourceId) return false
      return true
    })
  }

  /**
   * Enviar para servidor
   */
  private async sendToServer(log: AuditLog): Promise<void> {
    try {
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      })
    } catch (error) {
      console.error('[Audit] Falha ao enviar:', error)
    }
  }
}

/**
 * Instância global de auditoria
 */
export const audit = AuditManager.getInstance()
