import { X } from 'lucide-react';

import { useSettings } from './settings-provider';

interface QuickSettingsPopupProps {
  onClose: () => void;
  settings: string[];
}

export function QuickSettingsPopup({ onClose, settings: settingsToShow }: QuickSettingsPopupProps) {
  const { getValue, setValue, settings } = useSettings();

  return (
    <div className="absolute bottom-full right-0 mb-2 w-72 overflow-hidden rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-3 py-2">
        <span className="text-sm font-medium text-[var(--aethel-text-primary)]">Quick settings</span>
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-[var(--aethel-surface-tertiary)]">
          <X className="h-4 w-4 text-[var(--aethel-text-tertiary)]" />
        </button>
      </div>
      <div className="space-y-2 p-2">
        {settingsToShow.map(key => {
          const setting = settings.get(key);
          if (!setting) {
            return null;
          }
          const value = getValue(key);
          const displayName = key.split('.').pop()?.replace(/([A-Z])/g, ' $1')?.trim() || key;

          if (setting.type === 'boolean') {
            return (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 hover:bg-[var(--aethel-surface-tertiary)]/50"
              >
                <span className="text-sm text-[var(--aethel-text-secondary)]">{displayName}</span>
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={event => setValue(key, event.target.checked)}
                  className="rounded border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-info)]"
                />
              </label>
            );
          }

          if (setting.type === 'enum' && setting.enum) {
            return (
              <div key={key} className="px-2 py-1.5">
                <span className="text-xs text-[var(--aethel-text-tertiary)]">{displayName}</span>
                <select
                  value={String(value ?? '')}
                  onChange={event => setValue(key, event.target.value)}
                  className="mt-1 w-full rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] px-2 py-1 text-sm text-[var(--aethel-text-primary)]"
                >
                  {setting.enum.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
