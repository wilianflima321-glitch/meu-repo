/**
 * AAA Asset Pipeline - split runtime modules.
 *
 * Asset import, database, optimization, and streaming stay behind Studio/Local
 * runtime boundaries until capability and provenance evidence is available.
 */

import type { AssetMetadata, AssetType } from './types';

export class AssetDatabase {
  private assets: Map<string, AssetMetadata> = new Map();
  private tags: Map<string, Set<string>> = new Map();
  private types: Map<AssetType, Set<string>> = new Map();
  
  add(asset: AssetMetadata): void {
    this.assets.set(asset.id, asset);
    
    // Index by type
    if (!this.types.has(asset.type)) {
      this.types.set(asset.type, new Set());
    }
    this.types.get(asset.type)!.add(asset.id);
    
    // Index by AI tags
    for (const tag of asset.aiTags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(asset.id);
    }
  }
  
  get(id: string): AssetMetadata | undefined {
    return this.assets.get(id);
  }
  
  getByType(type: AssetType): AssetMetadata[] {
    const ids = this.types.get(type);
    if (!ids) return [];
    return Array.from(ids).map(id => this.assets.get(id)!);
  }
  
  getByTag(tag: string): AssetMetadata[] {
    const ids = this.tags.get(tag);
    if (!ids) return [];
    return Array.from(ids).map(id => this.assets.get(id)!);
  }
  
  search(query: string, type?: AssetType): AssetMetadata[] {
    const results: AssetMetadata[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const asset of this.assets.values()) {
      if (type && asset.type !== type) continue;
      
      // Search in name
      if (asset.name.toLowerCase().includes(lowerQuery)) {
        results.push(asset);
        continue;
      }
      
      // Search in AI tags
      if (asset.aiTags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
        results.push(asset);
        continue;
      }
      
      // Search in description
      if (asset.aiDescription.toLowerCase().includes(lowerQuery)) {
        results.push(asset);
      }
    }
    
    return results;
  }
  
  // AI-specific queries
  findSimilar(assetId: string, limit: number = 10): AssetMetadata[] {
    const asset = this.assets.get(assetId);
    if (!asset) return [];
    
    const scores: Map<string, number> = new Map();
    
    for (const [id, other] of this.assets) {
      if (id === assetId) continue;
      if (other.type !== asset.type) continue;
      
      // Score by shared tags
      let score = 0;
      for (const tag of asset.aiTags) {
        if (other.aiTags.includes(tag)) score += 1;
      }
      
      if (score > 0) scores.set(id, score);
    }
    
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => this.assets.get(id)!);
  }
  
  // Get assets suitable for AI generation
  getAITrainingAssets(type: AssetType, minQuality: number = 0.8): AssetMetadata[] {
    return this.getByType(type).filter(asset => 
      asset.aiTags.length > 0 && 
      asset.aiDescription.length > 10
    );
  }
  
  // Serialize for AI context
  toAIContext(): string {
    const summary: Record<AssetType, number> = {} as any;
    const allTags: Set<string> = new Set();
    
    for (const asset of this.assets.values()) {
      summary[asset.type] = (summary[asset.type] || 0) + 1;
      asset.aiTags.forEach(tag => allTags.add(tag));
    }
    
    return JSON.stringify({
      totalAssets: this.assets.size,
      byType: summary,
      availableTags: Array.from(allTags),
    }, null, 2);
  }
}

// ============================================================================
// ASSET OPTIMIZER
// ============================================================================
