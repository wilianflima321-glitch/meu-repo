'use client'

import React from 'react'
import type { RateLimitStatus, ThreatEvent, ThreatLevel, ThreatType } from './SecurityDashboard'

// ============================================================================
// ICONS
// ============================================================================

export const Icons = {
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
  critical: { bg: 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)]', text: 'text-[var(--aethel-error)]', border: 'border-[var(--aethel-error)]' },
  high: { bg: 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)]', text: 'text-[var(--aethel-warning-light)]', border: 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)]' },
  medium: { bg: 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)]', text: 'text-[var(--aethel-warning)]', border: 'border-[var(--aethel-warning)]' },
  low: { bg: 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)]', text: 'text-[var(--aethel-primary-light)]', border: 'border-[var(--aethel-primary)]' },
  none: { bg: 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]', text: 'text-[var(--aethel-success-light)]', border: 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]' },
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

export function SkeletonScoreGauge() {
  return (
    <div className="flex flex-col items-center animate-pulse">
      <div className="w-32 h-32 bg-[var(--aethel-surface-secondary)] rounded-full" />
      <div className="mt-2 w-16 h-4 bg-[var(--aethel-surface-secondary)] rounded" />
    </div>
  );
}

export function SkeletonStatsCard() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-16 bg-[var(--aethel-surface-secondary)] rounded mb-1" />
      <div className="h-4 w-20 bg-[var(--aethel-surface-secondary)] rounded" />
    </div>
  );
}

export function SkeletonThreatBreakdown() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[var(--aethel-surface-secondary)] rounded" />
              <div className="w-24 h-4 bg-[var(--aethel-surface-secondary)] rounded" />
            </div>
            <div className="w-8 h-4 bg-[var(--aethel-surface-secondary)] rounded" />
          </div>
          <div className="h-1.5 bg-[var(--aethel-surface-secondary)] rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRateLimitCard() {
  return (
    <div className="p-3 rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="w-20 h-4 bg-[var(--aethel-surface-secondary)] rounded" />
        <div className="w-16 h-3 bg-[var(--aethel-surface-secondary)] rounded" />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-[var(--aethel-surface-secondary)] rounded-full" />
        <div className="w-12 h-3 bg-[var(--aethel-surface-secondary)] rounded" />
      </div>
    </div>
  );
}

export function SkeletonEventRow() {
  return (
    <div className="border-b border-[var(--aethel-border-primary)] animate-pulse">
      <div className="px-4 py-3 flex items-center gap-4">
        <div className="w-2 h-2 bg-[var(--aethel-surface-secondary)] rounded-full" />
        <div className="w-5 h-5 bg-[var(--aethel-surface-secondary)] rounded" />
        <div className="flex items-center gap-2 w-40">
          <div className="w-4 h-4 bg-[var(--aethel-surface-secondary)] rounded" />
          <div className="w-24 h-4 bg-[var(--aethel-surface-secondary)] rounded" />
        </div>
        <div className="w-16 h-5 bg-[var(--aethel-surface-secondary)] rounded" />
        <div className="flex-1 flex gap-2">
          <div className="w-10 h-4 bg-[var(--aethel-surface-secondary)] rounded" />
          <div className="w-32 h-4 bg-[var(--aethel-surface-secondary)] rounded" />
        </div>
        <div className="w-28 h-4 bg-[var(--aethel-surface-secondary)] rounded" />
        <div className="w-16 h-4 bg-[var(--aethel-surface-secondary)] rounded" />
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

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icons.AlertTriangle />
      <div className="w-12 h-12 text-[var(--aethel-error)] mb-4 flex items-center justify-center">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-[var(--aethel-text-primary)] mb-2">Failed to load security data</h3>
      <p className="text-[var(--aethel-text-secondary)] mb-4 max-w-md">{message}</p>
      <button type="button" aria-label="Retry loading security data"
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--aethel-primary-dark)] hover:bg-[var(--aethel-primary-dark)] rounded-lg text-[var(--aethel-text-primary)] text-sm transition-colors"
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

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 text-[var(--aethel-success-light)] mb-4 opacity-50">
        <Icons.Shield />
      </div>
      <h3 className="text-lg font-medium text-[var(--aethel-text-primary)] mb-2">No security events</h3>
      <p className="text-[var(--aethel-text-secondary)] max-w-md">
        No security events were recorded. The system is protected and operating normally.
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

export function SecurityScoreGauge({ score }: SecurityScoreGaugeProps) {
  const getColor = (s: number) => {
    if (s >= 90) return 'text-[var(--aethel-success-light)]';
    if (s >= 70) return 'text-[var(--aethel-warning)]';
    if (s >= 50) return 'text-[var(--aethel-warning-light)]';
    return 'text-[var(--aethel-error)]';
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
            stroke="var(--aethel-border-primary)"
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
          <span className="text-xs text-[var(--aethel-text-tertiary)]">/ 100</span>
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

export function ThreatBreakdown({ data }: ThreatBreakdownProps) {
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
                <span className="text-[var(--aethel-text-tertiary)]">
                  {THREAT_TYPE_ICONS[type as ThreatType]}
                </span>
                <span className="text-sm text-[var(--aethel-text-secondary)]">
                  {THREAT_TYPE_LABELS[type as ThreatType]}
                </span>
              </div>
              <span className="text-sm text-[var(--aethel-text-secondary)]">{count}</span>
            </div>
            <div className="h-1.5 bg-[var(--aethel-border-primary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--aethel-primary)] transition-all duration-300"
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

export function RateLimitCard({ status }: RateLimitCardProps) {
  const percent = (status.current / status.limit) * 100;
  const isWarning = percent > 80;
  const isCritical = percent > 95;

  return (
    <div className={`p-3 rounded-lg border ${
      isCritical ? 'border-[color-mix(in_srgb,var(--aethel-error)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]' :
      isWarning ? 'border-[var(--aethel-warning)]/50 bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]' :
      'border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)]'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-[var(--aethel-text-primary)]">{status.category}</span>
        {status.blocked > 0 && (
          <span className="text-xs text-[var(--aethel-error)]">{status.blocked} blocked</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-[var(--aethel-border-primary)] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isCritical ? 'bg-[var(--aethel-error)]' :
              isWarning ? 'bg-[var(--aethel-warning)]' :
              'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs text-[var(--aethel-text-secondary)] w-12 text-right">
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

export function ThreatEventRow({ event, isExpanded, onToggle }: ThreatEventRowProps) {
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
    <div className={`border-b border-[var(--aethel-border-primary)] ${event.blocked ? '' : 'bg-[color-mix(in_srgb,var(--aethel-error)_5%,transparent)]'}`}>
      <div
        className="px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-[var(--aethel-surface-tertiary)] transition-colors"
        onClick={onToggle}
      >
        {/* Level indicator */}
        <div className={`w-2 h-2 rounded-full ${levelColor.bg.replace('/20', '')}`} />

        {/* Blocked status */}
        <div className={`w-5 h-5 ${event.blocked ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-error)]'}`}>
          {event.blocked ? <Icons.CheckCircle /> : <Icons.XCircle />}
        </div>

        {/* Type */}
        <div className="flex items-center gap-2 w-40">
          <span className="text-[var(--aethel-text-tertiary)]">{THREAT_TYPE_ICONS[event.type]}</span>
          <span className="text-sm text-[var(--aethel-text-primary)]">{THREAT_TYPE_LABELS[event.type]}</span>
        </div>

        {/* Level */}
        <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${levelColor.bg} ${levelColor.text}`}>
          {event.level}
        </span>

        {/* Target */}
        <div className="flex-1 truncate">
          <span className="text-xs text-[var(--aethel-text-tertiary)]">{event.target.method}</span>
          <span className="text-sm text-[var(--aethel-text-secondary)] ml-2">{event.target.endpoint}</span>
        </div>

        {/* Source IP */}
        <span className="text-xs text-[var(--aethel-text-tertiary)] font-mono w-28">{event.source.ip}</span>

        {/* Time */}
        <span className="text-xs text-[var(--aethel-text-tertiary)] w-16 text-right">{formatTime(event.timestamp)}</span>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 py-3 bg-[var(--aethel-surface-primary)] border-t border-[var(--aethel-border-primary)]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs text-[var(--aethel-text-tertiary)] uppercase mb-2">Origin details</h4>
              <dl className="space-y-1">
                <div className="flex">
                  <dt className="w-20 text-xs text-[var(--aethel-text-tertiary)]">IP:</dt>
                  <dd className="text-xs text-[var(--aethel-text-secondary)] font-mono">{event.source.ip}</dd>
                </div>
                {event.source.userId && (
                  <div className="flex">
                    <dt className="w-20 text-xs text-[var(--aethel-text-tertiary)]">User ID:</dt>
                    <dd className="text-xs text-[var(--aethel-text-secondary)]">{event.source.userId}</dd>
                  </div>
                )}
                <div className="flex">
                  <dt className="w-20 text-xs text-[var(--aethel-text-tertiary)]">User agent:</dt>
                  <dd className="text-xs text-[var(--aethel-text-secondary)] truncate max-w-xs">{event.source.userAgent}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="text-xs text-[var(--aethel-text-tertiary)] uppercase mb-2">Detection details</h4>
              <dl className="space-y-1">
                {event.details?.pattern && (
                  <div className="flex">
                    <dt className="w-20 text-xs text-[var(--aethel-text-tertiary)]">Pattern:</dt>
                    <dd className="text-xs text-[var(--aethel-error)] font-mono">{event.details.pattern}</dd>
                  </div>
                )}
                {event.details?.input && (
                  <div className="flex">
                    <dt className="w-20 text-xs text-[var(--aethel-text-tertiary)]">Input:</dt>
                    <dd className="text-xs text-[var(--aethel-warning-light)] font-mono truncate max-w-xs">
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
