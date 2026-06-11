import { AttributeSet } from './gameplay-attributes';
import { GameplayTag, GameplayTagContainer } from './gameplay-tags';
import type {
  ActiveAbility,
  ActiveGameplayEffect,
  AttributeDefinition,
  GameplayAbilitySpec,
  GameplayEffectSpec,
} from './gameplay-ability-contracts';

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

