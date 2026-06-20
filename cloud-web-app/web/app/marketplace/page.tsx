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
import type { MarketplaceInstallFeedback } from './marketplace-page.types'

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
  const [installPending, setInstallPending] = useState(false)
  const [installFeedback, setInstallFeedback] = useState<MarketplaceInstallFeedback | null>(null)
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

  const redirectToLogin = (extensionId: string) => {
    const next = encodeURIComponent(`/marketplace?install=${extensionId}`)
    window.location.assign(`/login?next=${next}`)
  }

  const handleInstall = async (extensionId: string) => {
    if (installPending) return
    setInstallPending(true)
    setInstallFeedback(null)

    try {
      const response = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionId }),
      })

      // Logged-out users are bounced to login (preserving their install intent).
      if (response.status === 401) {
        redirectToLogin(extensionId)
        return
      }

      if (response.ok) {
        setExtensions((prev) =>
          prev.map((extension) =>
            extension.id === extensionId ? { ...extension, installed: true } : extension,
          ),
        )
        setInstallFeedback({ type: 'success', message: 'Installed. The extension is now active for your account.' })
        setTimeout(() => {
          setReviewingExtensionId(null)
          setInstallFeedback(null)
        }, 1200)
        return
      }

      // Honest failure states — no placebo success.
      const data = (await response.json().catch(() => null)) as { error?: string; message?: string } | null
      if (response.status === 404) {
        setInstallFeedback({
          type: 'info',
          message: 'This extension is in curated preview and is not yet available to install.',
        })
        return
      }
      // Entitlement gates throw FEATURE_NOT_AVAILABLE → 402; some flows use 403.
      if (response.status === 402 || response.status === 403) {
        setInstallFeedback({
          type: 'error',
          message: data?.error || data?.message || 'Your plan does not include marketplace installs yet.',
        })
        return
      }
      setInstallFeedback({
        type: 'error',
        message: data?.error || data?.message || 'Install failed. Please try again.',
      })
    } catch {
      setInstallFeedback({ type: 'error', message: 'Network error. Check your connection and try again.' })
    } finally {
      setInstallPending(false)
    }
  }

  const handleUninstall = async (extensionId: string) => {
    // Optimistic flip with rollback on failure — honest, no silent no-op.
    const previous = extensions
    setExtensions((prev) => prev.map((extension) => (extension.id === extensionId ? { ...extension, installed: false } : extension)))
    try {
      const response = await fetch('/api/marketplace/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionId }),
      })
      if (response.status === 401) {
        redirectToLogin(extensionId)
        return
      }
      if (!response.ok) {
        setExtensions(previous)
      }
    } catch {
      setExtensions(previous)
    }
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
                    onUninstall={handleUninstall}
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
