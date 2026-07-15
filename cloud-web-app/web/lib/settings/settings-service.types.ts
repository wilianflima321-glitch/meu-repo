export type SettingValue = unknown;
export type SettingEnumValue = string | number;
export type SettingsRecord = Record<string, SettingValue>;

export interface SettingDefinition {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';
  default: SettingValue;
  description: string;
  markdownDescription?: string;
  scope: 'user' | 'workspace' | 'window' | 'resource' | 'machine';
  enum?: SettingEnumValue[];
  enumDescriptions?: string[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  items?: SettingDefinition;
  properties?: Record<string, SettingDefinition>;
  deprecationMessage?: string;
  tags?: string[];
  order?: number;
}

export interface SettingCategory {
  id: string;
  label: string;
  icon?: string;
  order: number;
  settings: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  icon?: string;
  settings: SettingsRecord;
  extensions: string[];
  keybindings: SettingValue[];
  snippets: SettingsRecord;
  tasks: SettingValue[];
  globalState: SettingsRecord;
  createdAt: number;
  updatedAt: number;
}

export interface SyncState {
  enabled: boolean;
  lastSync: number | null;
  syncedItems: ('settings' | 'extensions' | 'keybindings' | 'snippets' | 'tasks' | 'profiles')[];
  conflicts: SyncConflict[];
  status: 'idle' | 'syncing' | 'error';
  error?: string;
}

export interface SyncConflict {
  key: string;
  localValue: SettingValue;
  remoteValue: SettingValue;
  timestamp: number;
}
