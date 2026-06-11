import type { ConfigurationInspect, WorkspaceConfiguration } from './workspace-service.types';

export function getWorkspaceConfigurationFromMaps(
  configurations: Map<string, Map<string, unknown>>,
  section: string | undefined,
  emitChange: (payload: { section: string; key: string; value: unknown }) => void,
): WorkspaceConfiguration {
  const configMap = configurations.get(section || 'default') || new Map();

  return {
    get: <T>(key: string, defaultValue?: T): T | undefined => {
      const value = configMap.get(key);
      return value !== undefined ? (value as T) : defaultValue;
    },
    has: (key: string): boolean => configMap.has(key),
    update: async (key: string, value: unknown, global = false): Promise<void> => {
      const targetSection = global ? 'global' : (section || 'default');
      let targetMap = configurations.get(targetSection);

      if (!targetMap) {
        targetMap = new Map();
        configurations.set(targetSection, targetMap);
      }

      targetMap.set(key, value);
      emitChange({ section: targetSection, key, value });
    },
    inspect: <T>(key: string): ConfigurationInspect<T> | undefined => {
      const globalConfig = configurations.get('global');
      const workspaceConfig = configurations.get('default');
      const sectionConfig = section ? configurations.get(section) : undefined;

      return {
        key,
        defaultValue: undefined,
        globalValue: globalConfig?.get(key) as T | undefined,
        workspaceValue: workspaceConfig?.get(key) as T | undefined,
        workspaceFolderValue: sectionConfig?.get(key) as T | undefined,
      };
    },
  };
}
