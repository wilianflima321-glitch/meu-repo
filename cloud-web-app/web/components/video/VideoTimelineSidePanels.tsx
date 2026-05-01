'use client';

import { useState } from 'react';
import type { ClipEffect, TimelineClip } from './video-timeline-editor.types';

interface ClipInspectorProps {
  clip: TimelineClip | null;
  onUpdate: (clip: TimelineClip) => void;
}
export function ClipInspector({ clip, onUpdate }: ClipInspectorProps) {
  if (!clip) {
    return (
      <div style={{
        padding: '16px',
        color: 'var(--aethel-text-quaternary)',
        textAlign: 'center',
      }}>
        Select a clip to edit its properties
      </div>
    );
  }
  return (
    <div style={{ padding: '12px' }}>
      <h3 style={{ color: 'var(--aethel-text-primary)', fontSize: '14px', marginBottom: '16px' }}>
        Clip Properties
      </h3>
      {/* Name */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
          Name
        </label>
        <input
          type="text"
          value={clip.name}
          onChange={(e) => onUpdate({ ...clip, name: e.target.value })}
          style={{
            width: '100%',
            background: 'var(--aethel-surface-tertiary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            padding: '6px',
            color: 'var(--aethel-text-primary)',
            fontSize: '12px',
          }}
        />
      </div>
      {/* Timing */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
          Start Time
        </label>
        <input
          type="number"
          value={clip.startTime.toFixed(2)}
          onChange={(e) => onUpdate({ ...clip, startTime: parseFloat(e.target.value) })}
          step={0.01}
          style={{
            width: '100%',
            background: 'var(--aethel-surface-tertiary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            padding: '6px',
            color: 'var(--aethel-text-primary)',
            fontSize: '12px',
          }}
        />
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
          Duration
        </label>
        <input
          type="number"
          value={clip.duration.toFixed(2)}
          onChange={(e) => onUpdate({ ...clip, duration: parseFloat(e.target.value) })}
          step={0.01}
          style={{
            width: '100%',
            background: 'var(--aethel-surface-tertiary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            padding: '6px',
            color: 'var(--aethel-text-primary)',
            fontSize: '12px',
          }}
        />
      </div>
      {/* Opacity */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: '11px' }}>Opacity</label>
          <span style={{ color: 'var(--aethel-text-quaternary)', fontSize: '10px' }}>{Math.round(clip.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={clip.opacity}
          onChange={(e) => onUpdate({ ...clip, opacity: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>
      {/* Speed */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: '11px' }}>Speed</label>
          <span style={{ color: 'var(--aethel-text-quaternary)', fontSize: '10px' }}>{clip.speed}x</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={4}
          step={0.1}
          value={clip.speed}
          onChange={(e) => onUpdate({ ...clip, speed: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>
      {/* Audio level for audio/video clips */}
      {(clip.type === 'audio' || clip.type === 'video') && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: '11px' }}>Audio Level</label>
            <span style={{ color: 'var(--aethel-text-quaternary)', fontSize: '10px' }}>{Math.round(clip.audioLevel * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={clip.audioLevel}
            onChange={(e) => onUpdate({ ...clip, audioLevel: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
      )}
      {/* Lock/Mute */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="checkbox"
            checked={clip.locked}
            onChange={(e) => onUpdate({ ...clip, locked: e.target.checked })}
          />
          Locked
        </label>
        <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="checkbox"
            checked={clip.muted}
            onChange={(e) => onUpdate({ ...clip, muted: e.target.checked })}
          />
          Muted
        </label>
      </div>
    </div>
  );
}
interface EffectsPanelProps {
  clip: TimelineClip | null;
  onAddEffect: (effectType: string) => void;
  onRemoveEffect: (effectId: string) => void;
  onUpdateEffect: (effect: ClipEffect) => void;
}
export const availableEffects = [
  { type: 'blur', name: 'Gaussian Blur', category: 'Blur' },
  { type: 'sharpen', name: 'Sharpen', category: 'Blur' },
  { type: 'brightness_contrast', name: 'Brightness/Contrast', category: 'Color' },
  { type: 'hue_saturation', name: 'Hue/Saturation', category: 'Color' },
  { type: 'color_balance', name: 'Color Balance', category: 'Color' },
  { type: 'lumetri', name: 'Lumetri Color', category: 'Color' },
  { type: 'vignette', name: 'Vignette', category: 'Stylize' },
  { type: 'chromatic_aberration', name: 'Chromatic Aberration', category: 'Stylize' },
  { type: 'film_grain', name: 'Film Grain', category: 'Stylize' },
  { type: 'glow', name: 'Glow', category: 'Stylize' },
];
export function EffectsPanel({ clip, onAddEffect, onRemoveEffect, onUpdateEffect }: EffectsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredEffects = availableEffects.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <div style={{ padding: '12px' }}>
      <h3 style={{ color: 'var(--aethel-text-primary)', fontSize: '14px', marginBottom: '12px' }}>Effects</h3>
      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search effects..."
        style={{
          width: '100%',
          background: 'var(--aethel-surface-tertiary)',
          border: '1px solid var(--aethel-border-primary)',
          borderRadius: '4px',
          padding: '8px',
          color: 'var(--aethel-text-primary)',
          fontSize: '12px',
          marginBottom: '12px',
        }}
      />
      {/* Applied effects */}
      {clip && clip.effects.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ color: 'var(--aethel-text-tertiary)', fontSize: '11px', marginBottom: '8px' }}>
            Applied Effects
          </h4>
          {clip.effects.map((effect) => (
            <div
              key={effect.id}
              style={{
                background: 'var(--aethel-surface-tertiary)',
                borderRadius: '4px',
                padding: '8px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={effect.enabled}
                  onChange={(e) => onUpdateEffect({ ...effect, enabled: e.target.checked })}
                />
                <span style={{ color: 'var(--aethel-text-primary)', fontSize: '12px' }}>{effect.name}</span>
              </div>
              <button type="button"
                onClick={() => onRemoveEffect(effect.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--aethel-error)',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >

              </button>
            </div>
          ))}
        </div>
      )}
      {/* Available effects */}
      <h4 style={{ color: 'var(--aethel-text-tertiary)', fontSize: '11px', marginBottom: '8px' }}>
        Available Effects
      </h4>
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {filteredEffects.map((effect) => (
          <button type="button"
            key={effect.type}
            onClick={() => clip && onAddEffect(effect.type)}
            disabled={!clip}
            style={{
              width: '100%',
              background: 'var(--aethel-surface-tertiary)',
              border: 'none',
              borderRadius: '4px',
              padding: '8px',
              marginBottom: '4px',
              color: clip ? 'var(--aethel-text-primary)' : 'var(--aethel-text-quaternary)',
              cursor: clip ? 'pointer' : 'not-allowed',
              textAlign: 'left',
              fontSize: '12px',
            }}
          >
            <span>{effect.name}</span>
            <span style={{ color: 'var(--aethel-text-quaternary)', marginLeft: '8px', fontSize: '10px' }}>
              {effect.category}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
