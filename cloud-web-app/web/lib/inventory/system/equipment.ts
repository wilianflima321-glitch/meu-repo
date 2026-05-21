import { EventEmitter } from 'events';
import { Inventory } from './inventory';
import { ItemRegistry } from './item-registry';
import { type EquipmentSlot, type EquipResult, type ItemInstance, type ItemStats } from './types';

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
