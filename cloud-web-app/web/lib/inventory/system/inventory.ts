import { EventEmitter } from 'events';
import { ItemRegistry } from './item-registry';
import {
  type AddItemResult,
  type InventoryConfig,
  type InventorySlot,
  type ItemEffect,
  type ItemInstance,
  type ItemRarity,
  type ItemType,
  type RemoveItemResult,
  type UseItemResult,
} from './types';

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
