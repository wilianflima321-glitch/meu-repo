'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle, Layers, Sliders } from 'lucide-react'

import { AdminSummaryGrid } from '@/components/admin/AdminSummaryGrid'

import { IdeSettingsHeader } from './_components/IdeSettingsHeader'
import { IdeSettingsHistory } from './_components/IdeSettingsHistory'
import { IdeSettingsList } from './_components/IdeSettingsList'
import { IdeSettingsToolbar } from './_components/IdeSettingsToolbar'
import type { HistoryItem, IdeEnvironment, IdeSettingsPayload, SettingValue } from './_components/ide-settings-types'
import { areSettingValuesEqual } from './_components/ide-settings-utils'

export function AdminIdeSettingsPanel() {
  const [data, setData] = useState<IdeSettingsPayload | null>(null)
  const [values, setValues] = useState<Record<string, SettingValue>>({})
  const [originalValues, setOriginalValues] = useState<Record<string, SettingValue>>({})
  const [jsonInputs, setJsonInputs] = useState<Record<string, string>>({})
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [environment, setEnvironment] = useState<IdeEnvironment>('staging')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [publishing, setPublishing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/ide-settings?env=${environment}`)
      if (!response.ok) throw new Error('Failed to load IDE settings')
      const json = await response.json()
      setData(json)
      setValues(json.values || {})
      setOriginalValues(json.values || {})
      setJsonInputs(buildInitialJsonInputs(json))
      setJsonErrors({})
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading settings')
    } finally {
      setLoading(false)
    }
  }, [environment])

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/ide-settings/history?limit=20')
      if (!response.ok) throw new Error('Failed to load history')
      const json = await response.json()
      setHistory(json.items || [])
    } catch {
      setHistory([])
    }
  }, [])

  useEffect(() => {
    fetchSettings()
    fetchHistory()
  }, [fetchSettings, fetchHistory])

  const categories = useMemo(() => (data?.categories || []).slice().sort((a, b) => a.order - b.order), [data])

  const filteredKeys = useMemo(() => {
    const definitions = data?.definitions || {}
    const keys = Object.keys(definitions)
    const categorySettings = category === 'all' ? new Set(keys) : new Set(categories.find((item) => item.id === category)?.settings || [])

    return keys.filter((key) => {
      if (!categorySettings.has(key)) return false
      const term = search.trim().toLowerCase()
      if (!term) return true
      const definition = definitions[key]
      return key.toLowerCase().includes(term) || (definition?.description || '').toLowerCase().includes(term)
    })
  }, [data, categories, category, search])

  const hasChanges = useMemo(
    () => filteredKeys.some((key) => !areSettingValuesEqual(values[key], originalValues[key])),
    [filteredKeys, originalValues, values],
  )

  const handleSave = async () => {
    if (Object.keys(jsonErrors).length > 0) {
      setError('Fix JSON errors before saving.')
      return
    }

    const updates = filteredKeys.reduce<Record<string, SettingValue>>((acc, key) => {
      if (!areSettingValuesEqual(values[key], originalValues[key])) acc[key] = values[key]
      return acc
    }, {})

    if (Object.keys(updates).length === 0) {
      setError('No changes to save.')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/admin/ide-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, environment }),
      })
      if (!response.ok) throw new Error('Failed to save settings')
      await fetchSettings()
      await fetchHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    try {
      setPublishing(true)
      const response = await fetch('/api/admin/ide-settings/publish?from=staging&to=production', { method: 'POST' })
      if (!response.ok) throw new Error('Failed to publish to production')
      await fetchHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error publishing settings')
    } finally {
      setPublishing(false)
    }
  }

  const handleResetDefaults = () => {
    if (!data?.definitions) return
    const nextValues = { ...values }
    const nextJsonInputs = { ...jsonInputs }

    filteredKeys.forEach((key) => {
      nextValues[key] = data.definitions[key]?.default ?? null
      if (data.definitions[key]?.type === 'array' || data.definitions[key]?.type === 'object') {
        nextJsonInputs[key] = JSON.stringify(nextValues[key], null, 2)
      }
    })

    setValues(nextValues)
    setJsonInputs(nextJsonInputs)
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(values, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ide-settings-${new Date().toISOString()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <IdeSettingsHeader lastUpdated={lastUpdated} onRefresh={fetchSettings} onExport={handleExport} />

      {error ? <div className="mb-4 rounded border border-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] p-3 text-[var(--aethel-error)]">{error}</div> : null}

      <AdminSummaryGrid
        className="mb-6"
        columns={3}
        items={[
          { icon: Layers, label: 'Categories', value: categories.length },
          { icon: Sliders, label: 'Settings', value: Object.keys(data?.definitions || {}).length },
          { icon: hasChanges ? AlertTriangle : CheckCircle, label: 'Pending changes', value: hasChanges ? 'Yes' : 'No', tone: hasChanges ? 'warning' : 'success' },
        ]}
      />

      <div className="mb-6 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 shadow">
        <IdeSettingsToolbar
          search={search}
          category={category}
          environment={environment}
          categories={categories}
          hasChanges={hasChanges}
          loading={loading}
          saving={saving}
          publishing={publishing}
          onSearchChange={setSearch}
          onCategoryChange={setCategory}
          onEnvironmentChange={setEnvironment}
          onResetDefaults={handleResetDefaults}
          onPublish={handlePublish}
          onSave={handleSave}
        />
        <IdeSettingsList
          loading={loading}
          filteredKeys={filteredKeys}
          definitions={data?.definitions || {}}
          values={values}
          jsonInputs={jsonInputs}
          jsonErrors={jsonErrors}
          onValueChange={(key, value) => setValues((previous) => ({ ...previous, [key]: value }))}
          onJsonInputChange={(key, value) => setJsonInputs((previous) => ({ ...previous, [key]: value }))}
          onJsonErrorChange={(key, nextError) =>
            setJsonErrors((previous) => {
              const next = { ...previous }
              if (nextError) next[key] = nextError
              else delete next[key]
              return next
            })
          }
        />
      </div>

      <IdeSettingsHistory history={history} onRefresh={fetchHistory} />
    </div>
  )
}

function buildInitialJsonInputs(json: IdeSettingsPayload) {
  const initialJsonInputs: Record<string, string> = {}
  Object.entries(json.definitions || {}).forEach(([key, definition]) => {
    if (definition.type === 'array' || definition.type === 'object') {
      initialJsonInputs[key] = JSON.stringify(json.values?.[key] ?? definition.default ?? null, null, 2)
    }
  })
  return initialJsonInputs
}

export default AdminIdeSettingsPanel
