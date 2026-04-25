'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { DEFAULT_SETTINGS } from './default-settings';
import type {
  SettingDefinition,
  SettingValue,
  SettingsContextValue,
  SettingsScope,
} from './settings-types';

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}

interface SettingsProviderProps {
  children: ReactNode;
  initialSettings?: SettingDefinition[];
  initialValues?: Map<string, SettingValue>;
  onSave?: (key: string, value: unknown, scope: SettingsScope) => void;
}

export function SettingsProvider({
  children,
  initialSettings,
  initialValues,
  onSave,
}: SettingsProviderProps) {
  const [scope, setScope] = useState<SettingsScope>('user');
  const [values, setValues] = useState<Map<string, SettingValue>>(initialValues || new Map());

  const settings = useMemo(() => {
    const map = new Map<string, SettingDefinition>();
    (initialSettings || DEFAULT_SETTINGS).forEach(setting => map.set(setting.key, setting));
    return map;
  }, [initialSettings]);

  const getValue = useCallback(
    (key: string): unknown => {
      const settingValue = values.get(key);
      const definition = settings.get(key);
      if (scope === 'workspace' && settingValue?.workspaceValue !== undefined) {
        return settingValue.workspaceValue;
      }
      if (settingValue?.userValue !== undefined) {
        return settingValue.userValue;
      }
      return definition?.default;
    },
    [scope, settings, values]
  );

  const setValue = useCallback(
    (key: string, value: unknown) => {
      setValues(prev => {
        const next = new Map(prev);
        const existing = next.get(key) || { defaultValue: settings.get(key)?.default };
        if (scope === 'workspace') {
          next.set(key, { ...existing, workspaceValue: value });
        } else {
          next.set(key, { ...existing, userValue: value });
        }
        return next;
      });
      onSave?.(key, value, scope);
    },
    [onSave, scope, settings]
  );

  const resetValue = useCallback(
    (key: string) => {
      setValues(prev => {
        const next = new Map(prev);
        const existing = next.get(key);
        if (existing) {
          if (scope === 'workspace') {
            const { workspaceValue, ...rest } = existing;
            next.set(key, rest);
          } else {
            const { userValue, ...rest } = existing;
            next.set(key, rest);
          }
        }
        return next;
      });
      onSave?.(key, settings.get(key)?.default, scope);
    },
    [onSave, scope, settings]
  );

  const isModified = useCallback(
    (key: string): boolean => {
      const settingValue = values.get(key);
      if (!settingValue) return false;
      if (scope === 'workspace') {
        return settingValue.workspaceValue !== undefined;
      }
      return settingValue.userValue !== undefined;
    },
    [scope, values]
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        values,
        scope,
        setScope,
        getValue,
        setValue,
        resetValue,
        isModified,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
