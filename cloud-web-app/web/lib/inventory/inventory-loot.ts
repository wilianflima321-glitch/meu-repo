export interface LootEntry {
  itemId: string;
  weight: number;
  minQuantity: number;
  maxQuantity: number;
  conditions?: {
    minLevel?: number;
    maxLevel?: number;
    chance?: number;
  };
}

export interface LootTable {
  id: string;
  entries: LootEntry[];
  guaranteedDrops?: { itemId: string; quantity: number }[];
  minDrops: number;
  maxDrops: number;
}

export interface GeneratedLoot {
  itemId: string;
  quantity: number;
}

export class LootGenerator {
  private tables: Map<string, LootTable> = new Map();
  
  registerTable(table: LootTable): void {
    this.tables.set(table.id, table);
  }
  
  generateLoot(tableId: string, context?: { level?: number }): GeneratedLoot[] {
    const table = this.tables.get(tableId);
    if (!table) return [];
    
    const loot: GeneratedLoot[] = [];
    
    if (table.guaranteedDrops) {
      for (const drop of table.guaranteedDrops) {
        loot.push({
          itemId: drop.itemId,
          quantity: drop.quantity,
        });
      }
    }
    
    const numDrops = Math.floor(
      Math.random() * (table.maxDrops - table.minDrops + 1) + table.minDrops
    );
    
    const validEntries = table.entries.filter((entry) => {
      if (!entry.conditions) return true;
      
      if (context?.level) {
        if (entry.conditions.minLevel && context.level < entry.conditions.minLevel) {
          return false;
        }
        if (entry.conditions.maxLevel && context.level > entry.conditions.maxLevel) {
          return false;
        }
      }
      
      if (entry.conditions.chance && Math.random() > entry.conditions.chance) {
        return false;
      }
      
      return true;
    });
    
    const totalWeight = validEntries.reduce((sum, e) => sum + e.weight, 0);
    
    for (let i = 0; i < numDrops; i++) {
      let roll = Math.random() * totalWeight;
      
      for (const entry of validEntries) {
        roll -= entry.weight;
        if (roll <= 0) {
          const quantity = Math.floor(
            Math.random() * (entry.maxQuantity - entry.minQuantity + 1) + entry.minQuantity
          );
          
          loot.push({
            itemId: entry.itemId,
            quantity,
          });
          break;
        }
      }
    }
    
    return loot;
  }
}
