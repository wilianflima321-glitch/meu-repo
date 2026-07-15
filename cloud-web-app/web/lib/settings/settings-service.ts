/**
 * Aethel Settings System
 *
 * Sistema completo de configurações com sync, profiles,
 * e importação/exportação.
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

import type { SettingDefinition, SettingsRecord, SettingValue, SyncState, UserProfile } from './settings-service.types';
import { DEFAULT_SETTINGS, SETTING_DEFINITIONS } from './settings-service.catalog';
export type { SettingCategory, SettingDefinition, SettingEnumValue, SettingsRecord, SettingValue, SyncConflict, SyncState, UserProfile } from './settings-service.types';
export { DEFAULT_SETTINGS, SETTING_CATEGORIES, SETTING_DEFINITIONS } from './settings-service.catalog';

// ============================================================================
// SETTINGS SERVICE
// ============================================================================

export class SettingsService extends EventEmitter {
  private settings: Map<string, SettingValue> = new Map();
  private workspaceSettings: Map<string, SettingValue> = new Map();
  private profiles: Map<string, UserProfile> = new Map();
  private activeProfileId: string = 'default';
  private syncState: SyncState = {
    enabled: false,
    lastSync: null,
    syncedItems: [],
    conflicts: [],
    status: 'idle',
  };

  constructor() {
    super();
    this.loadDefaults();
  }

  // ==========================================================================
  // SETTINGS CRUD
  // ==========================================================================

  get<T = SettingValue>(key: string): T {
    // Check workspace settings first
    if (this.workspaceSettings.has(key)) {
      return this.workspaceSettings.get(key) as T;
    }
    // Then user settings
    if (this.settings.has(key)) {
      return this.settings.get(key) as T;
    }
    // Fall back to default
    return DEFAULT_SETTINGS[key] as T;
  }

  async set(key: string, value: SettingValue, scope: 'user' | 'workspace' = 'user'): Promise<void> {
    const oldValue = this.get(key);

    if (scope === 'workspace') {
      this.workspaceSettings.set(key, value);
    } else {
      this.settings.set(key, value);
    }

    this.emit('change', { key, value, oldValue, scope });

    // Update profile if active
    if (scope === 'user' && this.activeProfileId !== 'default') {
      const profile = this.profiles.get(this.activeProfileId);
      if (profile) {
        profile.settings[key] = value;
        profile.updatedAt = Date.now();
      }
    }
  }

  async reset(key: string): Promise<void> {
    const defaultValue = DEFAULT_SETTINGS[key];
    await this.set(key, defaultValue);
  }

  async resetAll(): Promise<void> {
    this.settings.clear();
    this.workspaceSettings.clear();
    this.loadDefaults();
    this.emit('reset');
  }

  has(key: string): boolean {
    return this.settings.has(key) || this.workspaceSettings.has(key) || key in DEFAULT_SETTINGS;
  }

  getAll(): SettingsRecord {
    const result: SettingsRecord = { ...DEFAULT_SETTINGS };

    for (const [key, value] of this.settings) {
      result[key] = value;
    }

    for (const [key, value] of this.workspaceSettings) {
      result[key] = value;
    }

    return result;
  }

  getUserSettings(): SettingsRecord {
    const result: SettingsRecord = {};
    for (const [key, value] of this.settings) {
      result[key] = value;
    }
    return result;
  }

  getWorkspaceSettings(): SettingsRecord {
    const result: SettingsRecord = {};
    for (const [key, value] of this.workspaceSettings) {
      result[key] = value;
    }
    return result;
  }

  // ==========================================================================
  // PROFILES
  // ==========================================================================

  async createProfile(name: string, icon?: string): Promise<UserProfile> {
    const id = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const profile: UserProfile = {
      id,
      name,
      icon,
      settings: this.getUserSettings(),
      extensions: [],
      keybindings: [],
      snippets: {},
      tasks: [],
      globalState: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.profiles.set(id, profile);
    this.emit('profileCreated', profile);

    return profile;
  }

  async deleteProfile(id: string): Promise<void> {
    if (id === 'default') {
      throw new Error('Cannot delete default profile');
    }

    if (this.activeProfileId === id) {
      await this.switchProfile('default');
    }

    this.profiles.delete(id);
    this.emit('profileDeleted', id);
  }

  async switchProfile(id: string): Promise<void> {
    if (id !== 'default' && !this.profiles.has(id)) {
      throw new Error(`Profile ${id} not found`);
    }

    const oldProfileId = this.activeProfileId;
    this.activeProfileId = id;

    // Load profile settings
    if (id !== 'default') {
      const profile = this.profiles.get(id)!;
      this.settings.clear();
      for (const [key, value] of Object.entries(profile.settings)) {
        this.settings.set(key, value);
      }
    } else {
      this.settings.clear();
      this.loadDefaults();
    }

    this.emit('profileSwitched', { oldProfileId, newProfileId: id });
  }

  getActiveProfile(): UserProfile | null {
    return this.profiles.get(this.activeProfileId) || null;
  }

  getAllProfiles(): UserProfile[] {
    return Array.from(this.profiles.values());
  }

  // ==========================================================================
  // SYNC
  // ==========================================================================

  async enableSync(items: SyncState['syncedItems']): Promise<void> {
    this.syncState.enabled = true;
    this.syncState.syncedItems = items;

    this.emit('syncEnabled', items);

    // Initial sync
    await this.sync();
  }

  async disableSync(): Promise<void> {
    this.syncState.enabled = false;
    this.syncState.syncedItems = [];

    this.emit('syncDisabled');
  }

  async sync(): Promise<void> {
    if (!this.syncState.enabled) return;

    this.syncState.status = 'syncing';
    this.emit('syncStarted');

    try {
      // Simulate sync
      await this.sleep(1000);

      this.syncState.lastSync = Date.now();
      this.syncState.status = 'idle';
      this.syncState.error = undefined;

      this.emit('syncCompleted', { lastSync: this.syncState.lastSync });

    } catch (error: unknown) {
      this.syncState.status = 'error';
      this.syncState.error = error instanceof Error ? error.message : String(error);

      this.emit('syncError', error);
    }
  }

  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  async resolveConflict(key: string, resolution: 'local' | 'remote'): Promise<void> {
    const conflict = this.syncState.conflicts.find(c => c.key === key);
    if (!conflict) return;

    if (resolution === 'remote') {
      await this.set(key, conflict.remoteValue);
    }
    // If local, keep current value

    this.syncState.conflicts = this.syncState.conflicts.filter(c => c.key !== key);

    this.emit('conflictResolved', { key, resolution });
  }

  // ==========================================================================
  // IMPORT / EXPORT
  // ==========================================================================

  async exportSettings(): Promise<string> {
    const data = {
      version: 1,
      timestamp: Date.now(),
      settings: this.getUserSettings(),
      profiles: Array.from(this.profiles.values()),
    };

    return JSON.stringify(data, null, 2);
  }

  async importSettings(json: string, merge: boolean = true): Promise<void> {
    const data = JSON.parse(json) as {
      version?: number;
      settings?: SettingsRecord;
      profiles?: UserProfile[];
    };

    if (!data.version || !data.settings) {
      throw new Error('Invalid settings file');
    }

    if (!merge) {
      this.settings.clear();
    }

    for (const [key, value] of Object.entries(data.settings)) {
      this.settings.set(key, value);
    }

    if (data.profiles) {
      for (const profile of data.profiles) {
        this.profiles.set(profile.id, profile);
      }
    }

    this.emit('imported', { merge });
  }

  // ==========================================================================
  // SEARCH
  // ==========================================================================

  search(query: string): Array<{ key: string; value: SettingValue; definition?: SettingDefinition }> {
    const results: Array<{ key: string; value: SettingValue; definition?: SettingDefinition }> = [];
    const lowerQuery = query.toLowerCase();

    for (const [key, definition] of Object.entries(SETTING_DEFINITIONS)) {
      if (
        key.toLowerCase().includes(lowerQuery) ||
        definition.description.toLowerCase().includes(lowerQuery) ||
        definition.tags?.some(t => t.toLowerCase().includes(lowerQuery))
      ) {
        results.push({
          key,
          value: this.get(key),
          definition,
        });
      }
    }

    return results;
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  validate(key: string, value: SettingValue): { valid: boolean; error?: string } {
    const definition = SETTING_DEFINITIONS[key];
    if (!definition) {
      return { valid: true }; // Unknown settings are allowed
    }

    // Type check
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (definition.type !== 'enum' && actualType !== definition.type && value !== null) {
      return { valid: false, error: `Expected ${definition.type}, got ${actualType}` };
    }

    // Enum check
    if (
      definition.type === 'enum' &&
      definition.enum &&
      (typeof value !== 'string' && typeof value !== 'number' || !definition.enum.includes(value))
    ) {
      return { valid: false, error: `Value must be one of: ${definition.enum.join(', ')}` };
    }

    // Number range
    if (definition.type === 'number' && typeof value === 'number') {
      if (definition.minimum !== undefined && value < definition.minimum) {
        return { valid: false, error: `Value must be at least ${definition.minimum}` };
      }
      if (definition.maximum !== undefined && value > definition.maximum) {
        return { valid: false, error: `Value must be at most ${definition.maximum}` };
      }
    }

    // Pattern check
    if (definition.pattern && typeof value === 'string') {
      if (!new RegExp(definition.pattern).test(value)) {
        return { valid: false, error: 'Value does not match required pattern' };
      }
    }

    return { valid: true };
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  private loadDefaults(): void {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (!this.settings.has(key)) {
        // Don't set default as user setting, just use DEFAULT_SETTINGS as fallback
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const settingsService = new SettingsService();

export default settingsService;
