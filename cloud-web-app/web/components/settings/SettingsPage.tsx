'use client'

import { SETTINGS_CATEGORIES, SETTING_ITEMS } from './SettingsPageData'
import { SettingRow } from './SettingsPageInputs'
import {
  SettingsContent,
  SettingsSidebar,
} from './SettingsPageSections'
import { useSettingsPageState } from './SettingsPageState'
import { useSettingsPageStorage } from './useSettingsPageStorage'

export default function SettingsPage() {
  const {
    exportSettings,
    modifiedCount,
    resetAllSettings,
    resetSetting,
    settings,
    updateSetting,
  } = useSettingsPageStorage()
  const {
    activeFilterLabel,
    categories,
    clearFilters,
    currentCategory,
    filteredSettings,
    groupedSettings,
    searchInputRef,
    searchQuery,
    selectedCategory,
    selectedSubcategory,
    selectCategory,
    selectSubcategory,
    setSearchQuery,
    totalCount,
  } = useSettingsPageState({
    categories: SETTINGS_CATEGORIES,
    items: SETTING_ITEMS,
  })

  return (
    <div className="flex h-full bg-[var(--aethel-surface-primary)]">
      <SettingsSidebar
        activeFilterLabel={activeFilterLabel}
        categories={categories}
        filteredCount={filteredSettings.length}
        modifiedCount={modifiedCount}
        searchInputRef={searchInputRef}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        totalCount={totalCount}
        onClearFilters={clearFilters}
        onExport={exportSettings}
        onResetAll={resetAllSettings}
        onSearchQueryChange={setSearchQuery}
        onSelectCategory={selectCategory}
        onSelectSubcategory={selectSubcategory}
      />

      <SettingsContent
        activeFilterLabel={activeFilterLabel}
        currentCategory={currentCategory}
        filteredSettings={filteredSettings}
        groupedSettings={groupedSettings}
        modifiedCount={modifiedCount}
        onClearFilters={clearFilters}
        searchQuery={searchQuery}
        totalCount={totalCount}
        renderSettingRow={(setting) => (
          <SettingRow
            key={setting.id}
            setting={setting}
            value={settings[setting.id] ?? setting.defaultValue}
            onChange={updateSetting}
            isModified={settings[setting.id] !== setting.defaultValue}
            onReset={() => resetSetting(setting.id)}
          />
        )}
      />
    </div>
  )
}
