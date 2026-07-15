import { EventEmitter } from 'events'

import type { MarketplaceExtension, SearchResult } from './extension-contracts'

export class ExtensionMarketplace extends EventEmitter {
  private baseUrl: string

  constructor(baseUrl: string = 'https://marketplace.aethel.dev/api') {
    super()
    this.baseUrl = baseUrl
  }

  async search(query: string, options?: {
    category?: string
    sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated'
    sortOrder?: 'asc' | 'desc'
    pageSize?: number
    pageNumber?: number
  }): Promise<SearchResult> {
    void query
    return {
      extensions: [],
      totalCount: 0,
      pageSize: options?.pageSize || 20,
      pageNumber: options?.pageNumber || 1,
    }
  }

  async getExtension(id: string): Promise<MarketplaceExtension | null> {
    void id
    return null
  }

  async getExtensionVersions(id: string): Promise<string[]> {
    void id
    return []
  }

  async downloadExtension(id: string, version?: string): Promise<ArrayBuffer> {
    void id
    void version
    throw new Error('EXTENSION_MARKETPLACE_PROVIDER_UNAVAILABLE')
  }

  async installExtension(id: string, version?: string): Promise<void> {
    await this.downloadExtension(id, version)
    this.emit('extensionInstalled', { id, version })
  }

  async getInstalled(): Promise<string[]> {
    return []
  }

  async getOutdated(): Promise<{ id: string; currentVersion: string; latestVersion: string }[]> {
    return []
  }
}
