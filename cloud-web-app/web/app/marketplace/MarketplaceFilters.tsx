'use client'

import type {
  MarketplaceFiltersProps,
  MarketplaceTrustFilter,
} from './marketplace-page.types'

export function MarketplaceFilters({
  searchQuery,
  selectedCategory,
  sortBy,
  trustFilter,
  categories,
  categoryLabels,
  sortOptions,
  onSearchChange,
  onCategoryChange,
  onSortChange,
  onTrustFilterChange,
}: MarketplaceFiltersProps) {
  const activeCategory = categoryLabels[selectedCategory] ?? selectedCategory
  const activeTrust =
    trustFilter === 'verified' ? 'Verified' : 'Community review'

  return (
    <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-4 shadow-[var(--aethel-shadow-md)] sm:p-5">
      <input
        type="search"
        placeholder="Search extensions, permissions, or tags..."
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-4 text-sm text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_55%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)]"
      />
      <details className="mt-3 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_42%,transparent)] px-3 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">
          <span>Filters</span>
          <span className="truncate text-right text-[10px] normal-case tracking-normal text-[var(--aethel-text-tertiary)]">
            {activeCategory} · {activeTrust}
          </span>
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-[180px_minmax(0,220px)]">
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
              Trust lane
            </span>
            <select
              value={trustFilter}
              onChange={(event) =>
                onTrustFilterChange(
                  event.currentTarget.value as MarketplaceTrustFilter,
                )
              }
              aria-label="Trust lane"
              className="h-11 w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-3 text-sm text-[var(--aethel-text-primary)] outline-none focus:border-[color-mix(in_srgb,var(--aethel-info)_55%,transparent)]"
            >
              <option value="verified">Verified</option>
              <option value="community-review">Community review</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
              Sort
            </span>
            <select
              value={sortBy}
              onChange={(event) => onSortChange(event.currentTarget.value)}
              className="h-11 w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-3 text-sm text-[var(--aethel-text-primary)] outline-none focus:border-[color-mix(in_srgb,var(--aethel-info)_55%,transparent)]"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 border-t border-[var(--aethel-border-subtle)] pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
            Category filters
          </p>
          <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = selectedCategory === category
            return (
              <button
                type="button"
                key={category}
                onClick={() => onCategoryChange(category)}
                className={`rounded-lg border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition ${active ? 'border-[color-mix(in_srgb,var(--aethel-info)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]' : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]'}`}
              >
                {categoryLabels[category] ?? category}
              </button>
            )
          })}
          </div>
        </div>
      </details>
    </div>
  )
}
