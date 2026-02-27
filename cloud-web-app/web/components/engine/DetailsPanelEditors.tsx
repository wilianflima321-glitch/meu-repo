/**
 * Details Panel Shared Editors
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';

// Number Input
function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 0.01,
  readOnly,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value.toString());
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startValue = useRef(0);
  
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value.toFixed(3).replace(/\.?0+$/, ''));
    }
  }, [value, isDragging]);
  
  const handleDragStart = (e: React.MouseEvent) => {
    if (readOnly) return;
    setIsDragging(true);
    startX.current = e.clientX;
    startValue.current = value;
    
    const handleMove = (moveEvent: MouseEvent) => {
      const delta = (moveEvent.clientX - startX.current) * step;
      let newValue = startValue.current + delta;
      if (min !== undefined) newValue = Math.max(min, newValue);
      if (max !== undefined) newValue = Math.min(max, newValue);
      onChange(newValue);
    };
    
    const handleUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };
  
  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
        const num = parseFloat(e.target.value);
        if (!isNaN(num)) {
          let finalValue = num;
          if (min !== undefined) finalValue = Math.max(min, finalValue);
          if (max !== undefined) finalValue = Math.min(max, finalValue);
          onChange(finalValue);
        }
      }}
      onMouseDown={handleDragStart}
      disabled={readOnly}
      style={{
        width: '100%',
        padding: '4px 8px',
        background: '#0f0f23',
        border: '1px solid #333',
        borderRadius: '3px',
        color: '#fff',
        fontSize: '12px',
        cursor: readOnly ? 'default' : 'ew-resize',
        textAlign: 'right',
      }}
    />
  );
}

// Vector3 Editor
function Vector3Editor({
  value,
  onChange,
  labels = ['X', 'Y', 'Z'],
  colors = ['#e74c3c', '#2ecc71', '#3498db'],
  readOnly,
}: {
  value: { x: number; y: number; z: number };
  onChange: (v: { x: number; y: number; z: number }) => void;
  labels?: string[];
  colors?: string[];
  readOnly?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {['x', 'y', 'z'].map((axis, i) => (
        <div key={axis} style={{ flex: 1 }}>
          <div style={{
            fontSize: '10px',
            color: colors[i],
            marginBottom: '2px',
            fontWeight: 'bold',
          }}>
            {labels[i]}
          </div>
          <NumberInput
            value={value[axis as keyof typeof value]}
            onChange={(v) => onChange({ ...value, [axis]: v })}
            readOnly={readOnly}
          />
        </div>
      ))}
    </div>
  );
}

// Color Editor
function ColorEditor({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  
  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => !readOnly && setShowPicker(!showPicker)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px',
          background: '#0f0f23',
          border: '1px solid #333',
          borderRadius: '3px',
          cursor: readOnly ? 'default' : 'pointer',
        }}
      >
        <div style={{
          width: '20px',
          height: '20px',
          background: value,
          borderRadius: '3px',
          border: '1px solid #555',
        }} />
        <span style={{ color: '#aaa', fontSize: '12px' }}>{value}</span>
      </div>
      
      {showPicker && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          padding: '8px',
          background: '#1a1a2e',
          border: '1px solid #333',
          borderRadius: '6px',
          zIndex: 100,
        }}>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '150px',
              height: '100px',
              border: 'none',
              cursor: 'pointer',
            }}
          />
          <button
            onClick={() => setShowPicker(false)}
            style={{
              display: 'block',
              width: '100%',
              marginTop: '8px',
              padding: '4px',
              background: '#333',
              border: 'none',
              borderRadius: '3px',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

// Boolean Editor
function BooleanEditor({
  value,
  onChange,
  readOnly,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  readOnly?: boolean;
}) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: readOnly ? 'default' : 'pointer',
    }}>
      <div
        onClick={() => !readOnly && onChange(!value)}
        style={{
          width: '36px',
          height: '20px',
          background: value ? '#3f51b5' : '#333',
          borderRadius: '10px',
          padding: '2px',
          transition: 'background 0.2s',
          cursor: readOnly ? 'default' : 'pointer',
        }}
      >
        <div style={{
          width: '16px',
          height: '16px',
          background: '#fff',
          borderRadius: '8px',
          transform: value ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform 0.2s',
        }} />
      </div>
    </label>
  );
}

// Enum Editor
function EnumEditor({
  value,
  options,
  onChange,
  readOnly,
}: {
  value: unknown;
  options: { label: string; value: unknown }[];
  onChange: (v: unknown) => void;
  readOnly?: boolean;
}) {
  return (
    <select
      value={String(value)}
      onChange={(e) => {
        const opt = options.find(o => String(o.value) === e.target.value);
        if (opt) onChange(opt.value);
      }}
      disabled={readOnly}
      style={{
        width: '100%',
        padding: '4px 8px',
        background: '#0f0f23',
        border: '1px solid #333',
        borderRadius: '3px',
        color: '#fff',
        fontSize: '12px',
        cursor: readOnly ? 'default' : 'pointer',
      }}
    >
      {options.map((opt) => (
        <option key={String(opt.value)} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// String Editor
function StringEditor({
  value,
  onChange,
  readOnly,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  multiline?: boolean;
}) {
  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={readOnly}
        rows={4}
        style={{
          width: '100%',
          padding: '6px 8px',
          background: '#0f0f23',
          border: '1px solid #333',
          borderRadius: '3px',
          color: '#fff',
          fontSize: '12px',
          resize: 'vertical',
          fontFamily: 'monospace',
        }}
      />
    );
  }
  
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={readOnly}
      style={{
        width: '100%',
        padding: '4px 8px',
        background: '#0f0f23',
        border: '1px solid #333',
        borderRadius: '3px',
        color: '#fff',
        fontSize: '12px',
      }}
    />
  );
}

// Asset Selector
function AssetSelector({
  value,
  assetType,
  onChange,
  readOnly,
}: {
  value: string | null;
  assetType?: string;
  onChange: (v: string | null) => void;
  readOnly?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      gap: '4px',
    }}>
      <input
        type="text"
        value={value || 'None'}
        readOnly
        style={{
          flex: 1,
          padding: '4px 8px',
          background: '#0f0f23',
          border: '1px solid #333',
          borderRadius: '3px',
          color: value ? '#fff' : '#666',
          fontSize: '12px',
        }}
      />
      <button
        onClick={() => {/* Open asset browser */}}
        disabled={readOnly}
        style={{
          padding: '4px 8px',
          background: '#333',
          border: 'none',
          borderRadius: '3px',
          color: '#fff',
          cursor: readOnly ? 'default' : 'pointer',
          fontSize: '12px',
        }}
      >
        📂
      </button>
      {value && (
        <button
          onClick={() => onChange(null)}
          disabled={readOnly}
          style={{
            padding: '4px 8px',
            background: '#333',
            border: 'none',
            borderRadius: '3px',
            color: '#e74c3c',
            cursor: readOnly ? 'default' : 'pointer',
            fontSize: '12px',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export {
  AssetSelector,
  BooleanEditor,
  ColorEditor,
  EnumEditor,
  NumberInput,
  StringEditor,
  Vector3Editor,
};
