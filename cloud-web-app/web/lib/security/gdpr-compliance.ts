/**
 * GDPR Compliance Utilities
 *
 * Data export, deletion, and consent management.
 *
 * @see docs/master/38_L5_EXECUTION_BOARD_2026-03-10.md (P2: Compliance)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DataExportRequest {
  userId: string;
  requestedAt: string;
  format: 'json' | 'csv';
  includeProjects: boolean;
  includeChat: boolean;
  includeUsage: boolean;
  includeAuditLog: boolean;
}

export interface DataExportResult {
  requestId: string;
  userId: string;
  status: 'pending' | 'processing' | 'ready' | 'expired';
  format: string;
  downloadUrl?: string;
  expiresAt?: string;
  sections: string[];
  generatedAt?: string;
}

export interface DeletionRequest {
  userId: string;
  requestedAt: string;
  reason?: string;
  retentionEndDate: string; // 30-day window
  status: 'pending' | 'processing' | 'completed' | 'canceled';
}

export interface ConsentRecord {
  userId: string;
  type: 'analytics' | 'marketing' | 'essential' | 'ai-training';
  granted: boolean;
  grantedAt: string;
  revokedAt?: string;
  version: string;
  ipAddress?: string;
}

// ============================================================================
// DATA SUBJECT RIGHTS
// ============================================================================

/**
 * Generate a data export package for a user (GDPR Art. 20 - Portability)
 */
export async function generateDataExport(request: DataExportRequest): Promise<DataExportResult> {
  const requestId = `export_${Date.now()}_${request.userId.slice(0, 8)}`;
  const sections: string[] = ['profile'];

  if (request.includeProjects) sections.push('projects');
  if (request.includeChat) sections.push('chat_history');
  if (request.includeUsage) sections.push('usage_data');
  if (request.includeAuditLog) sections.push('audit_log');

  // In production, this would queue a background job
  return {
    requestId,
    userId: request.userId,
    status: 'pending',
    format: request.format,
    sections,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Request account deletion (GDPR Art. 17 - Right to Erasure)
 */
export function createDeletionRequest(userId: string, reason?: string): DeletionRequest {
  const now = new Date();
  const retentionEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return {
    userId,
    requestedAt: now.toISOString(),
    reason,
    retentionEndDate: retentionEnd.toISOString(),
    status: 'pending',
  };
}

/**
 * Record user consent (GDPR Art. 7)
 */
export function recordConsent(
  userId: string,
  type: ConsentRecord['type'],
  granted: boolean,
  version = '1.0.0'
): ConsentRecord {
  return {
    userId,
    type,
    granted,
    grantedAt: new Date().toISOString(),
    version,
  };
}

// ============================================================================
// DATA PROCESSING RECORDS (GDPR Art. 30)
// ============================================================================

export const DATA_PROCESSING_ACTIVITIES = [
  {
    purpose: 'Account Management',
    legalBasis: 'Contract (Art. 6(1)(b))',
    dataCategories: ['email', 'name', 'password_hash', 'plan'],
    retention: 'Duration of account + 30 days',
    recipients: ['Internal platform services'],
  },
  {
    purpose: 'AI Code Generation',
    legalBasis: 'Contract (Art. 6(1)(b))',
    dataCategories: ['project_code', 'chat_messages', 'ai_prompts'],
    retention: 'Duration of project lifetime',
    recipients: ['AI model providers (OpenAI, Anthropic, Google)'],
  },
  {
    purpose: 'Billing',
    legalBasis: 'Contract (Art. 6(1)(b))',
    dataCategories: ['payment_method', 'billing_address', 'transaction_history'],
    retention: '7 years (tax compliance)',
    recipients: ['Stripe (payment processor)'],
  },
  {
    purpose: 'Analytics',
    legalBasis: 'Legitimate Interest (Art. 6(1)(f))',
    dataCategories: ['page_views', 'feature_usage', 'performance_metrics'],
    retention: '2 years',
    recipients: ['PostHog (analytics)'],
  },
  {
    purpose: 'Security',
    legalBasis: 'Legitimate Interest (Art. 6(1)(f))',
    dataCategories: ['ip_address', 'user_agent', 'login_attempts', 'audit_log'],
    retention: '1 year',
    recipients: ['Internal security services'],
  },
];

// ============================================================================
// PRIVACY POLICY METADATA
// ============================================================================

export const PRIVACY_METADATA = {
  lastUpdated: '2026-03-11',
  version: '1.0.0',
  dpo: {
    email: 'privacy@aethel.dev',
    name: 'Aethel Data Protection Officer',
  },
  supervisoryAuthority: 'ANPD (Brazil) / ICO (UK)',
  dataController: {
    name: 'Aethel Engine',
    address: 'São Paulo, Brazil',
    email: 'legal@aethel.dev',
  },
  subProcessors: [
    { name: 'Stripe', purpose: 'Payment processing', location: 'US' },
    { name: 'Vercel', purpose: 'Hosting', location: 'US/EU' },
    { name: 'OpenAI', purpose: 'AI model inference', location: 'US' },
    { name: 'Anthropic', purpose: 'AI model inference', location: 'US' },
    { name: 'Google Cloud', purpose: 'AI model inference', location: 'US/EU' },
    { name: 'E2B', purpose: 'Code sandbox execution', location: 'US/EU' },
    { name: 'PostHog', purpose: 'Product analytics', location: 'EU' },
  ],
};
