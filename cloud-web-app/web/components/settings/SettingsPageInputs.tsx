import type { ReactElement } from 'react'
import { RotateCcw } from 'lucide-react'

import type {
  SettingInputType,
  SettingItem,
  SettingValue,
} from './SettingsPage.types'

interface SettingInputProps {
  setting: SettingItem
  value: SettingValue
  onChange: (value: SettingValue) => void
}

function SettingToggle({ setting, value, onChange }: SettingInputProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-label={setting.label}
      aria-pressed={Boolean(value)}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        value ? 'bg-[var(--aethel-info)]' : 'bg-[var(--aethel-surface-quaternary)]'
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--aethel-surface-secondary)] transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function SettingSelect({ setting, value, onChange }: SettingInputProps) {
  const selectValue: number | string =
    typeof value === 'number' || typeof value === 'string' ? value : ''

  return (
    <select
      value={selectValue}
      onChange={(event) => {
        const nextValue =
          setting.options?.find((option) => String(option.value) === event.target.value)?.value ??
          event.target.value
        onChange(nextValue)
      }}
      className="min-w-[200px] rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] px-3 py-1.5 text-sm text-[var(--aethel-text-primary)]"
    >
      {setting.options?.map((option) => (
        <option key={option.value} value={option.value ?? ''}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function SettingNumber({ setting, value, onChange }: SettingInputProps) {
  const numberValue: number | string = typeof value === 'number' ? value : ''

  return (
    <input
      type="number"
      value={numberValue}
      onChange={(event) => onChange(Number(event.target.value))}
      min={setting.min}
      max={setting.max}
      step={setting.step ?? 1}
      className="w-24 rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] px-3 py-1.5 text-sm text-[var(--aethel-text-primary)]"
    />
  )
}

function SettingText({ value, onChange }: SettingInputProps) {
  const textValue: number | string =
    typeof value === 'number' || typeof value === 'string' ? value : ''

  return (
    <input
      type="text"
      value={textValue}
      onChange={(event) => onChange(event.target.value)}
      className="min-w-[300px] rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] px-3 py-1.5 text-sm text-[var(--aethel-text-primary)]"
    />
  )
}

function SettingSlider({ setting, value, onChange }: SettingInputProps) {
  const displayValue: number | string = typeof value === 'number' ? value : ''

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        value={displayValue}
        onChange={(event) => onChange(Number(event.target.value))}
        min={setting.min}
        max={setting.max}
        step={setting.step ?? 1}
        className="w-32 accent-[var(--aethel-info)]"
      />
      <span className="w-12 text-sm text-[var(--aethel-text-tertiary)]">{displayValue}</span>
    </div>
  )
}

const INPUT_COMPONENTS: Record<
  SettingInputType,
  (props: SettingInputProps) => ReactElement
> = {
  color: SettingText,
  keybinding: SettingText,
  number: SettingNumber,
  select: SettingSelect,
  slider: SettingSlider,
  text: SettingText,
  toggle: SettingToggle,
}

interface SettingRowProps {
  setting: SettingItem
  value: SettingValue
  onChange: (id: string, value: SettingValue) => void
  isModified: boolean
  onReset: () => void
}

export function SettingRow({
  setting,
  value,
  onChange,
  isModified,
  onReset,
}: SettingRowProps) {
  const InputComponent = INPUT_COMPONENTS[setting.type]

  return (
    <div className="group flex items-start justify-between border-b border-[var(--aethel-border-primary)] py-4">
      <div className="flex-1 pr-8">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{setting.label}</span>
          {isModified && (
            <span className="rounded bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-warning-light)]">
              Modified
            </span>
          )}
          {setting.requiresReload && (
            <span className="rounded bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-info-light)]">
              Requires Reload
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-[var(--aethel-text-quaternary)]">{setting.description}</p>
        <p className="mt-1 font-mono text-[10px] text-[var(--aethel-text-quaternary)]">{setting.id}</p>
      </div>

      <div className="flex items-center gap-2">
        <InputComponent
          setting={setting}
          value={value}
          onChange={(nextValue) => onChange(setting.id, nextValue)}
        />
        {isModified && (
          <button
            type="button"
            onClick={onReset}
            className="p-1 text-[var(--aethel-text-quaternary)] opacity-0 transition-opacity hover:text-[var(--aethel-text-primary)] group-hover:opacity-100"
            title="Reset to default"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
