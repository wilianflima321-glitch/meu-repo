import type { Extension } from './marketplace-page.data'

export type MarketplaceTrustFilter = 'verified' | 'community-review'

export type MarketplaceFiltersProps = {
  searchQuery: string
  selectedCategory: string
  sortBy: string
  trustFilter: MarketplaceTrustFilter
  categories: readonly string[]
  categoryLabels: Record<string, string>
  sortOptions: readonly { value: string; label: string }[]
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onSortChange: (value: string) => void
  onTrustFilterChange: (value: MarketplaceTrustFilter) => void
}

export type MarketplaceCardProps = {
  extension: Extension
  onRequestInstall: (extensionId: string) => void
  onUninstall: (extensionId: string) => void
}

export type MarketplaceInstallReviewProps = {
  extension: Extension | null
  onConfirmInstall: (extensionId: string) => void
  onCancel: () => void
}
