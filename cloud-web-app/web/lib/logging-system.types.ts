export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type AuditAction =
  // Auth
  | 'auth.login'
  | 'auth.logout'
  | 'auth.register'
  | 'auth.password_change'
  | 'auth.password_reset'
  | 'auth.mfa_enable'
  | 'auth.mfa_disable'
  | 'auth.session_revoke'
  // User
  | 'user.profile_update'
  | 'user.avatar_change'
  | 'user.settings_update'
  | 'user.preferences_update'
  | 'user.delete_account'
  // Project
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'project.archive'
  | 'project.restore'
  | 'project.transfer_ownership'
  | 'project.visibility_change'
  // File
  | 'file.create'
  | 'file.update'
  | 'file.delete'
  | 'file.rename'
  | 'file.move'
  | 'file.download'
  | 'file.upload'
  // Asset
  | 'asset.create'
  | 'asset.update'
  | 'asset.delete'
  | 'asset.import'
  | 'asset.export'
  // Collaboration
  | 'collab.invite_sent'
  | 'collab.invite_accepted'
  | 'collab.invite_revoked'
  | 'collab.member_removed'
  | 'collab.role_changed'
  | 'collab.comment_added'
  | 'collab.comment_deleted'
  // Billing
  | 'billing.subscription_created'
  | 'billing.subscription_updated'
  | 'billing.subscription_cancelled'
  | 'billing.payment_success'
  | 'billing.payment_failed'
  | 'billing.invoice_generated'
  | 'billing.refund_issued'
  // Admin
  | 'admin.user_ban'
  | 'admin.user_unban'
  | 'admin.content_remove'
  | 'admin.system_config_change'
  | 'admin.feature_flag_toggle'
  | 'admin.manual_override'
  // AI
  | 'ai.generation_start'
  | 'ai.generation_complete'
  | 'ai.generation_failed'
  | 'ai.model_change'
  // Engine
  | 'engine.build_start'
  | 'engine.build_complete'
  | 'engine.build_failed'
  | 'engine.export_start'
  | 'engine.export_complete'
  // Marketplace
  | 'marketplace.item_publish'
  | 'marketplace.item_unpublish'
  | 'marketplace.item_purchase'
  | 'marketplace.review_submit'
  // Security
  | 'security.suspicious_activity'
  | 'security.rate_limit_exceeded'
  | 'security.permission_denied'
  | 'security.api_key_created'
  | 'security.api_key_revoked';

export type AuditResource =
  | 'user'
  | 'project'
  | 'file'
  | 'asset'
  | 'team'
  | 'subscription'
  | 'payment'
  | 'marketplace_item'
  | 'api_key'
  | 'system';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  request?: {
    method: string;
    url: string;
    ip: string;
    userAgent: string;
    duration?: number;
  };
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  tags?: string[];
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: AuditAction;
  userId: string;
  userEmail?: string;
  userRole?: string;
  resourceType: AuditResource;
  resourceId: string;
  resourceName?: string;
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  enableAudit: boolean;
  batchSize: number;
  flushInterval: number;
  remoteEndpoint?: string;
  sentryDsn?: string;
  datadogApiKey?: string;
}
