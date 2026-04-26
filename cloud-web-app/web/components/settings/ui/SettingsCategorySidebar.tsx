import { ChevronDown, ChevronRight } from 'lucide-react';

import type { SettingsCategory } from './settings-types';

interface SettingsCategorySidebarProps {
  categories: SettingsCategory[];
  activeCategoryId: string | null;
  activeChildId: string | null;
  expandedCategories: Set<string>;
  onSelectCategory: (category: string | null) => void;
  onSelectChild: (category: string, child: string) => void;
  onToggleCategory: (category: string) => void;
}

export function SettingsCategorySidebar({
  categories,
  activeCategoryId,
  activeChildId,
  expandedCategories,
  onSelectCategory,
  onSelectChild,
  onToggleCategory,
}: SettingsCategorySidebarProps) {
  return (
    <div className="w-56 overflow-y-auto border-r border-[var(--aethel-border-primary)]">
      <div className="border-b border-[var(--aethel-border-primary)] px-3 py-3">
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm transition-colors ${
            !activeCategoryId
              ? 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)]'
              : 'text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)]/50 hover:text-[var(--aethel-text-primary)]'
          }`}
        >
          <span>All settings</span>
          <span className="rounded-full bg-[var(--aethel-surface-tertiary)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
            {categories.reduce((total, category) => total + (category.count || 0), 0)}
          </span>
        </button>
      </div>
      {categories.map(category => (
        <div key={category.id}>
          <div className="flex items-center gap-1 px-2 py-1">
            <button
              type="button"
              onClick={() => onToggleCategory(category.id)}
              aria-label={`Toggle ${category.label}`}
              className="rounded p-1 text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)]/50 hover:text-[var(--aethel-text-primary)]"
            >
              {expandedCategories.has(category.id) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={`flex min-w-0 flex-1 items-center justify-between rounded px-2 py-1.5 text-sm transition-colors ${
                activeCategoryId === category.id && !activeChildId
                  ? 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)]/50 hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              <span className="truncate">{category.label}</span>
              <span className="ml-2 rounded-full bg-[var(--aethel-surface-tertiary)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                {category.count || 0}
              </span>
            </button>
          </div>
          {expandedCategories.has(category.id) && category.children && (
            <div className="pb-1 pl-6">
              {category.children.map(child => (
                <button
                  type="button"
                  key={child.id}
                  onClick={() => onSelectChild(category.id, child.id)}
                  className={`flex w-full items-center justify-between rounded px-3 py-1.5 text-left text-sm transition-colors ${
                    activeCategoryId === category.id && activeChildId === child.id
                      ? 'bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)] text-[var(--aethel-info-light)]'
                      : 'text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)]/50 hover:text-[var(--aethel-text-primary)]'
                  }`}
                >
                  <span className="truncate">{child.label}</span>
                  <span className="ml-2 rounded-full bg-[var(--aethel-surface-tertiary)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                    {child.count || 0}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
