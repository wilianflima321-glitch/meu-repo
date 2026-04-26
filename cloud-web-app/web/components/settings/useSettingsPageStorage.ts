import { useCallback, useEffect, useMemo, useState } from 'react'

import { DEFAULT_SETTINGS } from './SettingsPageData'
import type { SettingsState, SettingValue } from './SettingsPage.types'

const SETTINGS_STORAGE_KEY = 'settings'

function persistSettings(nextSettings: SettingsState) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings))
}

export function useSettingsPageStorage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS)

  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!savedSettings) {
      return
    }

    try {
      setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) })
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }, [])

  const updateSetting = useCallback((id: string, value: SettingValue) => {
    setSettings((previousSettings) => {
      const nextSettings = { ...previousSettings, [id]: value }
      persistSettings(nextSettings)
      return nextSettings
    })
  }, [])

  const resetSetting = useCallback((id: string) => {
    setSettings((previousSettings) => {
      const nextSettings = { ...previousSettings, [id]: DEFAULT_SETTINGS[id] }
      persistSettings(nextSettings)
      return nextSettings
    })
  }, [])

  const resetAllSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    persistSettings(DEFAULT_SETTINGS)
  }, [])

  const modifiedCount = useMemo(
    () =>
      Object.entries(settings).filter(([key, value]) => DEFAULT_SETTINGS[key] !== value).length,
    [settings]
  )

  const exportSettings = useCallback(() => {
    const json = JSON.stringify(settings, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'settings.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }, [settings])

  return {
    exportSettings,
    modifiedCount,
    resetAllSettings,
    resetSetting,
    settings,
    updateSetting,
  }
}
