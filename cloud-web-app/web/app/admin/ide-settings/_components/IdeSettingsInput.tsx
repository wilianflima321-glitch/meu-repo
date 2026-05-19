import type { SettingDefinition, SettingValue } from './ide-settings-types'
import { toFormValue } from './ide-settings-utils'

type IdeSettingsInputProps = {
  settingKey: string
  definition: SettingDefinition
  value: SettingValue
  jsonInput?: string
  jsonError?: string
  onValueChange: (key: string, value: SettingValue) => void
  onJsonInputChange: (key: string, value: string) => void
  onJsonErrorChange: (key: string, error: string | null) => void
}

export function IdeSettingsInput({
  settingKey,
  definition,
  value,
  jsonInput,
  jsonError,
  onValueChange,
  onJsonInputChange,
  onJsonErrorChange,
}: IdeSettingsInputProps) {
  const currentValue = value ?? definition.default
  const formValue = toFormValue(currentValue)

  switch (definition.type) {
    case 'boolean':
      return <input type="checkbox" checked={Boolean(currentValue)} onChange={(event) => onValueChange(settingKey, event.target.checked)} />

    case 'number':
      return (
        <input
          type="number"
          value={formValue}
          min={definition.minimum}
          max={definition.maximum}
          onChange={(event) => onValueChange(settingKey, Number(event.target.value))}
          className="w-full rounded border p-2 text-sm"
        />
      )

    case 'enum':
      return (
        <select
          value={formValue || toFormValue(definition.default)}
          onChange={(event) => onValueChange(settingKey, event.target.value)}
          className="w-full rounded border p-2 text-sm"
        >
          {(definition.enum || []).map((option, index) => (
            <option key={option} value={option}>
              {definition.enumDescriptions?.[index] || String(option)}
            </option>
          ))}
        </select>
      )

    case 'array':
    case 'object':
      return (
        <div>
          <textarea
            value={jsonInput ?? JSON.stringify(currentValue ?? definition.default ?? null, null, 2)}
            onChange={(event) => {
              const inputValue = event.target.value
              onJsonInputChange(settingKey, inputValue)
              try {
                onValueChange(settingKey, JSON.parse(inputValue || 'null'))
                onJsonErrorChange(settingKey, null)
              } catch {
                onJsonErrorChange(settingKey, 'Invalid JSON')
              }
            }}
            className="min-h-[96px] w-full rounded border p-2 font-mono text-xs"
          />
          {jsonError ? <p className="mt-1 text-xs text-[var(--aethel-error)]">{jsonError}</p> : null}
        </div>
      )

    case 'string':
    default:
      return (
        <input
          type="text"
          value={formValue}
          onChange={(event) => onValueChange(settingKey, event.target.value)}
          className="w-full rounded border p-2 text-sm"
        />
      )
  }
}
