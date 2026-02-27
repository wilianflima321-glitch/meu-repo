/**
 * Animation Blueprint editor panels and modals
 */

'use client';

import React, { useState } from 'react';
import type {
  AnimationParameter,
  AnimationState,
  AnimationTransition,
  BlendTree,
  TransitionCondition,
} from './AnimationBlueprintEditor';

export interface ParameterPanelProps {
  parameters: AnimationParameter[];
  onChange: (params: AnimationParameter[]) => void;
  onValueChange: (id: string, value: number | boolean) => void;
}

export function ParameterPanel({ parameters, onChange, onValueChange }: ParameterPanelProps) {
  const [newParamName, setNewParamName] = useState('');
  const [newParamType, setNewParamType] = useState<AnimationParameter['type']>('float');
  
  const addParameter = () => {
    if (!newParamName.trim()) return;
    
    const newParam: AnimationParameter = {
      id: crypto.randomUUID(),
      name: newParamName,
      type: newParamType,
      value: newParamType === 'bool' || newParamType === 'trigger' ? false : 0,
      min: newParamType === 'float' || newParamType === 'int' ? 0 : undefined,
      max: newParamType === 'float' ? 1 : newParamType === 'int' ? 100 : undefined,
    };
    
    onChange([...parameters, newParam]);
    setNewParamName('');
  };
  
  const removeParameter = (id: string) => {
    onChange(parameters.filter(p => p.id !== id));
  };
  
  return (
    <div style={{ padding: '12px', background: '#0f172a', borderRadius: '8px' }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>
        Parameters
      </h3>
      
      {/* Parameter list */}
      <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
        {parameters.map(param => (
          <div
            key={param.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              padding: '8px',
              background: '#1e293b',
              borderRadius: '4px',
            }}
          >
            {/* Type indicator */}
            <span style={{ 
              fontSize: '10px', 
              padding: '2px 6px', 
              borderRadius: '4px',
              background: param.type === 'bool' ? '#22c55e' : 
                         param.type === 'trigger' ? '#f59e0b' : '#3b82f6',
              color: 'white',
            }}>
              {param.type}
            </span>
            
            {/* Name */}
            <span style={{ flex: 1, color: 'white', fontSize: '12px' }}>
              {param.name}
            </span>
            
            {/* Value control */}
            {(param.type === 'float' || param.type === 'int') && (
              <input
                type="range"
                min={param.min ?? 0}
                max={param.max ?? 1}
                step={param.type === 'int' ? 1 : 0.01}
                value={param.value as number}
                onChange={(e) => onValueChange(param.id, parseFloat(e.target.value))}
                style={{ width: '80px' }}
              />
            )}
            
            {param.type === 'bool' && (
              <input
                type="checkbox"
                checked={param.value as boolean}
                onChange={(e) => onValueChange(param.id, e.target.checked)}
              />
            )}
            
            {param.type === 'trigger' && (
              <button
                onClick={() => {
                  onValueChange(param.id, true);
                  setTimeout(() => onValueChange(param.id, false), 100);
                }}
                style={{
                  background: '#f59e0b',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                Fire
              </button>
            )}
            
            {/* Value display */}
            <span style={{ color: '#64748b', fontSize: '11px', width: '40px', textAlign: 'right' }}>
              {typeof param.value === 'boolean' ? (param.value ? 'true' : 'false') : param.value.toFixed(2)}
            </span>
            
            {/* Delete */}
            <button
              onClick={() => removeParameter(param.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      
      {/* Add new parameter */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={newParamName}
          onChange={(e) => setNewParamName(e.target.value)}
          placeholder="Parameter name"
          style={{
            flex: 1,
            background: '#1e293b',
            border: '1px solid #374151',
            borderRadius: '4px',
            padding: '6px 10px',
            color: 'white',
            fontSize: '12px',
          }}
        />
        <select
          value={newParamType}
          onChange={(e) => setNewParamType(e.target.value as AnimationParameter['type'])}
          style={{
            background: '#1e293b',
            border: '1px solid #374151',
            borderRadius: '4px',
            padding: '6px',
            color: 'white',
            fontSize: '12px',
          }}
        >
          <option value="float">Float</option>
          <option value="int">Int</option>
          <option value="bool">Bool</option>
          <option value="trigger">Trigger</option>
        </select>
        <button
          onClick={addParameter}
          style={{
            background: '#3b82f6',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// STATE EDITOR MODAL
// ============================================================================

export interface StateEditorModalProps {
  state: AnimationState;
  onSave: (state: AnimationState) => void;
  onClose: () => void;
  availableAnimations: string[];
  parameters: AnimationParameter[];
}

export function StateEditorModal({ state, onSave, onClose, availableAnimations, parameters }: StateEditorModalProps) {
  const [editedState, setEditedState] = useState<AnimationState>({ ...state });
  
  const updateField = <K extends keyof AnimationState>(field: K, value: AnimationState[K]) => {
    setEditedState(prev => ({ ...prev, [field]: value }));
  };
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1e293b',
          borderRadius: '12px',
          padding: '24px',
          width: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ color: 'white', marginBottom: '20px' }}>Edit State: {state.name}</h2>
        
        {/* Name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Name
          </label>
          <input
            type="text"
            value={editedState.name}
            onChange={(e) => updateField('name', e.target.value)}
            style={{
              width: '100%',
              background: '#0f172a',
              border: '1px solid #374151',
              borderRadius: '4px',
              padding: '8px 12px',
              color: 'white',
            }}
          />
        </div>
        
        {/* Animation */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Animation
          </label>
          <select
            value={editedState.animation || ''}
            onChange={(e) => updateField('animation', e.target.value || undefined)}
            style={{
              width: '100%',
              background: '#0f172a',
              border: '1px solid #374151',
              borderRadius: '4px',
              padding: '8px 12px',
              color: 'white',
            }}
          >
            <option value="">-- Select Animation --</option>
            {availableAnimations.map(anim => (
              <option key={anim} value={anim}>{anim}</option>
            ))}
          </select>
        </div>
        
        {/* Speed */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Speed: {editedState.speed.toFixed(2)}x
          </label>
          <input
            type="range"
            min={0}
            max={3}
            step={0.1}
            value={editedState.speed}
            onChange={(e) => updateField('speed', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        
        {/* Loop */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={editedState.loop}
              onChange={(e) => updateField('loop', e.target.checked)}
            />
            Loop Animation
          </label>
        </div>
        
        {/* Blend Tree option */}
        <div style={{ marginBottom: '16px', padding: '12px', background: '#0f172a', borderRadius: '8px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <input
              type="checkbox"
              checked={!!editedState.blendTree}
              onChange={(e) => updateField('blendTree', e.target.checked ? {
                type: '1d',
                parameterX: parameters[0]?.id || '',
                children: [],
              } : undefined)}
            />
            Use Blend Tree
          </label>
          
          {editedState.blendTree && (
            <div style={{ marginTop: '8px' }}>
              <select
                value={editedState.blendTree.type}
                onChange={(e) => updateField('blendTree', {
                  ...editedState.blendTree!,
                  type: e.target.value as BlendTree['type'],
                })}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '4px',
                  padding: '6px',
                  color: 'white',
                  marginBottom: '8px',
                }}
              >
                <option value="1d">1D Blend Space</option>
                <option value="2d">2D Blend Space</option>
                <option value="additive">Additive</option>
              </select>
              
              <select
                value={editedState.blendTree.parameterX}
                onChange={(e) => updateField('blendTree', {
                  ...editedState.blendTree!,
                  parameterX: e.target.value,
                })}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '4px',
                  padding: '6px',
                  color: 'white',
                }}
              >
                <option value="">-- Parameter X --</option>
                {parameters.filter(p => p.type === 'float').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: '#374151',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(editedState)}
            style={{
              background: '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TRANSITION EDITOR MODAL
// ============================================================================

export interface TransitionEditorModalProps {
  transition: AnimationTransition;
  onSave: (transition: AnimationTransition) => void;
  onClose: () => void;
  parameters: AnimationParameter[];
}

export function TransitionEditorModal({ transition, onSave, onClose, parameters }: TransitionEditorModalProps) {
  const [editedTransition, setEditedTransition] = useState<AnimationTransition>({ ...transition });
  
  const addCondition = () => {
    const newCondition: TransitionCondition = {
      parameter: parameters[0]?.id || '',
      comparison: '==',
      value: 0,
    };
    setEditedTransition(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition],
    }));
  };
  
  const updateCondition = (index: number, updates: Partial<TransitionCondition>) => {
    setEditedTransition(prev => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => i === index ? { ...c, ...updates } : c),
    }));
  };
  
  const removeCondition = (index: number) => {
    setEditedTransition(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1e293b',
          borderRadius: '12px',
          padding: '24px',
          width: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ color: 'white', marginBottom: '20px' }}>Edit Transition</h2>
        
        {/* Blend Time */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Blend Time: {editedTransition.blendTime.toFixed(2)}s
          </label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={editedTransition.blendTime}
            onChange={(e) => setEditedTransition(prev => ({ ...prev, blendTime: parseFloat(e.target.value) }))}
            style={{ width: '100%' }}
          />
        </div>
        
        {/* Blend Mode */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Blend Mode
          </label>
          <select
            value={editedTransition.blendMode}
            onChange={(e) => setEditedTransition(prev => ({ 
              ...prev, 
              blendMode: e.target.value as AnimationTransition['blendMode'] 
            }))}
            style={{
              width: '100%',
              background: '#0f172a',
              border: '1px solid #374151',
              borderRadius: '4px',
              padding: '8px',
              color: 'white',
            }}
          >
            <option value="linear">Linear</option>
            <option value="cubic">Cubic</option>
            <option value="custom">Custom Curve</option>
          </select>
        </div>
        
        {/* Interruptible */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={editedTransition.interruptible}
              onChange={(e) => setEditedTransition(prev => ({ ...prev, interruptible: e.target.checked }))}
            />
            Can Be Interrupted
          </label>
        </div>
        
        {/* Priority */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Priority: {editedTransition.priority}
          </label>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={editedTransition.priority}
            onChange={(e) => setEditedTransition(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
            style={{ width: '100%' }}
          />
        </div>
        
        {/* Conditions */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ color: '#94a3b8', fontSize: '12px' }}>Conditions</label>
            <button
              onClick={addCondition}
              style={{
                background: '#3b82f6',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              + Add
            </button>
          </div>
          
          {editedTransition.conditions.map((condition, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                marginBottom: '8px',
                padding: '8px',
                background: '#0f172a',
                borderRadius: '4px',
              }}
            >
              <select
                value={condition.parameter}
                onChange={(e) => updateCondition(index, { parameter: e.target.value })}
                style={{
                  flex: 1,
                  background: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '4px',
                  padding: '4px',
                  color: 'white',
                  fontSize: '11px',
                }}
              >
                {parameters.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              
              <select
                value={condition.comparison}
                onChange={(e) => updateCondition(index, { comparison: e.target.value as TransitionCondition['comparison'] })}
                style={{
                  background: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '4px',
                  padding: '4px',
                  color: 'white',
                  fontSize: '11px',
                }}
              >
                <option value="==">=</option>
                <option value="!=">≠</option>
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
              </select>
              
              <input
                type="number"
                value={condition.value as number}
                onChange={(e) => updateCondition(index, { value: parseFloat(e.target.value) })}
                style={{
                  width: '60px',
                  background: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '4px',
                  padding: '4px',
                  color: 'white',
                  fontSize: '11px',
                }}
              />
              
              <button
                onClick={() => removeCondition(index)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        
        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: '#374151',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(editedTransition)}
            style={{
              background: '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
