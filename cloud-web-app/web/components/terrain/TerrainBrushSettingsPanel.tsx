'use client';

import type { BrushFalloff, BrushSettings, BrushShape } from './terrain-sculpting-models';

interface BrushSettingsPanelProps {
  settings: BrushSettings;
  onChange: (settings: BrushSettings) => void;
}
export function BrushSettingsPanel({ settings, onChange }: BrushSettingsPanelProps) {
  const update = <K extends keyof BrushSettings>(key: K, value: BrushSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };
  return (
    <div style={{
      padding: '12px',
      background: 'var(--aethel-surface-primary)',
      borderRadius: '8px',
    }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>Brush Settings</h3>
      {/* Size */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: '12px' }}>Size</label>
          <span style={{ color: 'var(--aethel-text-quaternary)', fontSize: '11px' }}>{settings.size.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={50}
          step={0.5}
          value={settings.size}
          onChange={(e) => update('size', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      {/* Strength */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: '12px' }}>Strength</label>
          <span style={{ color: 'var(--aethel-text-quaternary)', fontSize: '11px' }}>{(settings.strength * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={settings.strength}
          onChange={(e) => update('strength', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      {/* Falloff */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          Falloff
        </label>
        <select
          value={settings.falloff}
          onChange={(e) => update('falloff', e.target.value as BrushFalloff)}
          style={{
            width: '100%',
            background: 'var(--aethel-surface-tertiary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            padding: '6px',
            color: 'white',
            fontSize: '12px',
          }}
        >
          <option value="linear">Linear</option>
          <option value="smooth">Smooth</option>
          <option value="spherical">Spherical</option>
          <option value="tip">Tip</option>
          <option value="constant">Constant</option>
        </select>
      </div>
      {/* Shape */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          Shape
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['circle', 'square'] as BrushShape[]).map(shape => (
            <button type="button"
              key={shape}
              onClick={() => update('shape', shape)}
              aria-label={`Selecionar pincel ${shape}`}
              aria-pressed={settings.shape === shape}
              style={{
                flex: 1,
                padding: '6px',
                background: settings.shape === shape ? 'var(--aethel-primary)' : 'var(--aethel-surface-tertiary)',
                border: '1px solid var(--aethel-border-primary)',
                borderRadius: '4px',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {shape}
            </button>
          ))}
        </div>
      </div>
      {/* Rotation */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: '12px' }}>Rotation</label>
          <span style={{ color: 'var(--aethel-text-quaternary)', fontSize: '11px' }}>{settings.rotation}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={settings.rotation}
          onChange={(e) => update('rotation', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      {/* Jitter */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: '12px' }}>Jitter</label>
          <span style={{ color: 'var(--aethel-text-quaternary)', fontSize: '11px' }}>{(settings.jitter * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={settings.jitter}
          onChange={(e) => update('jitter', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
