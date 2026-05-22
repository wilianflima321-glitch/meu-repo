'use client';

import React from 'react';
import { Trash2, Undo, User } from 'lucide-react';
import type { SettingDefinition, SettingValue, SyncState, UserProfile } from '@/lib/settings/settings-service';

// ============================================================================
// STYLES
// ============================================================================

export const colors = {
  base: 'var(--aethel-surface-primary)',
  surface0: 'var(--aethel-surface-tertiary)',
  surface1: 'var(--aethel-surface-quaternary)',
  surface2: 'var(--aethel-text-quaternary)',
  text: 'var(--aethel-text-primary)',
  subtext0: 'var(--aethel-text-tertiary)',
  subtext1: 'var(--aethel-text-secondary)',
  blue: 'var(--aethel-info)',
  green: 'var(--aethel-success-light)',
  red: 'var(--aethel-error-light)',
  yellow: 'var(--aethel-warning-light)',
  mauve: 'var(--aethel-accent-light)',
  overlay0: 'var(--aethel-text-muted)',
};

// ============================================================================
// SETTING INPUT COMPONENT
// ============================================================================

interface SettingInputProps {
  settingKey: string;
  definition?: SettingDefinition;
  value: SettingValue;
  onChange: (value: SettingValue) => void;
  onReset: () => void;
  isModified: boolean;
}

type SyncItem = SyncState['syncedItems'][number];

export const SYNC_ITEMS: SyncItem[] = ['settings', 'extensions', 'keybindings', 'snippets', 'tasks', 'profiles'];

export const SettingInput: React.FC<SettingInputProps> = ({
  settingKey,
  definition,
  value,
  onChange,
  onReset,
  isModified,
}) => {
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
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: colors.blue,
              }}
            />
            <span style={{ color: colors.text }}>
              {value ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        );

      case 'number':
        return (
          <input
            type="number"
            value={typeof value === 'number' || typeof value === 'string' ? value : ''}
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
            value={typeof value === 'string' || typeof value === 'number' ? value : ''}
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
              <option key={String(opt)} value={opt}>
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
            value={typeof value === 'string' || typeof value === 'number' ? value : ''}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: colors.text, fontWeight: 500 }}>{settingKey}</span>
            {isModified && (
              <span style={{
                padding: '2px 6px',
                background: colors.blue + '30',
                color: colors.blue,
                borderRadius: '4px',
                fontSize: '11px',
              }}>
                Modified
              </span>
            )}
          </div>
          <p style={{ color: colors.subtext0, fontSize: '13px', margin: '4px 0 0' }}>
            {definition?.description || 'No description'}
          </p>
        </div>

        {isModified && (
          <button type="button"
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
            Reset
          </button>
        )}
      </div>

      <div style={{ marginTop: '8px' }}>
        {renderInput()}
      </div>
    </div>
  );
};

// ============================================================================
// PROFILE CARD
// ============================================================================

interface ProfileCardProps {
  profile: UserProfile;
  isActive: boolean;
  onActivate: () => void;
  onDelete: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, isActive, onActivate, onDelete }) => {
  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        padding: '16px',
        background: isActive ? colors.blue + '20' : colors.surface0,
        border: `1px solid ${isActive ? colors.blue : colors.surface1}`,
        borderRadius: '8px',
        cursor: 'pointer',
      }}
      onClick={onActivate}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: colors.surface1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={20} color={colors.text} />
          </div>
          <div>
            <div style={{ color: colors.text, fontWeight: 500 }}>{profile.name}</div>
            <div style={{ color: colors.subtext0, fontSize: '12px' }}>
              {Object.keys(profile.settings).length} settings • {profile.extensions.length} extensions
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isActive && (
            <span style={{
              padding: '4px 8px',
              background: colors.green + '30',
              color: colors.green,
              borderRadius: '4px',
              fontSize: '12px',
            }}>
              Active
            </span>
          )}

          {profile.id !== 'default' && (
            <button type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Delete profile"
              style={{
                padding: '6px',
                background: 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: colors.red,
                cursor: 'pointer',
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
