import type { LucideIcon } from 'lucide-react';

export type SettingType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'enum'
  | 'color';
export interface SettingDefinition {
  key: string;
  type: SettingType;
  default: unknown;
  description: string;
  category: string[];
  enum?: string[];
  enumDescriptions?: string[];
  minimum?: number;
  maximum?: number;
  items?: { type: string };
  markdownDescription?: string;
  deprecationMessage?: string;
  scope?: 'application' | 'machine' | 'window' | 'resource' | 'language';
  tags?: string[];
}
export interface SettingValue {
  userValue?: unknown;
  workspaceValue?: unknown;
  defaultValue: unknown;
}
export type SettingsScope = 'user' | 'workspace';
export interface SettingsCategory {
  id: string;
  label: string;
  icon?: LucideIcon;
  children?: SettingsCategory[];
}
export interface SettingsContextValue {
  settings: Map<string, SettingDefinition>;
  values: Map<string, SettingValue>;
  scope: SettingsScope;
  setScope: (scope: SettingsScope) => void;
  getValue: (key: string) => unknown;
  setValue: (key: string, value: unknown) => void;
  resetValue: (key: string) => void;
  isModified: (key: string) => boolean;
}
