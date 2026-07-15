'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
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
import { useMarketplaceInstall } from './use-marketplace-install'

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
  
  const { installPending, purchasePending, installFeedback, setInstallFeedback, handleInstall, handlePurchase, handleUninstall } = useMarketplaceInstall(
    extensions,
    setExtensions,
    setReviewingExtensionId
  )
  
  const normalizedSearch = normalizeSearch(searchQuery)

  // Load the canonical "Catálogo Vivo": built-ins + curated packages with the
  // caller's real install state merged in. Curated defaults render immediately
  // and are replaced once the live catalog responds (best-effort).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch('/api/marketplace/catalog', { headers: { Accept: 'application/json' } })
        if (!response.ok) return
        const data = (await response.json()) as { extensions?: Extension[] }
        if (cancelled || !Array.isArray(data.extensions) || data.extensions.length === 0) return
        setExtensions(data.extensions)
      } catch {
        // Best-effort only — never block the catalog on this.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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

  const handleRequestInstall = (extensionId: string) => {
    setInstallFeedback(null)
    setReviewingExtensionId(extensionId)
  }

  const handleCancelReview = () => {
    if (installPending) return
    setReviewingExtensionId(null)
    setInstallFeedback(null)
  }

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
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

          <Suspense fallback={<div className="mt-6 h-52 animate-pulse rounded-2xl bg-[var(--aethel-surface-secondary)]" />}>
            {filteredExtensions.length > 0 ? (
              <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredExtensions.map((extension) => (
                  <MarketplaceCard
                    key={extension.id}
                    extension={extension}
                    onRequestInstall={handleRequestInstall}
                    onRequestPurchase={handlePurchase}
                    onUninstall={handleUninstall}
                    purchasePending={purchasePending}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-6">
                <MarketplaceEmptyState showingFallbackCatalog={false} />
              </div>
            )}
          </Suspense>
        </section>
      </main>

      <MarketplaceInstallReview
        extension={reviewingExtension}
        onConfirmInstall={handleInstall}
        onCancel={handleCancelReview}
        pending={installPending}
        feedback={installFeedback}
      />

      <PublicFooter />
    </div>
  )
}
