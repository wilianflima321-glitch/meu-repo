'use client';

import { useState } from 'react';
import type { AnimationVariable } from './AnimationBlueprint';

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
