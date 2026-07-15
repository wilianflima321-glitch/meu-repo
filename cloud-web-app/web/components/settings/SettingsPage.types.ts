import type { ReactNode } from 'react'

export type SettingInputType =
  | 'toggle'
  | 'select'
  | 'number'
  | 'text'
  | 'password'
  | 'color'
  | 'keybinding'
  | 'slider'

export type SettingValue = boolean | number | string | null

export interface SettingOption {
  label: string
  value: number | string
}

export interface SettingItem {
  id: string
  label: string
  description: string
  type: SettingInputType
  value: SettingValue
  defaultValue: SettingValue
  options?: SettingOption[]
  min?: number
  max?: number
  step?: number
  category: string
  subcategory?: string
  tags?: string[]
  requiresReload?: boolean
}

export interface SettingsSubcategory {
  id: string
  label: string
  count?: number
  visibleCount?: number
}

export interface SettingsCategory {
  id: string
  label: string
  icon: ReactNode
  description: string
  count?: number
  visibleCount?: number
  subcategories?: SettingsSubcategory[]
}

export interface SettingsGroup {
  id: string
  title: string
  description: string
  settings: SettingItem[]
}

export type SettingsState = Record<string, SettingValue>
