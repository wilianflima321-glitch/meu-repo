import { type ItemDefinition, type ItemRarity, type ItemType } from './types';

export class ItemRegistry {
  private static instance: ItemRegistry | null = null;
  private definitions: Map<string, ItemDefinition> = new Map();
  
  static getInstance(): ItemRegistry {
    if (!ItemRegistry.instance) {
      ItemRegistry.instance = new ItemRegistry();
    }
    return ItemRegistry.instance;
  }
  
  register(definition: ItemDefinition): void {
    this.definitions.set(definition.id, definition);
  }
  
  registerMany(definitions: ItemDefinition[]): void {
    for (const def of definitions) {
      this.register(def);
    }
  }
  
  get(id: string): ItemDefinition | undefined {
    return this.definitions.get(id);
  }
  
  getAll(): ItemDefinition[] {
    return Array.from(this.definitions.values());
  }
  
  getByType(type: ItemType): ItemDefinition[] {
    return this.getAll().filter((d) => d.type === type);
  }
  
  getByRarity(rarity: ItemRarity): ItemDefinition[] {
    return this.getAll().filter((d) => d.rarity === rarity);
  }
  
  search(query: string): ItemDefinition[] {
    const lower = query.toLowerCase();
    return this.getAll().filter(
      (d) =>
        d.name.toLowerCase().includes(lower) ||
        d.description.toLowerCase().includes(lower) ||
        d.tags?.some((t) => t.toLowerCase().includes(lower))
    );
  }
  
  clear(): void {
    this.definitions.clear();
  }
}

// ============================================================================
// INVENTORY
// ============================================================================
