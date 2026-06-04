export function MarketplaceEmptyState({
  showingFallbackCatalog,
}: {
  showingFallbackCatalog: boolean
}) {
  return (
    <div className="border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-6 py-12 text-center">
      <p className="text-lg font-semibold text-[var(--aethel-text-primary)]">
        No extensions match this view
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--aethel-text-tertiary)]">
        Adjust search, category, or trust filter.
        {showingFallbackCatalog
          ? 'The live catalog is unavailable, so curated packages are shown.'
          : ''}
      </p>
    </div>
  )
}
