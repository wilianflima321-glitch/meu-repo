'use client';

import { logger } from '@/lib/observability/logger';
/**
 * Debug Process Attach UI
 *
 * Compact surface for attaching the debugger to active processes.
 * Supports game, server, editor, worker and external targets.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Bug,
  Server,
  Gamepad2,
  RefreshCw,
  Search,
  Terminal,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  colors,
  tint,
  processTypeConfig,
  ProcessItem,
  QuickConnectButton,
} from './DebugAttachUI.parts';

// ============================================================================
// TYPES
// ============================================================================

export type ProcessType = 'game' | 'server' | 'editor' | 'worker' | 'external';

export interface AttachableProcess {
  id: string;
  pid: number;
  name: string;
  type: ProcessType;
  status: 'running' | 'paused' | 'stopped' | 'crashed';
  port?: number;
  host?: string;
  protocol?: 'dap' | 'chrome' | 'node' | 'v8';
  memory?: number; // MB
  cpu?: number; // percentage
  uptime?: number; // seconds
  debuggerAttached?: boolean;
  sourceFile?: string;
  command?: string;
}

export interface DebugConfiguration {
  name: string;
  type: ProcessType;
  protocol: 'dap' | 'chrome' | 'node' | 'v8';
  host: string;
  port: number;
  sourceMaps?: boolean;
  pauseOnStart?: boolean;
}

interface DebugAttachUIProps {
  processes?: AttachableProcess[];
  attachedProcessId?: string;
  onAttach?: (process: AttachableProcess) => Promise<void>;
  onDetach?: (processId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  onCreateConfiguration?: (config: DebugConfiguration) => void;
  isRefreshing?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DebugAttachUI: React.FC<DebugAttachUIProps> = ({
  processes,
  attachedProcessId,
  onAttach,
  onDetach,
  onRefresh,
  onCreateConfiguration,
  isRefreshing = false,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ProcessType | 'all'>('all');
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [localProcesses, setLocalProcesses] = useState<AttachableProcess[]>([]);
  const [localAttachedProcessId, setLocalAttachedProcessId] = useState<string | null>(null);
  const [localRefreshing, setLocalRefreshing] = useState(false);

  const resolvedProcesses = processes ?? localProcesses;
  const resolvedAttachedId = attachedProcessId ?? localAttachedProcessId;
  const resolvedRefreshing = isRefreshing || localRefreshing;

  const refreshProcesses = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
      return;
    }

    try {
      setLocalRefreshing(true);
      const res = await fetch('/api/dap/processes');
      if (!res.ok) throw new Error('Failed to load processes');
      const data = await res.json();
      const list = Array.isArray(data?.processes) ? data.processes : [];
      setLocalProcesses(list);
    } catch (error) {
      logger.error('Failed to refresh processes:', error);
      setLocalProcesses([]);
    } finally {
      setLocalRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!processes) {
      refreshProcesses();
    }
  }, [processes, refreshProcesses]);

  // Filter processes
  const filteredProcesses = resolvedProcesses.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.pid.toString().includes(search);
    const matchesType = filterType === 'all' || p.type === filterType;
    return matchesSearch && matchesType;
  });

  // Group by type
  const groupedProcesses = filteredProcesses.reduce(
    (acc, p) => {
      if (!acc[p.type]) acc[p.type] = [];
      acc[p.type].push(p);
      return acc;
    },
    {} as Record<ProcessType, AttachableProcess[]>
  );

  const handleAttach = async (process: AttachableProcess) => {
    if (!onAttach) {
      setLocalAttachedProcessId(process.id);
      return;
    }
    setAttachingId(process.id);
    try {
      await onAttach(process);
    } finally {
      setAttachingId(null);
    }
  };

  const handleDetach = async (processId: string) => {
    if (!onDetach) {
      setLocalAttachedProcessId(null);
      return;
    }
    await onDetach(processId);
  };

  const handleQuickConnect = async (config: DebugConfiguration) => {
    if (onCreateConfiguration) {
      onCreateConfiguration(config);
      return;
    }

    try {
      await fetch('/api/dap/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: config.protocol === 'node' ? 'node' : 'python',
          request: 'attach',
          name: config.name,
          host: config.host,
          port: config.port,
        }),
      });
      await refreshProcesses();
    } catch (error) {
      logger.error('Quick connect failed:', error);
    }
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bg,
        color: colors.text,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bug size={20} color={colors.primary} />
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Debug Attach</h2>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: colors.surfaceActive,
              color: colors.textMuted,
            }}
          >
            {filteredProcesses.length} processes
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" aria-label="Refresh debuggable process list"
            onClick={refreshProcesses}
            disabled={resolvedRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              color: colors.text,
              fontSize: '12px',
              cursor: resolvedRefreshing ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={resolvedRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.textMuted,
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search processes..."
            style={{
              width: '100%',
              padding: '6px 10px 6px 32px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              color: colors.text,
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>

        {/* Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ProcessType | 'all')}
          style={{
            padding: '6px 24px 6px 8px',
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '6px',
            color: colors.text,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Types</option>
          <option value="game">Game</option>
          <option value="server">Server</option>
          <option value="editor">Editor</option>
          <option value="worker">Worker</option>
          <option value="external">External</option>
        </select>
      </div>

      {/* Quick Connect */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${colors.border}`,
          background: colors.surface,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Info size={14} color={colors.primary} />
          <span style={{ fontSize: '12px', color: colors.textMuted }}>Quick Connect</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <QuickConnectButton
            icon={<Gamepad2 size={14} />}
            label="Game (9222)"
            color={colors.success}
            onClick={() => handleQuickConnect({
              name: 'Game (Chrome)',
              type: 'game',
              protocol: 'chrome',
              host: 'localhost',
              port: 9222,
            })}
          />
          <QuickConnectButton
            icon={<Server size={14} />}
            label="Server (9229)"
            color={colors.primary}
            onClick={() => handleQuickConnect({
              name: 'Server (Node)',
              type: 'server',
              protocol: 'node',
              host: 'localhost',
              port: 9229,
            })}
          />
          <QuickConnectButton
            icon={<Terminal size={14} />}
            label="Node (9230)"
            color={colors.warning}
            onClick={() => handleQuickConnect({
              name: 'Node (V8)',
              type: 'external',
              protocol: 'v8',
              host: 'localhost',
              port: 9230,
            })}
          />
        </div>
      </div>

      {/* Process List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {Object.entries(groupedProcesses).length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: colors.textMuted,
            }}
          >
            <Bug size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <p style={{ margin: 0, fontWeight: 500 }}>No debuggable processes</p>
            <p style={{ margin: '8px 0 0', fontSize: '12px' }}>
              Start a process with debugging enabled to attach.
            </p>
          </div>
        ) : (
          Object.entries(groupedProcesses).map(([type, procs]) => {
            const config = processTypeConfig[type as ProcessType];
            const TypeIcon = config.icon;

            return (
              <div key={type} style={{ marginBottom: '24px' }}>
                {/* Section header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <TypeIcon size={16} color={config.color} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text }}>
                    {config.label}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: colors.surfaceActive,
                      color: colors.textMuted,
                    }}
                  >
                    {procs.length}
                  </span>
                </div>

                {/* Processes */}
                {procs.map((process) => (
                  <ProcessItem
                    key={process.id}
                    process={process}
                    isAttached={resolvedAttachedId === process.id}
                    isAttaching={attachingId === process.id}
                    onAttach={() => handleAttach(process)}
                    onDetach={() => handleDetach(process.id)}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Status Bar */}
      {resolvedAttachedId && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderTop: `1px solid ${colors.border}`,
            background: tint(colors.success, 15),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={14} color={colors.success} />
            <span style={{ fontSize: '12px', color: colors.success }}>
              Debugger attached to{' '}
              {resolvedProcesses.find((p) => p.id === resolvedAttachedId)?.name}
            </span>
          </div>
          <button type="button" aria-label="Detach debugger from current session"
            onClick={() => handleDetach(resolvedAttachedId)}
            style={{
              padding: '4px 8px',
              background: 'transparent',
              border: `1px solid ${colors.error}`,
              borderRadius: '4px',
              color: colors.error,
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Detach
          </button>
        </div>
      )}
    </div>
  );
};


export default DebugAttachUI;
