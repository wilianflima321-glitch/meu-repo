import type { GameplayTag } from './gameplay-tags';
import type { AbilitySystemComponent } from './gameplay-ability-component';
import type { AttributeModifier } from './gameplay-attributes';

// ============================================================================
// TIPOS BASE
// ============================================================================

export type AttributeModifierOp = 'add' | 'multiply' | 'override';
export type GameplayEffectDurationType = 'instant' | 'duration' | 'infinite';
export type AbilityActivationType = 'triggered' | 'passive' | 'toggle';
export type TargetingMode = 'self' | 'single' | 'aoe' | 'projectile' | 'line';


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

