'use client';

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Bug,
  Server,
  Gamepad2,
  Box,
  ChevronDown,
  ChevronRight,
  Circle,
  Cpu,
  MemoryStick,
  Clock,
  Terminal,
  Code,
  RefreshCw,
  Plug,
  Unplug,
} from 'lucide-react';
import type { AttachableProcess, ProcessType } from './DebugAttachUI';

// ============================================================================
// VIEW MODEL
// ============================================================================

export const colors = {
  bg: 'var(--aethel-surface-primary)',
  surface: 'var(--aethel-surface-secondary)',
  surfaceHover: 'var(--aethel-surface-tertiary)',
  surfaceActive: 'var(--aethel-surface-quaternary)',
  border: 'var(--aethel-border-primary)',
  borderFocus: 'var(--aethel-border-focus)',
  text: 'var(--aethel-text-primary)',
  textMuted: 'var(--aethel-text-tertiary)',
  textDim: 'var(--aethel-text-quaternary)',
  primary: 'var(--aethel-primary)',
  success: 'var(--aethel-success)',
  warning: 'var(--aethel-warning)',
  error: 'var(--aethel-error)',
  accent: 'var(--aethel-accent)',
};

export const tint = (color: string, percent: number) =>
  `color-mix(in_srgb, ${color} ${percent}%, transparent)`;

export const processTypeConfig: Record<ProcessType, { icon: LucideIcon; color: string; label: string }> = {
  game: { icon: Gamepad2, color: colors.success, label: 'Game Process' },
  server: { icon: Server, color: colors.primary, label: 'Server Process' },
  editor: { icon: Code, color: colors.warning, label: 'Editor Process' },
  worker: { icon: Box, color: colors.accent, label: 'Worker Process' },
  external: { icon: Terminal, color: colors.textMuted, label: 'External Process' },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  running: { color: colors.success, label: 'Running' },
  paused: { color: colors.warning, label: 'Paused' },
  stopped: { color: colors.textDim, label: 'Stopped' },
  crashed: { color: colors.error, label: 'Crashed' },
};


interface ProcessItemProps {
  process: AttachableProcess;
  isAttached: boolean;
  isAttaching: boolean;
  onAttach: () => void;
  onDetach: () => void;
}

export const ProcessItem: React.FC<ProcessItemProps> = ({
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
        background: isAttached ? tint(colors.primary, 15) : colors.surface,
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
          type="button"
          aria-label={expanded ? `Collapse details for ${process.name}` : `Expand details for ${process.name}`}
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
            <button type="button" aria-label={`Detach debugger from ${process.name}`}
              onClick={onDetach}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                background: colors.error,
                border: 'none',
                borderRadius: '6px',
                color: 'var(--aethel-text-primary)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <Unplug size={14} />
              Detach
            </button>
          ) : (
            <button type="button" aria-label={`Attach debugger to ${process.name}`}
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
                color: 'var(--aethel-text-primary)',
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


function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}


// ============================================================================
// QUICK CONNECT BUTTON
// ============================================================================

export const QuickConnectButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}> = ({ icon, label, color, onClick }) => (
  <button type="button" aria-label={label}
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      background: tint(color, 15),
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
