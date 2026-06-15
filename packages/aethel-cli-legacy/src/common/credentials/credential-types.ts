/**
 * ============================================
 * AETHEL ENGINE - Secure Credential System
 * ============================================
 * 
 * Sistema unificado de gerenciamento de credenciais
 * para todas as operações das IAs que requerem
 * acesso a dados sensíveis dos usuários.
 * 
 * Contextos suportados:
 * - Trading (corretoras, APIs financeiras)
 * - Freelance (Upwork, Fiverr, Freelancer)
 * - Email (Gmail, Outlook, SMTP)
 * - Desenvolvimento (GitHub, GitLab, npm)
 * - Cloud (AWS, GCP, Azure)
 * - Social (Twitter, LinkedIn, Discord)
 * - Pesquisa (APIs de busca, scrapers)
 * - Qualquer serviço que necessite autenticação
 */

// ============================================
// CREDENTIAL TYPES & CATEGORIES
// ============================================

export type CredentialCategory = 
  | 'trading'      // Corretoras, exchanges, APIs financeiras
  | 'freelance'    // Plataformas de freelance
  | 'email'        // Serviços de email
  | 'development'  // Git, npm, APIs de dev
  | 'cloud'        // Provedores cloud
  | 'social'       // Redes sociais
  | 'research'     // APIs de pesquisa
  | 'ai'           // APIs de IA (OpenAI, Anthropic)
  | 'payment'      // Gateways de pagamento
  | 'storage'      // Armazenamento (S3, Dropbox)
  | 'communication'// Slack, Teams, Discord
  | 'custom';      // Qualquer outro serviço

export type CredentialType =
  | 'api_key'
  | 'api_secret'
  | 'access_token'
  | 'refresh_token'
  | 'oauth_token'
  | 'username'
  | 'password'
  | 'private_key'
  | 'public_key'
  | 'certificate'
  | 'webhook_url'
  | 'endpoint_url'
  | 'connection_string'
  | 'mfa_secret'
  | 'pin'
  | 'passphrase'
  | 'custom';

export type SecurityLevel = 
  | 'low'       // Pode ser cacheado em memória
  | 'medium'    // Criptografado em disco
  | 'high'      // Criptografado + requer confirmação
  | 'critical'; // Nunca persistido, sempre solicita

// ============================================
// CREDENTIAL DEFINITIONS
// ============================================

export interface CredentialField {
  id: string;
  name: string;
  type: CredentialType;
  label: string;
  placeholder?: string;
  description?: string;
  required: boolean;
  sensitive: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    custom?: (value: string) => boolean;
  };
  mask?: boolean; // Mostrar como ****
}

export interface CredentialSchema {
  id: string;
  name: string;
  category: CredentialCategory;
  icon: string;
  description: string;
  securityLevel: SecurityLevel;
  fields: CredentialField[];
  permissions: CredentialPermission[];
  expiresIn?: number; // ms, undefined = não expira
  requiresReauth?: boolean;
  documentation?: string;
  testEndpoint?: string;
}

export interface StoredCredential {
  id: string;
  schemaId: string;
  userId: string;
  name: string;
  category: CredentialCategory;
  values: Record<string, EncryptedValue>;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  metadata: {
    source: string;
    verified: boolean;
    usageCount: number;
    lastError?: string;
  };
}

export interface EncryptedValue {
  ciphertext: string;
  iv: string;
  tag: string;
  algorithm: string;
}

// ============================================
// PERMISSION SYSTEM
// ============================================

export type CredentialPermission =
  | 'read'           // Ler dados (não sensíveis)
  | 'use'            // Usar para autenticação
  | 'execute'        // Executar operações
  | 'trade'          // Operações de trading
  | 'transfer'       // Transferências financeiras
  | 'send_email'     // Enviar emails
  | 'post_social'    // Postar em redes sociais
  | 'commit_code'    // Commit em repositórios
  | 'deploy'         // Deploy de aplicações
  | 'admin';         // Acesso administrativo

export interface PermissionRequest {
  requestId: string;
  agentId: string;
  agentName: string;
  credentialId: string;
  permissions: CredentialPermission[];
  reason: string;
  context: string;
  timestamp: Date;
  expiresAt: Date;
  status: 'pending' | 'approved' | 'denied' | 'expired';
}

export interface PermissionGrant {
  grantId: string;
  requestId: string;
  userId: string;
  credentialId: string;
  permissions: CredentialPermission[];
  grantedAt: Date;
  expiresAt: Date;
  scope: {
    maxOperations?: number;
    maxValue?: number;
    allowedActions?: string[];
    restrictedHours?: { start: number; end: number };
  };
}

// ============================================
// CREDENTIAL REQUEST FLOW
// ============================================

export interface CredentialRequest {
  requestId: string;
  schemaId: string;
  agentId: string;
  agentName: string;
  reason: string;
  context: {
    task: string;
    workflow: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  };
  requiredFields: string[];
  optionalFields?: string[];
  suggestedName?: string;
  timestamp: Date;
  status: 'pending' | 'awaiting_input' | 'completed' | 'cancelled' | 'timeout';
  timeout: number; // ms
}

export interface CredentialResponse {
  requestId: string;
  success: boolean;
  credentialId?: string;
  error?: string;
  timestamp: Date;
}

// ============================================
// USER INTERACTION
// ============================================

export interface SecureInputPrompt {
  promptId: string;
  requestId: string;
  title: string;
  description: string;
  fields: SecureInputField[];
  agentInfo: {
    id: string;
    name: string;
    icon: string;
    trustLevel: 'verified' | 'trusted' | 'unknown';
  };
  securityInfo: {
    encryption: string;
    storage: string;
    retention: string;
  };
  actions: {
    submit: string;
    cancel: string;
    moreInfo?: string;
  };
}

export interface SecureInputField {
  id: string;
  label: string;
  type: 'text' | 'password' | 'textarea' | 'select' | 'file';
  placeholder?: string;
  description?: string;
  required: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: string;
    message?: string;
  };
}

export interface SecureInputResult {
  promptId: string;
  values: Record<string, string>;
  timestamp: Date;
  confirmed: boolean;
}

// ============================================
// VAULT EVENTS
// ============================================

export type VaultEventType =
  | 'credential_requested'
  | 'credential_provided'
  | 'credential_used'
  | 'credential_expired'
  | 'credential_revoked'
  | 'permission_requested'
  | 'permission_granted'
  | 'permission_denied'
  | 'security_alert'
  | 'vault_locked'
  | 'vault_unlocked';

export interface VaultEvent {
  eventId: string;
  type: VaultEventType;
  timestamp: Date;
  userId: string;
  agentId?: string;
  credentialId?: string;
  details: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

// ============================================
// PREDEFINED CREDENTIAL SCHEMAS
// ============================================

export const CREDENTIAL_SCHEMAS: Record<string, CredentialSchema> = {
  // Trading
  'binance': {
    id: 'binance',
    name: 'Binance',
    category: 'trading',
    icon: '🪙',
    description: 'API para trading na Binance',
    securityLevel: 'critical',
    fields: [
      { id: 'api_key', name: 'API Key', type: 'api_key', label: 'API Key', required: true, sensitive: true, mask: true },
      { id: 'api_secret', name: 'API Secret', type: 'api_secret', label: 'API Secret', required: true, sensitive: true, mask: true },
    ],
    permissions: ['read', 'use', 'trade'],
    requiresReauth: true,
    documentation: 'https://binance-docs.github.io/apidocs/',
  },
  
  'metatrader': {
    id: 'metatrader',
    name: 'MetaTrader 5',
    category: 'trading',
    icon: '📊',
    description: 'Conexão com MetaTrader 5',
    securityLevel: 'critical',
    fields: [
      { id: 'server', name: 'Server', type: 'endpoint_url', label: 'Servidor', required: true, sensitive: false, mask: false },
      { id: 'login', name: 'Login', type: 'username', label: 'Login', required: true, sensitive: true, mask: false },
      { id: 'password', name: 'Password', type: 'password', label: 'Senha', required: true, sensitive: true, mask: true },
    ],
    permissions: ['read', 'use', 'trade'],
    requiresReauth: true,
  },

  // Freelance
  'upwork': {
    id: 'upwork',
    name: 'Upwork',
    category: 'freelance',
    icon: '💼',
    description: 'Conta Upwork para freelancing',
    securityLevel: 'high',
    fields: [
      { id: 'email', name: 'Email', type: 'username', label: 'Email', required: true, sensitive: false, mask: false },
      { id: 'password', name: 'Password', type: 'password', label: 'Senha', required: true, sensitive: true, mask: true },
      { id: 'mfa', name: 'MFA Secret', type: 'mfa_secret', label: '2FA Secret (opcional)', required: false, sensitive: true, mask: true },
    ],
    permissions: ['read', 'use', 'execute'],
  },

  'fiverr': {
    id: 'fiverr',
    name: 'Fiverr',
    category: 'freelance',
    icon: '🎨',
    description: 'Conta Fiverr',
    securityLevel: 'high',
    fields: [
      { id: 'email', name: 'Email', type: 'username', label: 'Email', required: true, sensitive: false, mask: false },
      { id: 'password', name: 'Password', type: 'password', label: 'Senha', required: true, sensitive: true, mask: true },
    ],
    permissions: ['read', 'use', 'execute'],
  },

  // Email
  'gmail': {
    id: 'gmail',
    name: 'Gmail',
    category: 'email',
    icon: '📧',
    description: 'Conta Gmail / Google Workspace',
    securityLevel: 'high',
    fields: [
      { id: 'email', name: 'Email', type: 'username', label: 'Email', required: true, sensitive: false, mask: false },
      { id: 'app_password', name: 'App Password', type: 'password', label: 'Senha de App', required: true, sensitive: true, mask: true, description: 'Use senha de aplicativo, não sua senha principal' },
    ],
    permissions: ['read', 'use', 'send_email'],
    documentation: 'https://support.google.com/accounts/answer/185833',
  },

  'smtp': {
    id: 'smtp',
    name: 'SMTP Custom',
    category: 'email',
    icon: '✉️',
    description: 'Servidor SMTP personalizado',
    securityLevel: 'medium',
    fields: [
      { id: 'host', name: 'Host', type: 'endpoint_url', label: 'Servidor SMTP', required: true, sensitive: false, mask: false },
      { id: 'port', name: 'Port', type: 'custom', label: 'Porta', required: true, sensitive: false, mask: false },
      { id: 'username', name: 'Username', type: 'username', label: 'Usuário', required: true, sensitive: false, mask: false },
      { id: 'password', name: 'Password', type: 'password', label: 'Senha', required: true, sensitive: true, mask: true },
    ],
    permissions: ['use', 'send_email'],
  },

  // Development
  'github': {
    id: 'github',
    name: 'GitHub',
    category: 'development',
    icon: '🐙',
    description: 'Personal Access Token do GitHub',
    securityLevel: 'high',
    fields: [
      { id: 'token', name: 'Personal Access Token', type: 'access_token', label: 'Token', required: true, sensitive: true, mask: true },
    ],
    permissions: ['read', 'use', 'commit_code', 'deploy'],
    documentation: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token',
  },

  'npm': {
    id: 'npm',
    name: 'NPM',
    category: 'development',
    icon: '📦',
    description: 'Token de publicação NPM',
    securityLevel: 'high',
    fields: [
      { id: 'token', name: 'Auth Token', type: 'access_token', label: 'Token', required: true, sensitive: true, mask: true },
    ],
    permissions: ['read', 'use', 'deploy'],
  },

  // Cloud
  'aws': {
    id: 'aws',
    name: 'AWS',
    category: 'cloud',
    icon: '☁️',
    description: 'Credenciais AWS',
    securityLevel: 'critical',
    fields: [
      { id: 'access_key_id', name: 'Access Key ID', type: 'api_key', label: 'Access Key ID', required: true, sensitive: true, mask: true },
      { id: 'secret_access_key', name: 'Secret Access Key', type: 'api_secret', label: 'Secret Access Key', required: true, sensitive: true, mask: true },
      { id: 'region', name: 'Region', type: 'custom', label: 'Região', required: true, sensitive: false, mask: false },
    ],
    permissions: ['read', 'use', 'execute', 'deploy'],
    requiresReauth: true,
  },

  // AI APIs
  'openai': {
    id: 'openai',
    name: 'OpenAI',
    category: 'ai',
    icon: '🤖',
    description: 'API Key da OpenAI',
    securityLevel: 'high',
    fields: [
      { id: 'api_key', name: 'API Key', type: 'api_key', label: 'API Key', required: true, sensitive: true, mask: true, validation: { pattern: '^sk-' } },
    ],
    permissions: ['read', 'use', 'execute'],
  },

  'anthropic': {
    id: 'anthropic',
    name: 'Anthropic',
    category: 'ai',
    icon: '🧠',
    description: 'API Key da Anthropic',
    securityLevel: 'high',
    fields: [
      { id: 'api_key', name: 'API Key', type: 'api_key', label: 'API Key', required: true, sensitive: true, mask: true },
    ],
    permissions: ['read', 'use', 'execute'],
  },

  // Social
  'twitter': {
    id: 'twitter',
    name: 'Twitter/X',
    category: 'social',
    icon: '🐦',
    description: 'API do Twitter/X',
    securityLevel: 'high',
    fields: [
      { id: 'api_key', name: 'API Key', type: 'api_key', label: 'API Key', required: true, sensitive: true, mask: true },
      { id: 'api_secret', name: 'API Secret', type: 'api_secret', label: 'API Secret', required: true, sensitive: true, mask: true },
      { id: 'access_token', name: 'Access Token', type: 'access_token', label: 'Access Token', required: true, sensitive: true, mask: true },
      { id: 'access_secret', name: 'Access Token Secret', type: 'api_secret', label: 'Access Token Secret', required: true, sensitive: true, mask: true },
    ],
    permissions: ['read', 'use', 'post_social'],
  },

  // Custom
  'custom': {
    id: 'custom',
    name: 'Credencial Personalizada',
    category: 'custom',
    icon: '🔐',
    description: 'Credencial personalizada definida pelo usuário',
    securityLevel: 'high',
    fields: [
      { id: 'key1', name: 'Campo 1', type: 'custom', label: 'Campo 1', required: true, sensitive: true, mask: true },
      { id: 'key2', name: 'Campo 2', type: 'custom', label: 'Campo 2', required: false, sensitive: true, mask: true },
      { id: 'key3', name: 'Campo 3', type: 'custom', label: 'Campo 3', required: false, sensitive: true, mask: true },
    ],
    permissions: ['read', 'use', 'execute'],
  },
};

// ============================================
// WORKFLOW CONTEXT
// ============================================

export interface WorkflowContext {
  workflowId: string;
  name: string;
  type: 'trading' | 'freelance' | 'email' | 'development' | 'research' | 'automation' | 'custom';
  description: string;
  requiredCredentials: string[];
  optionalCredentials?: string[];
  steps: WorkflowStep[];
  status: 'pending' | 'in_progress' | 'awaiting_credentials' | 'completed' | 'failed';
  progress: number;
  currentStep?: number;
}

export interface WorkflowStep {
  stepId: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  requiresCredential?: string;
  estimatedTime?: number;
  result?: unknown;
}

// ============================================
// LIVE PREVIEW INTEGRATION
// ============================================

export interface LivePreviewCredentialPanel {
  visible: boolean;
  mode: 'request' | 'manage' | 'history';
  currentRequest?: CredentialRequest;
  storedCredentials: StoredCredentialSummary[];
  recentActivity: VaultEvent[];
  securityStatus: {
    vaultLocked: boolean;
    lastUnlock?: Date;
    activePermissions: number;
  };
}

export interface StoredCredentialSummary {
  id: string;
  name: string;
  category: CredentialCategory;
  icon: string;
  lastUsed?: Date;
  expiresAt?: Date;
  verified: boolean;
}

// ============================================
// AGENT CREDENTIAL INTERFACE
// ============================================

export interface AgentCredentialAccess {
  /**
   * Request a credential from the user
   */
  requestCredential(schema: string, reason: string, context: WorkflowContext): Promise<CredentialResponse>;
  
  /**
   * Use a stored credential (requires permission)
   */
  useCredential(credentialId: string, permission: CredentialPermission): Promise<{ success: boolean; value?: Record<string, string>; error?: string }>;
  
  /**
   * Check if credential exists and is valid
   */
  hasCredential(schema: string): Promise<boolean>;
  
  /**
   * Request permission for an operation
   */
  requestPermission(credentialId: string, permissions: CredentialPermission[], reason: string): Promise<PermissionGrant | null>;
  
  /**
   * Revoke own access to a credential
   */
  revokeAccess(credentialId: string): Promise<void>;
}
