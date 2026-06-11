type ExtensionStorageRecord = Record<string, unknown>;

function asStorageRecord(value: unknown): ExtensionStorageRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as ExtensionStorageRecord)
    : {};
}

export function getBrowserExtensionStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    if (!window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readExtensionState(prefix: string, extensionId: string, key: string): unknown {
  const storage = getBrowserExtensionStorage();
  if (!storage) return undefined;

  const raw = storage.getItem(`${prefix}${extensionId}`);
  if (!raw) return undefined;

  try {
    const data = asStorageRecord(JSON.parse(raw));
    return data[key];
  } catch {
    return undefined;
  }
}

export function writeExtensionState(
  prefix: string,
  extensionId: string,
  key: string,
  value: unknown
): void {
  const storage = getBrowserExtensionStorage();
  if (!storage) return;

  const storageKey = `${prefix}${extensionId}`;
  const raw = storage.getItem(storageKey);
  let data: ExtensionStorageRecord = {};

  if (raw) {
    try {
      data = asStorageRecord(JSON.parse(raw));
    } catch {
      data = {};
    }
  }

  data[key] = value;

  try {
    storage.setItem(storageKey, JSON.stringify(data));
  } catch {
    // Ignore quota and serialization failures; extension state is best-effort.
  }
}
