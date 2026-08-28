'use client';

// @aethel-heavy-async-boundary: transitive runtime chunk loaded through TerrainSculptingEditor.

import React from 'react';
import {
  Activity,
  BoxSelect,
  Droplets,
  Eraser,
  Flame,
  Layers,
  Minus,
  MousePointer,
  Mountain,
  Paintbrush,
  Plus,
  Trash2,
  TreePine,
  Trees,
  TrendingDown,
  TrendingUp,
  Wind,
} from 'lucide-react';
import type {
  ErosionSettings,
  TerrainLayer,
  TerrainToolType,
} from './terrain-sculpting-models';

export { ViewportScene } from './TerrainSculptingEditor.scene';

// ── Map typed Lucide icon to each tool ──────────────────────────────────────

const TOOL_ICONS: Record<TerrainToolType, React.ComponentType<{ className?: string }>> = {
  sculpt_raise: TrendingUp,
  sculpt_lower: TrendingDown,
  sculpt_smooth: Wind,
  sculpt_flatten: Minus,
  sculpt_noise: Activity,
  sculpt_erosion: Droplets,
  paint_layer: Paintbrush,
  paint_hole: Eraser,
  foliage_paint: Trees,
  foliage_erase: TreePine,
  select: MousePointer,
  region: BoxSelect,
};

const TOOL_GROUPS: Array<{
  name: string
  tools: Array<{ id: TerrainToolType; label: string; shortcut: string }>
}> = [
  {
    name: 'Sculpting',
    tools: [
      { id: 'sculpt_raise', label: 'Raise Terrain', shortcut: '1' },
      { id: 'sculpt_lower', label: 'Lower Terrain', shortcut: '2' },
      { id: 'sculpt_smooth', label: 'Smooth Surface', shortcut: '3' },
      { id: 'sculpt_flatten', label: 'Flatten Plateau', shortcut: '4' },
      { id: 'sculpt_noise', label: 'Noise Displacement', shortcut: '5' },
      { id: 'sculpt_erosion', label: 'Hydraulic Erosion', shortcut: '6' },
    ],
  },
  {
    name: 'Biome & Paint',
    tools: [
      { id: 'paint_layer', label: 'Paint Layer Weights', shortcut: '7' },
      { id: 'paint_hole', label: 'Cut Visibility Holes', shortcut: '8' },
    ],
  },
  {
    name: 'Foliage Scatter',
    tools: [
      { id: 'foliage_paint', label: 'Paint Foliage', shortcut: '9' },
      { id: 'foliage_erase', label: 'Erase Foliage', shortcut: '0' },
    ],
  },
];

interface ToolbarProps {
  selectedTool: TerrainToolType;
  onToolChange: (tool: TerrainToolType) => void;
}

export function Toolbar({ selectedTool, onToolChange }: ToolbarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-3.5 backdrop-blur-md">
      {TOOL_GROUPS.map((group) => (
        <div key={group.name}>
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
            {group.name}
          </h4>
          <div className="grid grid-cols-3 gap-1.5">
            {group.tools.map((tool) => {
              const Icon = TOOL_ICONS[tool.id] ?? Mountain;
              const isSelected = selectedTool === tool.id;
              return (
                <button
                  type="button"
                  key={tool.id}
                  onClick={() => onToolChange(tool.id)}
                  title={`${tool.label} (${tool.shortcut})`}
                  aria-label={tool.label}
                  aria-pressed={isSelected}
                  className={`group relative flex h-10 w-full items-center justify-center rounded-xl border transition-all duration-150 active:scale-95 ${
                    isSelected
                      ? 'border-[color-mix(in_srgb,var(--aethel-primary)_60%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)] shadow-[0_0_12px_color-mix(in_srgb,var(--aethel-primary)_35%,transparent)]'
                      : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]'
                  }`}
                >
                  <Icon className="h-4 w-4 transition-transform duration-150 group-hover:scale-110" />
                  <span className="absolute bottom-0.5 right-1 font-mono text-[8px] opacity-40">
                    {tool.shortcut}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Layers Panel ───────────────────────────────────────────────────────────

interface LayersPanelProps {
  layers: TerrainLayer[];
  selectedLayer: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (layer: TerrainLayer) => void;
}

export function LayersPanel({
  layers,
  selectedLayer,
  onSelect,
  onAdd,
  onRemove,
  onUpdate,
}: LayersPanelProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-[var(--aethel-primary)]" />
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-primary)]">
            Biome Layers
          </h3>
        </div>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add new terrain layer"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2 py-1 text-[10px] font-semibold text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
        >
          <Plus className="h-3 w-3" /> Add Layer
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {layers.map((layer) => {
          const isSelected = selectedLayer === layer.id;
          return (
            <div
              key={layer.id}
              onClick={() => onSelect(layer.id)}
              className={`flex items-center justify-between rounded-xl border p-2.5 cursor-pointer transition ${
                isSelected
                  ? 'border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)]'
                  : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_40%,transparent)] hover:border-[var(--aethel-border-secondary)]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-6 w-6 shrink-0 rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-quaternary)] flex items-center justify-center font-mono text-[9px] font-bold uppercase text-[var(--aethel-text-tertiary)]">
                  {layer.name.slice(0, 2)}
                </div>
                <span className="truncate text-xs font-semibold text-[var(--aethel-text-primary)]">
                  {layer.name}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(layer.id);
                  }}
                  aria-label={`Remove ${layer.name}`}
                  className="p-1 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-error)] transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Erosion Panel ──────────────────────────────────────────────────────────

interface ErosionPanelProps {
  settings: ErosionSettings;
  onChange: (settings: ErosionSettings) => void;
  onApply: () => void;
}

export function ErosionPanel({ settings, onChange, onApply }: ErosionPanelProps) {
  const update = <K extends keyof ErosionSettings>(key: K, value: ErosionSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const EROSION_TYPES: Array<{
    type: 'hydraulic' | 'thermal' | 'wind'
    label: string
    Icon: React.ComponentType<{ className?: string }>
  }> = [
    { type: 'hydraulic', label: 'Hydraulic', Icon: Droplets },
    { type: 'thermal', label: 'Thermal', Icon: Flame },
    { type: 'wind', label: 'Wind', Icon: Wind },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-4">
      <div className="flex items-center gap-1.5">
        <Droplets className="h-4 w-4 text-[var(--aethel-neon-cyan)]" />
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-primary)]">
          Natural Erosion
        </h3>
      </div>

      {/* Mode pills */}
      <div className="grid grid-cols-3 gap-1">
        {EROSION_TYPES.map(({ type, label, Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => update('type', type)}
            aria-pressed={settings.type === type}
            className={`flex items-center justify-center gap-1 rounded-lg border py-1.5 text-[10px] font-semibold transition ${
              settings.type === type
                ? 'border-[color-mix(in_srgb,var(--aethel-neon-cyan)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_15%,transparent)] text-[var(--aethel-neon-cyan)]'
                : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)]'
            }`}
          >
            <Icon className="h-3 w-3" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Iterations slider */}
      <div>
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)] mb-1">
          <span>Iterations</span>
          <span className="font-mono text-[var(--aethel-text-secondary)]">{settings.iterations}</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={settings.iterations}
          onChange={(e) => update('iterations', parseInt(e.target.value, 10))}
          className="w-full cursor-pointer"
        />
      </div>

      {/* Strength slider */}
      <div>
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)] mb-1">
          <span>Sediment Strength</span>
          <span className="font-mono text-[var(--aethel-text-secondary)]">{(settings.strength * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={settings.strength}
          onChange={(e) => update('strength', parseFloat(e.target.value))}
          className="w-full cursor-pointer"
        />
      </div>

      {/* Apply Button */}
      <button
        type="button"
        onClick={onApply}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--aethel-primary)] py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--aethel-primary-light)] active:scale-[0.98]"
      >
        <Activity className="h-3.5 w-3.5" /> Simulate Erosion
      </button>
    </div>
  );
}
