'use client';

import { useCallback, useState } from 'react';
import type { Setting } from './project-settings-model';

// ============================================================================
// TYPES
// ============================================================================

export interface SettingEditorProps {
  setting: Setting;
  value: unknown;
  onChange: (value: unknown) => void;
}

function BooleanEditor({ setting, value, onChange }: SettingEditorProps) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={value as boolean}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: '18px', height: '18px', accentColor: 'var(--aethel-primary)' }}
      />
      <span style={{ color: value ? 'var(--aethel-text-primary)' : 'var(--aethel-text-quaternary)' }}>{value ? 'Enabled' : 'Disabled'}</span>
    </label>
  );
}

function NumberEditor({ setting, value, onChange }: SettingEditorProps) {
  const numValue = value as number;
  const isPercentage = setting.max === 1 && setting.min === 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <input
        type="range"
        value={numValue}
        min={setting.min ?? 0}
        max={setting.max ?? 100}
        step={setting.step ?? 1}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--aethel-primary)' }}
      />
      <input
        type="number"
        value={numValue}
        min={setting.min}
        max={setting.max}
        step={setting.step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '80px',
          background: 'var(--aethel-surface-tertiary)',
          border: '1px solid var(--aethel-border-primary)',
          borderRadius: '4px',
          color: 'var(--aethel-text-primary)',
          padding: '4px 8px',
          textAlign: 'right',
        }}
      />
      {isPercentage && <span style={{ color: 'var(--aethel-text-quaternary)', fontSize: '12px' }}>({Math.round(numValue * 100)}%)</span>}
    </div>
  );
}

function StringEditor({ setting, value, onChange }: SettingEditorProps) {
  return (
    <input
      type="text"
      value={value as string}
      onChange={(e) => onChange(e.target.value)}
      placeholder={setting.name}
      style={{
        width: '100%',
        background: 'var(--aethel-surface-tertiary)',
        border: '1px solid var(--aethel-border-primary)',
        borderRadius: '4px',
        color: 'var(--aethel-text-primary)',
        padding: '8px 12px',
      }}
    />
  );
}

function EnumEditor({ setting, value, onChange }: SettingEditorProps) {
  return (
    <select
      value={value as string}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        background: 'var(--aethel-surface-tertiary)',
        border: '1px solid var(--aethel-border-primary)',
        borderRadius: '4px',
        color: 'var(--aethel-text-primary)',
        padding: '8px 12px',
        cursor: 'pointer',
      }}
    >
      {setting.options?.map((opt) => (
        <option key={String(opt.value)} value={opt.value as string}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function ColorEditor({ setting, value, onChange }: SettingEditorProps) {
  const color = value as string;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '48px',
          height: '32px',
          border: '1px solid var(--aethel-border-primary)',
          borderRadius: '4px',
          cursor: 'pointer',
          padding: '0',
        }}
      />
      <input
        type="text"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          background: 'var(--aethel-surface-tertiary)',
          border: '1px solid var(--aethel-border-primary)',
          borderRadius: '4px',
          color: 'var(--aethel-text-primary)',
          padding: '6px 12px',
          fontFamily: 'monospace',
        }}
      />
    </div>
  );
}

function Vector2Editor({ setting, value, onChange }: SettingEditorProps) {
  const vec = value as { x: number; y: number };

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: 'var(--aethel-error)', fontWeight: 'bold' }}>X</span>
        <input
          type="number"
          value={vec.x}
          onChange={(e) => onChange({ ...vec, x: parseFloat(e.target.value) })}
          style={{
            flex: 1,
            background: 'var(--aethel-surface-tertiary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            padding: '6px 8px',
          }}
        />
      </label>
      <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: 'var(--aethel-success)', fontWeight: 'bold' }}>Y</span>
        <input
          type="number"
          value={vec.y}
          onChange={(e) => onChange({ ...vec, y: parseFloat(e.target.value) })}
          style={{
            flex: 1,
            background: 'var(--aethel-surface-tertiary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            padding: '6px 8px',
          }}
        />
      </label>
    </div>
  );
}

function Vector3Editor({ setting, value, onChange }: SettingEditorProps) {
  const vec = value as { x: number; y: number; z: number };

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: 'var(--aethel-error)', fontWeight: 'bold' }}>X</span>
        <input
          type="number"
          value={vec.x}
          onChange={(e) => onChange({ ...vec, x: parseFloat(e.target.value) })}
          style={{
            flex: 1,
            background: 'var(--aethel-surface-tertiary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            padding: '6px 8px',
          }}
        />
      </label>
      <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: 'var(--aethel-success)', fontWeight: 'bold' }}>Y</span>
        <input
          type="number"
          value={vec.y}
          onChange={(e) => onChange({ ...vec, y: parseFloat(e.target.value) })}
          style={{
            flex: 1,
            background: 'var(--aethel-surface-tertiary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            padding: '6px 8px',
          }}
        />
      </label>
      <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: 'var(--aethel-primary)', fontWeight: 'bold' }}>Z</span>
        <input
          type="number"
          value={vec.z}
          onChange={(e) => onChange({ ...vec, z: parseFloat(e.target.value) })}
          style={{
            flex: 1,
            background: 'var(--aethel-surface-tertiary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            padding: '6px 8px',
          }}
        />
      </label>
    </div>
  );
}

function PathEditor({ setting, value, onChange }: SettingEditorProps) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <input
        type="text"
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Select path..."
        style={{
          flex: 1,
          background: 'var(--aethel-surface-tertiary)',
          border: '1px solid var(--aethel-border-primary)',
          borderRadius: '4px',
          color: 'var(--aethel-text-primary)',
          padding: '8px 12px',
        }}
      />
      <button type="button" aria-label="Browse for project setting file"
        onClick={() => {/* Open file picker */}}
        style={{
          padding: '8px 16px',
          background: 'var(--aethel-surface-quaternary)',
          border: '1px solid var(--aethel-border-secondary)',
          borderRadius: '4px',
          color: 'var(--aethel-text-primary)',
          cursor: 'pointer',
        }}
      >
        Browse
      </button>
    </div>
  );
}

function KeybindEditor({ setting, value, onChange }: SettingEditorProps) {
  const [isListening, setIsListening] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isListening) return;

    e.preventDefault();
    e.stopPropagation();

    let key = e.key;
    if (key === ' ') key = 'Space';
    if (key === 'Control') key = e.location === 1 ? 'LeftCtrl' : 'RightCtrl';
    if (key === 'Shift') key = e.location === 1 ? 'LeftShift' : 'RightShift';
    if (key === 'Alt') key = e.location === 1 ? 'LeftAlt' : 'RightAlt';

    onChange(key);
    setIsListening(false);

    window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, onChange]);

  const startListening = useCallback(() => {
    setIsListening(true);
    window.addEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <button type="button" aria-label={isListening ? 'Stop listening for input' : 'Start listening for input'}
      onClick={startListening}
      style={{
        padding: '8px 16px',
        background: isListening ? 'var(--aethel-primary)' : 'var(--aethel-surface-quaternary)',
        border: `1px solid ${isListening ? 'var(--aethel-primary)' : 'var(--aethel-border-secondary)'}`,
        borderRadius: '4px',
        color: 'var(--aethel-text-primary)',
        cursor: 'pointer',
        minWidth: '120px',
        textAlign: 'center',
        fontFamily: 'monospace',
      }}
    >
      {isListening ? 'Press a key...' : value as string}
    </button>
  );
}

export function SettingEditor({ setting, value, onChange }: SettingEditorProps) {
  switch (setting.type) {
    case 'boolean':
      return <BooleanEditor setting={setting} value={value} onChange={onChange} />;
    case 'number':
      return <NumberEditor setting={setting} value={value} onChange={onChange} />;
    case 'string':
      return <StringEditor setting={setting} value={value} onChange={onChange} />;
    case 'enum':
      return <EnumEditor setting={setting} value={value} onChange={onChange} />;
    case 'color':
      return <ColorEditor setting={setting} value={value} onChange={onChange} />;
    case 'vector2':
      return <Vector2Editor setting={setting} value={value} onChange={onChange} />;
    case 'vector3':
      return <Vector3Editor setting={setting} value={value} onChange={onChange} />;
    case 'path':
      return <PathEditor setting={setting} value={value} onChange={onChange} />;
    case 'keybind':
      return <KeybindEditor setting={setting} value={value} onChange={onChange} />;
    default:
      return <StringEditor setting={setting} value={value} onChange={onChange} />;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
