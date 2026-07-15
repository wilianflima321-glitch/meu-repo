import type { SettingItem } from './SettingsPage.types'
import { DEFAULT_SETTINGS } from './SettingsPageData.defaults'
import { SETTINGS_CATEGORIES } from './SettingsPageData.categories'
import { AI_SETTING_ITEMS } from './SettingsPageData.items.ai'
import { APPEARANCE_SETTING_ITEMS } from './SettingsPageData.items.appearance'
import { EDITOR_SETTING_ITEMS } from './SettingsPageData.items.editor'
import { ENGINE_SETTING_ITEMS } from './SettingsPageData.items.engine'
import { SYSTEM_SETTING_ITEMS } from './SettingsPageData.items.system'
import { TERMINAL_AND_GIT_SETTING_ITEMS } from './SettingsPageData.items.workspace'
import { SIMULATION_SETTING_ITEMS } from './SettingsPageData.items.simulation'
import { CONTROLS_SETTING_ITEMS } from './SettingsPageData.items.controls'
import { AUDIO_SETTING_ITEMS } from './SettingsPageData.items.audio'
import { VR_SETTING_ITEMS } from './SettingsPageData.items.vr'

export { DEFAULT_SETTINGS, SETTINGS_CATEGORIES }

export const SETTING_ITEMS: SettingItem[] = [
  ...EDITOR_SETTING_ITEMS,
  ...AI_SETTING_ITEMS,
  ...TERMINAL_AND_GIT_SETTING_ITEMS,
  ...ENGINE_SETTING_ITEMS,
  ...SIMULATION_SETTING_ITEMS,
  ...CONTROLS_SETTING_ITEMS,
  ...AUDIO_SETTING_ITEMS,
  ...VR_SETTING_ITEMS,
  ...APPEARANCE_SETTING_ITEMS,
  ...SYSTEM_SETTING_ITEMS,
]
