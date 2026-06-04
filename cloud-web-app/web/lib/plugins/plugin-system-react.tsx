/**
 * React provider and hooks for the plugin runtime.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { HookCallback, Plugin, PluginLoaderConfig } from './plugin-system';
import { PluginLoader } from './plugin-system';

interface PluginContextValue {
  loader: PluginLoader;
}

const PluginContext = createContext<PluginContextValue | null>(null);

export function PluginProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config?: Partial<PluginLoaderConfig>;
}) {
  const value = useMemo(() => ({
    loader: new PluginLoader(config),
  }), [config]);

  useEffect(() => {
    return () => {
      value.loader.dispose();
    };
  }, [value]);

  return (
    <PluginContext.Provider value={value}>
      {children}
    </PluginContext.Provider>
  );
}

export function usePluginLoader() {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error('usePluginLoader must be used within PluginProvider');
  }
  return context.loader;
}

export function usePlugins() {
  const loader = usePluginLoader();
  const [plugins, setPlugins] = useState<Plugin[]>([]);

  useEffect(() => {
    const update = () => setPlugins(loader.getPlugins());

    update();
    loader.on('pluginLoaded', update);
    loader.on('pluginUnloaded', update);
    loader.on('pluginEnabled', update);
    loader.on('pluginDisabled', update);

    return () => {
      loader.off('pluginLoaded', update);
      loader.off('pluginUnloaded', update);
      loader.off('pluginEnabled', update);
      loader.off('pluginDisabled', update);
    };
  }, [loader]);

  return plugins;
}

export function usePlugin(id: string) {
  const loader = usePluginLoader();
  const [plugin, setPlugin] = useState<Plugin | undefined>();

  useEffect(() => {
    const update = () => setPlugin(loader.getPlugin(id));

    update();
    loader.on('pluginLoaded', update);
    loader.on('pluginUnloaded', update);
    loader.on('pluginEnabled', update);
    loader.on('pluginDisabled', update);
    loader.on('configChanged', update);

    return () => {
      loader.off('pluginLoaded', update);
      loader.off('pluginUnloaded', update);
      loader.off('pluginEnabled', update);
      loader.off('pluginDisabled', update);
      loader.off('configChanged', update);
    };
  }, [loader, id]);

  const enable = useCallback(async () => {
    await loader.enablePlugin(id);
  }, [loader, id]);

  const disable = useCallback(async () => {
    await loader.disablePlugin(id);
  }, [loader, id]);

  const reload = useCallback(async () => {
    await loader.reloadPlugin(id);
  }, [loader, id]);

  const setConfig = useCallback((key: string, value: unknown) => {
    loader.setPluginConfig(id, key, value);
  }, [loader, id]);

  return { plugin, enable, disable, reload, setConfig };
}

export function usePluginHook(name: string, callback: HookCallback, deps: unknown[] = []) {
  const loader = usePluginLoader();

  useEffect(() => {
    loader.registerHook(name, callback, 'react-hook');

    return () => {
      loader.unregisterHook(name, callback);
    };
  }, [loader, name, callback, deps]);
}

export function useCallHook(name: string) {
  const loader = usePluginLoader();

  return useCallback((...args: unknown[]) => {
    return loader.callHook(name, ...args);
  }, [loader, name]);
}
