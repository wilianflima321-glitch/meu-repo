import type { IdeEnvironment, SettingCategory } from './ide-settings-types'

type IdeSettingsToolbarProps = {
  search: string
  category: string
  environment: IdeEnvironment
  categories: SettingCategory[]
  hasChanges: boolean
  loading: boolean
  saving: boolean
  publishing: boolean
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onEnvironmentChange: (value: IdeEnvironment) => void
  onResetDefaults: () => void
  onPublish: () => void
  onSave: () => void
}

export function IdeSettingsToolbar({
  search,
  category,
  environment,
  categories,
  hasChanges,
  loading,
  saving,
  publishing,
  onSearchChange,
  onCategoryChange,
  onEnvironmentChange,
  onResetDefaults,
  onPublish,
  onSave,
}: IdeSettingsToolbarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-2">
        <input type="text" placeholder="Search setting" value={search} onChange={(event) => onSearchChange(event.target.value)} className="rounded border p-2 text-sm" />
        <select value={environment} onChange={(event) => onEnvironmentChange(event.target.value as IdeEnvironment)} className="rounded border p-2 text-sm">
          <option value="staging">Staging</option>
          <option value="production">Production</option>
        </select>
        <select value={category} onChange={(event) => onCategoryChange(event.target.value)} className="rounded border p-2 text-sm">
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onResetDefaults}
          className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)]"
        >
          Restore defaults
        </button>
        {environment === 'staging' ? (
          <button
            type="button"
            onClick={onPublish}
            disabled={publishing}
            aria-label="Publish IDE settings to production"
            className="rounded bg-[var(--aethel-surface-primary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] disabled:opacity-50"
          >
            {publishing ? 'Publishing...' : 'Publish to production'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSave}
          disabled={saving || loading || !hasChanges}
          className="rounded bg-[var(--aethel-primary-dark)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
