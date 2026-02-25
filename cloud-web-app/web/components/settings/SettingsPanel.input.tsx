'use client';

import React from 'react';
import { Undo } from 'lucide-react';
import type { SettingDefinition } from '@/lib/settings/settings-service';
import { settingsPanelColors as colors } from './SettingsPanel.theme';

interface SettingInputProps {
  settingKey: string;
  definition?: SettingDefinition;
  value: any;
  onChange: (value: any) => void;
  onReset: () => void;
  isModified: boolean;
}

export function SettingInput({
  settingKey,
  definition,
  value,
  onChange,
  onReset,
  isModified,
}: SettingInputProps) {
  const type = definition?.type || 'string';

  const renderInput = () => {
    switch (type) {
      case 'boolean':
        return (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: colors.blue,
              }}
            />
            <span style={{ color: colors.text }}>{value ? 'Ativado' : 'Desativado'}</span>
          </label>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            min={definition?.minimum}
            max={definition?.maximum}
            style={{
              width: '120px',
              padding: '6px 10px',
              background: colors.surface0,
              border: `1px solid ${colors.surface1}`,
              borderRadius: '6px',
              color: colors.text,
              fontSize: '14px',
            }}
          />
        );

      case 'enum':
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              padding: '6px 10px',
              background: colors.surface0,
              border: `1px solid ${colors.surface1}`,
              borderRadius: '6px',
              color: colors.text,
              fontSize: '14px',
              minWidth: '200px',
            }}
          >
            {definition?.enum?.map((opt, idx) => (
              <option key={opt} value={opt}>
                {opt}
                {definition.enumDescriptions?.[idx] && ` - ${definition.enumDescriptions[idx]}`}
              </option>
            ))}
          </select>
        );

      case 'object':
        return (
          <textarea
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {}
            }}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '8px',
              background: colors.surface0,
              border: `1px solid ${colors.surface1}`,
              borderRadius: '6px',
              color: colors.text,
              fontSize: '13px',
              fontFamily: 'monospace',
              resize: 'vertical',
            }}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '6px 10px',
              background: colors.surface0,
              border: `1px solid ${colors.surface1}`,
              borderRadius: '6px',
              color: colors.text,
              fontSize: '14px',
            }}
          />
        );
    }
  };

  return (
    <div
      style={{
        padding: '16px',
        borderBottom: `1px solid ${colors.surface0}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '8px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: colors.text, fontWeight: 500 }}>{settingKey}</span>
            {isModified && (
              <span
                style={{
                  padding: '2px 6px',
                  background: colors.blue + '30',
                  color: colors.blue,
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              >
                Modificado
              </span>
            )}
          </div>
          <p style={{ color: colors.subtext0, fontSize: '13px', margin: '4px 0 0' }}>
            {definition?.description || 'Sem descricao'}
          </p>
        </div>

        {isModified && (
          <button
            onClick={onReset}
            style={{
              padding: '4px 8px',
              background: 'transparent',
              border: `1px solid ${colors.surface1}`,
              borderRadius: '4px',
              color: colors.subtext0,
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Undo size={12} />
            Resetar
          </button>
        )}
      </div>

      <div style={{ marginTop: '8px' }}>{renderInput()}</div>
    </div>
  );
}
