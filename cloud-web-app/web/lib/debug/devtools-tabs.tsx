'use client';

/**
 * Compact tab bodies for the Aethel DevTools panel.
 */

import { useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Cpu,
  Database,
  History,
  Layers,
  Network,
  Terminal,
  Timer,
} from 'lucide-react';
import type { ActionLog, ConsoleEntry, NetworkRequest, PerformanceMetric, StateSnapshot } from './devtools-provider';

// ============================================================================
// TAB COMPONENTS
// ============================================================================

export function StateTab({ snapshots, searchQuery }: { snapshots: StateSnapshot[]; searchQuery: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = snapshots.filter(s =>
    s.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filtered.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--aethel-text-quaternary)]">
        <div className="text-center">
          <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No state snapshots yet</p>
          <p className="text-xs mt-1">Use takeSnapshot() to capture state</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-2 space-y-1">
      {filtered.map(snapshot => (
        <div key={snapshot.id} className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] rounded-lg overflow-hidden">
          <button type="button"
            onClick={() => setExpandedId(expandedId === snapshot.id ? null : snapshot.id)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--aethel-surface-tertiary)]/50 transition-colors"
          >
            {expandedId === snapshot.id ? (
              <ChevronDown className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            )}
            <span className="text-sm text-[var(--aethel-text-secondary)]">{snapshot.label}</span>
            <span className="text-xs text-[var(--aethel-text-quaternary)] ml-auto">
              {new Date(snapshot.timestamp).toLocaleTimeString()}
            </span>
          </button>
          {expandedId === snapshot.id && (
            <div className="px-3 pb-3">
              <pre className="text-xs text-[var(--aethel-text-secondary)] bg-[var(--aethel-surface-primary)] p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(snapshot.state, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ActionsTab({ actions, searchQuery }: { actions: ActionLog[]; searchQuery: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = actions.filter(a =>
    a.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filtered.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--aethel-text-quaternary)]">
        <div className="text-center">
          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No actions logged</p>
          <p className="text-xs mt-1">Use logAction() to log actions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-2 space-y-1">
      {filtered.map(action => {
        const hasPayload = action.payload !== undefined && action.payload !== null;
        const payloadStr = hasPayload ? JSON.stringify(action.payload, null, 2) : '';

        return (
          <div key={action.id} className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] rounded-lg overflow-hidden">
            <button type="button"
              onClick={() => setExpandedId(expandedId === action.id ? null : action.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--aethel-surface-tertiary)]/50 transition-colors"
            >
              {expandedId === action.id ? (
                <ChevronDown className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
              )}
              <span className="text-sm text-[var(--aethel-primary-light)] font-mono">{action.type}</span>
              <span className="text-xs text-[var(--aethel-text-quaternary)]">{action.source}</span>
              <span className="text-xs text-[var(--aethel-text-quaternary)] ml-auto">
                {new Date(action.timestamp).toLocaleTimeString()}
              </span>
            </button>
            {expandedId === action.id && hasPayload && (
              <div className="px-3 pb-3">
                <pre className="text-xs text-[var(--aethel-text-secondary)] bg-[var(--aethel-surface-primary)] p-2 rounded overflow-auto max-h-40">
                  {payloadStr}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PerformanceTab({ metrics, searchQuery }: { metrics: PerformanceMetric[]; searchQuery: string }) {
  const filtered = metrics.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by category
  const grouped = filtered.reduce((acc, metric) => {
    if (!acc[metric.category]) acc[metric.category] = [];
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, PerformanceMetric[]>);

  const categoryIcons: Record<string, React.ReactNode> = {
    render: <Layers className="w-4 h-4" />,
    network: <Network className="w-4 h-4" />,
    memory: <Database className="w-4 h-4" />,
    cpu: <Cpu className="w-4 h-4" />,
    custom: <Timer className="w-4 h-4" />
  };

  if (filtered.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--aethel-text-quaternary)]">
        <div className="text-center">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No performance metrics</p>
          <p className="text-xs mt-1">Metrics are collected automatically</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] rounded-lg p-3">
            <div className="flex items-center gap-2 text-[var(--aethel-text-tertiary)] mb-2">
              {categoryIcons[category]}
              <span className="text-xs uppercase tracking-wide">{category}</span>
            </div>
            <div className="space-y-2">
              {items.slice(0, 5).map(metric => (
                <div key={metric.id} className="flex items-baseline justify-between">
                  <span className="text-xs text-[var(--aethel-text-secondary)]">{metric.name}</span>
                  <span className="text-sm font-mono text-[var(--aethel-primary-light)]">
                    {metric.value.toFixed(1)} {metric.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NetworkTab({ requests, searchQuery }: { requests: NetworkRequest[]; searchQuery: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = requests.filter(r =>
    r.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status?: number) => {
    if (!status) return 'text-[var(--aethel-text-tertiary)]';
    if (status >= 200 && status < 300) return 'text-[var(--aethel-success-light)]';
    if (status >= 300 && status < 400) return 'text-[var(--aethel-warning-light)]';
    return 'text-[var(--aethel-error-light)]';
  };

  if (filtered.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--aethel-text-quaternary)]">
        <div className="text-center">
          <Network className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No network requests</p>
          <p className="text-xs mt-1">Use logNetwork() to log requests</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-[var(--aethel-surface-secondary)]">
          <tr className="text-left text-[var(--aethel-text-tertiary)]">
            <th className="px-3 py-2">Method</th>
            <th className="px-3 py-2">URL</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Duration</th>
            <th className="px-3 py-2">Size</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(req => (
            <tr
              key={req.id}
              onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
              className="border-t border-[var(--aethel-border-primary)]/50 hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] cursor-pointer"
            >
              <td className="px-3 py-2 font-mono text-[var(--aethel-primary-light)]">{req.method}</td>
              <td className="px-3 py-2 text-[var(--aethel-text-secondary)] max-w-xs truncate">{req.url}</td>
              <td className={`px-3 py-2 font-mono ${getStatusColor(req.status)}`}>
                {req.status || 'pending'}
              </td>
              <td className="px-3 py-2 text-[var(--aethel-text-tertiary)]">
                {req.duration ? `${req.duration}ms` : '-'}
              </td>
              <td className="px-3 py-2 text-[var(--aethel-text-tertiary)]">
                {req.size ? `${(req.size / 1024).toFixed(1)}KB` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ConsoleTab({ entries, searchQuery }: { entries: ConsoleEntry[]; searchQuery: string }) {
  const filtered = entries.filter(e =>
    e.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.source?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const levelColors: Record<string, string> = {
    log: 'text-[var(--aethel-text-secondary)]',
    info: 'text-[var(--aethel-info-light)]',
    warn: 'text-[var(--aethel-warning-light)]',
    error: 'text-[var(--aethel-error-light)]',
    debug: 'text-[var(--aethel-accent-light)]'
  };

  const levelBgs: Record<string, string> = {
    log: 'bg-transparent',
    info: 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]',
    warn: 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]',
    error: 'bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)]',
    debug: 'bg-[color-mix(in_srgb,var(--aethel-accent)_10%,transparent)]'
  };

  if (filtered.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--aethel-text-quaternary)]">
        <div className="text-center">
          <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No console entries</p>
          <p className="text-xs mt-1">Use log() to add entries</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto font-mono text-xs">
      {filtered.map(entry => (
        <div
          key={entry.id}
          className={`flex items-start gap-2 px-3 py-1.5 border-b border-[var(--aethel-border-primary)] ${levelBgs[entry.level]}`}
        >
          <span className={`uppercase text-[10px] w-12 ${levelColors[entry.level]}`}>
            [{entry.level}]
          </span>
          <span className={`flex-1 ${levelColors[entry.level]}`}>{entry.message}</span>
          {entry.source && (
            <span className="text-[var(--aethel-text-quaternary)]">{entry.source}</span>
          )}
          <span className="text-[var(--aethel-text-quaternary)]">
            {new Date(entry.timestamp).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
}
