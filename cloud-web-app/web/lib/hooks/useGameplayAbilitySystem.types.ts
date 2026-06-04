import type {
  AbilitySystemComponent,
  GameplayAbilitySpec,
  GameplayEffectSpec,
  GameplayTag,
  AttributeDefinition,
  AttributeModifier,
} from '../gameplay-ability-system';

// ============================================================================
// TYPES
// ============================================================================

export interface AbilityState {
  id: string;
  name: string;
  description: string;
  icon?: string;
  isActive: boolean;
  isOnCooldown: boolean;
  cooldownRemaining: number;
  cooldownTotal: number;
  canActivate: boolean;
  costs: Array<{ attribute: string; value: number; available: number }>;
}

export interface EffectState {
  id: string;
  name: string;
  description: string;
  remainingDuration?: number;
  stackCount: number;
  isPeriodic: boolean;
  isInfinite: boolean;
}

export interface AttributeState {
  name: string;
  baseValue: number;
  currentValue: number;
  minValue?: number;
  maxValue?: number;
  percentage?: number;
}

export interface GASStats {
  totalAbilities: number;
  activeAbilities: number;
  activeEffects: number;
  totalTags: number;
  tickRate: number;
  lastTickTime: number;
}

export interface UseGASOptions {
  /** Atributos iniciais */
  attributes?: AttributeDefinition[];
  /** Habilidades disponíveis */
  abilities?: GameplayAbilitySpec[];
  /** Usar atributos padrão do sistema */
  useStandardAttributes?: boolean;
  /** Taxa de atualização em Hz (padrão: 60) */
  tickRate?: number;
  /** Callbacks de eventos */
  events?: {
    onAbilityActivated?: (ability: GameplayAbilitySpec) => void;
    onAbilityEnded?: (ability: GameplayAbilitySpec, cancelled: boolean) => void;
    onEffectApplied?: (effect: GameplayEffectSpec) => void;
    onEffectRemoved?: (effect: GameplayEffectSpec) => void;
    onAttributeChanged?: (name: string, oldValue: number, newValue: number) => void;
    onDamageReceived?: (amount: number, source?: string) => void;
    onHealReceived?: (amount: number, source?: string) => void;
  };
}

export interface UseGASReturn {
  // Estado
  attributes: Map<string, AttributeState>;
  abilities: Map<string, AbilityState>;
  activeEffects: EffectState[];
  tags: GameplayTag[];
  stats: GASStats;

  // Ações de atributos
  getAttribute: (name: string) => number;
  setAttribute: (name: string, value: number) => void;
  modifyAttribute: (modifier: AttributeModifier) => void;
  removeModifier: (modifierId: string) => void;

  // Ações de habilidades
  grantAbility: (spec: GameplayAbilitySpec) => void;
  removeAbility: (abilityId: string) => void;
  activateAbility: (abilityId: string, target?: AbilitySystemComponent) => boolean;
  cancelAbility: (abilityId: string) => void;
  canActivateAbility: (abilityId: string) => boolean;

  // Ações de efeitos
  applyEffect: (spec: GameplayEffectSpec, level?: number) => void;
  removeEffect: (effectId: string) => void;
  hasEffect: (effectId: string) => boolean;
  getEffectStacks: (effectId: string) => number;

  // Ações de tags
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  hasTag: (tag: string) => boolean;
  hasAnyTag: (tags: string[]) => boolean;
  hasAllTags: (tags: string[]) => boolean;

  // Utilitários
  dealDamage: (amount: number, source?: string) => number;
  heal: (amount: number, source?: string) => number;
  isAlive: () => boolean;
  reset: () => void;

  // Acesso ao sistema interno
  getSystemComponent: () => AbilitySystemComponent;
}
