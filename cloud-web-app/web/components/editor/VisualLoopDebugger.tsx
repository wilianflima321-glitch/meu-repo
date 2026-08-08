'use client';

/**
 * VisualLoopDebugger.tsx  — Sprint V33
 *
 * Live game-loop profiler overlay for the Aethel Engine Studio.
 *
 * Displays:
 *   - Per-frame timing breakdown (logic / physics / render bars)
 *   - Frame budget status (green/amber/red based on overBudget flag)
 *   - Rolling FPS graph (last 60 frames)
 *   - Deferred task backlog counter
 *   - Active ECS entity count (fed via props)
 *   - Kill switch / feature flag panel (links to /api/admin/system/kill-switch)
 *
 * Design: dark neon glassmorphism consistent with Aethel's L5 design system.
 * All timings come from the FrameBudgetMonitor singleton.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types (mirror from frame-budget.ts to avoid importing the full module here)
// ---------------------------------------------------------------------------

interface FrameStats {
  frameMs: number;
  logicMs: number;
  physicsMs: number;
  renderMs: number;
  avgFps: number;
  overBudget: boolean;
  deferredBacklog: number;
}

interface DebuggerProps {
  /** Subscribes to FrameBudgetMonitor — pass the subscribe function from the monitor */
  subscribe?: (cb: (stats: FrameStats) => void) => () => void;
  /** Current ECS entity count */
  entityCount?: number;
  /** Current visible triangle count */
  triangleCount?: number;
  /** Current draw call count */
  drawCalls?: number;
  /** Allow collapsing the panel */
  defaultCollapsed?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// FPS Ring Buffer for sparkline graph
// ---------------------------------------------------------------------------

const GRAPH_SAMPLES = 60;

function useFPSRingBuffer(fps: number): number[] {
  const bufRef = useRef<number[]>(Array(GRAPH_SAMPLES).fill(0));
  bufRef.current = [...bufRef.current.slice(1), fps];
  return bufRef.current;
}

// ---------------------------------------------------------------------------
// Timing bar component
// ---------------------------------------------------------------------------

function TimingBar({
  label,
  valueMs,
  budgetMs,
  color,
}: {
  label: string;
  valueMs: number;
  budgetMs: number;
  color: string;
}) {
  const pct = Math.min((valueMs / budgetMs) * 100, 100);
  const overBudget = valueMs > budgetMs;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-[10px] font-mono">
        <span style={{ color: 'var(--aethel-text-muted)' }}>{label}</span>
        <span style={{ color: overBudget ? 'var(--aethel-error)' : 'var(--aethel-text-secondary)' }}>
          {valueMs.toFixed(2)}ms
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(var(--aethel-text-inverse-rgb), 0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{
            width: `${pct}%`,
            background: overBudget ? 'var(--aethel-error)' : color,
            boxShadow: overBudget ? `0 0 6px var(--aethel-error)` : `0 0 4px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FPS Sparkline
// ---------------------------------------------------------------------------

function FPSSparkline({ samples }: { samples: number[] }) {
  const max = Math.max(...samples, 60);
  return (
    <svg
      width="100%"
      height="32"
      viewBox={`0 0 ${GRAPH_SAMPLES} 32`}
      preserveAspectRatio="none"
      className="rounded overflow-hidden"
      style={{ background: 'rgba(var(--aethel-text-inverse-rgb), 0.04)' }}
    >
      <polyline
        points={samples
          .map((v, i) => `${i},${32 - (v / max) * 30}`)
          .join(' ')}
        fill="none"
        stroke="var(--aethel-primary)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* 60fps reference line */}
      <line
        x1={0} y1={32 - (60 / max) * 30}
        x2={GRAPH_SAMPLES} y2={32 - (60 / max) * 30}
        stroke="rgba(var(--aethel-text-inverse-rgb), 0.15)"
        strokeWidth="0.4"
        strokeDasharray="2,2"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// VisualLoopDebugger
// ---------------------------------------------------------------------------

export function VisualLoopDebugger({
  subscribe,
  entityCount = 0,
  triangleCount = 0,
  drawCalls = 0,
  defaultCollapsed = false,
  className = '',
}: DebuggerProps) {
  const [stats, setStats] = useState<FrameStats>({
    frameMs: 0,
    logicMs: 0,
    physicsMs: 0,
    renderMs: 0,
    avgFps: 0,
    overBudget: false,
    deferredBacklog: 0,
  });
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [pinnedTop, setPinnedTop] = useState(true);
  const fpsSamples = useFPSRingBuffer(stats.avgFps);

  useEffect(() => {
    if (!subscribe) return;
    return subscribe(setStats);
  }, [subscribe]);

  const budgetColor = stats.overBudget
    ? 'var(--aethel-error)'
    : stats.frameMs > 12
    ? 'var(--aethel-warning)'
    : 'var(--aethel-success)';

  const budgetLabel = stats.overBudget ? 'OVER BUDGET' : stats.frameMs > 12 ? 'NEAR LIMIT' : 'HEALTHY';

  return (
    <div
      className={`
        fixed z-[9000] select-none font-mono
        ${pinnedTop ? 'top-4 right-4' : 'bottom-4 right-4'}
        ${className}
      `}
      style={{ width: collapsed ? 'auto' : '260px' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded-t-xl cursor-pointer"
        style={{
          background: 'var(--aethel-editor-overlay-bg)',
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${budgetColor}30`,
          boxShadow: `0 0 12px ${budgetColor}22`,
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2">
          {/* Status LED */}
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: budgetColor,
              boxShadow: `0 0 6px ${budgetColor}`,
              animation: stats.overBudget ? 'pulse 0.5s ease-in-out infinite alternate' : 'none',
            }}
          />
          <span className="text-[11px] font-semibold tracking-wider" style={{ color: budgetColor }}>
            {budgetLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/50">{Math.round(stats.avgFps)} FPS</span>
          <button
            className="text-white/30 hover:text-white/70 text-xs ml-1"
            onClick={(e) => { e.stopPropagation(); setPinnedTop((p) => !p); }}
            title="Move panel"
          >
            ⇕
          </button>
          <span className="text-white/30 text-xs">{collapsed ? '▶' : '▼'}</span>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div
          className="px-3 py-2 flex flex-col gap-2 rounded-b-xl"
          style={{
            background: 'var(--aethel-editor-overlay-bg-soft)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(var(--aethel-text-inverse-rgb), 0.06)',
            borderTop: 'none',
          }}
        >
          {/* FPS Sparkline */}
          <div>
            <div className="flex justify-between text-[9px] mb-1" style={{ color: 'var(--aethel-text-muted)' }}>
              <span>FPS (60s)</span>
              <span>{stats.avgFps.toFixed(1)} avg</span>
            </div>
            <FPSSparkline samples={fpsSamples} />
          </div>

          {/* Timing bars */}
          <div className="flex flex-col gap-1.5">
            <TimingBar label="Frame Total"  valueMs={stats.frameMs}   budgetMs={16.67} color="var(--aethel-primary)" />
            <TimingBar label="Logic (ECS)"  valueMs={stats.logicMs}   budgetMs={4}     color="var(--aethel-info)" />
            <TimingBar label="Physics"      valueMs={stats.physicsMs} budgetMs={3}     color="var(--aethel-warning)" />
            <TimingBar label="Render"       valueMs={stats.renderMs}  budgetMs={8}     color="var(--aethel-success)" />
          </div>

          {/* Separator */}
          <div style={{ borderTop: '1px solid rgba(var(--aethel-text-inverse-rgb), 0.06)' }} />

          {/* Scene stats */}
          <div className="grid grid-cols-3 gap-x-2 text-[10px]" style={{ color: 'var(--aethel-text-muted)' }}>
            {[
              { label: 'Entities', value: entityCount.toLocaleString() },
              { label: '△ Tris', value: (triangleCount / 1000).toFixed(0) + 'k' },
              { label: 'Draw', value: drawCalls.toString() },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center gap-0.5">
                <span style={{ color: 'var(--aethel-text-primary)', fontSize: '11px', fontWeight: 600 }}>{value}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* Deferred backlog */}
          {stats.deferredBacklog > 0 && (
            <div
              className="text-[10px] flex items-center gap-1.5 rounded px-2 py-1"
              style={{
                background: 'rgba(var(--aethel-warning-rgb), 0.08)',
                border: '1px solid rgba(var(--aethel-warning-rgb), 0.2)',
              }}
            >
              <span style={{ color: 'var(--aethel-warning)' }}>⏳</span>
              <span style={{ color: 'var(--aethel-text-secondary)' }}>
                {stats.deferredBacklog} deferred tasks pending
              </span>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          from { opacity: 1; }
          to { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

export default VisualLoopDebugger;
