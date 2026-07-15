import type { SettingDefinition, SettingValue } from './ide-settings-types'
import { IdeSettingsInput } from './IdeSettingsInput'

type IdeSettingsListProps = {
  loading: boolean
  filteredKeys: string[]
  definitions: Record<string, SettingDefinition>
  values: Record<string, SettingValue>
  jsonInputs: Record<string, string>
  jsonErrors: Record<string, string>
  onValueChange: (key: string, value: SettingValue) => void
  onJsonInputChange: (key: string, value: string) => void
  onJsonErrorChange: (key: string, error: string | null) => void
}

export function IdeSettingsList({
  loading,
  filteredKeys,
  definitions,
  values,
  jsonInputs,
  jsonErrors,
  onValueChange,
  onJsonInputChange,
  onJsonErrorChange,
}: IdeSettingsListProps) {
  if (loading) return <p className="text-sm text-[var(--aethel-text-tertiary)]">Loading settings...</p>
  if (filteredKeys.length === 0) return <p className="text-sm text-[var(--aethel-text-tertiary)]">No setting found.</p>

  return (
    <div className="space-y-4">
      {filteredKeys.map((key) => {
        const definition = definitions[key]
        if (!definition) return null

        return (
          <div key={key} className="rounded border p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="md:w-1/2">
                <p className="font-medium">{key}</p>
                <p className="text-xs text-[var(--aethel-text-tertiary)]">{definition.description || 'No description'}</p>
                <p className="mt-1 text-[11px] text-[var(--aethel-text-tertiary)]">Type: {definition.type}</p>
              </div>
              <div className="md:w-1/2">
                <IdeSettingsInput
                  settingKey={key}
                  definition={definition}
                  value={values[key]}
                  jsonInput={jsonInputs[key]}
                  jsonError={jsonErrors[key]}
                  onValueChange={onValueChange}
                  onJsonInputChange={onJsonInputChange}
                  onJsonErrorChange={onJsonErrorChange}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
