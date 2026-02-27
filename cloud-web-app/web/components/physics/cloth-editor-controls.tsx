/**
 * Shared presets and reusable controls for cloth editor.
 */

import React from 'react';
import type { ClothConfig } from '@/lib/cloth-simulation';

export interface ClothPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<ClothConfig>;
}

export interface ClothEditorState {
  selectedVertices: Set<number>;
  pinnedVertices: Set<number>;
  isSimulating: boolean;
  showConstraints: boolean;
  showWireframe: boolean;
  showColliders: boolean;
  currentPreset: string | null;
}

// ============================================================================
// PRESETS PROFISSIONAIS
// ============================================================================

export const CLOTH_PRESETS: ClothPreset[] = [
  {
    id: 'silk',
    name: 'Seda',
    description: 'Tecido leve e fluido',
    config: {
      mass: 0.3,
      stiffness: 0.6,
      damping: 0.02,
      iterations: 15,
      tearThreshold: 0.8,
    },
  },
  {
    id: 'cotton',
    name: 'Algodão',
    description: 'Tecido médio, comportamento natural',
    config: {
      mass: 0.5,
      stiffness: 0.8,
      damping: 0.05,
      iterations: 12,
      tearThreshold: 1.2,
    },
  },
  {
    id: 'denim',
    name: 'Jeans',
    description: 'Tecido pesado e rígido',
    config: {
      mass: 0.8,
      stiffness: 0.95,
      damping: 0.1,
      iterations: 10,
      tearThreshold: 2.0,
    },
  },
  {
    id: 'leather',
    name: 'Couro',
    description: 'Material rígido com pouca flexibilidade',
    config: {
      mass: 1.0,
      stiffness: 0.98,
      damping: 0.15,
      iterations: 8,
      tearThreshold: 3.0,
    },
  },
  {
    id: 'rubber',
    name: 'Borracha',
    description: 'Material elástico',
    config: {
      mass: 0.6,
      stiffness: 0.4,
      damping: 0.08,
      iterations: 20,
      tearThreshold: 5.0,
    },
  },
  {
    id: 'flag',
    name: 'Bandeira',
    description: 'Otimizado para bandeiras ao vento',
    config: {
      mass: 0.2,
      stiffness: 0.7,
      damping: 0.03,
      iterations: 12,
      tearThreshold: 1.5,
      windVariation: 0.3,
    },
  },
  {
    id: 'cape',
    name: 'Capa',
    description: 'Para capas de personagens',
    config: {
      mass: 0.4,
      stiffness: 0.75,
      damping: 0.04,
      iterations: 14,
      tearThreshold: 1.8,
    },
  },
  {
    id: 'curtain',
    name: 'Cortina',
    description: 'Tecido pesado para cortinas',
    config: {
      mass: 0.7,
      stiffness: 0.85,
      damping: 0.12,
      iterations: 10,
      tearThreshold: 2.5,
    },
  },
];

// ============================================================================
// SLIDER COMPONENT
// ============================================================================

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  tooltip?: string;
}

export function Slider({ label, value, min, max, step = 0.01, unit = '', onChange, tooltip }: SliderProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-slate-400" title={tooltip}>{label}</label>
        <span className="text-xs text-slate-300 font-mono">
          {value.toFixed(step < 1 ? 2 : 0)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-3
                   [&::-webkit-slider-thumb]:h-3
                   [&::-webkit-slider-thumb]:bg-sky-500
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:hover:bg-sky-400
                   [&::-webkit-slider-thumb]:transition-colors"
      />
    </div>
  );
}

// ============================================================================
// VECTOR3 INPUT COMPONENT
// ============================================================================

interface Vector3InputProps {
  label: string;
  value: { x: number; y: number; z: number };
  onChange: (value: { x: number; y: number; z: number }) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function Vector3Input({ label, value, onChange, min = -100, max = 100, step = 0.1 }: Vector3InputProps) {
  return (
    <div className="mb-3">
      <label className="text-xs text-slate-400 block mb-1.5">{label}</label>
      <div className="grid grid-cols-3 gap-1.5">
        {(['x', 'y', 'z'] as const).map((axis) => (
          <div key={axis} className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 uppercase">
              {axis}
            </span>
            <input
              type="number"
              value={value[axis]}
              min={min}
              max={max}
              step={step}
              onChange={(e) => onChange({ ...value, [axis]: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 pl-6
                       text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
