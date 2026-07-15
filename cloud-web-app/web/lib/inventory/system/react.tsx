'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { EquipmentManager } from './equipment';
import { Inventory } from './inventory';
import { type EquipmentSlot, type InventoryConfig, type ItemInstance, type ItemStats } from './types';

// ============================================================================



interface InventoryContextValue {
  inventory: Inventory;
  equipment: EquipmentManager;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ 
  children,
  config = { capacity: 40 },
}: { 
  children: ReactNode;
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
