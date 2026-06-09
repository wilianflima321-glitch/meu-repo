'use client'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const memoryStore = new Map<string, string>()

function getStorage(): StorageLike {
  if (typeof window === 'undefined') return memoryStorage

  try {
    const storage = window.localStorage
    const probeKey = '__aethel_storage_probe__'
    storage.setItem(probeKey, '1')
    storage.removeItem(probeKey)
    return storage
  } catch {
    return memoryStorage
  }
}

const memoryStorage: StorageLike = {
  getItem: (key) => memoryStore.get(key) ?? null,
  setItem: (key, value) => {
    memoryStore.set(key, value)
  },
  removeItem: (key) => {
    memoryStore.delete(key)
  },
}

export function readClientJson<T>(key: string, fallback: T): T {
  try {
    const raw = getStorage().getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeClientJson<T>(key: string, value: T): boolean {
  try {
    getStorage().setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeClientStorageItem(key: string): void {
  try {
    getStorage().removeItem(key)
  } catch {
    memoryStorage.removeItem(key)
  }
}
