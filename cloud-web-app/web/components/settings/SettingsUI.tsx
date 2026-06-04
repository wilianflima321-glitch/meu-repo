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

function SettingsUIView({ className }: { className?: string }) {
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
  } = useSettingsUiState({ settings });

  const modifiedCount = Array.from(settings.keys()).filter(key => isModified(key)).length;

  return (
    <div className={`flex h-full flex-col bg-[var(--aethel-surface-secondary)] ${className || ''}`}>
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-4 py-3">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-[var(--aethel-text-tertiary)]" />
          <div>
            <span className="text-lg font-medium text-[var(--aethel-text-primary)]">Settings</span>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">
              Tune editor, workspace, and engine defaults in one place.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScope('user')}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors ${
              scope === 'user'
                ? 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-info-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <User className="h-4 w-4" />
            User
          </button>
          <button
            type="button"
            onClick={() => setScope('workspace')}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors ${
              scope === 'workspace'
                ? 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-info-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <Folder className="h-4 w-4" />
            Workspace
          </button>
          <div className="mx-1 h-6 w-px bg-[var(--aethel-surface-quaternary)]" />
          <button
            type="button"
            onClick={() => setShowJSON(!showJSON)}
            className={`rounded p-1.5 transition-colors ${
              showJSON
                ? 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-info-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
            title="Open settings as JSON"
          >
            <FileJson className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-[var(--aethel-border-primary)] px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--aethel-text-tertiary)]" />
          <input
            ref={searchInputRef}
            type="text"
            suppressHydrationWarning
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search settings, descriptions, or categories..."
            className="w-full rounded-lg bg-[var(--aethel-surface-tertiary)] py-2 pl-10 pr-8 text-sm text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)] focus:ring-1 focus:ring-[var(--aethel-info)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear settings search"
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]" />
            </button>
          )}
        </div>
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

export function SettingsUI({ className }: { className?: string }) {
  return <SettingsUIView className={className} />;
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
