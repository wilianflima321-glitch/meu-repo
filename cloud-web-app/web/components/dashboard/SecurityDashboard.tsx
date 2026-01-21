'use client';

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

// ============================================================================
// TYPES
// ============================================================================

type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';
type ThreatType = 
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

interface ThreatEvent {
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

interface RateLimitStatus {
  category: string;
  current: number;
  limit: number;
  windowMs: number;
  blocked: number;
}

interface SecurityStats {
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
// ICONS
// ============================================================================

const Icons = {
  Shield: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  XCircle: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  CheckCircle: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Globe: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Terminal: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Activity: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
};

// ============================================================================
// CONSTANTS
// ============================================================================

const THREAT_LEVEL_COLORS: Record<ThreatLevel, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500' },
  low: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' },
  none: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' },
};

const THREAT_TYPE_LABELS: Record<ThreatType, string> = {
  prompt_injection: 'Prompt Injection',
  code_injection: 'Code Injection',
  xss: 'XSS Attack',
  sql_injection: 'SQL Injection',
  path_traversal: 'Path Traversal',
  data_exfiltration: 'Data Exfiltration',
  rate_limit_exceeded: 'Rate Limit',
  malicious_payload: 'Malicious Payload',
  sensitive_data: 'Sensitive Data',
  anomaly: 'Anomaly',
};

const THREAT_TYPE_ICONS: Record<ThreatType, React.ReactNode> = {
  prompt_injection: <Icons.Terminal />,
  code_injection: <Icons.Terminal />,
  xss: <Icons.Globe />,
  sql_injection: <Icons.Terminal />,
  path_traversal: <Icons.Eye />,
  data_exfiltration: <Icons.Eye />,
  rate_limit_exceeded: <Icons.Activity />,
  malicious_payload: <Icons.AlertTriangle />,
  sensitive_data: <Icons.Eye />,
  anomaly: <Icons.AlertTriangle />,
};

// ============================================================================
// SKELETON LOADERS
// ============================================================================

function SkeletonScoreGauge() {
  return (
    <div className="flex flex-col items-center animate-pulse">
      <div className="w-32 h-32 bg-gray-700 rounded-full" />
      <div className="mt-2 w-16 h-4 bg-gray-700 rounded" />
    </div>
  );
}

function SkeletonStatsCard() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-16 bg-gray-700 rounded mb-1" />
      <div className="h-4 w-20 bg-gray-600 rounded" />
    </div>
  );
}

function SkeletonThreatBreakdown() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-700 rounded" />
              <div className="w-24 h-4 bg-gray-700 rounded" />
            </div>
            <div className="w-8 h-4 bg-gray-700 rounded" />
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function SkeletonRateLimitCard() {
  return (
    <div className="p-3 rounded-lg border border-[#3c3c3c] bg-[#252526] animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="w-20 h-4 bg-gray-700 rounded" />
        <div className="w-16 h-3 bg-gray-700 rounded" />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-700 rounded-full" />
        <div className="w-12 h-3 bg-gray-700 rounded" />
      </div>
    </div>
  );
}

function SkeletonEventRow() {
  return (
    <div className="border-b border-[#3c3c3c] animate-pulse">
      <div className="px-4 py-3 flex items-center gap-4">
        <div className="w-2 h-2 bg-gray-700 rounded-full" />
        <div className="w-5 h-5 bg-gray-700 rounded" />
        <div className="flex items-center gap-2 w-40">
          <div className="w-4 h-4 bg-gray-700 rounded" />
          <div className="w-24 h-4 bg-gray-700 rounded" />
        </div>
        <div className="w-16 h-5 bg-gray-700 rounded" />
        <div className="flex-1 flex gap-2">
          <div className="w-10 h-4 bg-gray-700 rounded" />
          <div className="w-32 h-4 bg-gray-700 rounded" />
        </div>
        <div className="w-28 h-4 bg-gray-700 rounded" />
        <div className="w-16 h-4 bg-gray-700 rounded" />
      </div>
    </div>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icons.AlertTriangle />
      <div className="w-12 h-12 text-red-400 mb-4 flex items-center justify-center">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">Failed to load security data</h3>
      <p className="text-gray-400 mb-4 max-w-md">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors"
      >
        <Icons.Refresh />
        Try Again
      </button>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 text-green-400 mb-4 opacity-50">
        <Icons.Shield />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">No Security Events</h3>
      <p className="text-gray-400 max-w-md">
        No security events have been recorded. Your system is protected and operating normally.
      </p>
    </div>
  );
}

// ============================================================================
// SECURITY SCORE GAUGE
// ============================================================================

interface SecurityScoreGaugeProps {
  score: number;
}

function SecurityScoreGauge({ score }: SecurityScoreGaugeProps) {
  const getColor = (s: number) => {
    if (s >= 90) return 'text-green-400';
    if (s >= 70) return 'text-yellow-400';
    if (s >= 50) return 'text-orange-400';
    return 'text-red-400';
  };
  
  const getLabel = (s: number) => {
    if (s >= 90) return 'Excellent';
    if (s >= 70) return 'Good';
    if (s >= 50) return 'Fair';
    return 'Poor';
  };
  
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#3c3c3c"
            strokeWidth="8"
          />
          {/* Score circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${getColor(score)} transition-all duration-500`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${getColor(score)}`}>{score}</span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
      </div>
      <span className={`mt-2 text-sm font-medium ${getColor(score)}`}>{getLabel(score)}</span>
    </div>
  );
}

// ============================================================================
// THREAT TYPE BREAKDOWN
// ============================================================================

interface ThreatBreakdownProps {
  data: Record<ThreatType, number>;
}

function ThreatBreakdown({ data }: ThreatBreakdownProps) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const sortedData = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  return (
    <div className="space-y-3">
      {sortedData.map(([type, count]) => {
        const percent = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={type} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">
                  {THREAT_TYPE_ICONS[type as ThreatType]}
                </span>
                <span className="text-sm text-gray-300">
                  {THREAT_TYPE_LABELS[type as ThreatType]}
                </span>
              </div>
              <span className="text-sm text-gray-400">{count}</span>
            </div>
            <div className="h-1.5 bg-[#3c3c3c] rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// RATE LIMIT CARD
// ============================================================================

interface RateLimitCardProps {
  status: RateLimitStatus;
}

function RateLimitCard({ status }: RateLimitCardProps) {
  const percent = (status.current / status.limit) * 100;
  const isWarning = percent > 80;
  const isCritical = percent > 95;
  
  return (
    <div className={`p-3 rounded-lg border ${
      isCritical ? 'border-red-500/50 bg-red-500/10' :
      isWarning ? 'border-yellow-500/50 bg-yellow-500/10' :
      'border-[#3c3c3c] bg-[#252526]'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-white">{status.category}</span>
        {status.blocked > 0 && (
          <span className="text-xs text-red-400">{status.blocked} blocked</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-[#3c3c3c] rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              isCritical ? 'bg-red-500' :
              isWarning ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 w-12 text-right">
          {status.current}/{status.limit}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// THREAT EVENT ROW
// ============================================================================

interface ThreatEventRowProps {
  event: ThreatEvent;
  isExpanded: boolean;
  onToggle: () => void;
}

function ThreatEventRow({ event, isExpanded, onToggle }: ThreatEventRowProps) {
  const levelColor = THREAT_LEVEL_COLORS[event.level];
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };
  
  return (
    <div className={`border-b border-[#3c3c3c] ${event.blocked ? '' : 'bg-red-500/5'}`}>
      <div 
        className="px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-[#2a2a2a] transition-colors"
        onClick={onToggle}
      >
        {/* Level indicator */}
        <div className={`w-2 h-2 rounded-full ${levelColor.bg.replace('/20', '')}`} />
        
        {/* Blocked status */}
        <div className={`w-5 h-5 ${event.blocked ? 'text-green-400' : 'text-red-400'}`}>
          {event.blocked ? <Icons.CheckCircle /> : <Icons.XCircle />}
        </div>
        
        {/* Type */}
        <div className="flex items-center gap-2 w-40">
          <span className="text-gray-500">{THREAT_TYPE_ICONS[event.type]}</span>
          <span className="text-sm text-white">{THREAT_TYPE_LABELS[event.type]}</span>
        </div>
        
        {/* Level */}
        <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${levelColor.bg} ${levelColor.text}`}>
          {event.level}
        </span>
        
        {/* Target */}
        <div className="flex-1 truncate">
          <span className="text-xs text-gray-500">{event.target.method}</span>
          <span className="text-sm text-gray-300 ml-2">{event.target.endpoint}</span>
        </div>
        
        {/* Source IP */}
        <span className="text-xs text-gray-500 font-mono w-28">{event.source.ip}</span>
        
        {/* Time */}
        <span className="text-xs text-gray-500 w-16 text-right">{formatTime(event.timestamp)}</span>
      </div>
      
      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 py-3 bg-[#1e1e1e] border-t border-[#3c3c3c]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs text-gray-500 uppercase mb-2">Source Details</h4>
              <dl className="space-y-1">
                <div className="flex">
                  <dt className="w-20 text-xs text-gray-500">IP:</dt>
                  <dd className="text-xs text-gray-300 font-mono">{event.source.ip}</dd>
                </div>
                {event.source.userId && (
                  <div className="flex">
                    <dt className="w-20 text-xs text-gray-500">User ID:</dt>
                    <dd className="text-xs text-gray-300">{event.source.userId}</dd>
                  </div>
                )}
                <div className="flex">
                  <dt className="w-20 text-xs text-gray-500">User Agent:</dt>
                  <dd className="text-xs text-gray-300 truncate max-w-xs">{event.source.userAgent}</dd>
                </div>
              </dl>
            </div>
            
            <div>
              <h4 className="text-xs text-gray-500 uppercase mb-2">Detection Details</h4>
              <dl className="space-y-1">
                {event.details?.pattern && (
                  <div className="flex">
                    <dt className="w-20 text-xs text-gray-500">Pattern:</dt>
                    <dd className="text-xs text-red-400 font-mono">{event.details.pattern}</dd>
                  </div>
                )}
                {event.details?.input && (
                  <div className="flex">
                    <dt className="w-20 text-xs text-gray-500">Input:</dt>
                    <dd className="text-xs text-orange-400 font-mono truncate max-w-xs">
                      {event.details.input}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
      console.error('Failed to fetch security data:', err);
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
      <div className={`flex flex-col h-full bg-[#1e1e1e] ${className}`}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#3c3c3c]">
          <Icons.Shield />
          <h2 className="text-lg font-semibold text-white">Security Dashboard</h2>
        </div>
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }
  
  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className={`flex flex-col h-full bg-[#1e1e1e] ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c]">
          <div className="flex items-center gap-3">
            <Icons.Shield />
            <h2 className="text-lg font-semibold text-white">Security Dashboard</h2>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400">
              Loading...
            </span>
          </div>
        </div>
        
        {/* Stats Overview Skeleton */}
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-[#3c3c3c]">
          <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-4 flex items-center justify-center">
            <SkeletonScoreGauge />
          </div>
          <div className="col-span-2 bg-[#252526] border border-[#3c3c3c] rounded-lg p-4">
            <div className="h-4 w-24 bg-gray-700 rounded mb-3" />
            <div className="grid grid-cols-3 gap-4">
              <SkeletonStatsCard />
              <SkeletonStatsCard />
              <SkeletonStatsCard />
            </div>
          </div>
          <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-4">
            <div className="h-4 w-20 bg-gray-700 rounded mb-3" />
            <SkeletonThreatBreakdown />
          </div>
        </div>
        
        {/* Rate Limits Skeleton */}
        <div className="px-4 py-3 border-b border-[#3c3c3c]">
          <div className="h-4 w-20 bg-gray-700 rounded mb-3" />
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
    <div className={`flex flex-col h-full bg-[#1e1e1e] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c]">
        <div className="flex items-center gap-3">
          <Icons.Shield />
          <h2 className="text-lg font-semibold text-white">Security Dashboard</h2>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
            Protected
          </span>
        </div>
        
        <button
          onClick={fetchData}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
          title="Refresh"
        >
          <Icons.Refresh />
        </button>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-[#3c3c3c]">
        {/* Security Score */}
        <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-4 flex items-center justify-center">
          {stats && <SecurityScoreGauge score={stats.securityScore} />}
        </div>
        
        {/* Quick Stats */}
        <div className="col-span-2 bg-[#252526] border border-[#3c3c3c] rounded-lg p-4">
          <h3 className="text-xs text-gray-500 uppercase mb-3">Last 24 Hours</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-white">{stats?.totalThreats24h || 0}</div>
              <div className="text-xs text-gray-500">Total Threats</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{stats?.blockedThreats24h || 0}</div>
              <div className="text-xs text-gray-500">Blocked</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">{stats?.uniqueAttackers24h || 0}</div>
              <div className="text-xs text-gray-500">Unique Attackers</div>
            </div>
          </div>
        </div>
        
        {/* Threat Breakdown */}
        <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-4">
          <h3 className="text-xs text-gray-500 uppercase mb-3">Top Threats</h3>
          {stats && <ThreatBreakdown data={stats.threatsByType} />}
        </div>
      </div>
      
      {/* Rate Limits */}
      <div className="px-4 py-3 border-b border-[#3c3c3c]">
        <h3 className="text-xs text-gray-500 uppercase mb-3">Rate Limits</h3>
        <div className="grid grid-cols-3 gap-3">
          {rateLimits.map((status, i) => (
            <RateLimitCard key={i} status={status} />
          ))}
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-[#3c3c3c]">
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as ThreatLevel | 'all')}
          className="bg-[#252526] border border-[#3c3c3c] text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        
        <select
          value={showBlocked}
          onChange={(e) => setShowBlocked(e.target.value as 'all' | 'blocked' | 'passed')}
          className="bg-[#252526] border border-[#3c3c3c] text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="blocked">Blocked Only</option>
          <option value="passed">Passed Only</option>
        </select>
        
        <div className="flex-1" />
        
        <span className="text-sm text-gray-400">{filteredEvents.length} events</span>
      </div>
      
      {/* Event List */}
      <div className="flex-1 overflow-auto">
        {filteredEvents.length === 0 && events.length === 0 ? (
          <EmptyState />
        ) : filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
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
