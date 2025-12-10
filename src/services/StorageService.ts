export interface StorageOptions {
  namespace?: string;
  encrypt?: boolean;
  compress?: boolean;
}

export class StorageService {
  private static instance: StorageService;
  private namespace: string;

  private constructor() {
    this.namespace = 'ide';
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private getKey(key: string, namespace?: string): string {
    const ns = namespace || this.namespace;
    return `${ns}:${key}`;
  }

  public set<T>(key: string, value: T, options?: StorageOptions): boolean {
    try {
      const fullKey = this.getKey(key, options?.namespace);
      const serialized = JSON.stringify(value);
      localStorage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  public get<T>(key: string, defaultValue?: T, options?: StorageOptions): T | undefined {
    try {
      const fullKey = this.getKey(key, options?.namespace);
      const item = localStorage.getItem(fullKey);
      
      if (item === null) {
        return defaultValue;
      }

      return JSON.parse(item) as T;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  }

  public remove(key: string, options?: StorageOptions): boolean {
    try {
      const fullKey = this.getKey(key, options?.namespace);
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  public clear(namespace?: string): boolean {
    try {
      const ns = namespace || this.namespace;
      const keys = this.getKeys(ns);
      keys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }

  public has(key: string, options?: StorageOptions): boolean {
    const fullKey = this.getKey(key, options?.namespace);
    return localStorage.getItem(fullKey) !== null;
  }

  public getKeys(namespace?: string): string[] {
    const ns = namespace || this.namespace;
    const prefix = `${ns}:`;
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key);
      }
    }

    return keys;
  }

  public getSize(): number {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          size += key.length + value.length;
        }
      }
    }
    return size;
  }

  public getAvailableSpace(): number {
    const maxSize = 5 * 1024 * 1024; // 5MB typical limit
    return maxSize - this.getSize();
  }

  public setNamespace(namespace: string): void {
    this.namespace = namespace;
  }

  public getNamespace(): string {
    return this.namespace;
  }

  // Session storage methods
  public setSession<T>(key: string, value: T, options?: StorageOptions): boolean {
    try {
      const fullKey = this.getKey(key, options?.namespace);
      const serialized = JSON.stringify(value);
      sessionStorage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      console.error('Session storage set error:', error);
      return false;
    }
  }

  public getSession<T>(key: string, defaultValue?: T, options?: StorageOptions): T | undefined {
    try {
      const fullKey = this.getKey(key, options?.namespace);
      const item = sessionStorage.getItem(fullKey);
      
      if (item === null) {
        return defaultValue;
      }

      return JSON.parse(item) as T;
    } catch (error) {
      console.error('Session storage get error:', error);
      return defaultValue;
    }
  }

  public removeSession(key: string, options?: StorageOptions): boolean {
    try {
      const fullKey = this.getKey(key, options?.namespace);
      sessionStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error('Session storage remove error:', error);
      return false;
    }
  }

  public clearSession(namespace?: string): boolean {
    try {
      const ns = namespace || this.namespace;
      const prefix = `${ns}:`;

      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(prefix)) {
          sessionStorage.removeItem(key);
        }
      }
      return true;
    } catch (error) {
      console.error('Session storage clear error:', error);
      return false;
    }
  }

  // Utility methods
  public export(): Record<string, any> {
    const data: Record<string, any> = {};
    const keys = this.getKeys();

    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    });

    return data;
  }

  public import(data: Record<string, any>): boolean {
    try {
      Object.entries(data).forEach(([key, value]) => {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, serialized);
      });
      return true;
    } catch (error) {
      console.error('Storage import error:', error);
      return false;
    }
  }

  public backup(): string {
    return JSON.stringify(this.export(), null, 2);
  }

  public restore(backup: string): boolean {
    try {
      const data = JSON.parse(backup);
      return this.import(data);
    } catch (error) {
      console.error('Storage restore error:', error);
      return false;
    }
  }
}
