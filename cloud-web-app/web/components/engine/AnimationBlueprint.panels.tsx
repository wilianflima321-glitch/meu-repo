'use client'

import React, { useState } from 'react'

import type {
  AnimationState,
  AnimationVariable,
  TransitionCondition,
  TransitionRule,
} from './animation-blueprint-types'

interface VariablesPanelProps {
  variables: AnimationVariable[]
  values: Record<string, number | boolean>
  onValueChange: (name: string, value: number | boolean) => void
  onAddVariable: (variable: AnimationVariable) => void
  onRemoveVariable: (name: string) => void
}

export function VariablesPanel({
  variables,
  values,
  onValueChange,
  onAddVariable,
  onRemoveVariable,
}: VariablesPanelProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [newVar, setNewVar] = useState<{ name: string; type: AnimationVariable['type']; defaultValue: number | boolean }>({
    name: '',
    type: 'float',
    defaultValue: 0,
  })

  return (
    <div style={{ padding: '12px', borderBottom: '1px solid #333' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#fff' }}>Variables</span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            padding: '4px 8px',
            background: '#3f51b5',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          + Add
        </button>
      </div>

      {showAdd && (
        <div
          style={{
            padding: '8px',
            background: '#0f0f23',
            borderRadius: '4px',
            marginBottom: '8px',
          }}
        >
          <input
            type="text"
            placeholder="Variable name"
            value={newVar.name}
            onChange={(e) => setNewVar({ ...newVar, name: e.target.value })}
            style={{
              width: '100%',
              padding: '4px 8px',
              marginBottom: '4px',
              background: '#1a1a2e',
              border: '1px solid #333',
              borderRadius: '3px',
              color: '#fff',
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
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '11px',
              }}
            >
              <option value="float">Float</option>
              <option value="int">Int</option>
              <option value="bool">Bool</option>
            </select>
            <button
              onClick={() => {
                if (!newVar.name) return
                onAddVariable({
                  ...newVar,
                  defaultValue: newVar.type === 'bool' ? false : 0,
                })
                setNewVar({ name: '', type: 'float', defaultValue: 0 })
                setShowAdd(false)
              }}
              style={{
                padding: '4px 12px',
                background: '#4caf50',
                border: 'none',
                borderRadius: '3px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {variables.map((variable) => (
        <div
          key={variable.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px',
            background: '#0f0f23',
            borderRadius: '4px',
            marginBottom: '4px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: variable.type === 'bool' ? '#e74c3c' : variable.type === 'int' ? '#3498db' : '#2ecc71',
            }}
          />
          <span style={{ flex: 1, fontSize: '11px', color: '#ccc' }}>{variable.name}</span>

          {variable.type === 'bool' ? (
            <label style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={(values[variable.name] as boolean) ?? false}
                onChange={(e) => onValueChange(variable.name, e.target.checked)}
              />
            </label>
          ) : (
            <input
              type="number"
              value={(values[variable.name] as number) ?? 0}
              onChange={(e) => onValueChange(variable.name, parseFloat(e.target.value))}
              step={variable.type === 'int' ? 1 : 0.1}
              min={variable.min}
              max={variable.max}
              style={{
                width: '60px',
                padding: '2px 4px',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '2px',
                color: '#fff',
                fontSize: '11px',
                textAlign: 'right',
              }}
            />
          )}

          <button
            onClick={() => onRemoveVariable(variable.name)}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            x
          </button>
        </div>
      ))}
    </div>
  )
}

interface StateInspectorProps {
  state: AnimationState | null
  onUpdate: (updates: Partial<AnimationState>) => void
  animations: string[]
}

export function StateInspector({ state, onUpdate, animations }: StateInspectorProps) {
  if (!state) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#555' }}>
        Select a state to inspect
      </div>
    )
  }

  return (
    <div style={{ padding: '12px' }}>
      <div
        style={{
          fontWeight: 'bold',
          fontSize: '13px',
          color: '#fff',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        State: {state.name}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Name</label>
        <input
          type="text"
          value={state.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: '#0f0f23',
            border: '1px solid #333',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
          }}
        />
      </div>

      {state.type === 'state' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Animation</label>
          <select
            value={state.animation || ''}
            onChange={(e) => onUpdate({ animation: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: '#0f0f23',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
            }}
          >
            <option value="">Select animation...</option>
            {animations.map((anim) => (
              <option key={anim} value={anim}>
                {anim}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#ccc',
            cursor: 'pointer',
          }}
        >
          <input type="checkbox" checked={state.looping} onChange={(e) => onUpdate({ looping: e.target.checked })} />
          Looping
        </label>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Blend In</label>
          <input
            type="number"
            value={state.blendIn}
            onChange={(e) => onUpdate({ blendIn: parseFloat(e.target.value) })}
            step="0.05"
            min="0"
            style={{
              width: '100%',
              padding: '4px 8px',
              background: '#0f0f23',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Blend Out</label>
          <input
            type="number"
            value={state.blendOut}
            onChange={(e) => onUpdate({ blendOut: parseFloat(e.target.value) })}
            step="0.05"
            min="0"
            style={{
              width: '100%',
              padding: '4px 8px',
              background: '#0f0f23',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
            }}
          />
        </div>
      </div>
    </div>
  )
}

interface TransitionInspectorProps {
  transition: TransitionRule | null
  variables: AnimationVariable[]
  onUpdate: (updates: Partial<TransitionRule>) => void
}

export function TransitionInspector({ transition, variables, onUpdate }: TransitionInspectorProps) {
  if (!transition) return null

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff', marginBottom: '16px' }}>Transition</div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
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

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Blend Mode</label>
        <select
          value={transition.blendMode}
          onChange={(e) => onUpdate({ blendMode: e.target.value as TransitionRule['blendMode'] })}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: '#0f0f23',
            border: '1px solid #333',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
          }}
        >
          <option value="linear">Linear</option>
          <option value="cubic">Cubic</option>
          <option value="custom">Custom Curve</option>
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#ccc',
            cursor: 'pointer',
          }}
        >
          <input type="checkbox" checked={transition.automatic} onChange={(e) => onUpdate({ automatic: e.target.checked })} />
          Automatic (when animation ends)
        </label>
      </div>

      <div style={{ marginTop: '16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '11px', color: '#888' }}>Conditions</span>
          <button
            onClick={() => {
              const newCondition: TransitionCondition = {
                variable: variables[0]?.name || '',
                operator: '==',
                value: 0,
              }
              onUpdate({ conditions: [...transition.conditions, newCondition] })
            }}
            style={{
              padding: '2px 8px',
              background: '#333',
              border: 'none',
              borderRadius: '3px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            + Add
          </button>
        </div>

        {transition.conditions.map((condition, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
              marginBottom: '4px',
              padding: '6px',
              background: '#0f0f23',
              borderRadius: '4px',
            }}
          >
            <select
              value={condition.variable}
              onChange={(e) => {
                const nextConditions = [...transition.conditions]
                nextConditions[index] = { ...condition, variable: e.target.value }
                onUpdate({ conditions: nextConditions })
              }}
              style={{
                flex: 1,
                padding: '2px 4px',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '2px',
                color: '#fff',
                fontSize: '10px',
              }}
            >
              {variables.map((variable) => (
                <option key={variable.name} value={variable.name}>
                  {variable.name}
                </option>
              ))}
            </select>

            <select
              value={condition.operator}
              onChange={(e) => {
                const nextConditions = [...transition.conditions]
                nextConditions[index] = { ...condition, operator: e.target.value as TransitionCondition['operator'] }
                onUpdate({ conditions: nextConditions })
              }}
              style={{
                width: '40px',
                padding: '2px',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '2px',
                color: '#fff',
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
              type={typeof condition.value === 'boolean' ? 'checkbox' : 'number'}
              checked={typeof condition.value === 'boolean' ? condition.value : undefined}
              value={typeof condition.value !== 'boolean' ? condition.value : undefined}
              onChange={(e) => {
                const nextConditions = [...transition.conditions]
                const variableDef = variables.find((v) => v.name === condition.variable)
                const value = variableDef?.type === 'bool' ? e.target.checked : parseFloat(e.target.value)
                nextConditions[index] = { ...condition, value }
                onUpdate({ conditions: nextConditions })
              }}
              style={{
                width: '50px',
                padding: '2px 4px',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '2px',
                color: '#fff',
                fontSize: '10px',
              }}
            />

            <button
              onClick={() => {
                const nextConditions = transition.conditions.filter((_, conditionIndex) => conditionIndex !== index)
                onUpdate({ conditions: nextConditions })
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#e74c3c',
                cursor: 'pointer',
                padding: '2px',
                fontSize: '10px',
              }}
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
