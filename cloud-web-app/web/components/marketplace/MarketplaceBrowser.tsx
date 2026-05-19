"use client";

/**
 * AETHEL ENGINE - Marketplace Browser Component
 *
 * Focused marketplace shell. Dense card/filter primitives live in
 * MarketplaceBrowser.parts.tsx so this file stays small enough to review.
 */
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Crown, Download, Filter, Grid, List, Loader2, Package, Search, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Select } from "@/components/ui/Select";
import { Tabs, TabList, TabTrigger } from "@/components/ui/Tabs";
import { useToastActions } from "@/components/ui";
import {
  addToCart,
  addToFavorites,
  AssetCard,
  AssetGridSkeleton,
  countActiveFilters,
  DEFAULT_FILTERS,
  fetchAssets,
  FilterSidebar,
  SORT_OPTIONS,
  type Asset,
  type FilterState,
  type MarketplaceViewMode,
} from "./MarketplaceBrowser.parts";

export default function MarketplaceBrowser() {
  const queryClient = useQueryClient();
  const toast = useToastActions();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<MarketplaceViewMode>("grid");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["marketplace", filters, page],
    queryFn: () => fetchAssets(filters, page),
    staleTime: 60_000,
  });

  const favoriteMutation = useMutation({
    mutationFn: addToFavorites,
    onSuccess: () => {
      toast.success("Saved to favorites");
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: () => toast.error("Failed to save asset"),
  });

  const cartMutation = useMutation({
    mutationFn: addToCart,
    onSuccess: () => {
      toast.success("Added to cart");
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: () => toast.error("Failed to add to cart"),
  });

  const handleSearch = useCallback((query: string) => {
    setFilters((current) => ({ ...current, query }));
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((nextFilters: FilterState) => {
    setFilters(nextFilters);
    setPage(1);
  }, []);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const applyQuickFilter = useCallback(
    (value: "all" | "featured" | "popular" | "new" | "free") => {
      if (value === "all") handleFilterChange(DEFAULT_FILTERS);
      if (value === "popular") handleFilterChange({ ...filters, sortBy: "popular" });
      if (value === "new") handleFilterChange({ ...filters, sortBy: "newest" });
      if (value === "free") handleFilterChange({ ...filters, freeOnly: true });
      if (value === "featured") handleFilterChange({ ...filters, sortBy: "rating" });
    },
    [filters, handleFilterChange],
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="border-b px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Marketplace</h1>
            <p className="text-sm text-muted-foreground">Vetted assets, evidence-first licenses, clean delivery.</p>
          </div>

          <div className="max-w-xl flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search assets, kits, shaders..."
                className="pl-10"
                value={filters.query}
                onChange={(event) => handleSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowFilters((value) => !value)}>
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeFilterCount > 0 ? <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge> : null}
            </Button>

            <div className="w-44">
              <Select
                options={SORT_OPTIONS}
                value={filters.sortBy}
                onChange={(value) => handleFilterChange({ ...filters, sortBy: value as FilterState["sortBy"] })}
                placeholder="Sort by"
                size="sm"
                fullWidth
              />
            </div>

            <div className="flex rounded-md border">
              <Button
                type="button"
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-r-none"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-l-none"
                onClick={() => setViewMode("list")}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="all" className="mt-4" onValueChange={(value) => applyQuickFilter(value as "all" | "featured" | "popular" | "new" | "free")}>
          <TabList>
            <TabTrigger value="all">All</TabTrigger>
            <TabTrigger value="featured">
              <Crown className="mr-1 h-3 w-3" />
              Featured
            </TabTrigger>
            <TabTrigger value="popular">
              <TrendingUp className="mr-1 h-3 w-3" />
              Popular
            </TabTrigger>
            <TabTrigger value="new">
              <Clock className="mr-1 h-3 w-3" />
              New
            </TabTrigger>
            <TabTrigger value="free">
              <Download className="mr-1 h-3 w-3" />
              Free
            </TabTrigger>
          </TabList>
        </Tabs>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AnimatePresence>
          {showFilters ? (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 256, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="overflow-hidden border-r"
            >
              <ScrollArea className="h-full p-4">
                <FilterSidebar filters={filters} onChange={handleFilterChange} />
              </ScrollArea>
            </motion.aside>
          ) : null}
        </AnimatePresence>

        <main className="min-w-0 flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {data?.total ? `${data.total.toLocaleString()} assets found` : "Loading assets..."}
                </p>
                {selectedAsset ? <Badge variant="secondary">Selected: {selectedAsset.name}</Badge> : null}
              </div>

              {isLoading ? <AssetGridSkeleton /> : null}

              {isError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 py-12 text-center">
                  <p className="mb-4 text-muted-foreground">Failed to load assets.</p>
                  <Button type="button" variant="outline" onClick={() => refetch()}>
                    Try again
                  </Button>
                </div>
              ) : null}

              {!isLoading && !isError && data?.assets.length === 0 ? (
                <div className="rounded-xl border py-12 text-center">
                  <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">No assets found</h3>
                  <p className="mb-4 text-muted-foreground">Try adjusting your filters or search terms.</p>
                  <Button type="button" variant="outline" onClick={() => handleFilterChange(DEFAULT_FILTERS)}>
                    Clear filters
                  </Button>
                </div>
              ) : null}

              {!isLoading && !isError && data && data.assets.length > 0 ? (
                <>
                  <div className={cn(viewMode === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-3")}>
                    <AnimatePresence mode="popLayout">
                      {data.assets.map((asset) => (
                        <AssetCard
                          key={asset.id}
                          asset={asset}
                          viewMode={viewMode}
                          onFavorite={(assetId) => favoriteMutation.mutate(assetId)}
                          onAddToCart={(assetId) => cartMutation.mutate(assetId)}
                          onSelect={setSelectedAsset}
                        />
                      ))}
                    </AnimatePresence>
                  </div>

                  {data.hasMore ? (
                    <div className="mt-8 flex justify-center">
                      <Button type="button" variant="outline" onClick={() => setPage((current) => current + 1)} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Load more
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
