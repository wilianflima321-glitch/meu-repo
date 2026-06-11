import type { Extension, MarketplaceConfig, OpenVsxExtension, OpenVsxSearchResponse, SearchResult, VsCodeExtension, VsCodeResultMetadata, VsCodeSearchResponse, VsCodeStatistic } from './marketplace-runtime.contracts';
import { findVsCodeMarketplaceAsset, parseVsCodeMarketplaceProperties } from './marketplace-runtime-utils';

// ==========================================================================
// SEARCH
// ==========================================================================

/**
 * Busca extensões no marketplace
 */
export async function searchMarketplaceExtensions(marketplace: MarketplaceConfig, query: string, options?: {
  category?: string;
  sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated';
  pageSize?: number;
  pageNumber?: number;
}): Promise<SearchResult> {
  const {
    category,
    sortBy = 'relevance',
    pageSize = 20,
    pageNumber = 1,
  } = options || {};

  if (marketplace.name === 'Open VSX') {
    return searchOpenVSX(marketplace, query, category, sortBy, pageSize, pageNumber);
  } else {
    return searchVSCodeMarketplace(marketplace, query, category, sortBy, pageSize, pageNumber);
  }
}

async function searchOpenVSX(
  marketplace: MarketplaceConfig,
  query: string,
  category: string | undefined,
  sortBy: string,
  pageSize: number,
  pageNumber: number
): Promise<SearchResult> {
  const params = new URLSearchParams({
    query,
    size: pageSize.toString(),
    offset: ((pageNumber - 1) * pageSize).toString(),
    sortBy: sortBy === 'downloads' ? 'downloadCount' : sortBy === 'rating' ? 'averageRating' : sortBy,
    sortOrder: 'desc',
  });

  if (category) {
    params.set('category', category);
  }

  const response = await fetch(`${marketplace.searchUrl}?${params}`);

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  const data = await response.json() as OpenVsxSearchResponse;

  const extensions: Extension[] = (data.extensions || []).map((ext: OpenVsxExtension) => ({
    id: `${ext.namespace}.${ext.name}`,
    name: ext.name,
    displayName: ext.displayName || ext.name,
    publisher: ext.namespace,
    version: ext.version,
    description: ext.description || '',
    categories: ext.categories || [],
    tags: ext.tags || [],
    icon: ext.files?.icon,
    repository: ext.repository,
    license: ext.license,
    downloadCount: ext.downloadCount || 0,
    rating: ext.averageRating || 0,
    ratingCount: ext.reviewCount || 0,
    verified: ext.verified || false,
    preview: ext.preview || false,
    deprecated: ext.deprecated || false,
    engines: ext.engines || {},
    publishedAt: new Date(ext.publishedDate || ext.timestamp || Date.now()),
    updatedAt: new Date(ext.lastUpdated || ext.timestamp || Date.now()),
  }));

  return {
    extensions,
    totalCount: data.totalSize || extensions.length,
    pageNumber,
    pageSize,
  };
}

async function searchVSCodeMarketplace(
  marketplace: MarketplaceConfig,
  query: string,
  category: string | undefined,
  sortBy: string,
  pageSize: number,
  pageNumber: number
): Promise<SearchResult> {
  // VS Code Marketplace uses a different API format
  const body = {
    filters: [{
      criteria: [
        { filterType: 8, value: 'Microsoft.VisualStudio.Code' },
        { filterType: 10, value: query },
        ...(category ? [{ filterType: 5, value: category }] : []),
      ],
      pageNumber,
      pageSize,
      sortBy: sortBy === 'downloads' ? 4 : sortBy === 'rating' ? 12 : sortBy === 'updated' ? 1 : 0,
      sortOrder: 2,
    }],
    assetTypes: [],
    flags: 914,
  };

  const response = await fetch(marketplace.searchUrl, {
    method: 'POST',
    headers: marketplace.headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  const data = await response.json() as VsCodeSearchResponse;
  const results = data.results?.[0];

  const extensions: Extension[] = (results?.extensions || []).map((ext: VsCodeExtension) => {
    const latestVersion = ext.versions?.[0];
    const properties = parseVsCodeMarketplaceProperties(latestVersion?.properties || []);
    const installStatistic = ext.statistics?.find((statistic: VsCodeStatistic) => statistic.statisticName === 'install');
    const ratingStatistic = ext.statistics?.find((statistic: VsCodeStatistic) => statistic.statisticName === 'averagerating');
    const ratingCountStatistic = ext.statistics?.find((statistic: VsCodeStatistic) => statistic.statisticName === 'ratingcount');

    return {
      id: `${ext.publisher.publisherName}.${ext.extensionName}`,
      name: ext.extensionName,
      displayName: ext.displayName || ext.extensionName,
      publisher: ext.publisher.publisherName,
      version: latestVersion?.version || '0.0.0',
      description: ext.shortDescription || '',
      categories: ext.categories || [],
      tags: ext.tags || [],
      icon: findVsCodeMarketplaceAsset(latestVersion?.files, 'Microsoft.VisualStudio.Services.Icons.Default'),
      repository: properties['Microsoft.VisualStudio.Services.Links.Source'],
      downloadCount: installStatistic?.value || 0,
      rating: ratingStatistic?.value || 0,
      ratingCount: ratingCountStatistic?.value || 0,
      verified: ext.publisher.isDomainVerified || false,
      preview: ext.flags?.includes('preview') || false,
      deprecated: ext.flags?.includes('deprecated') || false,
      engines: { vscode: properties['Microsoft.VisualStudio.Code.Engine'] },
      publishedAt: new Date(ext.publishedDate || Date.now()),
      updatedAt: new Date(ext.lastUpdated || Date.now()),
    };
  });

  return {
    extensions,
    totalCount: results?.resultMetadata?.find((metadata: VsCodeResultMetadata) => metadata.metadataType === 'ResultCount')?.metadataItems?.[0]?.count || extensions.length,
    pageNumber,
    pageSize,
  };
}

