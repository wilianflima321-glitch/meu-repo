'use client';

import { FileJson, Folder, Search, Settings, User, X } from 'lucide-react';

import { SettingsCategorySidebar } from './ui/SettingsCategorySidebar';
import { SettingsResultsPane } from './ui/SettingsResultsPane';
import { SettingsSummaryBar } from './ui/SettingsSummaryBar';
import { QuickSettingsPopup } from './ui/QuickSettingsPopup';
import { SettingsProvider, useSettings } from './ui/settings-provider';
import type {
  SettingDefinition,
  SettingType,
  SettingValue,
  SettingsCategory,
  SettingsContextValue,
  SettingsScope,
} from './ui/settings-types';
import { useSettingsUiState } from './ui/useSettingsUiState';

function SettingsUIView({ className, initialCategoryFilter }: { className?: string; initialCategoryFilter?: string }) {
  const { isModified, scope, setScope, settings } = useSettings();
  const {
    activeCategoryId,
    activeChildId,
    activeFilterLabel,
    categories,
    clearFilters,
    expandedCategories,
    filteredSettings,
    groupedSettings,
    searchInputRef,
    selectCategory,
    selectChild,
    searchQuery,
    setSearchQuery,
    setShowJSON,
    showJSON,
    toggleCategory,
  } = useSettingsUiState({ settings, initialCategoryFilter });

  const modifiedCount = Array.from(settings.keys()).filter(key => isModified(key)).length;

  return (
    <div className={`flex h-full flex-col ${className || ''}`} style={{ background: 'rgba(var(--aethel-surface-primary-rgb), 0.94)' }}>
      {/* Premium settings header with integrated search */}
      <div
        className="relative flex items-center justify-between gap-3 border-b px-4 py-3 flex-shrink-0"
        style={{
          background: 'rgba(var(--aethel-panel-ink-rgb), 0.90)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: 'rgba(var(--aethel-border-slate-rgb), 0.12)',
          boxShadow: 'inset 0 -1px 0 rgba(var(--aethel-text-inverse-rgb), 0.04)',
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(var(--aethel-primary-rgb), 0.40)] to-transparent" />
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'rgba(var(--aethel-primary-rgb), 0.15)', border: '1px solid rgba(var(--aethel-primary-rgb), 0.25)' }}
          >
            <Settings className="h-4 w-4 text-[var(--aethel-primary-light)]" />
          </div>
          <div>
            <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">Settings</span>
            <p className="text-[10px] text-[var(--aethel-text-quaternary)] font-mono uppercase tracking-wider mt-0.5">
              Engine · Workspace · Editor
            </p>
          </div>
        </div>

        {/* Integrated search bar */}
        <div
          className="flex flex-1 max-w-xs items-center gap-2 rounded-lg px-3 py-1.5"
          style={{ background: 'rgba(var(--aethel-text-inverse-rgb), 0.05)', border: '1px solid rgba(var(--aethel-border-slate-rgb), 0.14)' }}
        >
          <Search className="h-3.5 w-3.5 text-[var(--aethel-text-quaternary)] flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search settings…"
            className="flex-1 bg-transparent text-xs text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)] transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {(['user', 'workspace'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                scope === s
                  ? 'bg-[rgba(var(--aethel-primary-rgb), 0.18)] text-[var(--aethel-primary-light)] border border-[rgba(var(--aethel-primary-rgb), 0.30)]'
                  : 'text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)] border border-transparent'
              }`}
            >
              {s === 'user' ? <User className="h-3 w-3" /> : <Folder className="h-3 w-3" />}
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <div className="mx-1 h-4 w-px bg-[var(--aethel-border-secondary)]" />
          <button
            type="button"
            onClick={() => setShowJSON(!showJSON)}
            className={`rounded-md p-1.5 transition-all border ${
              showJSON
                ? 'bg-[rgba(var(--aethel-primary-rgb), 0.18)] text-[var(--aethel-primary-light)] border-[rgba(var(--aethel-primary-rgb), 0.30)]'
                : 'text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)] border-transparent'
            }`}
            title="Open settings as JSON"
          >
            <FileJson className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="border-b border-[var(--aethel-border-secondary)] px-4 py-1.5" style={{ borderColor: 'rgba(var(--aethel-border-slate-rgb), 0.08)' }}>
        <SettingsSummaryBar
          activeFilterLabel={activeFilterLabel}
          filteredCount={filteredSettings.length}
          modifiedCount={modifiedCount}
          onClearFilters={clearFilters}
          searchQuery={searchQuery}
          totalCount={settings.size}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <SettingsCategorySidebar
          activeCategoryId={activeCategoryId}
          activeChildId={activeChildId}
          categories={categories}
          expandedCategories={expandedCategories}
          onSelectCategory={selectCategory}
          onSelectChild={selectChild}
          onToggleCategory={toggleCategory}
        />
        <div className="flex-1 overflow-y-auto p-6">
          <SettingsResultsPane
            activeFilterLabel={activeFilterLabel}
            filteredSettings={filteredSettings}
            groupedSettings={groupedSettings}
            onClearFilters={clearFilters}
            scope={scope}
            searchQuery={searchQuery}
            showJSON={showJSON}
          />
        </div>
      </div>
    </div>
  );
}

export function SettingsUI({ className, initialCategoryFilter }: { className?: string; initialCategoryFilter?: string }) {
  return <SettingsUIView className={className} initialCategoryFilter={initialCategoryFilter} />;
}

export {
  QuickSettingsPopup,
  SettingsProvider,
  useSettings,
};

export type {
  SettingDefinition,
  SettingType,
  SettingValue,
  SettingsCategory,
  SettingsContextValue,
  SettingsScope,
};

export default SettingsUI;
