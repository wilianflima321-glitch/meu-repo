import type { AttributeDefinition, AttributeModifier } from './gameplay-ability-contracts';

// ============================================================================
// ATTRIBUTES
// ============================================================================

export interface AttributeModifier {
  id: string;
  attribute: string;
  operation: AttributeModifierOp;
  value: number;
  source?: string;
  duration?: number;
  stackCount?: number;
}

export interface AttributeDefinition {
  name: string;
  baseValue: number;
  minValue?: number;
  maxValue?: number;
  regenRate?: number;
}

export class AttributeSet {
  private attributes: Map<string, AttributeDefinition> = new Map();
  private currentValues: Map<string, number> = new Map();
  private modifiers: Map<string, AttributeModifier[]> = new Map();

  constructor(definitions: AttributeDefinition[]) {
    for (const def of definitions) {
      this.attributes.set(def.name, def);
      this.currentValues.set(def.name, def.baseValue);
      this.modifiers.set(def.name, []);
    }
  }

  getAttribute(name: string): number {
    const base = this.currentValues.get(name) ?? 0;
    const mods = this.modifiers.get(name) ?? [];

    let additive = 0;
    let multiplicative = 1;
    let override: number | null = null;

    for (const mod of mods) {
      switch (mod.operation) {
        case 'add':
          additive += mod.value * (mod.stackCount ?? 1);
          break;
        case 'multiply':
          multiplicative *= Math.pow(mod.value, mod.stackCount ?? 1);
          break;
        case 'override':
          override = mod.value;
          break;
      }
    }

    if (override !== null) return override;

    let result = (base + additive) * multiplicative;

    const def = this.attributes.get(name);
    if (def) {
      if (def.minValue !== undefined) result = Math.max(def.minValue, result);
      if (def.maxValue !== undefined) result = Math.min(def.maxValue, result);
    }

    return result;
  }

  setBaseValue(name: string, value: number): void {
    if (this.currentValues.has(name)) {
      this.currentValues.set(name, value);
    }
  }

  getBaseValue(name: string): number {
    return this.currentValues.get(name) ?? 0;
  }

  addModifier(modifier: AttributeModifier): void {
    const mods = this.modifiers.get(modifier.attribute);
    if (mods) {
      mods.push(modifier);
    }
  }

  removeModifier(modifierId: string): void {
    for (const [_, mods] of this.modifiers) {
      const index = mods.findIndex(m => m.id === modifierId);
      if (index !== -1) {
        mods.splice(index, 1);
        break;
      }
    }
  }

  removeModifiersBySource(source: string): void {
    for (const [_, mods] of this.modifiers) {
      for (let i = mods.length - 1; i >= 0; i--) {
        if (mods[i].source === source) {
          mods.splice(i, 1);
        }
      }
    }
  }

  tick(deltaTime: number): void {
    for (const [name, def] of this.attributes) {
      if (def.regenRate) {
        const current = this.currentValues.get(name) ?? 0;
        const regen = def.regenRate * deltaTime;
        this.setBaseValue(name, current + regen);
      }
    }

    // Tick modifier durations
    for (const [_, mods] of this.modifiers) {
      for (let i = mods.length - 1; i >= 0; i--) {
        if (mods[i].duration !== undefined) {
          mods[i].duration! -= deltaTime;
          if (mods[i].duration! <= 0) {
            mods.splice(i, 1);
          }
        }
      }
    }
  }

  getAttributeNames(): string[] {
    return Array.from(this.attributes.keys());
  }

  serialize(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [name, _] of this.attributes) {
      result[name] = this.getAttribute(name);
    }
    return result;
  }
}

