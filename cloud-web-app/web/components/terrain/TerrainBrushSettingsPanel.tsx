'use client';

import {
  ArrowDown,
  ArrowUp,
  Circle,
  Droplets,
  FlipHorizontal,
  Layers,
  Minus,
  Square,
  TrendingDown,
  TrendingUp,
  Wind,
} from 'lucide-react';
import type { BrushFalloff, BrushSettings, BrushShape } from './terrain-sculpting-models';

// ── Reusable slider row ────────────────────────────────────────────────────

function SliderRow({
  label,
  value,
  displayValue,
  min,
  max,
  step,
  onChange,
  accentClass = 'bg-[var(--aethel-primary)]',
}: {
  label: string
  value: number
  displayValue: string
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  accentClass?: string
}) {
  const pct = Math.round(((value - min) / (max - min)) * 100)
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
          {label}
        </label>
        <span className="font-mono text-[10px] font-semibold text-[var(--aethel-text-secondary)]">
          {displayValue}
        </span>
      </div>
      {/* Track + fill */}
      <div className="relative h-1.5 w-full rounded-full bg-[var(--aethel-surface-tertiary)]">
        <div
          className={`absolute left-0 top-0 h-full rounded-full ${accentClass} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-0 h-1.5 w-full cursor-pointer appearance-none bg-transparent"
        aria-label={label}
        style={{ marginTop: '-6px', position: 'relative', zIndex: 1 }}
      />
    </div>
  )
}

// ── Pill button row ────────────────────────────────────────────────────────

function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string; Icon: React.ComponentType<{ className?: string }> }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-label={`${label}: ${opt.label}`}
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={[
              'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-all duration-150 active:scale-95',
              value === opt.value
                ? 'border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-primary-light)]'
                : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]',
            ].join(' ')}
          >
            <opt.Icon className="h-3 w-3" />
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────

interface BrushSettingsPanelProps {
  settings: BrushSettings
  onChange: (settings: BrushSettings) => void
}

export function BrushSettingsPanel({ settings, onChange }: BrushSettingsPanelProps) {
  const update = <K extends keyof BrushSettings>(key: K, value: BrushSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  const FALLOFF_OPTIONS: { value: BrushFalloff; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'linear', label: 'Linear', Icon: TrendingDown },
    { value: 'smooth', label: 'Smooth', Icon: Wind },
    { value: 'spherical', label: 'Sphere', Icon: Circle },
    { value: 'tip', label: 'Tip', Icon: TrendingUp },
    { value: 'constant', label: 'Flat', Icon: Minus },
  ]

  const SHAPE_OPTIONS: { value: BrushShape; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'circle', label: 'Circle', Icon: Circle },
    { value: 'square', label: 'Square', Icon: Square },
  ]

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
          Brush Settings
        </p>
        <span className="rounded border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--aethel-text-quaternary)]">
          UE5 Landscape
        </span>
      </div>

      {/* Size — in meters */}
      <SliderRow
        label="Radius (m)"
        value={settings.size}
        displayValue={`${settings.size.toFixed(1)}m`}
        min={0.5}
        max={50}
        step={0.5}
        onChange={(v) => update('size', v)}
        accentClass="bg-[var(--aethel-neon-cyan)]"
      />

      {/* Strength */}
      <SliderRow
        label="Strength"
        value={settings.strength}
        displayValue={`${(settings.strength * 100).toFixed(0)}%`}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => update('strength', v)}
        accentClass="bg-[var(--aethel-primary)]"
      />

      {/* Rotation */}
      <SliderRow
        label="Rotation"
        value={settings.rotation}
        displayValue={`${settings.rotation}°`}
        min={0}
        max={360}
        step={1}
        onChange={(v) => update('rotation', v)}
      />

      {/* Jitter */}
      <SliderRow
        label="Jitter"
        value={settings.jitter}
        displayValue={`${(settings.jitter * 100).toFixed(0)}%`}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => update('jitter', v)}
      />

      {/* Falloff curve */}
      <PillGroup
        label="Falloff Curve"
        options={FALLOFF_OPTIONS}
        value={settings.falloff}
        onChange={(v) => update('falloff', v)}
      />

      {/* Shape */}
      <PillGroup
        label="Shape"
        options={SHAPE_OPTIONS}
        value={settings.shape}
        onChange={(v) => update('shape', v)}
      />
    </div>
  )
}
