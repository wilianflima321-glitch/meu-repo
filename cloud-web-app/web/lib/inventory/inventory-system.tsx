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
import { ItemBuilder } from './inventory-builder';
import { LootGenerator } from './inventory-loot';

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

export { ItemBuilder } from './inventory-builder';
export { LootGenerator } from './inventory-loot';
export type { GeneratedLoot, LootEntry, LootTable } from './inventory-loot';

// ============================================================================
// ITEM REGISTRY
// ============================================================================

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

export class Inventory extends EventEmitter {
  private slots: InventorySlot[] = [];
  private config: InventoryConfig;
  private instanceIdCounter = 0;
  private registry: ItemRegistry;
  
  constructor(config: InventoryConfig) {
    super();
    
    this.config = config;
    this.registry = ItemRegistry.getInstance();
    
    // Initialize slots
    for (let i = 0; i < config.capacity; i++) {
      this.slots.push({
        index: i,
        item: null,
        locked: false,
      });
    }
  }
  
  // ============================================================================
  // CORE OPERATIONS
  // ============================================================================
  
  addItem(definitionId: string, quantity = 1): AddItemResult {
    const definition = this.registry.get(definitionId);
    if (!definition) {
      return { success: false, added: 0, remaining: quantity, reason: 'Item not found' };
    }
    
    // Check weight
    if (this.config.maxWeight) {
      const additionalWeight = definition.weight * quantity;
      const currentWeight = this.getTotalWeight();
      
      if (currentWeight + additionalWeight > this.config.maxWeight && !this.config.allowOverweight) {
        return { success: false, added: 0, remaining: quantity, reason: 'Inventory too heavy' };
      }
    }
    
    let remaining = quantity;
    const addedItems: ItemInstance[] = [];
    
    // First try to stack with existing items
    if (definition.stackable) {
      for (const slot of this.slots) {
        if (!slot.item || slot.locked) continue;
        if (slot.item.definitionId !== definitionId) continue;
        
        const def = this.registry.get(slot.item.definitionId);
        if (!def) continue;
        
        const canAdd = def.maxStack - slot.item.quantity;
        if (canAdd <= 0) continue;
        
        const toAdd = Math.min(canAdd, remaining);
        slot.item.quantity += toAdd;
        remaining -= toAdd;
        addedItems.push(slot.item);
        
        if (remaining <= 0) break;
      }
    }
    
    // Then add to empty slots
    while (remaining > 0) {
      const emptySlot = this.slots.find((s) => !s.item && !s.locked);
      if (!emptySlot) break;
      
      const toAdd = definition.stackable 
        ? Math.min(definition.maxStack, remaining) 
        : 1;
      
      const instance: ItemInstance = {
        instanceId: this.generateInstanceId(),
        definitionId,
        quantity: toAdd,
        durability: definition.stats?.armor || definition.stats?.damage ? 100 : undefined,
        maxDurability: definition.stats?.armor || definition.stats?.damage ? 100 : undefined,
      };
      
      emptySlot.item = instance;
      remaining -= toAdd;
      addedItems.push(instance);
    }
    
    const added = quantity - remaining;
    
    if (added > 0) {
      this.emit('itemAdded', { definitionId, quantity: added, items: addedItems });
    }
    
    return {
      success: remaining === 0,
      added,
      remaining,
      items: addedItems,
    };
  }
  
  removeItem(definitionId: string, quantity = 1): RemoveItemResult {
    let remaining = quantity;
    const removedItems: ItemInstance[] = [];
    
    // Find and remove from slots (prefer partial stacks first)
    const sortedSlots = [...this.slots]
      .filter((s) => s.item?.definitionId === definitionId && !s.locked)
      .sort((a, b) => (a.item?.quantity || 0) - (b.item?.quantity || 0));
    
    for (const slot of sortedSlots) {
      if (!slot.item || remaining <= 0) continue;
      
      const toRemove = Math.min(slot.item.quantity, remaining);
      slot.item.quantity -= toRemove;
      remaining -= toRemove;
      
      if (slot.item.quantity <= 0) {
        removedItems.push(slot.item);
        slot.item = null;
      }
    }
    
    const removed = quantity - remaining;
    
    if (removed > 0) {
      this.emit('itemRemoved', { definitionId, quantity: removed, items: removedItems });
    }
    
    return {
      success: remaining === 0,
      removed,
      remaining,
    };
  }
  
  removeItemByInstance(instanceId: string, quantity = 1): boolean {
    const slot = this.slots.find((s) => s.item?.instanceId === instanceId);
    if (!slot || !slot.item || slot.locked) return false;
    
    if (quantity >= slot.item.quantity) {
      slot.item = null;
    } else {
      slot.item.quantity -= quantity;
    }
    
    this.emit('itemRemoved', { instanceId, quantity });
    return true;
  }
  
  moveItem(fromIndex: number, toIndex: number): boolean {
    if (fromIndex < 0 || fromIndex >= this.slots.length) return false;
    if (toIndex < 0 || toIndex >= this.slots.length) return false;
    
    const fromSlot = this.slots[fromIndex];
    const toSlot = this.slots[toIndex];
    
    if (!fromSlot.item || fromSlot.locked || toSlot.locked) return false;
    
    // If target empty, just move
    if (!toSlot.item) {
      toSlot.item = fromSlot.item;
      fromSlot.item = null;
      this.emit('itemMoved', { from: fromIndex, to: toIndex });
      return true;
    }
    
    // If same item type and stackable, try to stack
    if (
      fromSlot.item.definitionId === toSlot.item.definitionId &&
      this.registry.get(fromSlot.item.definitionId)?.stackable
    ) {
      const def = this.registry.get(fromSlot.item.definitionId);
      if (def) {
        const canAdd = def.maxStack - toSlot.item.quantity;
        const toMove = Math.min(canAdd, fromSlot.item.quantity);
        
        toSlot.item.quantity += toMove;
        fromSlot.item.quantity -= toMove;
        
        if (fromSlot.item.quantity <= 0) {
          fromSlot.item = null;
        }
        
        this.emit('itemsStacked', { from: fromIndex, to: toIndex, quantity: toMove });
        return true;
      }
    }
    
    // Swap items
    const temp = fromSlot.item;
    fromSlot.item = toSlot.item;
    toSlot.item = temp;
    
    this.emit('itemsSwapped', { from: fromIndex, to: toIndex });
    return true;
  }
  
  splitStack(fromIndex: number, quantity: number): number | null {
    const fromSlot = this.slots[fromIndex];
    if (!fromSlot.item || fromSlot.locked) return null;
    if (fromSlot.item.quantity <= quantity) return null;
    
    const emptySlot = this.slots.find((s) => !s.item && !s.locked);
    if (!emptySlot) return null;
    
    // Create new instance
    const newInstance: ItemInstance = {
      ...fromSlot.item,
      instanceId: this.generateInstanceId(),
      quantity,
    };
    
    fromSlot.item.quantity -= quantity;
    emptySlot.item = newInstance;
    
    this.emit('stackSplit', { from: fromIndex, to: emptySlot.index, quantity });
    
    return emptySlot.index;
  }
  
  // ============================================================================
  // QUERIES
  // ============================================================================
  
  hasItem(definitionId: string, quantity = 1): boolean {
    return this.getItemCount(definitionId) >= quantity;
  }
  
  getItemCount(definitionId: string): number {
    return this.slots.reduce((sum, slot) => {
      if (slot.item?.definitionId === definitionId) {
        return sum + slot.item.quantity;
      }
      return sum;
    }, 0);
  }
  
  findItem(definitionId: string): ItemInstance | null {
    const slot = this.slots.find((s) => s.item?.definitionId === definitionId);
    return slot?.item || null;
  }
  
  findItemByInstance(instanceId: string): ItemInstance | null {
    const slot = this.slots.find((s) => s.item?.instanceId === instanceId);
    return slot?.item || null;
  }
  
  getSlot(index: number): InventorySlot | undefined {
    return this.slots[index];
  }
  
  getAllItems(): ItemInstance[] {
    return this.slots
      .filter((s) => s.item)
      .map((s) => s.item!);
  }
  
  getItemsByType(type: ItemType): ItemInstance[] {
    return this.getAllItems().filter((item) => {
      const def = this.registry.get(item.definitionId);
      return def?.type === type;
    });
  }
  
  getTotalWeight(): number {
    return this.slots.reduce((sum, slot) => {
      if (!slot.item) return sum;
      const def = this.registry.get(slot.item.definitionId);
      return sum + (def?.weight || 0) * slot.item.quantity;
    }, 0);
  }
  
  getEmptySlotCount(): number {
    return this.slots.filter((s) => !s.item && !s.locked).length;
  }
  
  isFull(): boolean {
    return this.getEmptySlotCount() === 0;
  }
  
  getCapacity(): number {
    return this.config.capacity;
  }
  
  // ============================================================================
  // SLOT MANAGEMENT
  // ============================================================================
  
  lockSlot(index: number): void {
    const slot = this.slots[index];
    if (slot) {
      slot.locked = true;
      this.emit('slotLocked', { index });
    }
  }
  
  unlockSlot(index: number): void {
    const slot = this.slots[index];
    if (slot) {
      slot.locked = false;
      this.emit('slotUnlocked', { index });
    }
  }
  
  expandCapacity(additionalSlots: number): void {
    const startIndex = this.slots.length;
    for (let i = 0; i < additionalSlots; i++) {
      this.slots.push({
        index: startIndex + i,
        item: null,
        locked: false,
      });
    }
    this.config.capacity += additionalSlots;
    this.emit('capacityExpanded', { newCapacity: this.config.capacity });
  }
  
  // ============================================================================
  // ITEM USAGE
  // ============================================================================
  
  useItem(instanceId: string): UseItemResult {
    const slot = this.slots.find((s) => s.item?.instanceId === instanceId);
    if (!slot || !slot.item) {
      return { success: false, reason: 'Item not found' };
    }
    
    const definition = this.registry.get(slot.item.definitionId);
    if (!definition) {
      return { success: false, reason: 'Item definition not found' };
    }
    
    if (!definition.usable) {
      return { success: false, reason: 'Item is not usable' };
    }
    
    const effects = definition.effects || [];
    
    this.emit('itemUsed', { 
      instanceId, 
      definitionId: slot.item.definitionId,
      effects,
    });
    
    if (definition.consumeOnUse) {
      this.removeItemByInstance(instanceId, 1);
    }
    
    return { success: true, effects };
  }
  
  // ============================================================================
  // PERSISTENCE
  // ============================================================================
  
  serialize(): string {
    const data = {
      config: this.config,
      slots: this.slots.map((slot) => ({
        index: slot.index,
        item: slot.item,
        locked: slot.locked,
      })),
    };
    
    return JSON.stringify(data);
  }
  
  deserialize(json: string): void {
    const data = JSON.parse(json);
    
    this.config = data.config;
    this.slots = data.slots;
    
    this.emit('loaded');
  }
  
  clear(): void {
    for (const slot of this.slots) {
      slot.item = null;
    }
    this.emit('cleared');
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  private generateInstanceId(): string {
    return `item_${++this.instanceIdCounter}_${Date.now()}`;
  }
  
  sortBy(criteria: 'type' | 'rarity' | 'name' | 'value'): void {
    const items = this.getAllItems();
    
    items.sort((a, b) => {
      const defA = this.registry.get(a.definitionId);
      const defB = this.registry.get(b.definitionId);
      if (!defA || !defB) return 0;
      
      switch (criteria) {
        case 'type':
          return defA.type.localeCompare(defB.type);
        case 'rarity':
          const rarityOrder: ItemRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'unique'];
          return rarityOrder.indexOf(defA.rarity) - rarityOrder.indexOf(defB.rarity);
        case 'name':
          return defA.name.localeCompare(defB.name);
        case 'value':
          return defB.value - defA.value;
        default:
          return 0;
      }
    });
    
    // Reorganize slots
    for (const slot of this.slots) {
      slot.item = null;
    }
    
    let slotIndex = 0;
    for (const item of items) {
      while (this.slots[slotIndex]?.locked) {
        slotIndex++;
      }
      if (slotIndex < this.slots.length) {
        this.slots[slotIndex].item = item;
        slotIndex++;
      }
    }
    
    this.emit('sorted', { criteria });
  }
}

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

export class EquipmentManager extends EventEmitter {
  private slots: Map<EquipmentSlot, ItemInstance | null> = new Map();
  private inventory: Inventory;
  private registry: ItemRegistry;
  
  constructor(inventory: Inventory) {
    super();
    
    this.inventory = inventory;
    this.registry = ItemRegistry.getInstance();
    
    // Initialize all equipment slots
    const allSlots: EquipmentSlot[] = [
      'head', 'chest', 'legs', 'feet', 'hands',
      'main_hand', 'off_hand', 'neck', 'ring_1', 'ring_2',
      'back', 'belt',
    ];
    
    for (const slot of allSlots) {
      this.slots.set(slot, null);
    }
  }
  
  equip(instanceId: string, slot?: EquipmentSlot): EquipResult {
    const item = this.inventory.findItemByInstance(instanceId);
    if (!item) {
      return { success: false, reason: 'Item not found in inventory' };
    }
    
    const definition = this.registry.get(item.definitionId);
    if (!definition) {
      return { success: false, reason: 'Item definition not found' };
    }
    
    if (!definition.equipSlot) {
      return { success: false, reason: 'Item is not equippable' };
    }
    
    const targetSlot = slot || definition.equipSlot;
    
    // Check if slot is compatible
    if (!this.isSlotCompatible(definition.equipSlot, targetSlot)) {
      return { success: false, reason: 'Incompatible equipment slot' };
    }
    
    // Check requirements
    if (definition.requirements?.level) {
      // Would check player level here
    }
    
    // Unequip current item if any
    const currentItem = this.slots.get(targetSlot);
    if (currentItem) {
      this.unequip(targetSlot);
    }
    
    // Remove from inventory and equip
    this.inventory.removeItemByInstance(instanceId, 1);
    this.slots.set(targetSlot, item);
    
    this.emit('equipped', { slot: targetSlot, item, definition });
    
    return { success: true, slot: targetSlot };
  }
  
  unequip(slot: EquipmentSlot): boolean {
    const item = this.slots.get(slot);
    if (!item) return false;
    
    // Add back to inventory
    const result = this.inventory.addItem(item.definitionId, item.quantity);
    if (!result.success) {
      return false;
    }
    
    this.slots.set(slot, null);
    
    this.emit('unequipped', { slot, item });
    
    return true;
  }
  
  getEquipped(slot: EquipmentSlot): ItemInstance | null {
    return this.slots.get(slot) || null;
  }
  
  getAllEquipped(): Map<EquipmentSlot, ItemInstance | null> {
    return new Map(this.slots);
  }
  
  getTotalStats(): ItemStats {
    const stats: ItemStats = {};
    
    for (const [, item] of this.slots) {
      if (!item) continue;
      
      const def = this.registry.get(item.definitionId);
      if (!def?.stats) continue;
      
      for (const [key, value] of Object.entries(def.stats)) {
        if (value !== undefined) {
          stats[key] = (stats[key] || 0) + value;
        }
      }
    }
    
    return stats;
  }
  
  private isSlotCompatible(itemSlot: EquipmentSlot, targetSlot: EquipmentSlot): boolean {
    if (itemSlot === targetSlot) return true;
    
    // Ring can go in either ring slot
    if (itemSlot === 'ring_1' || itemSlot === 'ring_2') {
      return targetSlot === 'ring_1' || targetSlot === 'ring_2';
    }
    
    // Weapons can sometimes go in off_hand
    if (itemSlot === 'main_hand' && targetSlot === 'off_hand') {
      return true; // Would need to check if one-handed
    }
    
    return false;
  }
  
  serialize(): string {
    const data = Array.from(this.slots.entries()).map(([slot, item]) => ({
      slot,
      item,
    }));
    
    return JSON.stringify(data);
  }
  
  deserialize(json: string): void {
    const data = JSON.parse(json);
    
    for (const { slot, item } of data) {
      this.slots.set(slot, item);
    }
    
    this.emit('loaded');
  }
}

export interface EquipResult {
  success: boolean;
  reason?: string;
  slot?: EquipmentSlot;
}
// REACT HOOKS
// ============================================================================

import { useState, useRef, useEffect, useContext, createContext, useCallback } from 'react';

interface InventoryContextValue {
  inventory: Inventory;
  equipment: EquipmentManager;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ 
  children,
  config = { capacity: 40 },
}: { 
  children: React.ReactNode;
  config?: InventoryConfig;
}) {
  const inventoryRef = useRef<Inventory>(new Inventory(config));
  const equipmentRef = useRef<EquipmentManager>(new EquipmentManager(inventoryRef.current));
  
  return (
    <InventoryContext.Provider value={{
      inventory: inventoryRef.current,
      equipment: equipmentRef.current,
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  
  const { inventory } = context;
  const [items, setItems] = useState<ItemInstance[]>(inventory.getAllItems());
  const [weight, setWeight] = useState(inventory.getTotalWeight());
  
  useEffect(() => {
    const update = () => {
      setItems([...inventory.getAllItems()]);
      setWeight(inventory.getTotalWeight());
    };
    
    inventory.on('itemAdded', update);
    inventory.on('itemRemoved', update);
    inventory.on('itemMoved', update);
    inventory.on('itemsSwapped', update);
    inventory.on('stackSplit', update);
    inventory.on('sorted', update);
    inventory.on('cleared', update);
    
    return () => {
      inventory.off('itemAdded', update);
      inventory.off('itemRemoved', update);
      inventory.off('itemMoved', update);
      inventory.off('itemsSwapped', update);
      inventory.off('stackSplit', update);
      inventory.off('sorted', update);
      inventory.off('cleared', update);
    };
  }, [inventory]);
  
  const addItem = useCallback((definitionId: string, quantity = 1) => {
    return inventory.addItem(definitionId, quantity);
  }, [inventory]);
  
  const removeItem = useCallback((definitionId: string, quantity = 1) => {
    return inventory.removeItem(definitionId, quantity);
  }, [inventory]);
  
  const useItem = useCallback((instanceId: string) => {
    return inventory.useItem(instanceId);
  }, [inventory]);
  
  const moveItem = useCallback((from: number, to: number) => {
    return inventory.moveItem(from, to);
  }, [inventory]);
  
  return {
    inventory,
    items,
    weight,
    maxWeight: context.inventory['config'].maxWeight,
    capacity: inventory.getCapacity(),
    emptySlots: inventory.getEmptySlotCount(),
    isFull: inventory.isFull(),
    addItem,
    removeItem,
    useItem,
    moveItem,
    hasItem: inventory.hasItem.bind(inventory),
    getItemCount: inventory.getItemCount.bind(inventory),
    sortBy: inventory.sortBy.bind(inventory),
  };
}

export function useEquipment() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useEquipment must be used within an InventoryProvider');
  }
  
  const { equipment } = context;
  const [equipped, setEquipped] = useState<Map<EquipmentSlot, ItemInstance | null>>(
    equipment.getAllEquipped()
  );
  const [stats, setStats] = useState<ItemStats>(equipment.getTotalStats());
  
  useEffect(() => {
    const update = () => {
      setEquipped(new Map(equipment.getAllEquipped()));
      setStats(equipment.getTotalStats());
    };
    
    equipment.on('equipped', update);
    equipment.on('unequipped', update);
    
    return () => {
      equipment.off('equipped', update);
      equipment.off('unequipped', update);
    };
  }, [equipment]);
  
  const equip = useCallback((instanceId: string, slot?: EquipmentSlot) => {
    return equipment.equip(instanceId, slot);
  }, [equipment]);
  
  const unequip = useCallback((slot: EquipmentSlot) => {
    return equipment.unequip(slot);
  }, [equipment]);
  
  return {
    equipment,
    equipped,
    stats,
    equip,
    unequip,
    getEquipped: equipment.getEquipped.bind(equipment),
  };
}

const __defaultExport = {
  ItemRegistry,
  Inventory,
  EquipmentManager,
  LootGenerator,
  ItemBuilder,
  InventoryProvider,
  useInventory,
  useEquipment,
};

export default __defaultExport;
