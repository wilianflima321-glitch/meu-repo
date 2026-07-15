import { AbilitySystemComponent } from './gameplay-ability-component';
import { AttributeSet } from './gameplay-attributes';
import { buildCommonAttributes, buildCommonTags, buildSampleAbilities } from './gameplay-ability-presets';
import { GameplayTag, GameplayTagContainer } from './gameplay-tags';
import type { AttributeDefinition } from './gameplay-attributes';
import type { GameplayAbilitySpec } from './gameplay-ability-contracts';

export { AbilitySystemComponent } from './gameplay-ability-component';
export { AttributeSet } from './gameplay-attributes';
export { GameplayTag, GameplayTagContainer } from './gameplay-tags';
export type { AttributeDefinition, AttributeModifier } from './gameplay-attributes';
export type {
  AbilityActivationType,
  AbilityCooldown,
  AbilityCost,
  ActiveAbility,
  ActiveGameplayEffect,
  AttributeModifierOp,
  GameplayAbilitySpec,
  GameplayEffectDurationType,
  GameplayEffectSpec,
  TargetingMode,
} from './gameplay-ability-contracts';


/**
 * Gameplay Ability System (GAS) - Sistema de Habilidades
 *
 * Sistema profissional estilo Unreal Engine para criar
 * e gerenciar habilidades, efeitos e atributos.
 *
 * NÃO É MOCK - Sistema real e funcional!
 */

// ============================================================================
// ABILITY SYSTEM COMPONENT
// ============================================================================

// ============================================================================
// PREDEFINED CONTENT
// ============================================================================

export const CommonAttributes = buildCommonAttributes();
export const CommonTags = buildCommonTags(GameplayTag);
export const SampleAbilities = buildSampleAbilities(GameplayTag, CommonTags);

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

