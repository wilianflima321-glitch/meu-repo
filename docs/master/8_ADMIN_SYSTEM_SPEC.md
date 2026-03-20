# 08_ADMIN_SYSTEM_SPEC (LEGACY FILENAME)
## Especificação do Sistema Administrativo
**Data:** Janeiro 2026  
**Versão:** 1.0  
**Status:** Contrato de Execução

---

## 1. VISÃO GERAL

O sistema administrativo é a **espinha dorsal operacional** da plataforma. Permite:
- Gestão de usuários e organizações
- Monitoramento de uso e custos
- Configuração da plataforma
- Moderação de conteúdo
- Analytics e métricas
- Billing e subscriptions

---

## 2. ARQUITETURA DO ADMIN

### 2.1 Diagrama Geral

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ADMIN DASHBOARD                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Overview   │  │    Users     │  │   Projects   │  │   Billing   │ │
│  │  Dashboard   │  │  Management  │  │  Management  │  │  & Revenue  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   AI Usage   │  │   System     │  │  Moderation  │  │   Logs &    │ │
│  │   & Costs    │  │   Health     │  │  & Reports   │  │   Audit     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Settings   │  │  Templates   │  │   Feature    │  │   Support   │ │
│  │   & Config   │  │  Management  │  │    Flags     │  │   Tickets   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADMIN API (FastAPI)                             │
├─────────────────────────────────────────────────────────────────────────┤
│  /admin/users  │  /admin/projects  │  /admin/billing  │  /admin/system │
│  /admin/ai     │  /admin/logs      │  /admin/config   │  /admin/reports│
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Roles e Permissões

```typescript
enum AdminRole {
  SUPER_ADMIN = 'super_admin',     // Acesso total
  ADMIN = 'admin',                  // Gestão geral
  MODERATOR = 'moderator',          // Moderação de conteúdo
  SUPPORT = 'support',              // Atendimento
  BILLING = 'billing',              // Financeiro
  ANALYST = 'analyst',              // Apenas leitura/reports
}

interface AdminPermissions {
  users: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    impersonate: boolean;
  };
  projects: {
    view: boolean;
    edit: boolean;
    delete: boolean;
    forceDelete: boolean;
  };
  billing: {
    view: boolean;
    refund: boolean;
    adjustCredits: boolean;
    manageSubscriptions: boolean;
  };
  system: {
    viewLogs: boolean;
    editConfig: boolean;
    manageFeatureFlags: boolean;
    deployUpdates: boolean;
  };
  ai: {
    viewUsage: boolean;
    adjustLimits: boolean;
    manageModels: boolean;
  };
}

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermissions> = {
  super_admin: {
    users: { view: true, create: true, edit: true, delete: true, impersonate: true },
    projects: { view: true, edit: true, delete: true, forceDelete: true },
    billing: { view: true, refund: true, adjustCredits: true, manageSubscriptions: true },
    system: { viewLogs: true, editConfig: true, manageFeatureFlags: true, deployUpdates: true },
    ai: { viewUsage: true, adjustLimits: true, manageModels: true },
  },
  admin: {
    users: { view: true, create: true, edit: true, delete: false, impersonate: true },
    projects: { view: true, edit: true, delete: true, forceDelete: false },
    billing: { view: true, refund: true, adjustCredits: true, manageSubscriptions: false },
    system: { viewLogs: true, editConfig: false, manageFeatureFlags: true, deployUpdates: false },
    ai: { viewUsage: true, adjustLimits: true, manageModels: false },
  },
  moderator: {
    users: { view: true, create: false, edit: false, delete: false, impersonate: false },
    projects: { view: true, edit: false, delete: true, forceDelete: false },
    billing: { view: false, refund: false, adjustCredits: false, manageSubscriptions: false },
    system: { viewLogs: true, editConfig: false, manageFeatureFlags: false, deployUpdates: false },
    ai: { viewUsage: false, adjustLimits: false, manageModels: false },
  },
  support: {
    users: { view: true, create: false, edit: true, delete: false, impersonate: true },
    projects: { view: true, edit: false, delete: false, forceDelete: false },
    billing: { view: true, refund: true, adjustCredits: false, manageSubscriptions: false },
    system: { viewLogs: true, editConfig: false, manageFeatureFlags: false, deployUpdates: false },
    ai: { viewUsage: true, adjustLimits: false, manageModels: false },
  },
  billing: {
    users: { view: true, create: false, edit: false, delete: false, impersonate: false },
    projects: { view: false, edit: false, delete: false, forceDelete: false },
    billing: { view: true, refund: true, adjustCredits: true, manageSubscriptions: true },
    system: { viewLogs: false, editConfig: false, manageFeatureFlags: false, deployUpdates: false },
    ai: { viewUsage: true, adjustLimits: false, manageModels: false },
  },
  analyst: {
    users: { view: true, create: false, edit: false, delete: false, impersonate: false },
    projects: { view: true, edit: false, delete: false, forceDelete: false },
    billing: { view: true, refund: false, adjustCredits: false, manageSubscriptions: false },
    system: { viewLogs: true, editConfig: false, manageFeatureFlags: false, deployUpdates: false },
    ai: { viewUsage: true, adjustLimits: false, manageModels: false },
  },
};
```

---

## 3. MÓDULOS DO ADMIN

### 3.1 Dashboard Overview

```typescript
interface AdminDashboard {
  // KPIs principais
  kpis: {
    totalUsers: number;
    activeUsers: { daily: number; weekly: number; monthly: number };
    totalProjects: number;
    activeProjects: number;
    revenue: { today: number; month: number; total: number };
    aiCosts: { today: number; month: number };
    systemHealth: 'healthy' | 'degraded' | 'down';
  };
  
  // Gráficos
  charts: {
    userGrowth: TimeSeriesData;
    projectCreation: TimeSeriesData;
    aiUsage: TimeSeriesData;
    revenue: TimeSeriesData;
  };
  
  // Alertas
  alerts: AdminAlert[];
  
  // Atividade recente
  recentActivity: ActivityLog[];
}

interface AdminAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}
```

### 3.2 User Management

```typescript
interface UserManagement {
  // Lista de usuários
  listUsers(filters: UserFilters, pagination: Pagination): Promise<UserList>;
  
  // Detalhes do usuário
  getUser(userId: string): Promise<UserDetails>;
  
  // Ações
  createUser(data: CreateUserData): Promise<User>;
  updateUser(userId: string, data: UpdateUserData): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  suspendUser(userId: string, reason: string): Promise<void>;
  restoreUser(userId: string): Promise<void>;
  
  // Impersonation (para debug/suporte)
  impersonateUser(userId: string): Promise<ImpersonationToken>;
  
  // Bulk actions
  bulkSuspend(userIds: string[], reason: string): Promise<void>;
  bulkDelete(userIds: string[]): Promise<void>;
  exportUsers(filters: UserFilters): Promise<CSVExport>;
}

interface UserFilters {
  search?: string;
  status?: 'active' | 'suspended' | 'deleted';
  plan?: 'free' | 'pro' | 'enterprise';
  createdAfter?: Date;
  createdBefore?: Date;
  lastActiveAfter?: Date;
}

interface UserDetails {
  // Info básica
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  lastLoginAt: Date;
  
  // Status
  status: 'active' | 'suspended' | 'deleted';
  suspensionReason?: string;
  
  // Plan
  plan: 'free' | 'pro' | 'enterprise';
  subscription?: SubscriptionDetails;
  
  // Usage
  projectCount: number;
  storageUsed: number;
  aiTokensUsed: number;
  deployCount: number;
  
  // Activity
  activityLog: ActivityLog[];
  loginHistory: LoginEvent[];
}
```

### 3.3 Project Management

```typescript
interface ProjectManagement {
  // Lista
  listProjects(filters: ProjectFilters, pagination: Pagination): Promise<ProjectList>;
  
  // Detalhes
  getProject(projectId: string): Promise<ProjectDetails>;
  
  // Ações
  updateProject(projectId: string, data: UpdateProjectData): Promise<Project>;
  deleteProject(projectId: string, reason: string): Promise<void>;
  forceDeleteProject(projectId: string): Promise<void>; // Bypass soft delete
  transferProject(projectId: string, newOwnerId: string): Promise<void>;
  
  // Moderação
  flagProject(projectId: string, reason: string): Promise<void>;
  unflagProject(projectId: string): Promise<void>;
  
  // Analytics
  getProjectStats(projectId: string): Promise<ProjectStats>;
}

interface ProjectDetails {
  id: string;
  name: string;
  owner: UserSummary;
  collaborators: UserSummary[];
  
  // Status
  status: 'active' | 'archived' | 'flagged' | 'deleted';
  flagReason?: string;
  
  // Stats
  storageUsed: number;
  lastEditedAt: Date;
  deployments: number;
  publicUrl?: string;
  
  // AI Usage
  aiTokensUsed: number;
  aiRequests: number;
  
  // Files
  fileCount: number;
  largestFiles: FileSummary[];
}
```

### 3.4 Billing & Revenue

```typescript
interface BillingManagement {
  // Overview
  getRevenueOverview(): Promise<RevenueOverview>;
  
  // Subscriptions
  listSubscriptions(filters: SubscriptionFilters): Promise<SubscriptionList>;
  getSubscription(userId: string): Promise<SubscriptionDetails>;
  
  // Actions
  cancelSubscription(userId: string, reason: string): Promise<void>;
  refundPayment(paymentId: string, amount: number, reason: string): Promise<void>;
  adjustCredits(userId: string, amount: number, reason: string): Promise<void>;
  
  // Reports
  generateRevenueReport(dateRange: DateRange): Promise<RevenueReport>;
  exportInvoices(dateRange: DateRange): Promise<CSVExport>;
}

interface RevenueOverview {
  // MRR/ARR
  mrr: number;
  arr: number;
  mrrGrowth: number; // %
  
  // Breakdown
  revenueByPlan: Record<string, number>;
  revenueByCountry: Record<string, number>;
  
  // Churn
  churnRate: number;
  churned: number;
  recovered: number;
  
  // Transactions
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  
  // Costs
  aiCosts: number;
  infraCosts: number;
  netRevenue: number;
}
```

### 3.5 AI Usage & Costs

```typescript
interface AIManagement {
  // Overview
  getAIOverview(): Promise<AIOverview>;
  
  // Usage por usuário
  getUserAIUsage(userId: string): Promise<UserAIUsage>;
  
  // Limits
  setUserAILimits(userId: string, limits: AILimits): Promise<void>;
  setGlobalAILimits(limits: AILimits): Promise<void>;
  
  // Models
  listModels(): Promise<ModelConfig[]>;
  updateModelConfig(modelId: string, config: ModelConfig): Promise<void>;
  
  // Costs
  getAICostBreakdown(dateRange: DateRange): Promise<AICostBreakdown>;
}

interface AIOverview {
  // Usage
  totalRequests: { today: number; week: number; month: number };
  totalTokens: { input: number; output: number };
  
  // By type
  usageByType: {
    autocomplete: number;
    chat: number;
    actions: number;
    agent: number;
  };
  
  // Costs
  totalCost: number;
  costByModel: Record<string, number>;
  costByType: Record<string, number>;
  
  // Performance
  averageLatency: number;
  errorRate: number;
  
  // Top users
  topUsers: { userId: string; usage: number; cost: number }[];
}

interface AICostBreakdown {
  total: number;
  byModel: {
    model: string;
    requests: number;
    tokens: number;
    cost: number;
  }[];
  byDay: {
    date: string;
    cost: number;
  }[];
  projectedMonth: number;
}
```

### 3.6 System Health

```typescript
interface SystemMonitoring {
  // Health
  getSystemHealth(): Promise<SystemHealth>;
  
  // Services
  getServiceStatus(): Promise<ServiceStatus[]>;
  
  // Metrics
  getSystemMetrics(): Promise<SystemMetrics>;
  
  // Logs
  getSystemLogs(filters: LogFilters): Promise<SystemLog[]>;
  
  // Actions
  restartService(serviceName: string): Promise<void>;
  clearCache(cacheType: string): Promise<void>;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number; // seconds
  
  services: {
    api: 'up' | 'down';
    database: 'up' | 'down';
    redis: 'up' | 'down';
    storage: 'up' | 'down';
    aiService: 'up' | 'down';
    containers: 'up' | 'down';
  };
  
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIn: number;
    networkOut: number;
  };
  
  alerts: SystemAlert[];
}

interface SystemMetrics {
  // API
  apiRequests: { total: number; perSecond: number };
  apiLatency: { p50: number; p95: number; p99: number };
  apiErrors: number;
  
  // Database
  dbConnections: number;
  dbQueryTime: number;
  
  // Containers
  activeContainers: number;
  containerStartTime: number;
  
  // Storage
  storageUsed: number;
  storageLimit: number;
  
  // WebSocket
  wsConnections: number;
}
```

### 3.7 Moderation

```typescript
interface ModerationSystem {
  // Reports
  listReports(filters: ReportFilters): Promise<ReportList>;
  getReport(reportId: string): Promise<ReportDetails>;
  
  // Actions
  resolveReport(reportId: string, action: ModerationAction): Promise<void>;
  flagContent(contentType: string, contentId: string, reason: string): Promise<void>;
  
  // Auto-moderation
  getAutoModSettings(): Promise<AutoModSettings>;
  updateAutoModSettings(settings: AutoModSettings): Promise<void>;
}

interface ReportDetails {
  id: string;
  type: 'user' | 'project' | 'content';
  targetId: string;
  reporter: UserSummary;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: UserSummary;
  action?: ModerationAction;
}

type ModerationAction = 
  | { type: 'dismiss' }
  | { type: 'warn'; message: string }
  | { type: 'suspend'; duration: number }
  | { type: 'delete' }
  | { type: 'ban' };

interface AutoModSettings {
  enabled: boolean;
  rules: {
    maliciousCode: boolean;
    inappropriateContent: boolean;
    spamDetection: boolean;
    resourceAbuse: boolean;
  };
  thresholds: {
    maxProjectsPerHour: number;
    maxDeploysPerHour: number;
    maxAIRequestsPerMinute: number;
  };
}
```

### 3.8 Feature Flags

```typescript
interface FeatureFlagSystem {
  // List
  listFlags(): Promise<FeatureFlag[]>;
  
  // CRUD
  createFlag(flag: CreateFlagData): Promise<FeatureFlag>;
  updateFlag(flagId: string, data: UpdateFlagData): Promise<FeatureFlag>;
  deleteFlag(flagId: string): Promise<void>;
  
  // Targeting
  setFlagTargeting(flagId: string, targeting: FlagTargeting): Promise<void>;
}

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  
  // Targeting
  targeting: FlagTargeting;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface FlagTargeting {
  type: 'all' | 'percentage' | 'users' | 'plans';
  percentage?: number;
  userIds?: string[];
  plans?: string[];
}
```

### 3.9 Audit Logs

```typescript
interface AuditSystem {
  // Query
  queryLogs(filters: AuditFilters, pagination: Pagination): Promise<AuditLog[]>;
  
  // Export
  exportLogs(filters: AuditFilters): Promise<CSVExport>;
}

interface AuditLog {
  id: string;
  timestamp: Date;
  
  // Actor
  actorType: 'user' | 'admin' | 'system';
  actorId: string;
  actorEmail?: string;
  
  // Action
  action: string;
  resource: string;
  resourceId: string;
  
  // Details
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  
  // Result
  success: boolean;
  errorMessage?: string;
}

// Ações auditadas:
const AUDITED_ACTIONS = [
  // User actions
  'user.login',
  'user.logout',
  'user.create',
  'user.update',
  'user.delete',
  'user.suspend',
  
  // Project actions
  'project.create',
  'project.delete',
  'project.deploy',
  'project.transfer',
  
  // Admin actions
  'admin.login',
  'admin.impersonate',
  'admin.refund',
  'admin.config.update',
  'admin.flag.toggle',
  
  // System actions
  'system.restart',
  'system.deploy',
  'system.config.update',
];
```

### 3.10 Support Tickets

```typescript
interface SupportSystem {
  // Tickets
  listTickets(filters: TicketFilters): Promise<TicketList>;
  getTicket(ticketId: string): Promise<TicketDetails>;
  
  // Actions
  assignTicket(ticketId: string, adminId: string): Promise<void>;
  respondToTicket(ticketId: string, response: string): Promise<void>;
  closeTicket(ticketId: string, resolution: string): Promise<void>;
  escalateTicket(ticketId: string, reason: string): Promise<void>;
  
  // Templates
  listResponseTemplates(): Promise<ResponseTemplate[]>;
  createResponseTemplate(template: CreateTemplateData): Promise<ResponseTemplate>;
}

interface TicketDetails {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // User
  user: UserSummary;
  
  // Assignment
  assignedTo?: AdminSummary;
  
  // Conversation
  messages: TicketMessage[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  
  // Context
  relatedProject?: ProjectSummary;
  userPlan: string;
  userSince: Date;
}
```

---

## 4. API ROUTES DO ADMIN

```python
# /api/admin/

# Dashboard
GET  /dashboard                    # Overview KPIs
GET  /dashboard/charts/{type}      # Chart data

# Users
GET  /users                        # List users
GET  /users/{id}                   # User details
POST /users                        # Create user
PUT  /users/{id}                   # Update user
DELETE /users/{id}                 # Delete user
POST /users/{id}/suspend           # Suspend user
POST /users/{id}/restore           # Restore user
POST /users/{id}/impersonate       # Get impersonation token
POST /users/bulk/suspend           # Bulk suspend
POST /users/export                 # Export CSV

# Projects
GET  /projects                     # List projects
GET  /projects/{id}                # Project details
PUT  /projects/{id}                # Update project
DELETE /projects/{id}              # Delete project
POST /projects/{id}/flag           # Flag project
POST /projects/{id}/transfer       # Transfer ownership

# Billing
GET  /billing/overview             # Revenue overview
GET  /billing/subscriptions        # List subscriptions
GET  /billing/subscriptions/{id}   # Subscription details
POST /billing/refund               # Process refund
POST /billing/credits              # Adjust credits
GET  /billing/reports              # Generate reports

# AI
GET  /ai/overview                  # AI usage overview
GET  /ai/usage/{userId}            # User AI usage
PUT  /ai/limits/{userId}           # Set user limits
PUT  /ai/limits/global             # Set global limits
GET  /ai/models                    # List models
PUT  /ai/models/{id}               # Update model config
GET  /ai/costs                     # Cost breakdown

# System
GET  /system/health                # System health
GET  /system/metrics               # System metrics
GET  /system/services              # Service status
POST /system/services/{name}/restart  # Restart service
GET  /system/logs                  # System logs
POST /system/cache/clear           # Clear cache

# Moderation
GET  /moderation/reports           # List reports
GET  /moderation/reports/{id}      # Report details
POST /moderation/reports/{id}/resolve  # Resolve report
GET  /moderation/settings          # Auto-mod settings
PUT  /moderation/settings          # Update settings

# Feature Flags
GET  /flags                        # List flags
POST /flags                        # Create flag
PUT  /flags/{id}                   # Update flag
DELETE /flags/{id}                 # Delete flag

# Audit
GET  /audit/logs                   # Query logs
POST /audit/export                 # Export logs

# Support
GET  /support/tickets              # List tickets
GET  /support/tickets/{id}         # Ticket details
POST /support/tickets/{id}/assign  # Assign ticket
POST /support/tickets/{id}/respond # Respond
POST /support/tickets/{id}/close   # Close ticket
GET  /support/templates            # Response templates

# Config
GET  /config                       # Platform config
PUT  /config                       # Update config
GET  /config/history               # Config history
```

---

## 5. UI DO ADMIN DASHBOARD

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ADMIN │ Logo │ Search...                    │ Notifications │ Profile │
├─────────────────────────────────────────────────────────────────────────┤
│        │                                                               │
│ NAV    │                    MAIN CONTENT AREA                         │
│        │                                                               │
│ 📊 Dash│  ┌─────────────────────────────────────────────────────────┐ │
│ 👥 Users│  │                                                         │ │
│ 📁 Proj │  │     (Content varies by selected module)                │ │
│ 💳 Bill │  │                                                         │ │
│ 🤖 AI   │  │                                                         │ │
│ 🖥️ System│ │                                                         │ │
│ 🛡️ Mod  │  │                                                         │ │
│ 🚩 Flags│  │                                                         │ │
│ 📋 Logs │  │                                                         │ │
│ 🎫 Supp │  │                                                         │ │
│ ⚙️ Config│ │                                                         │ │
│        │  └─────────────────────────────────────────────────────────┘ │
│        │                                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Componentes Reutilizáveis

```typescript
// Data table com filtros, sort, pagination
interface DataTable<T> {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  pagination: Pagination;
  filters: Filter[];
  onSort: (column: string, direction: 'asc' | 'desc') => void;
  onFilter: (filters: Filter[]) => void;
  onPageChange: (page: number) => void;
  actions?: RowAction<T>[];
}

// Stats card
interface StatsCard {
  title: string;
  value: string | number;
  change?: { value: number; direction: 'up' | 'down' };
  icon?: React.ReactNode;
  color?: string;
}

// Chart wrapper
interface ChartCard {
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  data: ChartData;
  timeRange?: TimeRange;
}

// Action modal
interface ActionModal {
  title: string;
  description: string;
  fields?: FormField[];
  confirmText: string;
  cancelText: string;
  onConfirm: (data: any) => Promise<void>;
  danger?: boolean;
}
```

---

## 6. SEGURANÇA DO ADMIN

### 6.1 Autenticação

```typescript
interface AdminAuth {
  // Login com 2FA obrigatório
  login(email: string, password: string): Promise<{ requiresTwoFactor: true }>;
  verifyTwoFactor(code: string): Promise<AdminToken>;
  
  // Session
  refreshToken(): Promise<AdminToken>;
  logout(): Promise<void>;
  
  // Password
  changePassword(oldPassword: string, newPassword: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
}

// Requisitos de senha admin
const ADMIN_PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true,
  maxAge: 90, // days
  preventReuse: 5, // last N passwords
};
```

### 6.2 Rate Limiting

```typescript
const ADMIN_RATE_LIMITS = {
  login: { requests: 5, window: '15m' },
  api: { requests: 100, window: '1m' },
  bulkActions: { requests: 10, window: '1h' },
  exports: { requests: 5, window: '1h' },
};
```

### 6.3 IP Whitelist

```typescript
interface IPWhitelist {
  enabled: boolean;
  allowedIPs: string[];
  allowedCIDRs: string[];
  vpnAllowed: boolean;
}
```

---

## 7. LIMITAÇÕES DO ADMIN ATUAL

| Limitação | Impacto | Mitigação |
|-----------|---------|-----------|
| **Não existe** | CRÍTICO | Implementar P1 |
| Single tenant | MÉDIO | Multi-tenant P2 |
| Sem analytics avançado | MÉDIO | Integrar PostHog/Mixpanel |
| Sem automação | BAIXO | Workflows P3 |

---

## 8. ROADMAP DO ADMIN

### P1 - Essencial
- [ ] Dashboard básico
- [ ] User management
- [ ] Project management
- [ ] Basic billing view
- [ ] AI usage view
- [ ] System health
- [ ] Audit logs

### P2 - Avançado
- [ ] Feature flags
- [ ] Moderation system
- [ ] Support tickets
- [ ] Advanced analytics
- [ ] Exports/reports

### P3 - Enterprise
- [ ] Multi-tenant
- [ ] SSO admin
- [ ] Custom workflows
- [ ] API for automation

---

## PRÓXIMO DOCUMENTO

- `9_BACKEND_SYSTEM_SPEC.md` - Especificação completa do backend

