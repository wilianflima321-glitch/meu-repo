/**
 * useGameplayAbilitySystem Hook
 * 
 * Hook React profissional para integrar o Gameplay Ability System (GAS)
 * com componentes React. Fornece uma API completa para:
 * - Gerenciamento de atributos
 * - Ativação de habilidades
 * - Aplicação de efeitos
 * - Sistema de tags
 * - Cooldowns e custos
 * 
 * @module hooks/useGameplayAbilitySystem
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  AbilitySystemComponent,
  GameplayAbilitySpec,
  GameplayEffectSpec,
  GameplayTag,
  AttributeDefinition,
  AttributeModifier,
  ActiveGameplayEffect,
  ActiveAbility,
  CommonAttributes,
  createAbilitySystemComponent,
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

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useGameplayAbilitySystem(options: UseGASOptions = {}): UseGASReturn {
  const {
    attributes: customAttributes,
    abilities: initialAbilities,
    useStandardAttributes = true,
    tickRate = 60,
    events = {},
  } = options;

  // Sistema GAS interno
  const systemRef = useRef<AbilitySystemComponent | null>(null);
  
  // Estado React
  const [attributeStates, setAttributeStates] = useState<Map<string, AttributeState>>(new Map());
  const [abilityStates, setAbilityStates] = useState<Map<string, AbilityState>>(new Map());
  const [activeEffects, setActiveEffects] = useState<EffectState[]>([]);
  const [tags, setTags] = useState<GameplayTag[]>([]);
  const [stats, setStats] = useState<GASStats>({
    totalAbilities: 0,
    activeAbilities: 0,
    activeEffects: 0,
    totalTags: 0,
    tickRate,
    lastTickTime: 0,
  });

  // Tracking de valores anteriores para callbacks
  const prevAttributesRef = useRef<Map<string, number>>(new Map());

  // ============================================================================
  // INICIALIZAÇÃO
  // ============================================================================

  useEffect(() => {
    // Criar atributos
    const attrs = useStandardAttributes 
      ? CommonAttributes
      : customAttributes ?? [];

    // Criar sistema
    systemRef.current = createAbilitySystemComponent('player', attrs, initialAbilities);

    // Sincronizar estado inicial
    syncState();

    return () => {
      // Cleanup
      systemRef.current = null;
    };
  }, []);

  // ============================================================================
  // GAME LOOP
  // ============================================================================

  useEffect(() => {
    if (!systemRef.current) return;

    let lastTime = performance.now();
    let animationId: number;

    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (systemRef.current) {
        // Tick do sistema
        systemRef.current.tick(deltaTime);

        // Sincronizar estado com React
        syncState();

        // Atualizar stats
        setStats(prev => ({
          ...prev,
          lastTickTime: deltaTime * 1000,
        }));
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [tickRate]);

  // ============================================================================
  // SINCRONIZAÇÃO DE ESTADO
  // ============================================================================

  const syncState = useCallback(() => {
    if (!systemRef.current) return;

    const system = systemRef.current;

    // Sincronizar atributos
    const newAttributes = new Map<string, AttributeState>();
    const attrNames = system.attributes.getAttributeNames();
    
    for (const name of attrNames) {
      const current = system.attributes.getAttribute(name);
      const base = system.attributes.getBaseValue(name);
      
      // Check for changes
      const prevValue = prevAttributesRef.current.get(name);
      if (prevValue !== undefined && prevValue !== current) {
        events.onAttributeChanged?.(name, prevValue, current);
      }
      prevAttributesRef.current.set(name, current);

      // Calcular porcentagem para atributos com máximo
      let percentage: number | undefined;
      if (name.toLowerCase().includes('health') || name.toLowerCase().includes('mana')) {
        const maxName = name.replace(/current/i, 'max').replace(/^(health|mana)$/i, 'max$1');
        const max = system.attributes.getAttribute(maxName);
        if (max > 0) {
          percentage = (current / max) * 100;
        }
      }

      newAttributes.set(name, {
        name,
        baseValue: base,
        currentValue: current,
        percentage,
      });
    }
    setAttributeStates(newAttributes);

    // Sincronizar habilidades
    const newAbilities = new Map<string, AbilityState>();
    const abilities = system.getAbilities();
    
    for (const ability of abilities) {
      const spec = ability.spec;
      const cooldownRemaining = system.getCooldownRemaining(spec.id);
      const cooldownTotal = spec.cooldown?.duration ?? 0;
      const canActivate = system.canActivateAbility(spec.id);

      // Calcular custos
      const costs = spec.costs.map(cost => ({
        attribute: cost.attribute,
        value: cost.value,
        available: system.attributes.getAttribute(cost.attribute),
      }));

      newAbilities.set(spec.id, {
        id: spec.id,
        name: spec.name,
        description: spec.description,
        icon: spec.icon,
        isActive: ability.isActive,
        isOnCooldown: cooldownRemaining > 0,
        cooldownRemaining,
        cooldownTotal,
        canActivate,
        costs,
      });
    }
    setAbilityStates(newAbilities);

    // Sincronizar efeitos ativos
    const effects = system.getActiveEffects();
    const newEffects: EffectState[] = effects.map(effect => ({
      id: effect.spec.id,
      name: effect.spec.name,
      description: effect.spec.description,
      remainingDuration: effect.remainingDuration,
      stackCount: effect.stackCount,
      isPeriodic: effect.spec.period !== undefined,
      isInfinite: effect.spec.durationType === 'infinite',
    }));
    setActiveEffects(newEffects);

    // Sincronizar tags
    const currentTags = system.tags.getTags();
    setTags(currentTags);

    // Atualizar stats
    setStats(prev => ({
      ...prev,
      totalAbilities: abilities.length,
      activeAbilities: Array.from(newAbilities.values()).filter(a => a.isActive).length,
      activeEffects: newEffects.length,
      totalTags: currentTags.length,
    }));
  }, [events]);

  // ============================================================================
  // AÇÕES DE ATRIBUTOS
  // ============================================================================

  const getAttribute = useCallback((name: string): number => {
    return systemRef.current?.attributes.getAttribute(name) ?? 0;
  }, []);

  const setAttribute = useCallback((name: string, value: number): void => {
    systemRef.current?.attributes.setBaseValue(name, value);
    syncState();
  }, [syncState]);

  const modifyAttribute = useCallback((modifier: AttributeModifier): void => {
    systemRef.current?.attributes.addModifier(modifier);
    syncState();
  }, [syncState]);

  const removeModifier = useCallback((modifierId: string): void => {
    systemRef.current?.attributes.removeModifier(modifierId);
    syncState();
  }, [syncState]);

  // ============================================================================
  // AÇÕES DE HABILIDADES
  // ============================================================================

  const grantAbility = useCallback((spec: GameplayAbilitySpec): void => {
    systemRef.current?.grantAbility(spec);
    syncState();
  }, [syncState]);

  const removeAbility = useCallback((abilityId: string): void => {
    systemRef.current?.removeAbility(abilityId);
    syncState();
  }, [syncState]);

  const activateAbility = useCallback((abilityId: string, target?: AbilitySystemComponent): boolean => {
    if (!systemRef.current) return false;
    
    const success = systemRef.current.activateAbility(abilityId, target);
    
    if (success) {
      const ability = systemRef.current.getAbility(abilityId);
      if (ability) {
        events.onAbilityActivated?.(ability.spec);
      }
    }
    
    syncState();
    return success;
  }, [syncState, events]);

  const cancelAbility = useCallback((abilityId: string): void => {
    if (!systemRef.current) return;
    
    const ability = systemRef.current.getAbility(abilityId);
    if (ability) {
      systemRef.current.endAbility(abilityId, true);
      events.onAbilityEnded?.(ability.spec, true);
    }
    
    syncState();
  }, [syncState, events]);

  const canActivateAbility = useCallback((abilityId: string): boolean => {
    return systemRef.current?.canActivateAbility(abilityId) ?? false;
  }, []);

  // ============================================================================
  // AÇÕES DE EFEITOS
  // ============================================================================

  const applyEffect = useCallback((spec: GameplayEffectSpec, level: number = 1): void => {
    if (!systemRef.current) return;
    
    systemRef.current.applyEffect(spec, systemRef.current, level);
    events.onEffectApplied?.(spec);
    syncState();
  }, [syncState, events]);

  const removeEffect = useCallback((effectId: string): void => {
    if (!systemRef.current) return;
    
    const effect = systemRef.current.getActiveEffects().find(e => e.spec.id === effectId);
    if (effect) {
      systemRef.current.removeEffect(effectId);
      events.onEffectRemoved?.(effect.spec);
    }
    
    syncState();
  }, [syncState, events]);

  const hasEffect = useCallback((effectId: string): boolean => {
    return systemRef.current?.getActiveEffects().some(e => e.spec.id === effectId) ?? false;
  }, []);

  const getEffectStacks = useCallback((effectId: string): number => {
    const effect = systemRef.current?.getActiveEffects().find(e => e.spec.id === effectId);
    return effect?.stackCount ?? 0;
  }, []);

  // ============================================================================
  // AÇÕES DE TAGS
  // ============================================================================

  const addTag = useCallback((tag: string): void => {
    systemRef.current?.tags.addTag(GameplayTag.fromString(tag));
    syncState();
  }, [syncState]);

  const removeTag = useCallback((tag: string): void => {
    systemRef.current?.tags.removeTag(GameplayTag.fromString(tag));
    syncState();
  }, [syncState]);

  const hasTag = useCallback((tag: string): boolean => {
    return systemRef.current?.tags.hasTag(GameplayTag.fromString(tag)) ?? false;
  }, []);

  const hasAnyTag = useCallback((tagNames: string[]): boolean => {
    const gameTags = tagNames.map(t => GameplayTag.fromString(t));
    return systemRef.current?.tags.hasAny(gameTags) ?? false;
  }, []);

  const hasAllTags = useCallback((tagNames: string[]): boolean => {
    const gameTags = tagNames.map(t => GameplayTag.fromString(t));
    return systemRef.current?.tags.hasAll(gameTags) ?? false;
  }, []);

  // ============================================================================
  // UTILITÁRIOS
  // ============================================================================

  const dealDamage = useCallback((amount: number, source?: string): number => {
    if (!systemRef.current) return 0;
    
    const currentHealth = systemRef.current.attributes.getAttribute('health');
    const defense = systemRef.current.attributes.getAttribute('defense') ?? 0;
    
    // Aplicar redução de dano baseada em defesa
    const damageReduction = defense / (defense + 100); // Formula de redução logarítmica
    const actualDamage = amount * (1 - damageReduction);
    
    const newHealth = Math.max(0, currentHealth - actualDamage);
    systemRef.current.attributes.setBaseValue('health', newHealth);
    
    events.onDamageReceived?.(actualDamage, source);
    syncState();
    
    return actualDamage;
  }, [syncState, events]);

  const heal = useCallback((amount: number, source?: string): number => {
    if (!systemRef.current) return 0;
    
    const currentHealth = systemRef.current.attributes.getAttribute('health');
    const maxHealth = systemRef.current.attributes.getAttribute('maxHealth') ?? 100;
    
    const actualHeal = Math.min(amount, maxHealth - currentHealth);
    const newHealth = currentHealth + actualHeal;
    
    systemRef.current.attributes.setBaseValue('health', newHealth);
    
    events.onHealReceived?.(actualHeal, source);
    syncState();
    
    return actualHeal;
  }, [syncState, events]);

  const isAlive = useCallback((): boolean => {
    const health = systemRef.current?.attributes.getAttribute('health') ?? 0;
    return health > 0;
  }, []);

  const reset = useCallback((): void => {
    if (!systemRef.current) return;
    
    // Reset attributes to base values
    const attrNames = systemRef.current.attributes.getAttributeNames();
    for (const name of attrNames) {
      const baseValue = systemRef.current.attributes.getBaseValue(name);
      systemRef.current.attributes.setBaseValue(name, baseValue);
    }
    
    // Remove all active effects
    const effects = systemRef.current.getActiveEffects();
    for (const effect of effects) {
      systemRef.current.removeEffect(effect.spec.id);
    }
    
    // Cancel all active abilities
    const abilities = systemRef.current.getAbilities();
    for (const ability of abilities) {
      if (ability.isActive) {
        systemRef.current.endAbility(ability.spec.id, true);
      }
    }
    
    // Clear tags
    systemRef.current.tags.clear();
    
    syncState();
  }, [syncState]);

  const getSystemComponent = useCallback((): AbilitySystemComponent => {
    if (!systemRef.current) {
      throw new Error('GAS not initialized');
    }
    return systemRef.current;
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return useMemo(() => ({
    // Estado
    attributes: attributeStates,
    abilities: abilityStates,
    activeEffects,
    tags,
    stats,
    
    // Ações de atributos
    getAttribute,
    setAttribute,
    modifyAttribute,
    removeModifier,
    
    // Ações de habilidades
    grantAbility,
    removeAbility,
    activateAbility,
    cancelAbility,
    canActivateAbility,
    
    // Ações de efeitos
    applyEffect,
    removeEffect,
    hasEffect,
    getEffectStacks,
    
    // Ações de tags
    addTag,
    removeTag,
    hasTag,
    hasAnyTag,
    hasAllTags,
    
    // Utilitários
    dealDamage,
    heal,
    isAlive,
    reset,
    
    // Sistema interno
    getSystemComponent,
  }), [
    attributeStates,
    abilityStates,
    activeEffects,
    tags,
    stats,
    getAttribute,
    setAttribute,
    modifyAttribute,
    removeModifier,
    grantAbility,
    removeAbility,
    activateAbility,
    cancelAbility,
    canActivateAbility,
    applyEffect,
    removeEffect,
    hasEffect,
    getEffectStacks,
    addTag,
    removeTag,
    hasTag,
    hasAnyTag,
    hasAllTags,
    dealDamage,
    heal,
    isAlive,
    reset,
    getSystemComponent,
  ]);
}

// ============================================================================
// PRESET ABILITIES
// ============================================================================

/**
 * Habilidades predefinidas para uso rápido
 */
export const PRESET_ABILITIES = {
  /** Fireball - Dano de área com DOT */
  fireball: (): GameplayAbilitySpec => ({
    id: 'ability.fireball',
    name: 'Fireball',
    description: 'Lança uma bola de fogo que causa dano em área',
    icon: '🔥',
    activationType: 'triggered',
    targetingMode: 'aoe',
    costs: [{ attribute: 'mana', value: 30 }],
    cooldown: { duration: 5, tags: [GameplayTag.fromString('cooldown.fire')] },
    tags: {
      ability: [GameplayTag.fromString('ability.fire'), GameplayTag.fromString('ability.magic')],
      cancel: [],
      block: [GameplayTag.fromString('state.silenced')],
      activation: { required: [], blocked: [GameplayTag.fromString('state.stunned')] },
    },
    effects: [{
      id: 'effect.burn',
      name: 'Burning',
      description: 'Causa dano ao longo do tempo',
      durationType: 'duration',
      duration: 4,
      period: 1,
      modifiers: [],
      grantedTags: [GameplayTag.fromString('debuff.burning')],
      applicationTags: [],
      removalTags: [],
      requiredTags: [],
      blockedTags: [],
      stackingPolicy: 'refresh',
      maxStacks: 3,
    }],
    range: 20,
    aoeRadius: 5,
  }),

  /** Heal - Cura instantânea */
  heal: (): GameplayAbilitySpec => ({
    id: 'ability.heal',
    name: 'Heal',
    description: 'Restaura pontos de vida',
    icon: '💚',
    activationType: 'triggered',
    targetingMode: 'self',
    costs: [{ attribute: 'mana', value: 20 }],
    cooldown: { duration: 3, tags: [GameplayTag.fromString('cooldown.heal')] },
    tags: {
      ability: [GameplayTag.fromString('ability.heal'), GameplayTag.fromString('ability.magic')],
      cancel: [],
      block: [],
      activation: { required: [], blocked: [GameplayTag.fromString('state.stunned')] },
    },
    effects: [{
      id: 'effect.healing',
      name: 'Healing',
      description: 'Restaura vida instantaneamente',
      durationType: 'instant',
      modifiers: [{
        id: 'mod.heal',
        attribute: 'health',
        operation: 'add',
        value: 50,
      }],
      grantedTags: [],
      applicationTags: [],
      removalTags: [],
      requiredTags: [],
      blockedTags: [],
      stackingPolicy: 'none',
      maxStacks: 1,
    }],
  }),

  /** Sprint - Buff de velocidade temporário */
  sprint: (): GameplayAbilitySpec => ({
    id: 'ability.sprint',
    name: 'Sprint',
    description: 'Aumenta a velocidade de movimento temporariamente',
    icon: '⚡',
    activationType: 'triggered',
    targetingMode: 'self',
    costs: [{ attribute: 'stamina', value: 25 }],
    cooldown: { duration: 10, tags: [GameplayTag.fromString('cooldown.movement')] },
    tags: {
      ability: [GameplayTag.fromString('ability.movement')],
      cancel: [],
      block: [],
      activation: { required: [], blocked: [GameplayTag.fromString('state.rooted')] },
    },
    effects: [{
      id: 'effect.sprint',
      name: 'Sprinting',
      description: 'Velocidade aumentada em 50%',
      durationType: 'duration',
      duration: 5,
      modifiers: [{
        id: 'mod.speed',
        attribute: 'moveSpeed',
        operation: 'multiply',
        value: 1.5,
      }],
      grantedTags: [GameplayTag.fromString('buff.speed')],
      applicationTags: [],
      removalTags: [],
      requiredTags: [],
      blockedTags: [],
      stackingPolicy: 'refresh',
      maxStacks: 1,
    }],
  }),

  /** Shield - Escudo absorvedor de dano */
  shield: (): GameplayAbilitySpec => ({
    id: 'ability.shield',
    name: 'Shield',
    description: 'Cria um escudo que absorve dano',
    icon: '🛡️',
    activationType: 'triggered',
    targetingMode: 'self',
    costs: [{ attribute: 'mana', value: 40 }],
    cooldown: { duration: 15, tags: [GameplayTag.fromString('cooldown.defensive')] },
    tags: {
      ability: [GameplayTag.fromString('ability.defensive')],
      cancel: [],
      block: [],
      activation: { required: [], blocked: [] },
    },
    effects: [{
      id: 'effect.shield',
      name: 'Shielded',
      description: 'Absorve até 100 pontos de dano',
      durationType: 'duration',
      duration: 10,
      modifiers: [{
        id: 'mod.shield',
        attribute: 'defense',
        operation: 'add',
        value: 100,
      }],
      grantedTags: [GameplayTag.fromString('buff.shielded')],
      applicationTags: [],
      removalTags: [],
      requiredTags: [],
      blockedTags: [],
      stackingPolicy: 'override',
      maxStacks: 1,
    }],
  }),
};

export default useGameplayAbilitySystem;
