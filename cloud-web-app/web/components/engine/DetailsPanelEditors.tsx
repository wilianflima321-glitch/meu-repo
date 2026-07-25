'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FolderOpen, X, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { openConfirmDialog } from '@/lib/ui/non-blocking-dialogs';
import { ComponentIcon } from './DetailsPanelIcons';
import type { ComponentDefinition, PropertyDefinition } from './DetailsPanel.types';

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
        background: 'var(--aethel-surface-primary)',
        border: '1px solid var(--aethel-border-primary)',
        borderRadius: '3px',
        color: 'var(--aethel-text-primary)',
        fontSize: '12px',
        cursor: readOnly ? 'default' : 'ew-resize',
        textAlign: 'right',
      }}
    />
  );
}
export function Vector3Editor({
  value,
  onChange,
  labels = ['X', 'Y', 'Z'],
  colors = ['var(--aethel-error)', 'var(--aethel-success)', 'var(--aethel-primary)'],
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
          background: 'var(--aethel-surface-primary)',
          border: '1px solid var(--aethel-border-primary)',
          borderRadius: '3px',
          cursor: readOnly ? 'default' : 'pointer',
        }}
      >
        <div style={{
          width: '20px',
          height: '20px',
          background: value,
          borderRadius: '3px',
          border: '1px solid var(--aethel-border-secondary)',
        }} />
        <span style={{ color: 'var(--aethel-text-tertiary)', fontSize: '12px' }}>{value}</span>
      </div>
      {showPicker && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          padding: '8px',
          background: 'var(--aethel-surface-tertiary)',
          border: '1px solid var(--aethel-border-primary)',
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
          <button type="button" aria-label="Close color picker"
            onClick={() => setShowPicker(false)}
            style={{
              display: 'block',
              width: '100%',
              marginTop: '8px',
              padding: '4px',
              background: 'var(--aethel-surface-quaternary)',
              border: 'none',
              borderRadius: '3px',
              color: 'var(--aethel-text-primary)',
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
          background: value ? 'var(--aethel-primary)' : 'var(--aethel-surface-quaternary)',
          borderRadius: '10px',
          padding: '2px',
          transition: 'background 0.2s',
          cursor: readOnly ? 'default' : 'pointer',
        }}
      >
        <div style={{
          width: '16px',
          height: '16px',
          background: 'var(--aethel-text-primary)',
          borderRadius: '8px',
          transform: value ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform 0.2s',
        }} />
      </div>
    </label>
  );
}
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
        background: 'var(--aethel-surface-primary)',
        border: '1px solid var(--aethel-border-primary)',
        borderRadius: '3px',
        color: 'var(--aethel-text-primary)',
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
          background: 'var(--aethel-surface-primary)',
          border: '1px solid var(--aethel-border-primary)',
          borderRadius: '3px',
          color: 'var(--aethel-text-primary)',
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
        background: 'var(--aethel-surface-primary)',
        border: '1px solid var(--aethel-border-primary)',
        borderRadius: '3px',
        color: 'var(--aethel-text-primary)',
        fontSize: '12px',
      }}
    />
  );
}
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
          background: 'var(--aethel-surface-primary)',
          border: '1px solid var(--aethel-border-primary)',
          borderRadius: '3px',
          color: value ? 'var(--aethel-text-primary)' : 'var(--aethel-text-muted)',
          fontSize: '12px',
        }}
      />
      <button type="button" aria-label={assetType ? `Browse ${assetType} asset` : 'Browse asset'}
        onClick={() => {/* Open asset browser */}}
        disabled={readOnly}
        className="inline-flex items-center justify-center"
        style={{
          padding: '4px 8px',
          background: 'var(--aethel-surface-quaternary)',
          border: 'none',
          borderRadius: '3px',
          color: 'var(--aethel-text-primary)',
          cursor: readOnly ? 'default' : 'pointer',
          fontSize: '12px',
        }}
      >
        <FolderOpen className="w-3.5 h-3.5" />
      </button>
      {value && (
        <button type="button" aria-label="Clear selected asset"
          onClick={() => onChange(null)}
          disabled={readOnly}
          className="inline-flex items-center justify-center"
          style={{
            padding: '4px 8px',
            background: 'var(--aethel-surface-quaternary)',
            border: 'none',
            borderRadius: '3px',
            color: 'var(--aethel-error)',
            cursor: readOnly ? 'default' : 'pointer',
            fontSize: '12px',
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
export function PropertyRow({
  property,
  onChange,
}: {
  property: PropertyDefinition;
  onChange: (value: unknown) => void;
}) {
  const handleChange = useCallback((value: unknown) => {
    onChange(value);
    property.onChange?.(value);
  }, [onChange, property]);
  const renderEditor = () => {
    switch (property.type) {
      case 'number':
        return (
          <NumberInput
            value={property.value as number}
            onChange={handleChange}
            min={property.min}
            max={property.max}
            step={property.step}
            readOnly={property.readOnly}
          />
        );
      case 'string':
        return (
          <StringEditor
            value={property.value as string}
            onChange={handleChange}
            readOnly={property.readOnly}
          />
        );
      case 'boolean':
        return (
          <BooleanEditor
            value={property.value as boolean}
            onChange={handleChange}
            readOnly={property.readOnly}
          />
        );
      case 'vector3':
      case 'euler':
        return (
          <Vector3Editor
            value={property.value as { x: number; y: number; z: number }}
            onChange={handleChange}
            readOnly={property.readOnly}
          />
        );
      case 'color':
        return (
          <ColorEditor
            value={property.value as string}
            onChange={handleChange}
            readOnly={property.readOnly}
          />
        );
      case 'enum':
        return (
          <EnumEditor
            value={property.value}
            options={property.options || []}
            onChange={handleChange}
            readOnly={property.readOnly}
          />
        );
      case 'asset':
        return (
          <AssetSelector
            value={property.value as string | null}
            assetType={property.assetType}
            onChange={handleChange}
            readOnly={property.readOnly}
          />
        );
      default:
        return (
          <span style={{ color: 'var(--aethel-text-muted)', fontSize: '12px' }}>
            [{property.type}]
          </span>
        );
    }
  };
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '120px 1fr',
      gap: '8px',
      alignItems: 'start',
      padding: '4px 0',
    }}>
      <label
        style={{
          fontSize: '12px',
          color: 'var(--aethel-text-tertiary)',
          paddingTop: '4px',
          cursor: 'default',
        }}
        title={property.tooltip}
      >
        {property.displayName}
      </label>
      <div>
        {renderEditor()}
      </div>
    </div>
  );
}
export function ComponentSection({
  component,
  onPropertyChange,
  onToggleEnabled,
  onRemove,
}: {
  component: ComponentDefinition;
  onPropertyChange: (propertyName: string, value: unknown) => void;
  onToggleEnabled: () => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const basicProps = component.properties.filter(p => !p.advanced);
  const advancedProps = component.properties.filter(p => p.advanced);
  const groupedProps = useMemo(() => {
    const props = showAdvanced ? component.properties : basicProps;
    const groups: Record<string, PropertyDefinition[]> = {};
    for (const prop of props) {
      const cat = prop.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(prop);
    }
    return groups;
  }, [component.properties, basicProps, showAdvanced]);
  return (
    <div style={{
      marginBottom: '8px',
      background: 'var(--aethel-surface-tertiary)',
      borderRadius: '6px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--aethel-surface-tertiary)',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ color: 'var(--aethel-text-muted)', display: 'inline-flex' }}>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <ComponentIcon iconKey={component.icon} size={16} />
        <span style={{
          flex: 1,
          fontWeight: 'bold',
          fontSize: '13px',
          color: 'var(--aethel-text-primary)',
        }}>
          {component.name}
        </span>
        {/* Enable toggle */}
        <div onClick={(e) => e.stopPropagation()}>
          <BooleanEditor
            value={component.enabled}
            onChange={onToggleEnabled}
          />
        </div>
        {/* Remove button */}
        {component.removable && (
          <button type="button" aria-label={`Remove ${component.name} component`}
            onClick={async (e) => {
              e.stopPropagation();
              const shouldRemove = await openConfirmDialog({
                title: 'Remove component',
                message: `Remove ${component.name}?`,
                confirmText: 'Remove',
                cancelText: 'Cancel',
              });
              if (!shouldRemove) return;
              onRemove();
            }}
            className="inline-flex items-center justify-center"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--aethel-error)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '4px',
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {/* Properties */}
      {expanded && (
        <div style={{ padding: '12px' }}>
          {Object.entries(groupedProps).map(([category, props]) => (
            <div key={category}>
              {Object.keys(groupedProps).length > 1 && (
                <div style={{
                  fontSize: '10px',
                  color: 'var(--aethel-text-muted)',
                  textTransform: 'uppercase',
                  marginTop: '8px',
                  marginBottom: '4px',
                  fontWeight: 'bold',
                }}>
                  {category}
                </div>
              )}
              {props.map((prop) => (
                <PropertyRow
                  key={prop.name}
                  property={prop}
                  onChange={(value) => onPropertyChange(prop.name, value)}
                />
              ))}
            </div>
          ))}
          {/* Advanced toggle */}
          {advancedProps.length > 0 && (
            <button type="button" aria-label={showAdvanced ? `Hide advanced ${component.name} properties` : `Show advanced ${component.name} properties`}
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                width: '100%',
                padding: '6px',
                marginTop: '8px',
                background: 'var(--aethel-surface-primary)',
                border: '1px solid var(--aethel-border-primary)',
                borderRadius: '3px',
                color: 'var(--aethel-text-quaternary)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              {showAdvanced ? '▲ Hide Advanced' : '▼ Show Advanced'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
