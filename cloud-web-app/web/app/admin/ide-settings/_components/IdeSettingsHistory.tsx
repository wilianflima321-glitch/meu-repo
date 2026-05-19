import type { HistoryItem } from './ide-settings-types'
import { formatEnvironment, toHistoryMetadata } from './ide-settings-utils'

type IdeSettingsHistoryProps = {
  history: HistoryItem[]
  onRefresh: () => void
}

export function IdeSettingsHistory({ history, onRefresh }: IdeSettingsHistoryProps) {
  return (
    <div className="rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Change history</h2>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)]"
        >
          Refresh
        </button>
      </div>
      <table className="w-full table-auto">
        <thead>
          <tr className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-sm">
            <th className="p-2 text-left">Action</th>
            <th className="p-2 text-left">Admin</th>
            <th className="p-2 text-left">Environment</th>
            <th className="p-2 text-left">Details</th>
            <th className="p-2 text-left">Date</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td className="p-2 text-sm text-[var(--aethel-text-tertiary)]" colSpan={5}>
                No history available.
              </td>
            </tr>
          ) : (
            history.map((item) => {
              const metadata = toHistoryMetadata(item.metadata)
              return (
                <tr key={item.id} className="border-t">
                  <td className="p-2">
                    <span className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-secondary)]">{item.action}</span>
                  </td>
                  <td className="p-2">{item.adminEmail || '?'}</td>
                  <td className="p-2">{formatEnvironment(metadata.environment || metadata.to)}</td>
                  <td className="p-2 text-xs text-[var(--aethel-text-secondary)]">
                    {item.action === 'IDE_SETTINGS_PUBLISH'
                      ? `Publication ${formatEnvironment(metadata.from)} ? ${formatEnvironment(metadata.to)}`
                      : `Updates: ${Object.keys(metadata.updates || {}).length}`}
                  </td>
                  <td className="p-2">{new Date(item.createdAt).toLocaleString()}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
