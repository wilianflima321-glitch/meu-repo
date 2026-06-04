/**
 * Shared contracts for the Aethel email runtime.
 */

// ============================================================================
// TYPES
// ============================================================================

export type EmailProvider = 'sendgrid' | 'resend' | 'ses' | 'smtp' | 'mock';

export type EmailTemplate =
  // Auth
  | 'welcome'
  | 'verify_email'
  | 'magic_link'
  | 'password_reset'
  | 'password_changed'
  | 'login_alert'
  | 'mfa_enabled'
  // Notifications
  | 'invite_to_project'
  | 'project_shared'
  | 'comment_mention'
  | 'task_assigned'
  | 'build_complete'
  | 'export_ready'
  // Billing
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'payment_success'
  | 'payment_failed'
  | 'invoice'
  | 'trial_ending'
  | 'plan_upgrade'
  // Marketing
  | 'newsletter'
  | 'product_update'
  | 'feature_announcement'
  // Digest
  | 'daily_digest'
  | 'weekly_summary';

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
}

export interface EmailOptions {
  to: EmailAddress | EmailAddress[];
  from?: EmailAddress;
  replyTo?: EmailAddress;
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  text?: string;
  html?: string;
  template?: EmailTemplate;
  templateData?: Record<string, unknown>;
  attachments?: EmailAttachment[];
  tags?: string[];
  metadata?: Record<string, string>;
  trackOpens?: boolean;
  trackClicks?: boolean;
  sendAt?: Date;
  priority?: 'low' | 'normal' | 'high';
}

export interface EmailResult {
  id: string;
  messageId?: string;
  success: boolean;
  provider: EmailProvider;
  timestamp: Date;
  recipients: string[];
  error?: string;
}

export interface EmailStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complaints: number;
  unsubscribed: number;
}
