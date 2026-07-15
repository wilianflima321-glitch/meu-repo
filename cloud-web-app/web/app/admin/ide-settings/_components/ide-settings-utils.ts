import type { HistoryMetadata, SettingValue } from './ide-settings-types'

export const environmentLabels = {
  staging: 'Staging',
  production: 'Production',
} as const

export function isRecord(value: SettingValue): value is Record<string, SettingValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function toFormValue(value: SettingValue): string | number {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

export function toHistoryMetadata(value: SettingValue): HistoryMetadata {
  return isRecord(value) ? (value as HistoryMetadata) : {}
}

export function formatEnvironment(value?: string | null) {
  if (!value) return '?'
  if (value === 'staging' || value === 'production') return environmentLabels[value]
  return value
}

export function areSettingValuesEqual(a: SettingValue, b: SettingValue) {
  return JSON.stringify(a) === JSON.stringify(b)
}
