'use client'

import {
  CheckCircle2,
  Filter,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
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
  return (
    <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-4 shadow-[var(--aethel-shadow-md)] backdrop-blur-md sm:p-6 space-y-4">
      {/* Top search & Trust toggle row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search bar */}
        <div className="relative w-full sm:flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--aethel-text-quaternary)]" />
          <input
            type="search"
            placeholder="Search assets, extensions, permissions, or tags..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)] pl-10 pr-9 text-sm text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)] focus:border-[var(--aethel-primary)] focus:ring-1 focus:ring-[var(--aethel-primary)] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Trust lane switcher pills */}
        <div className="flex items-center gap-1 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] p-1 shrink-0 w-full sm:w-auto justify-center">
          <button
            type="button"
            onClick={() => onTrustFilterChange('verified')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition ${
              trustFilter === 'verified'
                ? 'border border-[color-mix(in_srgb,var(--aethel-success)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success-light)] shadow-sm'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
          </button>
          <button
            type="button"
            onClick={() => onTrustFilterChange('community-review')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition ${
              trustFilter === 'community-review'
                ? 'border border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning-light)] shadow-sm'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Community Review
          </button>
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)] hidden sm:inline">
            Sort
          </span>
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value)}
            aria-label="Sort marketplace items"
            className="h-11 w-full sm:w-44 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)] px-3 text-xs font-semibold text-[var(--aethel-text-primary)] outline-none focus:border-[var(--aethel-primary)]"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-t border-[var(--aethel-border-subtle)] pt-3.5">
        {categories.map((category) => {
          const active = selectedCategory === category
          return (
            <button
              type="button"
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`shrink-0 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                active
                  ? 'border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-primary-light)] shadow-sm'
                  : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              {categoryLabels[category] ?? category}
            </button>
          )
        })}
      </div>
    </div>
  )
}
