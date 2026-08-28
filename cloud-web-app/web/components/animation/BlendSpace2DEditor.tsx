'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Activity,
  Crosshair,
  Grid,
  Move,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { AnimationParameter } from './animation-blueprint-editor.types';

export interface BlendSample2D {
  id: string;
  animation: string;
  x: number; // e.g. Direction -180 to 180
  y: number; // e.g. Speed 0 to 600
}

export interface BlendSpace2DConfig {
  name: string;
  paramX: string;
  paramY: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  gridDivisionsX: number;
  gridDivisionsY: number;
  samples: BlendSample2D[];
}

interface BlendSpace2DEditorProps {
  config: BlendSpace2DConfig;
  onChange: (config: BlendSpace2DConfig) => void;
  availableAnimations?: string[];
  parameters?: AnimationParameter[];
}

export function BlendSpace2DEditor({
  config,
  onChange,
  availableAnimations = ['Idle', 'Walk_Fwd', 'Walk_Bwd', 'Walk_Left', 'Walk_Right', 'Run_Fwd', 'Run_Bwd', 'Sprint'],
  parameters = [],
}: BlendSpace2DEditorProps) {
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Normalize grid coordinates to pixels
  const coordToPct = useCallback(
    (x: number, y: number) => {
      const pctX = ((x - config.minX) / (config.maxX - config.minX)) * 100;
      const pctY = 100 - ((y - config.minY) / (config.maxY - config.minY)) * 100;
      return { pctX: Math.max(0, Math.min(100, pctX)), pctY: Math.max(0, Math.min(100, pctY)) };
    },
    [config.minX, config.maxX, config.minY, config.maxY]
  );

  const pctToCoord = useCallback(
    (pctX: number, pctY: number) => {
      const x = config.minX + (pctX / 100) * (config.maxX - config.minX);
      const y = config.minY + ((100 - pctY) / 100) * (config.maxY - config.minY);
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    },
    [config.minX, config.maxX, config.minY, config.maxY]
  );

  const handleGridMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const pctX = ((e.clientX - rect.left) / rect.width) * 100;
    const pctY = ((e.clientY - rect.top) / rect.height) * 100;
    const { x, y } = pctToCoord(pctX, pctY);
    setPreviewPos({ x, y });
    setIsDraggingPreview(true);
  };

  const handleGridMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingPreview || !gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const pctX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const pctY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const { x, y } = pctToCoord(pctX, pctY);
    setPreviewPos({ x, y });
  };

  const handleGridMouseUp = () => {
    setIsDraggingPreview(false);
  };

  const addSampleAtCenter = () => {
    const newSample: BlendSample2D = {
      id: crypto.randomUUID(),
      animation: availableAnimations[0] ?? 'Idle',
      x: previewPos.x,
      y: previewPos.y,
    };
    onChange({
      ...config,
      samples: [...config.samples, newSample],
    });
    setSelectedSampleId(newSample.id);
  };

  const removeSample = (id: string) => {
    onChange({
      ...config,
      samples: config.samples.filter((s) => s.id !== id),
    });
    if (selectedSampleId === id) setSelectedSampleId(null);
  };

  const updateSampleAnimation = (id: string, animation: string) => {
    onChange({
      ...config,
      samples: config.samples.map((s) => (s.id === id ? { ...s, animation } : s)),
    });
  };

  const previewPct = coordToPct(previewPos.x, previewPos.y);

  // Compute calculated blend weights for nearest samples
  const weights = config.samples.map((s) => {
    const dx = s.x - previewPos.x;
    const dy = s.y - previewPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return { ...s, dist };
  });
  const totalInvDist = weights.reduce((acc, s) => acc + (s.dist === 0 ? 100 : 1 / (s.dist + 0.001)), 0);
  const normalizedWeights = weights.map((s) => ({
    ...s,
    weight: Math.round(((s.dist === 0 ? 100 : 1 / (s.dist + 0.001)) / totalInvDist) * 100),
  })).sort((a, b) => b.weight - a.weight);

  return (
    <div className="flex flex-col lg:flex-row gap-6 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-5 backdrop-blur-md">
      {/* 2D Grid Canvas (Left/Center) */}
      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid className="h-4 w-4 text-[var(--aethel-primary)]" />
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-primary)]">
              2D Blend Space Cartesian Grid (UE5 Persona Parity)
            </h3>
          </div>
          <button
            type="button"
            onClick={addSampleAtCenter}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--aethel-primary)] px-2.5 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--aethel-primary-light)] active:scale-95"
          >
            <Plus className="h-3 w-3" /> Add Sample at Cursor
          </button>
        </div>

        {/* Interactive Grid Area */}
        <div
          ref={gridRef}
          onMouseDown={handleGridMouseDown}
          onMouseMove={handleGridMouseMove}
          onMouseUp={handleGridMouseUp}
          className="relative aspect-square w-full max-w-[480px] mx-auto cursor-crosshair overflow-hidden rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] select-none shadow-inner"
        >
          {/* Grid lines background */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: `
                linear-gradient(to right, var(--aethel-border-primary) 1px, transparent 1px),
                linear-gradient(to bottom, var(--aethel-border-primary) 1px, transparent 1px)
              `,
              backgroundSize: '25% 25%',
            }}
          />

          {/* Axis center markers */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)]" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)]" />

          {/* Axis Labels */}
          <div className="absolute top-2 left-2 font-mono text-[9px] text-[var(--aethel-text-quaternary)]">
            +Y: {config.maxY} cm/s
          </div>
          <div className="absolute bottom-2 left-2 font-mono text-[9px] text-[var(--aethel-text-quaternary)]">
            -Y: {config.minY} cm/s
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[9px] text-[var(--aethel-text-quaternary)]">
            X: 0°
          </div>
          <div className="absolute bottom-2 right-2 font-mono text-[9px] text-[var(--aethel-text-quaternary)]">
            +X: {config.maxX}°
          </div>

          {/* Triangulation connection lines between samples */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none opacity-30">
            {config.samples.map((s, i) => {
              const p1 = coordToPct(s.x, s.y);
              return config.samples.slice(i + 1).map((s2) => {
                const p2 = coordToPct(s2.x, s2.y);
                return (
                  <line
                    key={`${s.id}-${s2.id}`}
                    x1={`${p1.pctX}%`}
                    y1={`${p1.pctY}%`}
                    x2={`${p2.pctX}%`}
                    y2={`${p2.pctY}%`}
                    stroke="var(--aethel-primary-light)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                );
              });
            })}
          </svg>

          {/* Placed Sample Nodes */}
          {config.samples.map((sample) => {
            const { pctX, pctY } = coordToPct(sample.x, sample.y);
            const isSelected = selectedSampleId === sample.id;
            return (
              <div
                key={sample.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSampleId(sample.id);
                }}
                className={`group absolute -translate-x-1/2 -translate-y-1/2 z-10 flex cursor-pointer flex-col items-center`}
                style={{ left: `${pctX}%`, top: `${pctY}%` }}
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all ${
                    isSelected
                      ? 'border-[var(--aethel-warning)] bg-[var(--aethel-warning)] shadow-[0_0_12px_var(--aethel-warning)]'
                      : 'border-[var(--aethel-neon-cyan)] bg-[var(--aethel-surface-primary)] group-hover:scale-125'
                  }`}
                />
                <span className="mt-1 rounded border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_85%,transparent)] px-1.5 py-0.5 font-mono text-[8px] font-bold text-[var(--aethel-text-primary)] backdrop-blur-sm pointer-events-none whitespace-nowrap">
                  {sample.animation}
                </span>
              </div>
            );
          })}

          {/* Interactive Preview Cursor */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
            style={{ left: `${previewPct.pctX}%`, top: `${previewPct.pctY}%` }}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--aethel-primary)] bg-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] shadow-[0_0_16px_var(--aethel-primary)] animate-pulse">
              <Crosshair className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>

        {/* Live coordinate readout */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] px-3 py-2 text-xs font-mono">
          <span className="text-[var(--aethel-text-tertiary)]">Cursor Scrub:</span>
          <span className="text-[var(--aethel-neon-cyan)]">
            Dir (X): {previewPos.x}° · Speed (Y): {previewPos.y} cm/s
          </span>
        </div>
      </div>

      {/* Right Column: Sample Weights & Configuration */}
      <div className="w-full lg:w-72 space-y-4">
        {/* Real-time Delaunay Blending Weights */}
        <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="h-4 w-4 text-[var(--aethel-neon-cyan)]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--aethel-text-primary)]">
              Active Blend Weights
            </h4>
          </div>

          {normalizedWeights.length === 0 ? (
            <p className="text-xs text-[var(--aethel-text-quaternary)]">
              No samples added yet. Click &quot;Add Sample&quot; to place animation clips.
            </p>
          ) : (
            <div className="space-y-2">
              {normalizedWeights.slice(0, 4).map((w) => (
                <div key={w.id} className="text-xs">
                  <div className="flex justify-between text-[11px] mb-1 font-mono">
                    <span className="font-semibold text-[var(--aethel-text-primary)]">{w.animation}</span>
                    <span className="text-[var(--aethel-neon-cyan)]">{w.weight}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--aethel-surface-primary)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--aethel-neon-cyan)] transition-all duration-75"
                      style={{ width: `${w.weight}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Sample Editor */}
        {selectedSampleId && (
          <div className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--aethel-warning)]">
                Selected Sample
              </h4>
              <button
                type="button"
                onClick={() => removeSample(selectedSampleId)}
                className="text-[var(--aethel-error)] hover:opacity-80 p-1"
                aria-label="Remove sample"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-[var(--aethel-text-tertiary)] block mb-1">
                Clip Name
              </label>
              <select
                value={config.samples.find((s) => s.id === selectedSampleId)?.animation ?? ''}
                onChange={(e) => updateSampleAnimation(selectedSampleId, e.target.value)}
                className="w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] p-2 text-xs text-[var(--aethel-text-primary)]"
              >
                {availableAnimations.map((anim) => (
                  <option key={anim} value={anim}>
                    {anim}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
