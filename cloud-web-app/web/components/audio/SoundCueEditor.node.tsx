'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { SoundNodeDefinition } from './sound-cue-models';

export interface SoundNodeData extends Record<string, unknown> {
  definition: SoundNodeDefinition;
  parameters: Record<string, unknown>;
  onParameterChange: (nodeId: string, paramId: string, value: unknown) => void;
}

export function SoundNode({ id, data, selected }: NodeProps<Node<SoundNodeData>>) {
  const { definition, parameters, onParameterChange } = data;

  const getPinColor = (type: string) => {
    switch (type) {
      case 'audio': return 'var(--aethel-success)';
      case 'control': return 'var(--aethel-accent)';
      case 'trigger': return 'var(--aethel-warning)';
      default: return 'var(--aethel-text-muted)';
    }
  };

  return (
    <div
      style={{
        background: selected ? 'color-mix(in srgb, var(--aethel-primary) 24%, var(--aethel-surface-secondary))' : 'var(--aethel-surface-secondary)',
        border: `2px solid ${definition.color}`,
        borderRadius: '8px',
        minWidth: '180px',
        color: 'white',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: definition.color,
          padding: '8px 12px',
          borderRadius: '6px 6px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '12px', opacity: 0.8 }}>{definition.category}</span>
        <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{definition.name}</span>
      </div>

      {/* Body */}
      <div style={{ padding: '12px' }}>
        {/* Pins */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          {/* Input pins */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {definition.inputs.map((pin) => (
              <div key={pin.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                <Handle
                  type="target"
                  position={Position.Left}
                  id={pin.id}
                  style={{
                    background: getPinColor(pin.type),
                    width: 10,
                    height: 10,
                    left: -17,
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--aethel-text-tertiary)' }}>{pin.name}</span>
              </div>
            ))}
          </div>

          {/* Output pins */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
            {definition.outputs.map((pin) => (
              <div key={pin.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                <span style={{ fontSize: '11px', color: 'var(--aethel-text-tertiary)' }}>{pin.name}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={pin.id}
                  style={{
                    background: getPinColor(pin.type),
                    width: 10,
                    height: 10,
                    right: -17,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Parameters */}
        {definition.parameters.length > 0 && (
          <div style={{ borderTop: '1px solid var(--aethel-border-primary)', paddingTop: '8px', marginTop: '8px' }}>
            {definition.parameters.slice(0, 3).map((param) => (
              <div key={param.id} style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--aethel-text-muted)' }}>{param.name}</label>
                  {param.type === 'float' && (
                    <span style={{ fontSize: '10px', color: 'var(--aethel-text-tertiary)' }}>
                      {((parameters[param.id] as number) ?? param.value as number).toFixed(2)}
                    </span>
                  )}
                </div>

                {param.type === 'float' && (
                  <input
                    type="range"
                    min={param.min ?? 0}
                    max={param.max ?? 1}
                    step={(param.max! - param.min!) / 100}
                    value={(parameters[param.id] as number) ?? param.value as number}
                    onChange={(e) => onParameterChange(id, param.id, parseFloat(e.target.value))}
                    style={{ width: '100%', height: '4px' }}
                  />
                )}

                {param.type === 'bool' && (
                  <input
                    type="checkbox"
                    checked={(parameters[param.id] as boolean) ?? param.value as boolean}
                    onChange={(e) => onParameterChange(id, param.id, e.target.checked)}
                  />
                )}

                {param.type === 'enum' && (
                  <select
                    value={(parameters[param.id] as string) ?? param.value as string}
                    onChange={(e) => onParameterChange(id, param.id, e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--aethel-surface-primary)',
                      border: '1px solid var(--aethel-border-primary)',
                      borderRadius: '2px',
                      padding: '2px',
                      color: 'white',
                      fontSize: '10px',
                    }}
                  >
                    {param.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}

            {definition.parameters.length > 3 && (
              <div style={{ fontSize: '10px', color: 'var(--aethel-text-muted)', textAlign: 'center' }}>
                +{definition.parameters.length - 3} more params
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
