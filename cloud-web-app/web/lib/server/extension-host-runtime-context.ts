import * as fs from 'fs';
import * as path from 'path';
import type { Extension, ExtensionContext } from './extension-host/types';

export function createExtensionContext(extension: Extension): ExtensionContext {
  const homeDir = process.env.HOME || '';
  const globalStoragePath = path.join(homeDir, '.aethel', 'extensions', extension.id, 'global');
  const workspaceStoragePath = path.join(homeDir, '.aethel', 'extensions', extension.id, 'workspace');
  const logPath = path.join(homeDir, '.aethel', 'logs', extension.id);

  [globalStoragePath, workspaceStoragePath, logPath].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const globalState = new Map<string, unknown>();
  const workspaceState = new Map<string, unknown>();
  const secrets = new Map<string, string>();

  return {
    extensionPath: extension.extensionPath,
    extensionUri: `file://${extension.extensionPath}`,
    globalStoragePath,
    workspaceStoragePath,
    logPath,
    subscriptions: [],
    globalState: {
      get: <T>(key: string, defaultValue?: T) => (globalState.get(key) as T | undefined) ?? defaultValue,
      update: async (key: string, value: unknown) => { globalState.set(key, value); },
      keys: () => Array.from(globalState.keys()),
    },
    workspaceState: {
      get: <T>(key: string, defaultValue?: T) => (workspaceState.get(key) as T | undefined) ?? defaultValue,
      update: async (key: string, value: unknown) => { workspaceState.set(key, value); },
      keys: () => Array.from(workspaceState.keys()),
    },
    secrets: {
      get: async (key: string) => secrets.get(key),
      store: async (key: string, value: string) => { secrets.set(key, value); },
      delete: async (key: string) => { secrets.delete(key); },
    },
    asAbsolutePath: (relativePath: string) => path.join(extension.extensionPath, relativePath),
  };
}
