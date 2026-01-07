/**
 * Debug Process Attach UI
 * 
 * Interface para selecionar e anexar debugger a processos.
 * Suporta múltiplos tipos: Game, Server, Editor, Worker.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bug,
  Server,
  Gamepad2,
  Settings,
  Box,
  RefreshCw,
  Plug,
  Unplug,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Circle,
  Cpu,
  MemoryStick,
  Clock,
  Terminal,
  Code,
  Play,
  Square,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';

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
// STYLES
// ============================================================================

const colors = {
  bg: '#0f0f14',
  surface: '#16161d',
  surfaceHover: '#1e1e28',
  surfaceActive: '#26263a',
  border: '#2a2a3a',
  borderFocus: '#4f46e5',
  text: '#e4e4eb',
  textMuted: '#8b8b9e',
  textDim: '#5a5a6e',
  primary: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

const processTypeConfig: Record<ProcessType, { icon: typeof Bug; color: string; label: string }> = {
  game: { icon: Gamepad2, color: colors.success, label: 'Game Process' },
  server: { icon: Server, color: colors.primary, label: 'Server Process' },
  editor: { icon: Code, color: colors.warning, label: 'Editor Process' },
  worker: { icon: Box, color: '#8b5cf6', label: 'Worker Process' },
  external: { icon: Terminal, color: colors.textMuted, label: 'External Process' },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  running: { color: colors.success, label: 'Running' },
  paused: { color: colors.warning, label: 'Paused' },
  stopped: { color: colors.textDim, label: 'Stopped' },
  crashed: { color: colors.error, label: 'Crashed' },
};

// ============================================================================
// PROCESS ITEM
// ============================================================================

interface ProcessItemProps {
  process: AttachableProcess;
  isAttached: boolean;
  isAttaching: boolean;
  onAttach: () => void;
  onDetach: () => void;
}

const ProcessItem: React.FC<ProcessItemProps> = ({
  process,
  isAttached,
  isAttaching,
  onAttach,
  onDetach,
}) => {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = processTypeConfig[process.type];
  const status = statusConfig[process.status];
  const Icon = typeConfig.icon;

  return (
    <div
      style={{
        background: isAttached ? `${colors.primary}15` : colors.surface,
        border: `1px solid ${isAttached ? colors.primary : colors.border}`,
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '8px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Expand toggle */}
        <button
          style={{
            background: 'transparent',
            border: 'none',
            padding: '0',
            marginRight: '8px',
            color: colors.textMuted,
            cursor: 'pointer',
          }}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* Icon */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: `${typeConfig.color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px',
          }}
        >
          <Icon size={18} color={typeConfig.color} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                color: colors.text,
                fontWeight: 500,
                fontSize: '14px',
              }}
            >
              {process.name}
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
              PID: {process.pid}
            </span>
            {isAttached && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: `${colors.success}20`,
                  color: colors.success,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Bug size={10} />
                Attached
              </span>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '4px',
            }}
          >
            {/* Status */}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: status.color,
              }}
            >
              <Circle size={8} fill={status.color} />
              {status.label}
            </span>

            {/* Port */}
            {process.port && (
              <span style={{ fontSize: '12px', color: colors.textMuted }}>
                :{process.port}
              </span>
            )}

            {/* Protocol */}
            {process.protocol && (
              <span style={{ fontSize: '12px', color: colors.textDim }}>
                {process.protocol.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
          {isAttached ? (
            <button
              onClick={onDetach}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                background: colors.error,
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <Unplug size={14} />
              Detach
            </button>
          ) : (
            <button
              onClick={onAttach}
              disabled={isAttaching || process.status === 'stopped'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                background: process.status === 'stopped' ? colors.surfaceActive : colors.primary,
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
                cursor: process.status === 'stopped' ? 'not-allowed' : 'pointer',
                opacity: isAttaching ? 0.7 : 1,
              }}
            >
              {isAttaching ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Plug size={14} />
              )}
              {isAttaching ? 'Attaching...' : 'Attach'}
            </button>
          )}
        </div>
      </div>

      {/* Details */}
      {expanded && (
        <div
          style={{
            padding: '12px',
            borderTop: `1px solid ${colors.border}`,
            background: colors.bg,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}
          >
            {/* Memory */}
            {process.memory !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MemoryStick size={14} color={colors.textMuted} />
                <span style={{ color: colors.textMuted, fontSize: '12px' }}>Memory:</span>
                <span style={{ color: colors.text, fontSize: '12px' }}>
                  {process.memory} MB
                </span>
              </div>
            )}

            {/* CPU */}
            {process.cpu !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={14} color={colors.textMuted} />
                <span style={{ color: colors.textMuted, fontSize: '12px' }}>CPU:</span>
                <span style={{ color: colors.text, fontSize: '12px' }}>
                  {process.cpu.toFixed(1)}%
                </span>
              </div>
            )}

            {/* Uptime */}
            {process.uptime !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={14} color={colors.textMuted} />
                <span style={{ color: colors.textMuted, fontSize: '12px' }}>Uptime:</span>
                <span style={{ color: colors.text, fontSize: '12px' }}>
                  {formatUptime(process.uptime)}
                </span>
              </div>
            )}

            {/* Host */}
            {process.host && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={14} color={colors.textMuted} />
                <span style={{ color: colors.textMuted, fontSize: '12px' }}>Host:</span>
                <span style={{ color: colors.text, fontSize: '12px' }}>
                  {process.host}
                </span>
              </div>
            )}
          </div>

          {/* Command */}
          {process.command && (
            <div style={{ marginTop: '12px' }}>
              <span style={{ color: colors.textMuted, fontSize: '12px' }}>Command:</span>
              <code
                style={{
                  display: 'block',
                  marginTop: '4px',
                  padding: '8px',
                  background: colors.surface,
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: colors.textMuted,
                  fontFamily: 'monospace',
                  overflow: 'auto',
                }}
              >
                {process.command}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// UTILITIES
// ============================================================================

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DebugAttachUI: React.FC<DebugAttachUIProps> = ({
  processes = DEMO_PROCESSES,
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
  const [showConfig, setShowConfig] = useState(false);

  // Filter processes
  const filteredProcesses = processes.filter((p) => {
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
    if (!onAttach) return;
    setAttachingId(process.id);
    try {
      await onAttach(process);
    } finally {
      setAttachingId(null);
    }
  };

  const handleDetach = async (processId: string) => {
    if (!onDetach) return;
    await onDetach(processId);
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
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
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
              cursor: isRefreshing ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
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
            onClick={() => {}}
          />
          <QuickConnectButton
            icon={<Server size={14} />}
            label="Server (9229)"
            color={colors.primary}
            onClick={() => {}}
          />
          <QuickConnectButton
            icon={<Terminal size={14} />}
            label="Node (9230)"
            color={colors.warning}
            onClick={() => {}}
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
                    isAttached={attachedProcessId === process.id}
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
      {attachedProcessId && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderTop: `1px solid ${colors.border}`,
            background: `${colors.success}15`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={14} color={colors.success} />
            <span style={{ fontSize: '12px', color: colors.success }}>
              Debugger attached to{' '}
              {processes.find((p) => p.id === attachedProcessId)?.name}
            </span>
          </div>
          <button
            onClick={() => handleDetach(attachedProcessId)}
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

// ============================================================================
// QUICK CONNECT BUTTON
// ============================================================================

const QuickConnectButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}> = ({ icon, label, color, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      background: `${color}15`,
      border: `1px solid ${color}40`,
      borderRadius: '6px',
      color: color,
      fontSize: '12px',
      cursor: 'pointer',
    }}
  >
    {icon}
    {label}
  </button>
);

// ============================================================================
// DEMO DATA
// ============================================================================

const DEMO_PROCESSES: AttachableProcess[] = [
  {
    id: 'game-1',
    pid: 12345,
    name: 'AethelGame.exe',
    type: 'game',
    status: 'running',
    port: 9222,
    protocol: 'chrome',
    memory: 512,
    cpu: 15.2,
    uptime: 3600,
    command: 'AethelGame.exe --debug --port=9222',
  },
  {
    id: 'server-1',
    pid: 12346,
    name: 'GameServer',
    type: 'server',
    status: 'running',
    port: 9229,
    host: 'localhost',
    protocol: 'node',
    memory: 256,
    cpu: 5.1,
    uptime: 7200,
    command: 'node --inspect=9229 server.js',
  },
  {
    id: 'editor-1',
    pid: 12347,
    name: 'AethelEditor',
    type: 'editor',
    status: 'paused',
    port: 9230,
    protocol: 'dap',
    memory: 1024,
    cpu: 0.5,
    uptime: 1800,
    debuggerAttached: true,
  },
  {
    id: 'worker-1',
    pid: 12348,
    name: 'AssetCompiler',
    type: 'worker',
    status: 'running',
    protocol: 'node',
    memory: 128,
    cpu: 45.0,
    uptime: 120,
  },
  {
    id: 'worker-2',
    pid: 12349,
    name: 'ShaderCompiler',
    type: 'worker',
    status: 'stopped',
    memory: 0,
    cpu: 0,
  },
];

export default DebugAttachUI;
