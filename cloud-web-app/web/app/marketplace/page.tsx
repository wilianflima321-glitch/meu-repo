'use client'

import { useMemo, useState } from 'react'
import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'
import {
  CURATED_EXTENSIONS,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CATEGORY_LABELS,
  MARKETPLACE_SORT_OPTIONS,
  type Extension,
  type MarketplaceSort,
} from './marketplace-page.data'
import {
  isVerifiedExtension,
  MarketplaceCard,
  MarketplaceEmptyState,
  MarketplaceFilters,
  MarketplaceHero,
  MarketplaceInstallReview,
  type MarketplaceTrustFilter,
} from './marketplace-page.parts'

function hasMarketplaceSort(value: string): value is MarketplaceSort {
  return MARKETPLACE_SORT_OPTIONS.some((option) => option.value === value)
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase()
}

export default function MarketplacePage() {
  const [extensions, setExtensions] = useState<Extension[]>(CURATED_EXTENSIONS)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<MarketplaceSort>('evidence')
  const [trustFilter, setTrustFilter] = useState<MarketplaceTrustFilter>('verified')
  const [reviewingExtensionId, setReviewingExtensionId] = useState<string | null>(null)
  const normalizedSearch = normalizeSearch(searchQuery)

  const filteredExtensions = useMemo(() => {
    return extensions
      .filter((extension) => {
        const verified = isVerifiedExtension(extension)
        const matchesTrustFilter = trustFilter === 'verified' ? verified : !verified
        const matchesCategory = selectedCategory === 'all' || extension.categories.includes(selectedCategory)
        const searchable = [
          extension.displayName,
          extension.description,
          extension.publisher,
          extension.license ?? '',
          extension.provenance ?? '',
          ...extension.tags,
          ...(extension.permissions ?? []),
        ]
          .join(' ')
          .toLowerCase()

        return matchesTrustFilter && matchesCategory && (!normalizedSearch || searchable.includes(normalizedSearch))
      })
      .sort((a, b) => {
        if (sortBy === 'evidence') {
          const verifiedDelta = Number(isVerifiedExtension(b)) - Number(isVerifiedExtension(a))
          if (verifiedDelta !== 0) return verifiedDelta
          return a.displayName.localeCompare(b.displayName)
        }
        if (sortBy === 'risk') {
          const riskRank = { low: 0, medium: 1, high: 2 } as const
          return (riskRank[a.riskLevel ?? 'medium'] - riskRank[b.riskLevel ?? 'medium']) || a.displayName.localeCompare(b.displayName)
        }
        return a.displayName.localeCompare(b.displayName)
      })
  }, [extensions, normalizedSearch, selectedCategory, sortBy, trustFilter])
  const reviewingExtension = useMemo(
    () => extensions.find((extension) => extension.id === reviewingExtensionId) ?? null,
    [extensions, reviewingExtensionId],
  )

  const handleSortChange = (value: string) => {
    if (hasMarketplaceSort(value)) setSortBy(value)
  }

  const handleInstall = (extensionId: string) => {
    const next = encodeURIComponent(`/marketplace?install=${extensionId}`)
    window.location.assign(`/login?next=${next}`)
  }

  const handleUninstall = (extensionId: string) => {
    setExtensions((prev) => prev.map((extension) => (extension.id === extensionId ? { ...extension, installed: false } : extension)))
  }

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/3 top-0 h-[560px] w-[560px] rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_7%,transparent)] blur-[170px]" />
        <div className="absolute bottom-0 right-1/4 h-[480px] w-[480px] rounded-full bg-[color-mix(in_srgb,var(--aethel-primary)_6%,transparent)] blur-[160px]" />
      </div>

      <PublicHeader />

      <main id="main-content" className="relative z-10 pb-16">
        <MarketplaceHero />

        <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
          <MarketplaceFilters
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            sortBy={sortBy}
            trustFilter={trustFilter}
            categories={MARKETPLACE_CATEGORIES}
            categoryLabels={MARKETPLACE_CATEGORY_LABELS}
            sortOptions={MARKETPLACE_SORT_OPTIONS}
            onSearchChange={setSearchQuery}
            onCategoryChange={setSelectedCategory}
            onSortChange={handleSortChange}
            onTrustFilterChange={setTrustFilter}
          />

          {filteredExtensions.length > 0 ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredExtensions.map((extension) => (
                <MarketplaceCard
                  key={extension.id}
                  extension={extension}
                  onRequestInstall={setReviewingExtensionId}
                  onUninstall={handleUninstall}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <MarketplaceEmptyState showingFallbackCatalog={false} />
            </div>
          )}
        </section>
      </main>

      <MarketplaceInstallReview
        extension={reviewingExtension}
        onConfirmInstall={handleInstall}
        onCancel={() => setReviewingExtensionId(null)}
      />

      <PublicFooter />
    </div>
  )
}
