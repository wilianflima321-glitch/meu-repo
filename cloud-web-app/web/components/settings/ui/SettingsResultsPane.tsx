import { Search } from 'lucide-react';

import { SettingField } from './SettingsField';
import { useSettings } from './settings-provider';
import type { SettingDefinition, SettingsScope } from './settings-types';

interface SettingsResultsPaneProps {
  filteredSettings: SettingDefinition[];
  groupedSettings: Map<string, SettingDefinition[]>;
  scope: SettingsScope;
  searchQuery: string;
  showJSON: boolean;
}

export function SettingsResultsPane({
  filteredSettings,
  groupedSettings,
  scope,
  searchQuery,
  showJSON,
}: SettingsResultsPaneProps) {
  const { getValue, isModified, resetValue, setValue, settings } = useSettings();

  if (showJSON) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--aethel-text-tertiary)]">
          {scope === 'user' ? 'User settings (JSON)' : 'Workspace settings (JSON)'}
        </p>
        <pre className="overflow-x-auto rounded-lg bg-[var(--aethel-surface-tertiary)] p-4 font-mono text-sm text-[var(--aethel-text-secondary)]">
          {JSON.stringify(
            Object.fromEntries(
              Array.from(settings.keys())
                .filter(key => isModified(key))
                .map(key => [key, getValue(key)])
            ),
            null,
            2
          ) || '{}'}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Array.from(groupedSettings.entries()).map(([category, categorySettings]) => {
        const [root, sub] = category.split(' > ');
        return (
          <div key={category} id={`setting-category-${root}-${sub || ''}`}>
            <h2 className="mb-4 text-sm font-medium text-[var(--aethel-text-tertiary)]">{category}</h2>
            <div className="space-y-6">
              {categorySettings.map(setting => (
                <div
                  key={setting.key}
                  className="border-b border-[var(--aethel-border-primary)]/50 pb-4 last:border-0"
                >
                  <SettingField
                    definition={setting}
                    value={getValue(setting.key)}
                    modified={isModified(setting.key)}
                    onChange={value => setValue(setting.key, value)}
                    onReset={() => resetValue(setting.key)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {filteredSettings.length === 0 && (
        <div className="py-12 text-center text-[var(--aethel-text-tertiary)]">
          <Search className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>No settings found for {`"${searchQuery}"`}</p>
        </div>
      )}
    </div>
  );
}
