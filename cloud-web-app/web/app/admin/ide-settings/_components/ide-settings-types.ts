export type SettingValue = unknown
export type SettingEnumValue = string | number

export type SettingDefinition = {
  key: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum'
  default: SettingValue
  description?: string
  enum?: SettingEnumValue[]
  enumDescriptions?: string[]
  minimum?: number
  maximum?: number
}

export type SettingCategory = {
  id: string
  label: string
  icon?: string
  order: number
  settings: string[]
}

export type IdeSettingsPayload = {
  categories: SettingCategory[]
  definitions: Record<string, SettingDefinition>
  values: Record<string, SettingValue>
  environment?: 'staging' | 'production'
}

export type HistoryItem = {
  id: string
  action: string
  adminEmail?: string | null
  adminRole?: string | null
  severity?: string | null
  createdAt: string
  metadata?: SettingValue
}

export type HistoryMetadata = {
  environment?: string
  to?: string
  from?: string
  updates?: Record<string, SettingValue>
}

export type IdeEnvironment = 'staging' | 'production'
