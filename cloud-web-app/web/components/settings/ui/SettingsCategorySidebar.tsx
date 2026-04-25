import { ChevronDown, ChevronRight } from 'lucide-react';

import type { SettingsCategory } from './settings-types';

interface SettingsCategorySidebarProps {
  categories: SettingsCategory[];
  expandedCategories: Set<string>;
  onToggleCategory: (category: string) => void;
}

export function SettingsCategorySidebar({
  categories,
  expandedCategories,
  onToggleCategory,
}: SettingsCategorySidebarProps) {
  return (
    <div className="w-56 overflow-y-auto border-r border-[var(--aethel-border-primary)]">
      {categories.map(category => (
        <div key={category.id}>
          <button
            type="button"
            onClick={() => onToggleCategory(category.id)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)]/50 hover:text-[var(--aethel-text-primary)]"
          >
            {expandedCategories.has(category.id) ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {category.label}
          </button>
          {expandedCategories.has(category.id) && category.children && (
            <div className="pb-1 pl-6">
              {category.children.map(child => (
                <button
                  type="button"
                  key={child.id}
                  onClick={() => {
                    const element = document.getElementById(`setting-category-${category.id}-${child.id}`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="w-full rounded px-3 py-1.5 text-left text-sm text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)]/50 hover:text-[var(--aethel-text-primary)]"
                >
                  {child.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
