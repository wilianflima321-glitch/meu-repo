// @aethel-heavy-async-boundary Motion-heavy surface; lazy-load outside its owning product region.
"use client";

import React, { useState, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from '@/lib/ui/motion';
import {
  Box,
  Check,
  Crown,
  Download,
  FileImage,
  Heart,
  Music,
  Package,
  Palette,
  ShoppingCart,
  Star,
  Tag,
  X,
  Zap,
  Code,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/Skeleton";
import { Slider } from "@/components/ui/slider";

export type AssetCategory =
  | "3d-models"
  | "textures"
  | "materials"
  | "audio"
  | "scripts"
  | "animations"
  | "particles"
  | "shaders"
  | "prefabs"
  | "complete-projects";

export interface Asset {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  currency: string;
  category: AssetCategory;
  subcategory: string;
  tags: string[];
  images: string[];
  thumbnailUrl: string;
  previewUrl?: string;
  fileSize: number;
  version: string;
  compatibility: string[];
  license: "standard" | "extended" | "exclusive";
  creator: {
    id: string;
    name: string;
    avatar: string;
    verified: boolean;
  };
  stats: {
    downloads: number;
    rating: number;
    reviewCount: number;
    favorites: number;
  };
  isFeatured: boolean;
  isNew: boolean;
  isFree: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  query: string;
  categories: AssetCategory[];
  priceRange: [number, number];
  minRating: number;
  licenses: string[];
  sortBy: "popular" | "newest" | "rating" | "price-asc" | "price-desc";
  freeOnly: boolean;
}

export interface MarketplaceResponse {
  assets: Asset[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type MarketplaceViewMode = "grid" | "list";

export const DEFAULT_FILTERS: FilterState = {
  query: "",
  categories: [],
  priceRange: [0, 1000],
  minRating: 0,
  licenses: [],
  sortBy: "popular",
  freeOnly: false,
};

export const CATEGORIES: { id: AssetCategory; name: string; icon: ReactNode }[] = [
  { id: "3d-models", name: "3D Models", icon: <Box className="h-4 w-4" /> },
  { id: "textures", name: "Textures", icon: <FileImage className="h-4 w-4" /> },
  { id: "materials", name: "Materials", icon: <Palette className="h-4 w-4" /> },
  { id: "audio", name: "Audio", icon: <Music className="h-4 w-4" /> },
  { id: "scripts", name: "Scripts", icon: <Code className="h-4 w-4" /> },
  { id: "animations", name: "Animations", icon: <Zap className="h-4 w-4" /> },
  { id: "particles", name: "Particles", icon: <Zap className="h-4 w-4" /> },
  { id: "shaders", name: "Shaders", icon: <Code className="h-4 w-4" /> },
  { id: "prefabs", name: "Prefabs", icon: <Package className="h-4 w-4" /> },
  { id: "complete-projects", name: "Complete Projects", icon: <Crown className="h-4 w-4" /> },
];

export const SORT_OPTIONS: { value: FilterState["sortBy"]; label: string }[] = [
  { value: "popular", label: "Most popular" },
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Top rated" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export const LICENSE_OPTIONS = [
  { value: "standard", label: "Standard license" },
  { value: "extended", label: "Extended license" },
  { value: "exclusive", label: "Exclusive license" },
];

export async function fetchAssets(filters: FilterState, page = 1): Promise<MarketplaceResponse> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", "24");

  if (filters.query) params.set("q", filters.query);
  if (filters.categories.length) params.set("categories", filters.categories.join(","));
  if (filters.freeOnly) params.set("free", "true");
  if (filters.minRating > 0) params.set("minRating", filters.minRating.toString());
  if (filters.priceRange[0] > 0) params.set("minPrice", filters.priceRange[0].toString());
  if (filters.priceRange[1] < 1000) params.set("maxPrice", filters.priceRange[1].toString());
  if (filters.licenses.length) params.set("licenses", filters.licenses.join(","));
  params.set("sort", filters.sortBy);

  const response = await fetch(`/api/marketplace/assets?${params}`);
  if (!response.ok) throw new Error("Failed to load assets");
  return response.json();
}

export async function addToFavorites(assetId: string): Promise<void> {
  const response = await fetch(`/api/marketplace/favorites/${assetId}`, { method: "POST" });
  if (!response.ok) throw new Error("Failed to add to favorites");
}

export async function addToCart(assetId: string): Promise<void> {
  const response = await fetch("/api/marketplace/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId }),
  });
  if (!response.ok) throw new Error("Failed to add to cart");
}

export function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.query) count++;
  if (filters.categories.length) count++;
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) count++;
  if (filters.minRating > 0) count++;
  if (filters.licenses.length) count++;
  if (filters.freeOnly) count++;
  return count;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatPrice(price: number, currency: string) {
  if (price === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(price / 100);
}

export function AssetCard({
  asset,
  viewMode,
  onFavorite,
  onAddToCart,
  onSelect,
}: {
  asset: Asset;
  viewMode: MarketplaceViewMode;
  onFavorite: (id: string) => void;
  onAddToCart: (id: string) => void;
  onSelect: (asset: Asset) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const categoryLabel = CATEGORIES.find((category) => category.id === asset.category)?.name ?? asset.category;

  const handleFavorite = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsFavorited((value) => !value);
    onFavorite(asset.id);
  };

  if (viewMode === "list") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        className="group flex cursor-pointer gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/50"
        onClick={() => onSelect(asset)}
      >
        <div className="h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image
            src={asset.thumbnailUrl}
            alt={asset.name}
            width={128}
            height={96}
            unoptimized
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{asset.name}</h3>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                by {asset.creator.name}
                {asset.creator.verified ? <Check className="h-3 w-3 text-[var(--aethel-info-light)]" /> : null}
              </p>
            </div>
            <p className={cn("whitespace-nowrap font-bold", asset.isFree ? "text-[var(--aethel-success-light)]" : "text-foreground")}>{formatPrice(asset.price, asset.currency)}</p>
          </div>

          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{asset.shortDescription}</p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-[var(--aethel-warning-light)]" />
              {asset.stats.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              {asset.stats.downloads.toLocaleString()}
            </span>
            <span>{formatFileSize(asset.fileSize)}</span>
            <Badge variant="secondary" className="text-xs">{categoryLabel}</Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button type="button" size="icon" variant="ghost" onClick={handleFavorite} aria-label="Save asset">
            <Heart className={cn("h-4 w-4", isFavorited && "fill-red-500 text-[var(--aethel-error-light)]")} />
          </Button>
          {!asset.isFree ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                onAddToCart(asset.id);
              }}
              aria-label="Add asset to cart"
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -4 }}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(asset)}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={asset.thumbnailUrl}
          alt={asset.name}
          fill
          unoptimized
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        <div className="absolute left-3 top-3 flex gap-1.5">
          {asset.isFeatured ? (
            <Badge variant="default" className="bg-[var(--aethel-warning)] text-xs">
              <Crown className="mr-1 h-3 w-3" /> Featured
            </Badge>
          ) : null}
          {asset.isNew ? (
            <Badge variant="default" className="bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-xs">
              New
            </Badge>
          ) : null}
        </div>

        <AnimatePresence>
          {isHovered ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center gap-2 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)]"
            >
              <Button type="button" size="sm" variant="secondary" onClick={handleFavorite}>
                <Heart className={cn("mr-1 h-4 w-4", isFavorited && "fill-red-500 text-[var(--aethel-error-light)]")} />
                {isFavorited ? "Saved" : "Save"}
              </Button>
              {!asset.isFree ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddToCart(asset.id);
                  }}
                >
                  <ShoppingCart className="mr-1 h-4 w-4" />
                  Add
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(asset);
                  }}
                >
                  <Download className="mr-1 h-4 w-4" />
                  Download
                </Button>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 flex-1 font-semibold">{asset.name}</h3>
          <span className={cn("whitespace-nowrap text-sm font-bold", asset.isFree ? "text-[var(--aethel-success-light)]" : "text-foreground")}>{formatPrice(asset.price, asset.currency)}</span>
        </div>

        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          {asset.creator.name}
          {asset.creator.verified ? <Check className="h-3 w-3 text-[var(--aethel-info-light)]" /> : null}
        </p>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-[var(--aethel-warning-light)]" />
              {asset.stats.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              {asset.stats.downloads >= 1000 ? `${(asset.stats.downloads / 1000).toFixed(1)}k` : asset.stats.downloads}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">{categoryLabel}</Badge>
        </div>
      </div>
    </motion.div>
  );
}

export function FilterSidebar({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}) {
  const toggleCategory = (category: AssetCategory) => {
    const categories = filters.categories.includes(category)
      ? filters.categories.filter((value) => value !== category)
      : [...filters.categories, category];
    onChange({ ...filters, categories });
  };

  const toggleLicense = (license: string) => {
    const licenses = filters.licenses.includes(license)
      ? filters.licenses.filter((value) => value !== license)
      : [...filters.licenses, license];
    onChange({ ...filters, licenses });
  };

  return (
    <div className="w-64 flex-shrink-0 space-y-6">
      <section>
        <h4 className="mb-3 flex items-center gap-2 font-semibold">
          <Package className="h-4 w-4" />
          Categories
        </h4>
        <div className="space-y-2">
          {CATEGORIES.map((category) => (
            <button
              type="button"
              aria-label={`${filters.categories.includes(category.id) ? "Remove" : "Add"} ${category.name} category`}
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                filters.categories.includes(category.id) ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground",
              )}
            >
              {category.icon}
              {category.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h4 className="mb-3 flex items-center gap-2 font-semibold">
          <Tag className="h-4 w-4" />
          Price range
        </h4>
        <div className="px-2">
          <Slider
            value={filters.priceRange}
            min={0}
            max={1000}
            step={10}
            onValueChange={(value) => onChange({ ...filters, priceRange: value as [number, number] })}
          />
          <div className="mt-2 flex justify-between text-sm text-muted-foreground">
            <span>${filters.priceRange[0]}</span>
            <span>${filters.priceRange[1]}+</span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Checkbox id="free-only" checked={filters.freeOnly} onCheckedChange={(checked) => onChange({ ...filters, freeOnly: !!checked })} />
          <label htmlFor="free-only" className="cursor-pointer text-sm">
            Free assets only
          </label>
        </div>
      </section>

      <section>
        <h4 className="mb-3 flex items-center gap-2 font-semibold">
          <Star className="h-4 w-4" />
          Minimum rating
        </h4>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4, 5].map((rating) => (
            <button
              type="button"
              aria-label={`Filter marketplace by minimum rating ${rating}`}
              key={rating}
              onClick={() => onChange({ ...filters, minRating: rating })}
              className={cn(
                "rounded-md p-2 transition-colors",
                filters.minRating === rating ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {rating === 0 ? "All" : `${rating}+`}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h4 className="mb-3 font-semibold">License type</h4>
        <div className="space-y-2">
          {LICENSE_OPTIONS.map((license) => (
            <div key={license.value} className="flex items-center gap-2">
              <Checkbox id={license.value} checked={filters.licenses.includes(license.value)} onCheckedChange={() => toggleLicense(license.value)} />
              <label htmlFor={license.value} className="cursor-pointer text-sm">
                {license.label}
              </label>
            </div>
          ))}
        </div>
      </section>

      <Button type="button" variant="outline" className="w-full" onClick={() => onChange(DEFAULT_FILTERS)}>
        <X className="mr-2 h-4 w-4" />
        Clear filters
      </Button>
    </div>
  );
}

export function AssetGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border bg-card">
          <Skeleton className="aspect-[4/3]" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
