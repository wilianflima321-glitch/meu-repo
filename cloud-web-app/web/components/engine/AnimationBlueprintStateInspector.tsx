'use client';

import React from 'react';
import { Clapperboard } from 'lucide-react';
import type { AnimationState, AnimationVariable } from './AnimationBlueprint';

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
        <Clapperboard className="w-4 h-4 text-amber-400" /> {state.name}
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
