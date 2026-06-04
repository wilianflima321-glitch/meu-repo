'use client';

import { logger } from '@/lib/observability/logger';
/**
 * AETHEL ENGINE - Security Dashboard
 * =====================================
 *
 * Professional security monitoring and threat visualization.
 * Real-time display of blocked attacks, security events, and system health.
 *
 * Features:
 * - Real-time threat feed
 * - Attack type breakdown
 * - Geographic attack origin map (simplified)
 * - Rate limiting status
 * - Security score
 * - Audit log viewer
 * - Alert configuration
 *
 * @see server/src/security/security-firewall.ts
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  EmptyState,
  ErrorState,
  Icons,
  RateLimitCard,
  SecurityScoreGauge,
  SkeletonEventRow,
  SkeletonRateLimitCard,
  SkeletonScoreGauge,
  SkeletonStatsCard,
  SkeletonThreatBreakdown,
  ThreatBreakdown,
  ThreatEventRow,
} from './SecurityDashboard.parts';

// ============================================================================
// TYPES
// ============================================================================

export type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';
export type ThreatType =
  | 'prompt_injection'
  | 'code_injection'
  | 'xss'
  | 'sql_injection'
  | 'path_traversal'
  | 'data_exfiltration'
  | 'rate_limit_exceeded'
  | 'malicious_payload'
  | 'sensitive_data'
  | 'anomaly';

export interface ThreatEvent {
  id: string;
  timestamp: string;
  type: ThreatType;
  level: ThreatLevel;
  description: string;
  source: {
    ip: string;
    userAgent?: string;
    userId?: string;
  };
  target: {
    endpoint: string;
    method: string;
  };
  blocked: boolean;
  details?: {
    pattern?: string;
    input?: string;
    location?: { start: number; end: number };
  };
}

export interface RateLimitStatus {
  category: string;
  current: number;
  limit: number;
  windowMs: number;
  blocked: number;
}

export interface SecurityStats {
  totalThreats24h: number;
  blockedThreats24h: number;
  uniqueAttackers24h: number;
  threatsByType: Record<ThreatType, number>;
  threatsByLevel: Record<ThreatLevel, number>;
  rateLimitsTriggered: number;
  securityScore: number; // 0-100
  lastUpdated: string;
}

interface SecurityDashboardProps {
  /** WebSocket URL for real-time updates */
  wsUrl?: string;
  /** HTTP API base URL */
  apiUrl?: string;
  /** Refresh interval in ms */
  refreshInterval?: number;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SecurityDashboard({
  wsUrl,
  apiUrl = '/api/admin/security',
  refreshInterval = 5000,
  className = '',
}: SecurityDashboardProps) {
  // State
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [rateLimits, setRateLimits] = useState<RateLimitStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<ThreatLevel | 'all'>('all');
  const [showBlocked, setShowBlocked] = useState<'all' | 'blocked' | 'passed'>('all');

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!isLoading) {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const [eventsResponse, rateLimitsResponse] = await Promise.all([
        fetch(`${apiUrl}/events`),
        fetch(`${apiUrl}/rate-limits`)
      ]);

      if (!eventsResponse.ok) {
        throw new Error(`Failed to fetch events: ${eventsResponse.status} ${eventsResponse.statusText}`);
      }

      if (!rateLimitsResponse.ok) {
        throw new Error(`Failed to fetch rate limits: ${rateLimitsResponse.status} ${rateLimitsResponse.statusText}`);
      }

      const eventsData = await eventsResponse.json();
      const rateLimitsData = await rateLimitsResponse.json();

      // Parse events
      const parsedEvents: ThreatEvent[] = eventsData.events || [];
      setEvents(parsedEvents);

      // Set rate limits
      setRateLimits(rateLimitsData.rateLimits || []);

      // Calculate stats from real data or use provided stats
      if (eventsData.stats) {
        setStats(eventsData.stats);
      } else {
        // Calculate stats from events
        const threatsByType = parsedEvents.reduce((acc: Record<ThreatType, number>, event) => {
          acc[event.type] = (acc[event.type] || 0) + 1;
          return acc;
        }, {} as Record<ThreatType, number>);

        const threatsByLevel = parsedEvents.reduce((acc: Record<ThreatLevel, number>, event) => {
          acc[event.level] = (acc[event.level] || 0) + 1;
          return acc;
        }, {} as Record<ThreatLevel, number>);

        const uniqueIPs = new Set(parsedEvents.map(e => e.source.ip));

        setStats({
          totalThreats24h: parsedEvents.length,
          blockedThreats24h: parsedEvents.filter(e => e.blocked).length,
          uniqueAttackers24h: uniqueIPs.size,
          threatsByType: {
            prompt_injection: threatsByType.prompt_injection || 0,
            code_injection: threatsByType.code_injection || 0,
            xss: threatsByType.xss || 0,
            sql_injection: threatsByType.sql_injection || 0,
            path_traversal: threatsByType.path_traversal || 0,
            data_exfiltration: threatsByType.data_exfiltration || 0,
            rate_limit_exceeded: threatsByType.rate_limit_exceeded || 0,
            malicious_payload: threatsByType.malicious_payload || 0,
            sensitive_data: threatsByType.sensitive_data || 0,
            anomaly: threatsByType.anomaly || 0,
          },
          threatsByLevel: {
            critical: threatsByLevel.critical || 0,
            high: threatsByLevel.high || 0,
            medium: threatsByLevel.medium || 0,
            low: threatsByLevel.low || 0,
            none: threatsByLevel.none || 0,
          },
          rateLimitsTriggered: rateLimitsData.rateLimits?.reduce((acc: number, r: RateLimitStatus) => acc + r.blocked, 0) || 0,
          securityScore: eventsData.securityScore || 100,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (err) {
      logger.error('Failed to fetch security data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error fetching security data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [apiUrl, isLoading]);

  // Initial fetch and polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  // WebSocket for real-time updates
  useEffect(() => {
    if (!wsUrl) return;

    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'threat:new') {
          setEvents(prev => [data.event, ...prev].slice(0, 50));
        } else if (data.type === 'stats:update') {
          setStats(data.stats);
        }
      } catch { /* ignore */ }
    };

    return () => ws.close();
  }, [wsUrl]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (filterLevel !== 'all' && event.level !== filterLevel) return false;
      if (showBlocked === 'blocked' && !event.blocked) return false;
      if (showBlocked === 'passed' && event.blocked) return false;
      return true;
    });
  }, [events, filterLevel, showBlocked]);

  // Error state
  if (error && !isRefreshing) {
    return (
      <div className={`flex flex-col h-full bg-[var(--aethel-surface-primary)] ${className}`}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--aethel-border-primary)]">
          <Icons.Shield />
          <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Security dashboard</h2>
        </div>
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className={`flex flex-col h-full bg-[var(--aethel-surface-primary)] ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--aethel-border-primary)]">
          <div className="flex items-center gap-3">
            <Icons.Shield />
            <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Security dashboard</h2>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--aethel-surface-secondary)]/20 text-[var(--aethel-text-secondary)]">
              Loading...
            </span>
          </div>
        </div>

        {/* Stats Overview Skeleton */}
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-[var(--aethel-border-primary)]">
          <div className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg p-4 flex items-center justify-center">
            <SkeletonScoreGauge />
          </div>
          <div className="col-span-2 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg p-4">
            <div className="h-4 w-24 bg-[var(--aethel-surface-secondary)] rounded mb-3" />
            <div className="grid grid-cols-3 gap-4">
              <SkeletonStatsCard />
              <SkeletonStatsCard />
              <SkeletonStatsCard />
            </div>
          </div>
          <div className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg p-4">
            <div className="h-4 w-20 bg-[var(--aethel-surface-secondary)] rounded mb-3" />
            <SkeletonThreatBreakdown />
          </div>
        </div>

        {/* Rate Limits Skeleton */}
        <div className="px-4 py-3 border-b border-[var(--aethel-border-primary)]">
          <div className="h-4 w-20 bg-[var(--aethel-surface-secondary)] rounded mb-3" />
          <div className="grid grid-cols-3 gap-3">
            <SkeletonRateLimitCard />
            <SkeletonRateLimitCard />
            <SkeletonRateLimitCard />
          </div>
        </div>

        {/* Events Skeleton */}
        <div className="flex-1 overflow-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonEventRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-[var(--aethel-surface-primary)] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-3">
          <Icons.Shield />
          <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Security dashboard</h2>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]">
            Protegido
          </span>
        </div>

        <button type="button" aria-label="Refresh security panel"
          onClick={fetchData}
          className="p-1.5 text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-border-primary)] rounded transition-colors"
          title="Refresh"
        >
          <Icons.Refresh />
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-[var(--aethel-border-primary)]">
        {/* Security Score */}
        <div className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg p-4 flex items-center justify-center">
          {stats && <SecurityScoreGauge score={stats.securityScore} />}
        </div>

        {/* Quick Stats */}
        <div className="col-span-2 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg p-4">
          <h3 className="text-xs text-[var(--aethel-text-tertiary)] uppercase mb-3">Last 24 hours</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-[var(--aethel-text-primary)]">{stats?.totalThreats24h || 0}</div>
              <div className="text-xs text-[var(--aethel-text-tertiary)]">Total threats</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--aethel-success-light)]">{stats?.blockedThreats24h || 0}</div>
              <div className="text-xs text-[var(--aethel-text-tertiary)]">Bloqueadas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--aethel-warning-light)]">{stats?.uniqueAttackers24h || 0}</div>
              <div className="text-xs text-[var(--aethel-text-tertiary)]">Unique attackers</div>
            </div>
          </div>
        </div>

        {/* Threat Breakdown */}
        <div className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg p-4">
          <h3 className="text-xs text-[var(--aethel-text-tertiary)] uppercase mb-3">Top threats</h3>
          {stats && <ThreatBreakdown data={stats.threatsByType} />}
        </div>
      </div>

      {/* Rate Limits */}
      <div className="px-4 py-3 border-b border-[var(--aethel-border-primary)]">
        <h3 className="text-xs text-[var(--aethel-text-tertiary)] uppercase mb-3">Limites de taxa</h3>
        <div className="grid grid-cols-3 gap-3">
          {rateLimits.map((status, i) => (
            <RateLimitCard key={i} status={status} />
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-[var(--aethel-border-primary)]">
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as ThreatLevel | 'all')}
          className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] text-[var(--aethel-text-primary)] text-sm rounded px-2 py-1 focus:outline-none focus:border-[var(--aethel-border-focus)]"
        >
          <option value="all">All levels</option>
          <option value="critical">Critical</option>
          <option value="high">Alto</option>
          <option value="medium">Medium</option>
          <option value="low">Baixo</option>
        </select>

        <select
          value={showBlocked}
          onChange={(e) => setShowBlocked(e.target.value as 'all' | 'blocked' | 'passed')}
          className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] text-[var(--aethel-text-primary)] text-sm rounded px-2 py-1 focus:outline-none focus:border-[var(--aethel-border-focus)]"
        >
          <option value="all">All statuses</option>
          <option value="blocked">Blocked only</option>
          <option value="passed">Allowed only</option>
        </select>

        <div className="flex-1" />

        <span className="text-sm text-[var(--aethel-text-secondary)]">{filteredEvents.length} eventos</span>
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-auto">
        {filteredEvents.length === 0 && events.length === 0 ? (
          <EmptyState />
        ) : filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[var(--aethel-text-tertiary)]">
            No security events match the current filters
          </div>
        ) : (
          filteredEvents.map(event => (
            <ThreatEventRow
              key={event.id}
              event={event}
              isExpanded={expandedEventId === event.id}
              onToggle={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default SecurityDashboard;
