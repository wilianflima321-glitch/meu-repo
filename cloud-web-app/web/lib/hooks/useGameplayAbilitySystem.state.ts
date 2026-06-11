import type { AbilitySystemComponent, GameplayTag } from '../gameplay-ability-system';
import type { AbilityState, AttributeState, EffectState, GASStats, UseGASOptions } from './useGameplayAbilitySystem.types';

export type GASSyncSnapshot = {
  attributeStates: Map<string, AttributeState>;
  abilityStates: Map<string, AbilityState>;
  activeEffects: EffectState[];
  tags: GameplayTag[];
  statsPatch: Pick<GASStats, 'totalAbilities' | 'activeAbilities' | 'activeEffects' | 'totalTags'>;
};

function resolveAttributePercentage(system: AbilitySystemComponent, name: string, current: number): number | undefined {
  if (!name.toLowerCase().includes('health') && !name.toLowerCase().includes('mana')) {
    return undefined;
  }

  const maxName = name.replace(/current/i, 'max').replace(/^(health|mana)$/i, 'max$1');
  const max = system.attributes.getAttribute(maxName);
  return max > 0 ? (current / max) * 100 : undefined;
}

export function syncGameplayAbilityState(
  system: AbilitySystemComponent,
  prevAttributes: Map<string, number>,
  events: UseGASOptions['events'] = {},
): GASSyncSnapshot {
  const attributeStates = new Map<string, AttributeState>();

  for (const name of system.attributes.getAttributeNames()) {
    const current = system.attributes.getAttribute(name);
    const base = system.attributes.getBaseValue(name);
    const previous = prevAttributes.get(name);

    if (previous !== undefined && previous !== current) {
      events.onAttributeChanged?.(name, previous, current);
    }

    prevAttributes.set(name, current);
    attributeStates.set(name, {
      name,
      baseValue: base,
      currentValue: current,
      percentage: resolveAttributePercentage(system, name, current),
    });
  }

  const abilityStates = new Map<string, AbilityState>();
  const abilities = system.getAbilities();

  for (const ability of abilities) {
    const spec = ability.spec;
    const cooldownRemaining = system.getCooldownRemaining(spec.id);

    abilityStates.set(spec.id, {
      id: spec.id,
      name: spec.name,
      description: spec.description,
      icon: spec.icon,
      isActive: ability.isActive,
      isOnCooldown: cooldownRemaining > 0,
      cooldownRemaining,
      cooldownTotal: spec.cooldown?.duration ?? 0,
      canActivate: system.canActivateAbility(spec.id),
      costs: spec.costs.map(cost => ({
        attribute: cost.attribute,
        value: cost.value,
        available: system.attributes.getAttribute(cost.attribute),
      })),
    });
  }

  const activeEffects: EffectState[] = system.getActiveEffects().map(effect => ({
    id: effect.spec.id,
    name: effect.spec.name,
    description: effect.spec.description,
    remainingDuration: effect.remainingDuration,
    stackCount: effect.stackCount,
    isPeriodic: effect.spec.period !== undefined,
    isInfinite: effect.spec.durationType === 'infinite',
  }));

  const tags = system.tags.getTags();

  return {
    attributeStates,
    abilityStates,
    activeEffects,
    tags,
    statsPatch: {
      totalAbilities: abilities.length,
      activeAbilities: Array.from(abilityStates.values()).filter(ability => ability.isActive).length,
      activeEffects: activeEffects.length,
      totalTags: tags.length,
    },
  };
}
