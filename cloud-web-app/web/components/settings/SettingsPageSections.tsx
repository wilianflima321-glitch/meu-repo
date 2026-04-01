'use client'

import type { ReactNode } from 'react'
import {
  Download,
  RotateCcw,
  Search,
  Settings,
} from 'lucide-react'

export interface SettingItem {
  id: string
  label: string
  description: string
  type: 'toggle' | 'select' | 'number' | 'text' | 'color' | 'keybinding' | 'slider'
  value: any
  defaultValue: any
  options?: { label: string; value: any }[]
  min?: number
  max?: number
  step?: number
  category: string
  subcategory?: string
  tags?: string[]
  requiresReload?: boolean
}

export interface SettingsCategory {
  id: string
  label: string
  icon: ReactNode
  description: string
  subcategories?: { id: string; label: string }[]
}

type SidebarProps = {
  categories: SettingsCategory[]
  modifiedCount: number
  searchQuery: string
  selectedCategory: string
  selectedSubcategory: string | null
  onExport: () => void
  onResetAll: () => void
  onSearchQueryChange: (query: string) => void
  onSelectCategory: (categoryId: string) => void
  onSelectSubcategory: (subcategoryId: string) => void
}

export function SettingsSidebar({
  categories,
  modifiedCount,
  searchQuery,
  selectedCategory,
  selectedSubcategory,
  onExport,
  onResetAll,
  onSearchQueryChange,
  onSelectCategory,
  onSelectSubcategory,
}: SidebarProps) {
  return (
    <div className="w-64 border-r border-[var(--aethel-border-primary)] flex flex-col">
      <div className="p-3 border-b border-[var(--aethel-border-primary)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--aethel-text-quaternary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search settings..."
            className="w-full bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded pl-9 pr-3 py-2 text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {categories.map((category) => (
          <div key={category.id}>
            <button
              onClick={() => onSelectCategory(category.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                selectedCategory === category.id && !selectedSubcategory
                  ? 'bg-sky-600/20 text-sky-400'
                  : 'text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              {category.icon}
              <span className="text-sm">{category.label}</span>
            </button>

            {selectedCategory === category.id && category.subcategories && (
              <div className="ml-6 border-l border-[var(--aethel-border-primary)]">
                {category.subcategories.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    onClick={() => onSelectSubcategory(subcategory.id)}
                    className={`w-full flex items-center gap-2 px-4 py-1.5 text-left text-sm transition-colors ${
                      selectedSubcategory === subcategory.id
                        ? 'text-sky-400'
                        : 'text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)]'
                    }`}
                  >
                    {subcategory.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-[var(--aethel-border-primary)]">
        <div className="flex items-center justify-between text-xs text-[var(--aethel-text-quaternary)] mb-2">
          <span>{modifiedCount} modified</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onResetAll}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-primary)] rounded text-xs"
          >
            <RotateCcw className="w-3 h-3" />
            Reset All
          </button>
          <button
            onClick={onExport}
            className="p-1.5 bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-primary)] rounded"
            title="Export settings"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

type ContentProps = {
  currentCategory?: SettingsCategory
  filteredSettings: SettingItem[]
  searchQuery: string
  settings: Record<string, any>
  onResetSetting: (settingId: string) => void
  onUpdateSetting: (id: string, value: any) => void
  renderSettingRow: (setting: SettingItem) => ReactNode
}

export function SettingsContent({
  currentCategory,
  filteredSettings,
  searchQuery,
  renderSettingRow,
}: ContentProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-[var(--aethel-text-tertiary)]" />
          <h1 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Settings</h1>
        </div>
        {currentCategory && !searchQuery && (
          <p className="text-sm text-[var(--aethel-text-quaternary)] mt-1">{currentCategory.description}</p>
        )}
        {searchQuery && (
          <p className="text-sm text-[var(--aethel-text-quaternary)] mt-1">
            {filteredSettings.length} results for {`"${searchQuery}"`}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6">
        {filteredSettings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--aethel-text-quaternary)]">
            <Search className="w-8 h-8 mb-2 opacity-50" />
            <p>No settings found</p>
          </div>
        ) : (
          filteredSettings.map((setting) => renderSettingRow(setting))
        )}
      </div>
    </div>
  )
}

