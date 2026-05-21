/**
 * Inventory System - Sistema de Inventário Completo
 * 
 * Sistema completo com:
 * - Item management
 * - Stacking and splitting
 * - Equipment slots
 * - Item categories/types
 * - Weight/capacity limits
 * - Drag and drop support
 * - Crafting integration
 * - Loot tables
 * - Item persistence
 * 
 * @module lib/inventory/inventory-system
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'unique';
export type ItemType = 
  | 'weapon'
  | 'armor'
  | 'accessory'
  | 'consumable'
  | 'material'
  | 'quest'
  | 'key'
  | 'currency'
  | 'misc';

export type EquipmentSlot =
  | 'head'
  | 'chest'
  | 'legs'
  | 'feet'
  | 'hands'
  | 'main_hand'
  | 'off_hand'
  | 'neck'
  | 'ring_1'
  | 'ring_2'
  | 'back'
  | 'belt';

export interface ItemStats {
  damage?: number;
  armor?: number;
  health?: number;
  mana?: number;
  strength?: number;
  dexterity?: number;
  intelligence?: number;
  vitality?: number;
  critChance?: number;
  critDamage?: number;
  speed?: number;
  [key: string]: number | undefined;
}

export interface ItemEffect {
  type: 'heal' | 'buff' | 'damage' | 'teleport' | 'summon' | 'custom';
  value?: number;
  duration?: number;
  data?: unknown;
}

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  icon?: string;
  model?: string;
  stackable: boolean;
  maxStack: number;
  weight: number;
  value: number;
  level?: number;
  requirements?: {
    level?: number;
    stats?: Partial<ItemStats>;
    class?: string[];
  };
  equipSlot?: EquipmentSlot;
  stats?: ItemStats;
  effects?: ItemEffect[];
  usable?: boolean;
  consumeOnUse?: boolean;
  tradeable?: boolean;
  droppable?: boolean;
  questItem?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ItemInstance {
  instanceId: string;
  definitionId: string;
  quantity: number;
  durability?: number;
  maxDurability?: number;
  enchantments?: string[];
  customData?: Record<string, unknown>;
}

export interface InventorySlot {
  index: number;
  item: ItemInstance | null;
  locked: boolean;
}

export interface InventoryConfig {
  capacity: number;
  maxWeight?: number;
  allowOverweight?: boolean;
}

// ============================================================================
// ITEM REGISTRY
// ============================================================================



// RESULT TYPES
// ============================================================================

export interface AddItemResult {
  success: boolean;
  added: number;
  remaining: number;
  reason?: string;
  items?: ItemInstance[];
}

export interface RemoveItemResult {
  success: boolean;
  removed: number;
  remaining: number;
}

export interface UseItemResult {
  success: boolean;
  reason?: string;
  effects?: ItemEffect[];
}

// ============================================================================
// EQUIPMENT SYSTEM
// ============================================================================



export interface EquipResult {
  success: boolean;
  reason?: string;
  slot?: EquipmentSlot;
}

// ============================================================================


// LOOT TABLE
// ============================================================================

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

// ============================================================================
// ITEM BUILDER
// ============================================================================
