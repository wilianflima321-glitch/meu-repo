import { ExtensionKind, ExtensionMode } from './extension-contracts'
import type {
  EnvironmentVariableCollection,
  EnvironmentVariableMutator,
  ExtensionContext,
  ExtensionManifest,
  Memento,
  SecretStorage,
} from './extension-contracts'

export function createExtensionMemento(key: string): Memento {
  void key

    const storage = new Map<string, unknown>();
    const syncKeys = new Set<string>();

    return {
      keys: () => Array.from(storage.keys()),
      get: <T>(k: string, defaultValue?: T): T | undefined => {
        return storage.has(k) ? storage.get(k) as T : defaultValue;
      },
      update: async (k: string, value: unknown) => {
        if (value === undefined) {
          storage.delete(k);
        } else {
          storage.set(k, value);
        }
      },
      setKeysForSync: (keys: readonly string[]) => {
        syncKeys.clear();
        keys.forEach(k => syncKeys.add(k));
      },
    };
  }

export function createExtensionSecretStorage(extensionId: string): SecretStorage {
  void extensionId

    const secrets = new Map<string, string>();
    const listeners = new Set<(e: { key: string }) => void>();

    return {
      get: async (key: string) => secrets.get(key),
      store: async (key: string, value: string) => {
        secrets.set(key, value);
        listeners.forEach(l => l({ key }));
      },
      delete: async (key: string) => {
        secrets.delete(key);
        listeners.forEach(l => l({ key }));
      },
      onDidChange: (listener) => {
        listeners.add(listener);
        return { dispose: () => listeners.delete(listener) };
      },
    };
  }

export function createExtensionEnvVarCollection(): EnvironmentVariableCollection {

    const vars = new Map<string, EnvironmentVariableMutator>();

    return {
      persistent: true,
      description: undefined,
      replace: (variable, value, options) => vars.set(variable, { value, type: 1, options }),
      append: (variable, value, options) => vars.set(variable, { value, type: 2, options }),
      prepend: (variable, value, options) => vars.set(variable, { value, type: 3, options }),
      get: (variable) => vars.get(variable),
      forEach: (callback) => vars.forEach((v, k) => callback(k, v, vars)),
      delete: (variable) => { vars.delete(variable); },
      clear: () => vars.clear(),
    };
  }

export function createExtensionContext(input: {
  id: string
  manifest: ExtensionManifest
  extensionPath: string
  activateExtension: (id: string) => Promise<unknown>
}): ExtensionContext {
  const { id, manifest, extensionPath, activateExtension } = input
  const globalStoragePath = `/extensions/${id}/globalStorage`
  const storagePath = `/workspace/extensions/${id}/storage`
  const logPath = `/extensions/${id}/logs`
  const globalState = createExtensionMemento(`${id}:global`)
  const workspaceState = createExtensionMemento(`${id}:workspace`)
  const secrets = createExtensionSecretStorage(id)
  const subscriptions: { dispose(): void }[] = []

  return {
    extensionId: id,
    extensionUri: extensionPath,
    extensionPath,
    globalStoragePath,
    storagePath,
    logPath,
    globalState,
    workspaceState,
    secrets,
    subscriptions,
    extensionMode: ExtensionMode.Production,
    environmentVariableCollection: createExtensionEnvVarCollection(),
    extension: {
      id,
      extensionUri: extensionPath,
      extensionPath,
      isActive: false,
      packageJSON: manifest,
      extensionKind: ExtensionKind.UI,
      exports: null,
      activate: () => activateExtension(id),
    },
    globalStorageUri: { fsPath: globalStoragePath, path: globalStoragePath },
    storageUri: { fsPath: storagePath, path: storagePath },
    logUri: { fsPath: logPath, path: logPath },
  }
}
