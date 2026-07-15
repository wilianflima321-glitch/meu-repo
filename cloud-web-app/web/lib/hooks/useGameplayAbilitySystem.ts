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
  AttributeModifier,
  ActiveGameplayEffect,
  ActiveAbility,
  CommonAttributes,
  createAbilitySystemComponent,
} from '../gameplay-ability-system';

import type { AbilityState, AttributeState, EffectState, GASStats, UseGASOptions, UseGASReturn } from './useGameplayAbilitySystem.types';
import { syncGameplayAbilityState } from './useGameplayAbilitySystem.state';

export type { AbilityState, AttributeState, EffectState, GASStats, UseGASOptions, UseGASReturn } from './useGameplayAbilitySystem.types';

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
  const eventsRef = useRef(events);
  const syncStateRef = useRef<() => void>(() => {});

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

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
    syncStateRef.current();

    return () => {
      // Cleanup
      systemRef.current = null;
    };
  }, [customAttributes, initialAbilities, useStandardAttributes]);

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
        syncStateRef.current();

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

    const snapshot = syncGameplayAbilityState(
      systemRef.current,
      prevAttributesRef.current,
      eventsRef.current,
    );

    setAttributeStates(snapshot.attributeStates);
    setAbilityStates(snapshot.abilityStates);
    setActiveEffects(snapshot.activeEffects);
    setTags(snapshot.tags);
    setStats(prev => ({
      ...prev,
      ...snapshot.statsPatch,
    }));
  }, []);

  useEffect(() => {
    syncStateRef.current = syncState;
  }, [syncState]);

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

export { PRESET_ABILITIES } from './useGameplayAbilitySystem.presets';

export default useGameplayAbilitySystem;
