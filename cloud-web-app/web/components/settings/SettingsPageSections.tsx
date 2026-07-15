'use client'

import type { ReactNode, RefObject } from 'react'
import {
  AlertCircle,
  Download,
  Info,
  RotateCcw,
  Search,
  Settings,
  X,
} from 'lucide-react'
import type {
  SettingItem,
  SettingsCategory,
  SettingsGroup,
} from './SettingsPage.types'

type SidebarProps = {
  activeFilterLabel: string | null
  categories: SettingsCategory[]
  filteredCount: number
  modifiedCount: number
  searchInputRef: RefObject<HTMLInputElement>
  searchQuery: string
  selectedCategory: string | null
  selectedSubcategory: string | null
  totalCount: number
  onClearFilters: () => void
  onExport: () => void
  onResetAll: () => void
  onSearchQueryChange: (query: string) => void
  onSelectCategory: (categoryId: string | null) => void
  onSelectSubcategory: (categoryId: string, subcategoryId: string) => void
}

export function SettingsSidebar({
  activeFilterLabel,
  categories,
  filteredCount,
  modifiedCount,
  searchInputRef,
  searchQuery,
  selectedCategory,
  selectedSubcategory,
  totalCount,
  onClearFilters,
  onExport,
  onResetAll,
  onSearchQueryChange,
  onSelectCategory,
  onSelectSubcategory,
}: SidebarProps) {
  const hasActiveFilters = Boolean(searchQuery.trim() || selectedSubcategory)
  const categoryCountLabel = (visibleCount = 0, count = 0) =>
    searchQuery.trim() ? `${visibleCount}/${count}` : `${count}`

  return (
    <div className="w-64 border-r border-[var(--aethel-border-primary)] flex flex-col">
      <div className="p-3 border-b border-[var(--aethel-border-primary)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--aethel-text-quaternary)]" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search settings, ids, or sections..."
            className="w-full bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded pl-9 pr-9 py-2 text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)]"
            aria-label="Search settings"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              aria-label="Clear settings search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
          <span>{filteredCount} of {totalCount} visible</span>
          <span>Ctrl/Cmd+F</span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-[var(--aethel-border-primary)] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--aethel-text-secondary)] transition-colors hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-2 pb-2">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className={`w-full flex items-center justify-between gap-3 rounded px-3 py-2 text-left transition-colors ${
              selectedCategory === null
                ? 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-info-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <span className="flex items-center gap-3">
              <Settings className="w-4 h-4" />
              <span className="text-sm">All settings</span>
            </span>
            <span className="rounded-full bg-[var(--aethel-surface-tertiary)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)]">
              {categoryCountLabel(filteredCount, totalCount)}
            </span>
          </button>
        </div>
        {categories.map((category) => (
          <div key={category.id} className="px-2">
            <button
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-all duration-150 ${
                selectedCategory === category.id && !selectedSubcategory
                  ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_16%,transparent)] text-[var(--aethel-primary-light)] border border-[color-mix(in_srgb,var(--aethel-primary)_25%,transparent)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className={selectedCategory === category.id ? 'text-[var(--aethel-primary-light)]' : ''}>{category.icon}</span>
                <span className="text-sm font-medium">{category.label}</span>
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                selectedCategory === category.id
                  ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                  : 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)]'
              }`}>
                {categoryCountLabel(category.visibleCount, category.count)}
              </span>
            </button>

            {selectedCategory === category.id && category.subcategories && (
              <div className="mx-2 mb-2 mt-0.5 space-y-0.5">
                {category.subcategories.map((subcategory) => {
                  const isActive = selectedSubcategory === subcategory.id
                  return (
                    <button
                      type="button"
                      key={subcategory.id}
                      onClick={() => onSelectSubcategory(category.id, subcategory.id)}
                      className={`
                        group w-full flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-xs
                        font-medium transition-all duration-150
                        ${isActive
                          ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_14%,transparent)] text-[var(--aethel-primary-light)] border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]'
                          : 'text-[var(--aethel-text-quaternary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-secondary)] border border-transparent'}
                      `}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                            isActive
                              ? 'bg-[var(--aethel-neon-cyan)]'
                              : 'bg-[var(--aethel-border-primary)] group-hover:bg-[var(--aethel-text-tertiary)]'
                          }`}
                          aria-hidden
                        />
                        {subcategory.label}
                      </span>
                      {(subcategory.count ?? 0) > 0 && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none transition-colors ${
                          isActive
                            ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_22%,transparent)] text-[var(--aethel-primary-light)]'
                            : 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-quaternary)]'
                        }`}>
                          {subcategory.count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-[var(--aethel-border-primary)]">
        <div className="flex items-center justify-between text-xs text-[var(--aethel-text-quaternary)] mb-2">
          <span>{modifiedCount} modified</span>
          <span>{activeFilterLabel ?? 'All sections'}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onResetAll}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-primary)] rounded text-xs"
          >
            <RotateCcw className="w-3 h-3" />
            Reset All
          </button>
          <button
            type="button"
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
  activeFilterLabel: string | null
  currentCategory?: SettingsCategory
  filteredSettings: SettingItem[]
  groupedSettings: SettingsGroup[]
  modifiedCount: number
  onClearFilters: () => void
  searchQuery: string
  totalCount: number
  renderSettingRow: (setting: SettingItem) => ReactNode
}

export function SettingsContent({
  activeFilterLabel,
  currentCategory,
  filteredSettings,
  groupedSettings,
  modifiedCount,
  onClearFilters,
  searchQuery,
  totalCount,
  renderSettingRow,
}: ContentProps) {
  const hasSearchQuery = Boolean(searchQuery.trim())
  const showScopedSummary = hasSearchQuery || Boolean(activeFilterLabel && !currentCategory)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-[var(--aethel-text-tertiary)]" />
          <h1 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Settings</h1>
        </div>
        {currentCategory && !hasSearchQuery && (
          <p className="text-sm text-[var(--aethel-text-quaternary)] mt-1">{currentCategory.description}</p>
        )}
        {!currentCategory && !hasSearchQuery && (
          <p className="text-sm text-[var(--aethel-text-quaternary)] mt-1">
            Browse every settings section from one place.
          </p>
        )}
        {hasSearchQuery && (
          <p className="text-sm text-[var(--aethel-text-quaternary)] mt-1">
            {filteredSettings.length} results for {`"${searchQuery.trim()}"`}
            {activeFilterLabel ? ` in ${activeFilterLabel}` : ''}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--aethel-surface-tertiary)] px-2.5 py-1">
            <Search className="w-3.5 h-3.5" />
            {filteredSettings.length} of {totalCount} visible
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--aethel-surface-tertiary)] px-2.5 py-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {modifiedCount} modified
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--aethel-surface-tertiary)] px-2.5 py-1">
            <Info className="w-3.5 h-3.5" />
            Cmd/Ctrl+F focuses search
          </span>
          {hasSearchQuery && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] px-2.5 py-1 text-[var(--aethel-info-light)]">
              Query: {searchQuery.trim()}
            </span>
          )}
          {showScopedSummary && activeFilterLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2.5 py-1 text-[var(--aethel-info-light)]">
              Section: {activeFilterLabel}
            </span>
          )}
          {(hasSearchQuery || (!currentCategory && activeFilterLabel)) && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--aethel-border-primary)] px-2.5 py-1 text-[var(--aethel-text-secondary)] transition-colors hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-2">
        {filteredSettings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--aethel-text-quaternary)]">
            <Search className="w-8 h-8 mb-2 opacity-50" />
            <p>No settings found{hasSearchQuery ? ` for "${searchQuery.trim()}"` : ''}</p>
            {(hasSearchQuery || !currentCategory) && (
              <button
                type="button"
                onClick={onClearFilters}
                className="mt-4 rounded border border-[var(--aethel-border-primary)] px-3 py-1.5 text-sm text-[var(--aethel-text-secondary)] transition-colors hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8 py-4">
            {groupedSettings.map((group) => (
              <section key={group.id}>
                {groupedSettings.length > 1 && (
                  <div className="mb-3">
                    <h2 className="text-sm font-medium text-[var(--aethel-text-secondary)]">
                      {group.title}
                    </h2>
                    <p className="text-xs text-[var(--aethel-text-quaternary)] mt-1">
                      {group.description}
                    </p>
                  </div>
                )}
                <div>
                  {group.settings.map((setting) => renderSettingRow(setting))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

