/**
 * Shared contracts for the Aethel health-check spine.
 */

// ============================================================================
// TYPES
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export type ServiceType =
  | 'database'
  | 'cache'
  | 'storage'
  | 'email'
  | 'payment'
  | 'ai'
  | 'auth'
  | 'external_api'
  | 'queue'
  | 'search';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ServiceHealth {
  service: string;
  type: ServiceType;
  status: HealthStatus;
  latency?: number;
  message?: string;
  lastCheck: Date;
  metadata?: Record<string, unknown>;
}

export interface SystemMetrics {
  timestamp: Date;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu?: {
    usage: number;
    cores: number;
  };
  requests: {
    total: number;
    perSecond: number;
    avgLatency: number;
  };
  errors: {
    total: number;
    rate: number;
  };
  activeConnections: number;
}

export interface HealthReport {
  status: HealthStatus;
  timestamp: Date;
  version: string;
  environment: string;
  services: ServiceHealth[];
  metrics: SystemMetrics;
  checks: {
    passed: number;
    failed: number;
    total: number;
  };
}

export interface HealthAlert {
  id: string;
  service: string;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ServiceConfig {
  name: string;
  type: ServiceType;
  check: () => Promise<{
    healthy: boolean;
    latency?: number;
    message?: string;
    metadata?: Record<string, unknown>;
  }>;
  critical?: boolean;
  timeout?: number;
  interval?: number;
}
