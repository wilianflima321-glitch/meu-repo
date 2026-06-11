export type EventCategory = 
  | 'user'
  | 'project'
  | 'ai'
  | 'engine'
  | 'billing'
  | 'collaboration'
  | 'marketplace'
  | 'performance'
  | 'error';

export type EventAction =
  // User
  | 'login'
  | 'logout'
  | 'register'
  | 'profile_update'
  | 'settings_change'
  | 'plan_upgrade'
  | 'plan_downgrade'
  | 'auth_intent'
  | 'oauth_start'
  | 'cta_click'
  | 'contact_sales_start'
  
  // Project
  | 'project_create'
  | 'project_open'
  | 'project_save'
  | 'project_delete'
  | 'project_export'
  | 'project_share'
  | 'mission_submit'
  | 'mission_handoff'
  | 'workspace_create'
  | 'onboarding_start'
  
  // AI
  | 'ai_chat'
  | 'ai_stream'
  | 'ai_complete'
  | 'ai_error'
  | 'ai_feedback'
  
  // Engine
  | 'editor_open'
  | 'editor_close'
  | 'blueprint_create'
  | 'vfx_create'
  | 'terrain_edit'
  | 'animation_create'
  | 'build_start'
  | 'build_complete'
  | 'deploy_click'
  | 'deploy_success'
  | 'deploy_failure'
  | 'play_start'
  | 'play_stop'
  
  // Billing
  | 'pricing_view'
  | 'pricing_cycle_change'
  | 'checkout_start'
  | 'checkout_complete'
  | 'checkout_cancel'
  | 'payment_success'
  | 'payment_failed'
  
  // Collaboration
  | 'invite_send'
  | 'invite_accept'
  | 'collab_join'
  | 'collab_leave'
  | 'comment_add'
  
  // Marketplace
  | 'marketplace_browse'
  | 'marketplace_search'
  | 'marketplace_view'
  | 'marketplace_purchase'
  | 'marketplace_download'
  
  // Performance
  | 'page_load'
  | 'api_latency'
  | 'render_time'
  
  // Error
  | 'error_client'
  | 'error_server'
  | 'error_api';

export interface AnalyticsEvent {
  id: string;
  timestamp: Date;
  category: EventCategory;
  action: EventAction;
  label?: string;
  value?: number;
  userId?: string;
  sessionId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
  
  // Contexto
  userAgent?: string;
  referrer?: string;
  url?: string;
  screenResolution?: string;
  language?: string;
  timezone?: string;
}

export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  name: string;
  value: number;
  unit: 'ms' | 's' | 'bytes' | 'count' | 'percent';
  tags?: Record<string, string>;
}

export interface UserMetrics {
  userId: string;
  
  // Engagement
  totalSessions: number;
  totalTimeSpent: number; // seconds
  lastActive: Date;
  
  // Usage
  projectsCreated: number;
  filesCreated: number;
  aiMessagesCount: number;
  aiTokensUsed: number;
  buildCount: number;
  
  // Monetization
  plan: string;
  totalSpent: number;
  mrr: number; // Monthly Recurring Revenue
  ltv: number; // Lifetime Value
}

export interface DashboardMetrics {
  // Users
  totalUsers: number;
  activeUsersToday: number;
  activeUsersWeek: number;
  activeUsersMonth: number;
  newUsersToday: number;
  churnRate: number;
  
  // Revenue
  mrrTotal: number;
  arrTotal: number;
  avgRevenuePerUser: number;
  conversionRate: number;
  
  // Usage
  totalProjects: number;
  totalFiles: number;
  totalAssets: number;
  totalAIRequests: number;
  totalAITokens: number;
  
  // Performance
  avgApiLatency: number;
  errorRate: number;
  uptime: number;
}

export interface MetricsQuery {
  startDate: Date;
  endDate: Date;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  filters?: Record<string, string | number | boolean>;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

