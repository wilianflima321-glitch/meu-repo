/* eslint-disable max-len */
/**
 * Lightweight LlmProviderRegistry
 *
 * This is a conservative, low-risk registry used to centralize provider
 * definitions. It is intentionally minimal and synchronous so it remains easy
 * to reason about while we migrate provider config from scattered locations
 * into a single preference namespace.
 */

export type LlmProviderDefinition = {
  id: string;
  title?: string;
  description?: string;
  type?: string; // e.g. 'http', 'sdk', 'mock'
  config?: Record<string, unknown>;
  enabled?: boolean;
};

export class LlmProviderRegistry {
  protected providers: Map<string, LlmProviderDefinition> = new Map();

  register(def: LlmProviderDefinition): void {
    if (!def || !def.id) {
      throw new Error('LlmProviderRegistry.register: provider definition must include an id');
    }
    this.providers.set(def.id, Object.assign({ enabled: true }, def));
  }

  getProvider(id: string): LlmProviderDefinition | undefined {
    return this.providers.get(id);
  }

  list(): LlmProviderDefinition[] {
    return Array.from(this.providers.values());
  }

  unregister(id: string): boolean {
    return this.providers.delete(id);
  }

  clear(): void {
    this.providers.clear();
  }
}

// Export a shared singleton for convenience in the short-term migration path.
export const defaultLlmProviderRegistry = new LlmProviderRegistry();
