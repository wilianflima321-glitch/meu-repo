import type {
  EquipmentSlot,
  ItemDefinition,
  ItemEffect,
  ItemRarity,
  ItemStats,
  ItemType,
} from './inventory-system';

export class ItemBuilder {
  private definition: Partial<ItemDefinition> = {
    stackable: false,
    maxStack: 1,
    weight: 0,
    value: 0,
    tradeable: true,
    droppable: true,
  };
  
  static create(id: string): ItemBuilder {
    return new ItemBuilder().id(id);
  }
  
  id(id: string): this {
    this.definition.id = id;
    return this;
  }
  
  name(name: string): this {
    this.definition.name = name;
    return this;
  }
  
  description(desc: string): this {
    this.definition.description = desc;
    return this;
  }
  
  type(type: ItemType): this {
    this.definition.type = type;
    return this;
  }
  
  rarity(rarity: ItemRarity): this {
    this.definition.rarity = rarity;
    return this;
  }
  
  icon(icon: string): this {
    this.definition.icon = icon;
    return this;
  }
  
  model(model: string): this {
    this.definition.model = model;
    return this;
  }
  
  stackable(maxStack = 99): this {
    this.definition.stackable = true;
    this.definition.maxStack = maxStack;
    return this;
  }
  
  weight(weight: number): this {
    this.definition.weight = weight;
    return this;
  }
  
  value(value: number): this {
    this.definition.value = value;
    return this;
  }
  
  level(level: number): this {
    this.definition.level = level;
    return this;
  }
  
  equipSlot(slot: EquipmentSlot): this {
    this.definition.equipSlot = slot;
    return this;
  }
  
  stats(stats: ItemStats): this {
    this.definition.stats = stats;
    return this;
  }
  
  effect(effect: ItemEffect): this {
    if (!this.definition.effects) {
      this.definition.effects = [];
    }
    this.definition.effects.push(effect);
    return this;
  }
  
  usable(consumeOnUse = true): this {
    this.definition.usable = true;
    this.definition.consumeOnUse = consumeOnUse;
    return this;
  }
  
  questItem(): this {
    this.definition.questItem = true;
    this.definition.tradeable = false;
    this.definition.droppable = false;
    return this;
  }
  
  requirement(req: NonNullable<ItemDefinition['requirements']>): this {
    this.definition.requirements = req;
    return this;
  }
  
  tag(tag: string): this {
    if (!this.definition.tags) {
      this.definition.tags = [];
    }
    this.definition.tags.push(tag);
    return this;
  }
  
  build(): ItemDefinition {
    if (!this.definition.id) throw new Error('Item ID is required');
    if (!this.definition.name) throw new Error('Item name is required');
    if (!this.definition.description) throw new Error('Item description is required');
    if (!this.definition.type) throw new Error('Item type is required');
    if (!this.definition.rarity) throw new Error('Item rarity is required');
    
    return this.definition as ItemDefinition;
  }
}
