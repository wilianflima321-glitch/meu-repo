'use client';

import React, { useState } from 'react';
import { Handle, NodeTypes, Position } from '@xyflow/react';
import type { AnimationState, AnimationStateType, AnimationVariable, TransitionCondition, TransitionRule } from './AnimationBlueprint';

function StateNode({ data, selected }: { data: { label: string; type: AnimationStateType; animation?: string; isEntry?: boolean }; selected: boolean }) {
  const getNodeColor = () => {
    switch (data.type) {
      case 'entry': return 'var(--aethel-success)';
      case 'conduit': return 'var(--aethel-warning)';
      case 'blend': return 'var(--aethel-accent)';
      case 'blendspace1d':
      case 'blendspace2d': return 'var(--aethel-info)';
      case 'montage': return 'var(--aethel-error)';
      case 'slot': return 'var(--aethel-text-quaternary)';
      default: return 'var(--aethel-primary)';
    }
  };

  const getNodeIcon = () => {
    switch (data.type) {
      case 'entry': return 'START';
      case 'conduit': return 'FX';
      case 'blend': return 'BLEND';
      case 'blendspace1d': return '1D';
      case 'blendspace2d': return '2D';
      case 'montage': return 'ANIM';
      case 'slot': return 'SLOT';
      default: return 'STATE';
    }
  };

  return (
    <div style={{
      padding: '12px 16px',
      background: 'var(--aethel-surface-tertiary)',
      border: `2px solid ${selected ? 'var(--aethel-text-primary)' : getNodeColor()}`,
      borderRadius: data.type === 'entry' ? '50%' : '8px',
      minWidth: data.type === 'entry' ? '60px' : '140px',
      textAlign: 'center',
      boxShadow: selected ? `0 0 12px ${getNodeColor()}` : '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      {/* Input handle */}
      {data.type !== 'entry' && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: getNodeColor(),
            width: '12px',
            height: '12px',
            border: '2px solid var(--aethel-text-primary)',
          }}
        />
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: data.animation ? '8px' : 0,
      }}>
        <span>{getNodeIcon()}</span>
        <span style={{
          fontWeight: 'bold',
          color: 'var(--aethel-text-primary)',
          fontSize: '13px',
        }}>
          {data.label}
        </span>
      </div>

      {/* Animation name */}
      {data.animation && (
        <div style={{
          fontSize: '11px',
          color: 'var(--aethel-text-quaternary)',
          padding: '4px 8px',
          background: 'var(--aethel-surface-primary)',
          borderRadius: '4px',
        }}>
          ANIM {data.animation}
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: getNodeColor(),
          width: '12px',
          height: '12px',
          border: '2px solid var(--aethel-text-primary)',
        }}
      />
    </div>
  );
}

export function TransitionLabel({ data }: { data: { conditions?: TransitionCondition[]; blendTime: number } }) {
  if (!data.conditions?.length) {
    return (
      <div style={{
        padding: '4px 8px',
        background: 'var(--aethel-surface-tertiary)',
        borderRadius: '4px',
        fontSize: '10px',
        color: 'var(--aethel-text-quaternary)',
        border: '1px solid var(--aethel-border-primary)',
      }}>
        Auto ({data.blendTime}s)
      </div>
    );
  }

  return (
    <div style={{
      padding: '6px 10px',
      background: 'var(--aethel-surface-tertiary)',
      borderRadius: '4px',
      fontSize: '10px',
      color: 'var(--aethel-text-secondary)',
      border: '1px solid var(--aethel-border-primary)',
      maxWidth: '120px',
    }}>
      {data.conditions.map((cond, i) => (
        <div key={i}>
          {cond.variable} {cond.operator} {String(cond.value)}
        </div>
      ))}
      <div style={{ color: 'var(--aethel-text-muted)', marginTop: '2px' }}>
        Blend: {data.blendTime}s
      </div>
    </div>
  );
}

export const nodeTypes: NodeTypes = {
  animState: StateNode,
};


export function VariablesPanel({
  variables,
  values,
  onValueChange,
  onAddVariable,
  onRemoveVariable,
}: {
  variables: AnimationVariable[];
  values: Record<string, number | boolean>;
  onValueChange: (name: string, value: number | boolean) => void;
  onAddVariable: (variable: AnimationVariable) => void;
  onRemoveVariable: (name: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newVar, setNewVar] = useState({ name: '', type: 'float' as AnimationVariable['type'], defaultValue: 0 });

  return (
    <div style={{
      padding: '12px',
      borderBottom: '1px solid var(--aethel-border-primary)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--aethel-text-primary)' }}>
          Variables
        </span>
        <button type="button" aria-label={showAdd ? 'Close new variable form' : 'Open new variable form'}
          onClick={() => setShowAdd(!showAdd)}
          style={{
            padding: '4px 8px',
            background: 'var(--aethel-primary)',
            border: 'none',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          + Add
        </button>
      </div>

      {/* Add Variable Form */}
      {showAdd && (
        <div style={{
          padding: '8px',
          background: 'var(--aethel-surface-primary)',
          borderRadius: '4px',
          marginBottom: '8px',
        }}>
          <input
            type="text"
            placeholder="Variable name"
            value={newVar.name}
            onChange={(e) => setNewVar({ ...newVar, name: e.target.value })}
            style={{
              width: '100%',
              padding: '4px 8px',
              marginBottom: '4px',
              background: 'var(--aethel-surface-tertiary)',
              border: '1px solid var(--aethel-border-primary)',
              borderRadius: '3px',
              color: 'var(--aethel-text-primary)',
              fontSize: '11px',
            }}
          />
          <div style={{ display: 'flex', gap: '4px' }}>
            <select
              value={newVar.type}
              onChange={(e) => setNewVar({ ...newVar, type: e.target.value as AnimationVariable['type'] })}
              style={{
                flex: 1,
                padding: '4px',
                background: 'var(--aethel-surface-tertiary)',
                border: '1px solid var(--aethel-border-primary)',
                borderRadius: '3px',
                color: 'var(--aethel-text-primary)',
                fontSize: '11px',
              }}
            >
              <option value="float">Float</option>
              <option value="int">Int</option>
              <option value="bool">Bool</option>
            </select>
            <button type="button" aria-label="Add nova variavel ao animation blueprint"
              onClick={() => {
                if (newVar.name) {
                  onAddVariable({
                    ...newVar,
                    defaultValue: newVar.type === 'bool' ? false : 0,
                  });
                  setNewVar({ name: '', type: 'float', defaultValue: 0 });
                  setShowAdd(false);
                }
              }}
              style={{
                padding: '4px 12px',
                background: 'var(--aethel-success)',
                border: 'none',
                borderRadius: '3px',
                color: 'var(--aethel-text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Variable List */}
      {variables.map((variable) => (
        <div
          key={variable.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px',
            background: 'var(--aethel-surface-primary)',
            borderRadius: '4px',
            marginBottom: '4px',
          }}
        >
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: variable.type === 'bool' ? 'var(--aethel-error)' : variable.type === 'int' ? 'var(--aethel-primary)' : 'var(--aethel-success)',
          }} />
          <span style={{ flex: 1, fontSize: '11px', color: 'var(--aethel-text-secondary)' }}>
            {variable.name}
          </span>

          {variable.type === 'bool' ? (
            <label style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={values[variable.name] as boolean ?? false}
                onChange={(e) => onValueChange(variable.name, e.target.checked)}
              />
            </label>
          ) : (
            <input
              type="number"
              value={values[variable.name] as number ?? 0}
              onChange={(e) => onValueChange(variable.name, parseFloat(e.target.value))}
              step={variable.type === 'int' ? 1 : 0.1}
              min={variable.min}
              max={variable.max}
              style={{
                width: '60px',
                padding: '2px 4px',
                background: 'var(--aethel-surface-tertiary)',
                border: '1px solid var(--aethel-border-primary)',
                borderRadius: '2px',
                color: 'var(--aethel-text-primary)',
                fontSize: '11px',
                textAlign: 'right',
              }}
            />
          )}

          <button type="button" aria-label={`Remove variavel ${variable.name}`}
            onClick={() => onRemoveVariable(variable.name)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--aethel-text-muted)',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            X
          </button>
        </div>
      ))}
    </div>
  );
}

export function StateInspector({
  state,
  onUpdate,
  animations,
}: {
  state: AnimationState | null;
  onUpdate: (updates: Partial<AnimationState>) => void;
  animations: string[];
}) {
  if (!state) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: 'var(--aethel-text-muted)',
      }}>
        Select a state to inspect
      </div>
    );
  }

  return (
    <div style={{ padding: '12px' }}>
      <div style={{
        fontWeight: 'bold',
        fontSize: '13px',
        color: 'var(--aethel-text-primary)',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        🎭 {state.name}
      </div>

      {/* Name */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--aethel-text-quaternary)', marginBottom: '4px' }}>
          Name
        </label>
        <input
          type="text"
          value={state.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: 'var(--aethel-surface-primary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            fontSize: '12px',
          }}
        />
      </div>

      {/* Animation */}
      {state.type === 'state' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--aethel-text-quaternary)', marginBottom: '4px' }}>
            Animation
          </label>
          <select
            value={state.animation || ''}
            onChange={(e) => onUpdate({ animation: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: 'var(--aethel-surface-primary)',
              border: '1px solid var(--aethel-border-primary)',
              borderRadius: '4px',
              color: 'var(--aethel-text-primary)',
              fontSize: '12px',
            }}
          >
            <option value="">Select animation...</option>
            {animations.map((anim) => (
              <option key={anim} value={anim}>{anim}</option>
            ))}
          </select>
        </div>
      )}

      {/* Looping */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: 'var(--aethel-text-secondary)',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={state.looping}
            onChange={(e) => onUpdate({ looping: e.target.checked })}
          />
          Looping
        </label>
      </div>

      {/* Play Rate */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--aethel-text-quaternary)', marginBottom: '4px' }}>
          Play Rate: {state.playRate.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="3"
          step="0.1"
          value={state.playRate}
          onChange={(e) => onUpdate({ playRate: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      {/* Blend Times */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--aethel-text-quaternary)', marginBottom: '4px' }}>
            Blend In
          </label>
          <input
            type="number"
            value={state.blendIn}
            onChange={(e) => onUpdate({ blendIn: parseFloat(e.target.value) })}
            step="0.05"
            min="0"
            style={{
              width: '100%',
              padding: '4px 8px',
              background: 'var(--aethel-surface-primary)',
              border: '1px solid var(--aethel-border-primary)',
              borderRadius: '4px',
              color: 'var(--aethel-text-primary)',
              fontSize: '12px',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--aethel-text-quaternary)', marginBottom: '4px' }}>
            Blend Out
          </label>
          <input
            type="number"
            value={state.blendOut}
            onChange={(e) => onUpdate({ blendOut: parseFloat(e.target.value) })}
            step="0.05"
            min="0"
            style={{
              width: '100%',
              padding: '4px 8px',
              background: 'var(--aethel-surface-primary)',
              border: '1px solid var(--aethel-border-primary)',
              borderRadius: '4px',
              color: 'var(--aethel-text-primary)',
              fontSize: '12px',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function TransitionInspector({
  transition,
  variables,
  onUpdate,
}: {
  transition: TransitionRule | null;
  variables: AnimationVariable[];
  onUpdate: (updates: Partial<TransitionRule>) => void;
}) {
  if (!transition) return null;

  return (
    <div style={{ padding: '12px' }}>
      <div style={{
        fontWeight: 'bold',
        fontSize: '13px',
        color: 'var(--aethel-text-primary)',
        marginBottom: '16px',
      }}>
        Transition
      </div>

      {/* Blend Time */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--aethel-text-quaternary)', marginBottom: '4px' }}>
          Blend Time: {transition.blendTime.toFixed(2)}s
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.05"
          value={transition.blendTime}
          onChange={(e) => onUpdate({ blendTime: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      {/* Blend Mode */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--aethel-text-quaternary)', marginBottom: '4px' }}>
          Blend Mode
        </label>
        <select
          value={transition.blendMode}
          onChange={(e) => onUpdate({ blendMode: e.target.value as TransitionRule['blendMode'] })}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: 'var(--aethel-surface-primary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            fontSize: '12px',
          }}
        >
          <option value="linear">Linear</option>
          <option value="cubic">Cubic</option>
          <option value="custom">Custom Curve</option>
        </select>
      </div>

      {/* Automatic */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: 'var(--aethel-text-secondary)',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={transition.automatic}
            onChange={(e) => onUpdate({ automatic: e.target.checked })}
          />
          Automatic (when animation ends)
        </label>
      </div>

      {/* Conditions */}
      <div style={{ marginTop: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--aethel-text-quaternary)' }}>Conditions</span>
          <button type="button" aria-label="Add condicao de transicao"
            onClick={() => {
              const newCondition: TransitionCondition = {
                variable: variables[0]?.name || '',
                operator: '==',
                value: 0,
              };
              onUpdate({ conditions: [...transition.conditions, newCondition] });
            }}
            style={{
              padding: '2px 8px',
              background: 'var(--aethel-surface-quaternary)',
              border: 'none',
              borderRadius: '3px',
              color: 'var(--aethel-text-primary)',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            + Add
          </button>
        </div>

        {transition.conditions.map((cond, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
              marginBottom: '4px',
              padding: '6px',
              background: 'var(--aethel-surface-primary)',
              borderRadius: '4px',
            }}
          >
            <select
              value={cond.variable}
              onChange={(e) => {
                const newConditions = [...transition.conditions];
                newConditions[i] = { ...cond, variable: e.target.value };
                onUpdate({ conditions: newConditions });
              }}
              style={{
                flex: 1,
                padding: '2px 4px',
                background: 'var(--aethel-surface-tertiary)',
                border: '1px solid var(--aethel-border-primary)',
                borderRadius: '2px',
                color: 'var(--aethel-text-primary)',
                fontSize: '10px',
              }}
            >
              {variables.map((v) => (
                <option key={v.name} value={v.name}>{v.name}</option>
              ))}
            </select>

            <select
              value={cond.operator}
              onChange={(e) => {
                const newConditions = [...transition.conditions];
                newConditions[i] = { ...cond, operator: e.target.value as TransitionCondition['operator'] };
                onUpdate({ conditions: newConditions });
              }}
              style={{
                width: '40px',
                padding: '2px',
                background: 'var(--aethel-surface-tertiary)',
                border: '1px solid var(--aethel-border-primary)',
                borderRadius: '2px',
                color: 'var(--aethel-text-primary)',
                fontSize: '10px',
              }}
            >
              <option value="==">==</option>
              <option value="!=">!=</option>
              <option value="<">&lt;</option>
              <option value=">">&gt;</option>
              <option value="<=">&lt;=</option>
              <option value=">=">&gt;=</option>
            </select>

            <input
              type={typeof cond.value === 'boolean' ? 'checkbox' : 'number'}
              checked={typeof cond.value === 'boolean' ? cond.value : undefined}
              value={typeof cond.value !== 'boolean' ? cond.value : undefined}
              onChange={(e) => {
                const newConditions = [...transition.conditions];
                const varDef = variables.find(v => v.name === cond.variable);
                const value = varDef?.type === 'bool'
                  ? e.target.checked
                  : parseFloat(e.target.value);
                newConditions[i] = { ...cond, value };
                onUpdate({ conditions: newConditions });
              }}
              style={{
                width: '50px',
                padding: '2px 4px',
                background: 'var(--aethel-surface-tertiary)',
                border: '1px solid var(--aethel-border-primary)',
                borderRadius: '2px',
                color: 'var(--aethel-text-primary)',
                fontSize: '10px',
              }}
            />

            <button type="button" aria-label={`Remove condicao ${i + 1} da transicao`}
              onClick={() => {
                const newConditions = transition.conditions.filter((_, j) => j !== i);
                onUpdate({ conditions: newConditions });
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--aethel-error)',
                cursor: 'pointer',
                padding: '2px',
                fontSize: '10px',
              }}
            >
              X
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
