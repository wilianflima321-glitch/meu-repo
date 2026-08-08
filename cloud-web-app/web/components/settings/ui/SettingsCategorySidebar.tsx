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
    <div
      className="w-52 flex-shrink-0 overflow-y-auto"
      style={{ borderRight: '1px solid rgba(var(--aethel-border-slate-rgb), 0.10)', background: 'rgba(var(--aethel-surface-primary-rgb), 0.60)' }}
    >
      <div className="px-2 py-3" style={{ borderBottom: '1px solid rgba(var(--aethel-border-slate-rgb), 0.08)' }}>
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
            !activeCategoryId
              ? 'bg-[rgba(var(--aethel-primary-rgb), 0.18)] text-[var(--aethel-primary-light)] border border-[rgba(var(--aethel-primary-rgb), 0.28)]'
              : 'text-[var(--aethel-text-tertiary)] hover:bg-[rgba(var(--aethel-text-inverse-rgb), 0.04)] hover:text-[var(--aethel-text-primary)] border border-transparent'
          }`}
        >
          <span>All settings</span>
          <span className="rounded-full px-1.5 py-0 text-[9px] font-mono tabular-nums" style={{ background: 'rgba(var(--aethel-text-inverse-rgb), 0.08)' }}>
            {categories.reduce((total, category) => total + (category.count || 0), 0)}
          </span>
        </button>
      </div>
      {categories.map(category => (
        <div key={category.id}>
          <div className="flex items-center gap-0.5 px-2 py-0.5">
            <button
              type="button"
              onClick={() => onToggleCategory(category.id)}
              aria-label={`Toggle ${category.label}`}
              className="rounded p-1 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)] transition-colors"
            >
              {expandedCategories.has(category.id) ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={`flex min-w-0 flex-1 items-center justify-between rounded-md px-2 py-1 text-xs font-medium transition-all ${
                activeCategoryId === category.id && !activeChildId
                  ? 'border-l-2 border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)] bg-[rgba(var(--aethel-info-rgb), 0.10)] pl-1.5 text-[var(--aethel-info-light)]'
                  : 'border border-transparent text-[var(--aethel-text-secondary)] hover:bg-[rgba(var(--aethel-text-inverse-rgb), 0.04)] hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              <span className="truncate">{category.label}</span>
              <span className="ml-2 text-[9px] font-mono text-[var(--aethel-text-quaternary)] tabular-nums">
                {category.count || 0}
              </span>
            </button>
          </div>
          {expandedCategories.has(category.id) && category.children && (
            <div className="pb-1 pl-7">
              {category.children.map(child => (
                <button
                  type="button"
                  key={child.id}
                  onClick={() => onSelectChild(category.id, child.id)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[11px] transition-all ${
                    activeCategoryId === category.id && activeChildId === child.id
                      ? 'bg-[rgba(var(--aethel-neon-cyan-rgb), 0.12)] text-cyan-300 border border-[rgba(var(--aethel-neon-cyan-rgb), 0.20)]'
                      : 'text-[var(--aethel-text-quaternary)] hover:bg-[rgba(var(--aethel-text-inverse-rgb), 0.04)] hover:text-[var(--aethel-text-secondary)] border border-transparent'
                  }`}
                >
                  <span className="truncate">{child.label}</span>
                  <span className="ml-2 text-[9px] font-mono text-[var(--aethel-text-quaternary)] tabular-nums">
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
