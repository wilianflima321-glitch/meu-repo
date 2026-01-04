/**
 * Gameplay Ability System (GAS) - Sistema de Habilidades
 * 
 * Sistema profissional estilo Unreal Engine para criar
 * e gerenciar habilidades, efeitos e atributos.
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

// ============================================================================
// TIPOS BASE
// ============================================================================

export type AttributeModifierOp = 'add' | 'multiply' | 'override';
export type GameplayEffectDurationType = 'instant' | 'duration' | 'infinite';
export type AbilityActivationType = 'triggered' | 'passive' | 'toggle';
export type TargetingMode = 'self' | 'single' | 'aoe' | 'projectile' | 'line';

// ============================================================================
// GAMEPLAY TAGS
// ============================================================================

export class GameplayTag {
  constructor(public readonly name: string) {}
  
  matches(other: GameplayTag): boolean {
    return this.name === other.name || other.name.startsWith(this.name + '.');
  }
  
  isChildOf(parent: GameplayTag): boolean {
    return this.name.startsWith(parent.name + '.');
  }
  
  getParent(): GameplayTag | null {
    const lastDot = this.name.lastIndexOf('.');
    if (lastDot === -1) return null;
    return new GameplayTag(this.name.substring(0, lastDot));
  }
  
  static fromString(str: string): GameplayTag {
    return new GameplayTag(str);
  }
}

export class GameplayTagContainer {
  private tags: Set<string> = new Set();
  
  addTag(tag: GameplayTag): void {
    this.tags.add(tag.name);
  }
  
  removeTag(tag: GameplayTag): void {
    this.tags.delete(tag.name);
  }
  
  hasTag(tag: GameplayTag): boolean {
    return this.tags.has(tag.name);
  }
  
  hasAny(tags: GameplayTag[]): boolean {
    return tags.some(t => this.hasTag(t));
  }
  
  hasAll(tags: GameplayTag[]): boolean {
    return tags.every(t => this.hasTag(t));
  }
  
  matchesQuery(required: GameplayTag[], blocked: GameplayTag[]): boolean {
    if (blocked.some(t => this.hasTag(t))) return false;
    return required.every(t => this.hasTag(t));
  }
  
  getTags(): GameplayTag[] {
    return Array.from(this.tags).map(name => new GameplayTag(name));
  }
  
  clear(): void {
    this.tags.clear();
  }
}

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

// ============================================================================
// GAMEPLAY EFFECTS
// ============================================================================

export interface GameplayEffectSpec {
  id: string;
  name: string;
  description: string;
  durationType: GameplayEffectDurationType;
  duration?: number;
  period?: number;
  modifiers: AttributeModifier[];
  grantedTags: GameplayTag[];
  applicationTags: GameplayTag[];
  removalTags: GameplayTag[];
  requiredTags: GameplayTag[];
  blockedTags: GameplayTag[];
  stackingPolicy: 'none' | 'aggregate' | 'refresh' | 'override';
  maxStacks: number;
  onApplication?: (target: AbilitySystemComponent) => void;
  onRemoval?: (target: AbilitySystemComponent) => void;
  onPeriodTick?: (target: AbilitySystemComponent) => void;
}

export interface ActiveGameplayEffect {
  spec: GameplayEffectSpec;
  startTime: number;
  remainingDuration?: number;
  nextPeriodTick: number;
  stackCount: number;
  source?: AbilitySystemComponent;
  level: number;
}

// ============================================================================
// GAMEPLAY ABILITIES
// ============================================================================

export interface AbilityCost {
  attribute: string;
  value: number;
}

export interface AbilityCooldown {
  duration: number;
  tags: GameplayTag[];
}

export interface GameplayAbilitySpec {
  id: string;
  name: string;
  description: string;
  icon?: string;
  activationType: AbilityActivationType;
  targetingMode: TargetingMode;
  costs: AbilityCost[];
  cooldown?: AbilityCooldown;
  tags: {
    ability: GameplayTag[];
    cancel: GameplayTag[];
    block: GameplayTag[];
    activation: {
      required: GameplayTag[];
      blocked: GameplayTag[];
    };
  };
  effects: GameplayEffectSpec[];
  range?: number;
  aoeRadius?: number;
  canActivate?: (owner: AbilitySystemComponent) => boolean;
  onActivate?: (owner: AbilitySystemComponent, target?: AbilitySystemComponent) => void;
  onEnd?: (owner: AbilitySystemComponent, wasCancelled: boolean) => void;
  onTick?: (owner: AbilitySystemComponent, deltaTime: number) => void;
}

export interface ActiveAbility {
  spec: GameplayAbilitySpec;
  isActive: boolean;
  activationTime: number;
  cooldownEndTime: number;
  target?: AbilitySystemComponent;
}

// ============================================================================
// ABILITY SYSTEM COMPONENT
// ============================================================================

export class AbilitySystemComponent {
  public readonly id: string;
  public readonly attributes: AttributeSet;
  public readonly tags: GameplayTagContainer;
  
  private abilities: Map<string, ActiveAbility> = new Map();
  private activeEffects: Map<string, ActiveGameplayEffect> = new Map();
  private cooldowns: Map<string, number> = new Map();
  
  private onAttributeChanged?: (name: string, oldValue: number, newValue: number) => void;
  private onTagChanged?: (tag: GameplayTag, added: boolean) => void;
  private onAbilityActivated?: (ability: GameplayAbilitySpec) => void;
  private onEffectApplied?: (effect: GameplayEffectSpec) => void;
  
  constructor(id: string, attributeDefinitions: AttributeDefinition[]) {
    this.id = id;
    this.attributes = new AttributeSet(attributeDefinitions);
    this.tags = new GameplayTagContainer();
  }
  
  // ---- Event Handlers ----
  
  setOnAttributeChanged(handler: (name: string, oldValue: number, newValue: number) => void): void {
    this.onAttributeChanged = handler;
  }
  
  setOnTagChanged(handler: (tag: GameplayTag, added: boolean) => void): void {
    this.onTagChanged = handler;
  }
  
  setOnAbilityActivated(handler: (ability: GameplayAbilitySpec) => void): void {
    this.onAbilityActivated = handler;
  }
  
  setOnEffectApplied(handler: (effect: GameplayEffectSpec) => void): void {
    this.onEffectApplied = handler;
  }
  
  // ---- Abilities ----
  
  grantAbility(spec: GameplayAbilitySpec): void {
    if (!this.abilities.has(spec.id)) {
      this.abilities.set(spec.id, {
        spec,
        isActive: spec.activationType === 'passive',
        activationTime: 0,
        cooldownEndTime: 0,
      });
      
      // Auto-activate passive abilities
      if (spec.activationType === 'passive') {
        this.activateAbility(spec.id);
      }
    }
  }
  
  removeAbility(abilityId: string): void {
    const ability = this.abilities.get(abilityId);
    if (ability) {
      if (ability.isActive) {
        this.endAbility(abilityId, true);
      }
      this.abilities.delete(abilityId);
    }
  }
  
  canActivateAbility(abilityId: string, target?: AbilitySystemComponent): boolean {
    const ability = this.abilities.get(abilityId);
    if (!ability) return false;
    
    const spec = ability.spec;
    const now = Date.now();
    
    // Check cooldown
    if (ability.cooldownEndTime > now) return false;
    
    // Check costs
    for (const cost of spec.costs) {
      if (this.attributes.getAttribute(cost.attribute) < cost.value) {
        return false;
      }
    }
    
    // Check activation tags
    if (!this.tags.matchesQuery(spec.tags.activation.required, spec.tags.activation.blocked)) {
      return false;
    }
    
    // Check custom condition
    if (spec.canActivate && !spec.canActivate(this)) {
      return false;
    }
    
    return true;
  }
  
  activateAbility(abilityId: string, target?: AbilitySystemComponent): boolean {
    if (!this.canActivateAbility(abilityId, target)) return false;
    
    const ability = this.abilities.get(abilityId)!;
    const spec = ability.spec;
    const now = Date.now();
    
    // Cancel abilities with matching cancel tags
    for (const [id, active] of this.abilities) {
      if (active.isActive && spec.tags.cancel.some(t => active.spec.tags.ability.some(at => t.matches(at)))) {
        this.endAbility(id, true);
      }
    }
    
    // Pay costs
    for (const cost of spec.costs) {
      const current = this.attributes.getBaseValue(cost.attribute);
      this.attributes.setBaseValue(cost.attribute, current - cost.value);
    }
    
    // Set cooldown
    if (spec.cooldown) {
      ability.cooldownEndTime = now + spec.cooldown.duration * 1000;
      for (const tag of spec.cooldown.tags) {
        this.cooldowns.set(tag.name, ability.cooldownEndTime);
      }
    }
    
    // Apply ability tags
    for (const tag of spec.tags.ability) {
      this.tags.addTag(tag);
      this.onTagChanged?.(tag, true);
    }
    
    // Mark active
    ability.isActive = true;
    ability.activationTime = now;
    ability.target = target;
    
    // Apply effects
    for (const effect of spec.effects) {
      this.applyEffect(effect, this, 1);
      if (target && spec.targetingMode !== 'self') {
        target.applyEffect(effect, this, 1);
      }
    }
    
    // Call activation callback
    spec.onActivate?.(this, target);
    this.onAbilityActivated?.(spec);
    
    return true;
  }
  
  endAbility(abilityId: string, wasCancelled: boolean): void {
    const ability = this.abilities.get(abilityId);
    if (!ability || !ability.isActive) return;
    
    const spec = ability.spec;
    
    // Remove ability tags
    for (const tag of spec.tags.ability) {
      this.tags.removeTag(tag);
      this.onTagChanged?.(tag, false);
    }
    
    ability.isActive = false;
    ability.target = undefined;
    
    // Call end callback
    spec.onEnd?.(this, wasCancelled);
  }
  
  getAbility(abilityId: string): ActiveAbility | undefined {
    return this.abilities.get(abilityId);
  }
  
  getAbilities(): ActiveAbility[] {
    return Array.from(this.abilities.values());
  }
  
  getCooldownRemaining(abilityId: string): number {
    const ability = this.abilities.get(abilityId);
    if (!ability) return 0;
    return Math.max(0, ability.cooldownEndTime - Date.now()) / 1000;
  }
  
  // ---- Effects ----
  
  applyEffect(spec: GameplayEffectSpec, source: AbilitySystemComponent | undefined, level: number): boolean {
    // Check required tags
    if (spec.requiredTags.length > 0 && !this.tags.hasAll(spec.requiredTags)) {
      return false;
    }
    
    // Check blocked tags
    if (spec.blockedTags.length > 0 && this.tags.hasAny(spec.blockedTags)) {
      return false;
    }
    
    const now = Date.now();
    const existingEffect = this.activeEffects.get(spec.id);
    
    // Handle stacking
    if (existingEffect) {
      switch (spec.stackingPolicy) {
        case 'none':
          return false;
        case 'aggregate':
          if (existingEffect.stackCount < spec.maxStacks) {
            existingEffect.stackCount++;
            // Update modifiers
            for (const mod of spec.modifiers) {
              const existing = this.attributes.getAttributeNames();
              if (existing.includes(mod.attribute)) {
                this.attributes.removeModifiersBySource(spec.id);
                this.attributes.addModifier({
                  ...mod,
                  source: spec.id,
                  stackCount: existingEffect.stackCount,
                });
              }
            }
          }
          return true;
        case 'refresh':
          existingEffect.remainingDuration = spec.duration;
          return true;
        case 'override':
          this.removeEffect(spec.id);
          break;
      }
    }
    
    // Create new effect
    const activeEffect: ActiveGameplayEffect = {
      spec,
      startTime: now,
      remainingDuration: spec.duration,
      nextPeriodTick: spec.period ? now + spec.period * 1000 : Infinity,
      stackCount: 1,
      source,
      level,
    };
    
    this.activeEffects.set(spec.id, activeEffect);
    
    // Apply modifiers
    for (const mod of spec.modifiers) {
      this.attributes.addModifier({
        ...mod,
        id: `${spec.id}_${mod.attribute}`,
        source: spec.id,
        duration: spec.durationType === 'duration' ? spec.duration : undefined,
      });
    }
    
    // Grant tags
    for (const tag of spec.grantedTags) {
      this.tags.addTag(tag);
      this.onTagChanged?.(tag, true);
    }
    
    // Call application callback
    spec.onApplication?.(this);
    this.onEffectApplied?.(spec);
    
    return true;
  }
  
  removeEffect(effectId: string): void {
    const effect = this.activeEffects.get(effectId);
    if (!effect) return;
    
    const spec = effect.spec;
    
    // Remove modifiers
    this.attributes.removeModifiersBySource(spec.id);
    
    // Remove tags
    for (const tag of spec.grantedTags) {
      this.tags.removeTag(tag);
      this.onTagChanged?.(tag, false);
    }
    
    // Call removal callback
    spec.onRemoval?.(this);
    
    this.activeEffects.delete(effectId);
  }
  
  getActiveEffects(): ActiveGameplayEffect[] {
    return Array.from(this.activeEffects.values());
  }
  
  hasEffect(effectId: string): boolean {
    return this.activeEffects.has(effectId);
  }
  
  // ---- Tick ----
  
  tick(deltaTime: number): void {
    const now = Date.now();
    
    // Tick attributes
    this.attributes.tick(deltaTime);
    
    // Tick active abilities
    for (const [_, ability] of this.abilities) {
      if (ability.isActive && ability.spec.onTick) {
        ability.spec.onTick(this, deltaTime);
      }
    }
    
    // Tick effects
    for (const [id, effect] of this.activeEffects) {
      // Check duration
      if (effect.spec.durationType === 'duration' && effect.remainingDuration !== undefined) {
        effect.remainingDuration -= deltaTime;
        if (effect.remainingDuration <= 0) {
          this.removeEffect(id);
          continue;
        }
      }
      
      // Check periodic tick
      if (effect.spec.period && now >= effect.nextPeriodTick) {
        effect.spec.onPeriodTick?.(this);
        effect.nextPeriodTick = now + effect.spec.period * 1000;
      }
    }
  }
  
  // ---- Serialization ----
  
  serialize(): object {
    return {
      id: this.id,
      attributes: this.attributes.serialize(),
      tags: this.tags.getTags().map(t => t.name),
      abilities: Array.from(this.abilities.keys()),
      effects: Array.from(this.activeEffects.keys()),
    };
  }
}

// ============================================================================
// PREDEFINED ATTRIBUTES
// ============================================================================

export const CommonAttributes: AttributeDefinition[] = [
  { name: 'Health', baseValue: 100, minValue: 0, maxValue: 100, regenRate: 0 },
  { name: 'MaxHealth', baseValue: 100, minValue: 1 },
  { name: 'Mana', baseValue: 50, minValue: 0, maxValue: 50, regenRate: 2 },
  { name: 'MaxMana', baseValue: 50, minValue: 1 },
  { name: 'Stamina', baseValue: 100, minValue: 0, maxValue: 100, regenRate: 10 },
  { name: 'MaxStamina', baseValue: 100, minValue: 1 },
  { name: 'Strength', baseValue: 10, minValue: 1 },
  { name: 'Dexterity', baseValue: 10, minValue: 1 },
  { name: 'Intelligence', baseValue: 10, minValue: 1 },
  { name: 'Armor', baseValue: 0, minValue: 0 },
  { name: 'MagicResist', baseValue: 0, minValue: 0 },
  { name: 'AttackPower', baseValue: 10, minValue: 0 },
  { name: 'SpellPower', baseValue: 10, minValue: 0 },
  { name: 'CritChance', baseValue: 0.05, minValue: 0, maxValue: 1 },
  { name: 'CritDamage', baseValue: 1.5, minValue: 1 },
  { name: 'AttackSpeed', baseValue: 1, minValue: 0.1, maxValue: 5 },
  { name: 'MovementSpeed', baseValue: 5, minValue: 0 },
  { name: 'CooldownReduction', baseValue: 0, minValue: 0, maxValue: 0.5 },
];

// ============================================================================
// PREDEFINED TAGS
// ============================================================================

export const CommonTags = {
  // Status
  Status: {
    Stunned: new GameplayTag('Status.Stunned'),
    Rooted: new GameplayTag('Status.Rooted'),
    Silenced: new GameplayTag('Status.Silenced'),
    Invulnerable: new GameplayTag('Status.Invulnerable'),
    Invisible: new GameplayTag('Status.Invisible'),
    Burning: new GameplayTag('Status.Burning'),
    Frozen: new GameplayTag('Status.Frozen'),
    Poisoned: new GameplayTag('Status.Poisoned'),
    Bleeding: new GameplayTag('Status.Bleeding'),
  },
  
  // Actions
  Action: {
    Attacking: new GameplayTag('Action.Attacking'),
    Casting: new GameplayTag('Action.Casting'),
    Moving: new GameplayTag('Action.Moving'),
    Jumping: new GameplayTag('Action.Jumping'),
    Dashing: new GameplayTag('Action.Dashing'),
    Blocking: new GameplayTag('Action.Blocking'),
    Channeling: new GameplayTag('Action.Channeling'),
  },
  
  // Damage Types
  Damage: {
    Physical: new GameplayTag('Damage.Physical'),
    Magic: new GameplayTag('Damage.Magic'),
    Fire: new GameplayTag('Damage.Fire'),
    Ice: new GameplayTag('Damage.Ice'),
    Lightning: new GameplayTag('Damage.Lightning'),
    Poison: new GameplayTag('Damage.Poison'),
    True: new GameplayTag('Damage.True'),
  },
  
  // Ability Types
  Ability: {
    Melee: new GameplayTag('Ability.Melee'),
    Ranged: new GameplayTag('Ability.Ranged'),
    AOE: new GameplayTag('Ability.AOE'),
    Projectile: new GameplayTag('Ability.Projectile'),
    Ultimate: new GameplayTag('Ability.Ultimate'),
  },
};

// ============================================================================
// SAMPLE ABILITIES
// ============================================================================

export const SampleAbilities: GameplayAbilitySpec[] = [
  {
    id: 'fireball',
    name: 'Fireball',
    description: 'Launch a ball of fire that deals magic damage to enemies.',
    icon: '🔥',
    activationType: 'triggered',
    targetingMode: 'projectile',
    costs: [{ attribute: 'Mana', value: 25 }],
    cooldown: { duration: 5, tags: [new GameplayTag('Cooldown.Fireball')] },
    range: 30,
    tags: {
      ability: [CommonTags.Action.Casting, CommonTags.Damage.Fire],
      cancel: [],
      block: [CommonTags.Status.Silenced],
      activation: {
        required: [],
        blocked: [CommonTags.Status.Stunned, CommonTags.Status.Silenced],
      },
    },
    effects: [
      {
        id: 'fireball_damage',
        name: 'Fireball Damage',
        description: 'Deals fire damage',
        durationType: 'instant',
        modifiers: [],
        grantedTags: [],
        applicationTags: [CommonTags.Damage.Fire],
        removalTags: [],
        requiredTags: [],
        blockedTags: [CommonTags.Status.Invulnerable],
        stackingPolicy: 'none',
        maxStacks: 1,
      },
    ],
  },
  {
    id: 'heal',
    name: 'Heal',
    description: 'Restore health to yourself or an ally.',
    icon: '💚',
    activationType: 'triggered',
    targetingMode: 'single',
    costs: [{ attribute: 'Mana', value: 30 }],
    cooldown: { duration: 8, tags: [new GameplayTag('Cooldown.Heal')] },
    range: 20,
    tags: {
      ability: [CommonTags.Action.Casting],
      cancel: [],
      block: [CommonTags.Status.Silenced],
      activation: {
        required: [],
        blocked: [CommonTags.Status.Stunned, CommonTags.Status.Silenced],
      },
    },
    effects: [
      {
        id: 'heal_effect',
        name: 'Healing',
        description: 'Restores health',
        durationType: 'instant',
        modifiers: [
          { id: 'heal_mod', attribute: 'Health', operation: 'add', value: 50 },
        ],
        grantedTags: [],
        applicationTags: [],
        removalTags: [],
        requiredTags: [],
        blockedTags: [],
        stackingPolicy: 'none',
        maxStacks: 1,
      },
    ],
  },
  {
    id: 'dash',
    name: 'Dash',
    description: 'Quickly dash in the direction you are facing.',
    icon: '💨',
    activationType: 'triggered',
    targetingMode: 'self',
    costs: [{ attribute: 'Stamina', value: 20 }],
    cooldown: { duration: 3, tags: [new GameplayTag('Cooldown.Dash')] },
    tags: {
      ability: [CommonTags.Action.Dashing],
      cancel: [CommonTags.Action.Attacking],
      block: [],
      activation: {
        required: [],
        blocked: [CommonTags.Status.Stunned, CommonTags.Status.Rooted],
      },
    },
    effects: [
      {
        id: 'dash_speed',
        name: 'Dash Speed Boost',
        description: 'Temporarily increases movement speed',
        durationType: 'duration',
        duration: 0.3,
        modifiers: [
          { id: 'dash_speed_mod', attribute: 'MovementSpeed', operation: 'multiply', value: 3 },
        ],
        grantedTags: [CommonTags.Status.Invulnerable],
        applicationTags: [],
        removalTags: [],
        requiredTags: [],
        blockedTags: [],
        stackingPolicy: 'none',
        maxStacks: 1,
      },
    ],
  },
  {
    id: 'poison_cloud',
    name: 'Poison Cloud',
    description: 'Create a cloud of poison that damages enemies over time.',
    icon: '☠️',
    activationType: 'triggered',
    targetingMode: 'aoe',
    costs: [{ attribute: 'Mana', value: 40 }],
    cooldown: { duration: 12, tags: [new GameplayTag('Cooldown.PoisonCloud')] },
    range: 25,
    aoeRadius: 5,
    tags: {
      ability: [CommonTags.Action.Casting, CommonTags.Damage.Poison],
      cancel: [],
      block: [CommonTags.Status.Silenced],
      activation: {
        required: [],
        blocked: [CommonTags.Status.Stunned, CommonTags.Status.Silenced],
      },
    },
    effects: [
      {
        id: 'poison_dot',
        name: 'Poison',
        description: 'Deals poison damage over time',
        durationType: 'duration',
        duration: 6,
        period: 1,
        modifiers: [
          { id: 'poison_damage', attribute: 'Health', operation: 'add', value: -10 },
        ],
        grantedTags: [CommonTags.Status.Poisoned],
        applicationTags: [CommonTags.Damage.Poison],
        removalTags: [],
        requiredTags: [],
        blockedTags: [CommonTags.Status.Invulnerable],
        stackingPolicy: 'refresh',
        maxStacks: 1,
        onPeriodTick: (target) => {
          const current = target.attributes.getBaseValue('Health');
          target.attributes.setBaseValue('Health', current - 10);
        },
      },
    ],
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createAbilitySystemComponent(
  id: string,
  attributes?: AttributeDefinition[],
  abilities?: GameplayAbilitySpec[]
): AbilitySystemComponent {
  const asc = new AbilitySystemComponent(id, attributes || CommonAttributes);
  
  if (abilities) {
    for (const ability of abilities) {
      asc.grantAbility(ability);
    }
  }
  
  return asc;
}

export function calculateDamage(
  attacker: AbilitySystemComponent,
  target: AbilitySystemComponent,
  baseDamage: number,
  damageType: 'physical' | 'magic'
): number {
  const attackPower = damageType === 'physical' 
    ? attacker.attributes.getAttribute('AttackPower')
    : attacker.attributes.getAttribute('SpellPower');
  
  const defense = damageType === 'physical'
    ? target.attributes.getAttribute('Armor')
    : target.attributes.getAttribute('MagicResist');
  
  const critChance = attacker.attributes.getAttribute('CritChance');
  const critDamage = attacker.attributes.getAttribute('CritDamage');
  
  let damage = baseDamage * (attackPower / 10);
  
  // Apply armor/resist reduction
  const reduction = defense / (defense + 100);
  damage *= (1 - reduction);
  
  // Apply crit
  if (Math.random() < critChance) {
    damage *= critDamage;
  }
  
  return Math.floor(damage);
}

const gameplayAbilitySystem = {
  GameplayTag,
  GameplayTagContainer,
  AttributeSet,
  AbilitySystemComponent,
  CommonAttributes,
  CommonTags,
  SampleAbilities,
  createAbilitySystemComponent,
  calculateDamage,
};

export default gameplayAbilitySystem;

