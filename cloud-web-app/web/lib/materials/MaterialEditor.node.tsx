'use client';

// Custom ReactFlow node renderer + property editors for the Material Editor.
// Extracted from MaterialEditor.runtime.tsx to keep that file under the
// ≤500 LoC component guideline (mirrors the SoundCueEditor.node.tsx split).

import React, { useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { MaterialNodeData, MaterialProperty } from '@/components/materials/material-editor-models';

interface NodeProps {
  id: string;
  data: MaterialNodeData;
  selected: boolean;
}

export function MaterialNode({ id, data, selected }: NodeProps) {
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'output': return 'var(--aethel-error)';
      case 'constant': return 'var(--aethel-success)';
      case 'texture': return 'var(--aethel-accent)';
      case 'math': return 'var(--aethel-info)';
      case 'color': return 'var(--aethel-warning)';
      case 'utility': return 'var(--aethel-success-light)';
      case 'procedural': return 'var(--aethel-surface-quaternary)';
      default: return 'var(--aethel-text-muted)';
    }
  };

  const getPortColor = (portType: string): string => {
    switch (portType) {
      case 'color': return 'yellow';
      case 'float': return 'cyan';
      case 'vector2': return 'lime';
      case 'vector3': return 'magenta';
      case 'texture': return 'red';
      default: return 'white';
    }
  };

  return (
    <div
      className={`rounded-lg shadow-lg min-w-[180px] ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        backgroundColor: 'var(--aethel-surface-primary)',
        border: `2px solid ${getTypeColor(data.type)}`,
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-md text-[var(--aethel-text-primary)] text-sm font-medium"
        style={{ backgroundColor: getTypeColor(data.type) }}
      >
        {data.label}
      </div>

      {/* Body */}
      <div className="p-2">
        {/* Inputs */}
        <div className="space-y-1">
          {data.inputs.map((input, i) => (
            <div key={i} className="flex items-center">
              <Handle
                type="target"
                position={Position.Left}
                id={`input-${input.name}`}
                style={{
                  background: getPortColor(input.type),
                  width: 10,
                  height: 10,
                }}
              />
              <span className="text-xs text-[var(--aethel-text-secondary)] ml-2">{input.name}</span>
            </div>
          ))}
        </div>

        {/* Properties */}
        {data.properties.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-[var(--aethel-border-primary)] pt-2">
            {data.properties.map((prop, i) => (
              <PropertyInput
                key={i}
                property={prop}
                onChange={(value) => data.onPropertyChange?.(prop.name, value)}
              />
            ))}
          </div>
        )}

        {/* Outputs */}
        <div className="space-y-1 mt-2">
          {data.outputs.map((output, i) => (
            <div key={i} className="flex items-center justify-end">
              <span className="text-xs text-[var(--aethel-text-secondary)] mr-2">{output.name}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={`output-${output.name}`}
                style={{
                  background: getPortColor(output.type),
                  width: 10,
                  height: 10,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PropertyInput({ property, onChange }: { property: MaterialProperty; onChange?: (value: unknown) => void }) {
  const textureInputRef = useRef<HTMLInputElement>(null);

  switch (property.type) {
    case 'color':
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--aethel-text-secondary)]">{property.name}</span>
          <input
            type="color"
            value={property.value as string}
            onChange={(e) => onChange?.(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer"
          />
        </div>
      );

    case 'float':
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--aethel-text-secondary)] w-12">{property.name}</span>
          <input
            type="range"
            min={property.min ?? 0}
            max={property.max ?? 1}
            step={0.01}
            value={property.value as number}
            onChange={(e) => onChange?.(parseFloat(e.target.value))}
            className="flex-1 h-1"
          />
          <span className="text-xs text-[var(--aethel-text-secondary)] w-8">
            {(property.value as number).toFixed(2)}
          </span>
        </div>
      );

    case 'texture': {
      const uri = typeof property.value === 'string' ? property.value : '';
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--aethel-text-secondary)]">{property.name}</span>
          {uri ? (
            // eslint-disable-next-line @next/next/no-img-element -- data: URL thumbnail, next/image cannot optimize it
            <img src={uri} alt={`${property.name} preview`} className="h-6 w-6 rounded object-cover border border-[var(--aethel-border-subtle)]" />
          ) : null}
          <button
            type="button"
            aria-label={`Select resource for ${property.name}`}
            onClick={() => textureInputRef.current?.click()}
            className="px-2 py-1 text-xs bg-[var(--aethel-surface-secondary)] rounded hover:bg-[var(--aethel-surface-secondary)]"
          >
            {uri ? 'Replace…' : 'Select...'}
          </button>
          {uri ? (
            <button
              type="button"
              aria-label={`Clear resource for ${property.name}`}
              onClick={() => onChange?.('')}
              className="px-2 py-1 text-xs bg-[var(--aethel-surface-secondary)] rounded hover:bg-[var(--aethel-surface-secondary)] text-[var(--aethel-error-light)]"
            >
              Clear
            </button>
          ) : null}
          <input
            ref={textureInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => onChange?.(reader.result as string);
              reader.readAsDataURL(file);
            }}
          />
        </div>
      );
    }

    default:
      return null;
  }
}
