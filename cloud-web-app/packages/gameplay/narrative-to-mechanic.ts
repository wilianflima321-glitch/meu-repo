/**
 * narrative-to-mechanic.ts
 *
 * Translates lore beats, factions, and emotional weight structures
 * into gameplay nodes and mechanic definitions.
 *
 * Schema from the Master Blueprint:
 *   NarrativeBeat → MechanicTranslation
 */

import type { GameplayBlueprint } from './gameplay-blueprint';
import { createComponentLogger } from '../../web/lib/observability/logger';

const log = createComponentLogger('narrative.mechanic');

// ─────────────────────────────────────────────────────────────────────────────
// Types (from Master Blueprint spec)
// ─────────────────────────────────────────────────────────────────────────────

export interface NarrativeBeat {
  id: string;
  type: 'betrayal' | 'sacrifice' | 'discovery' | 'corruption' | 'redemption';
  emotionalWeight: number;   // 0.0 – 1.0
  charactersInvolved: string[];
  locationHint?: string;
  timestamp?: string;
}

export interface MechanicTranslation {
  narrativeBeatId: string;
  generatedMechanic: {
    targetComponent: 'ability' | 'progression' | 'economy' | 'combat' | 'world_event';
    ruleDefinition: string;
    displayName: string;
  };
  justification: string;
  emotionalResonance: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Beat-type → Mechanic mapping rules
// ─────────────────────────────────────────────────────────────────────────────

type BeatMechanicTemplate = {
  targetComponent: MechanicTranslation['generatedMechanic']['targetComponent'];
  ruleTemplate: (beat: NarrativeBeat, blueprint: GameplayBlueprint) => string;
  displayNameTemplate: (beat: NarrativeBeat) => string;
  justificationTemplate: (beat: NarrativeBeat) => string;
};

const BEAT_TEMPLATES: Record<NarrativeBeat['type'], BeatMechanicTemplate> = {
  betrayal: {
    targetComponent: 'ability',
    ruleTemplate: (beat, bp) => {
      const char = beat.charactersInvolved[0] ?? 'ally';
      const weight = beat.emotionalWeight;
      return `// Betrayal Mechanic — triggered when ${char} reveals treachery\n` +
        `if (relationship[${JSON.stringify(char)}] === 'trusted' && betrayal_event_fired) {\n` +
        `  rage_buildup += ${(weight * 20).toFixed(1)};\n` +
        `  unlock_ability('vengeance_strike');\n` +
        `  relationship[${JSON.stringify(char)}] = 'enemy';\n` +
        `  ${bp.combatStyle.hasParry ? 'boost_parry_window(500);' : ''}\n` +
        `}`;
    },
    displayNameTemplate: (beat) => `Betrayal of ${beat.charactersInvolved[0] ?? 'Ally'}: Vengeance Unlocked`,
    justificationTemplate: (beat) => `High emotional weight (${(beat.emotionalWeight * 100).toFixed(0)}%) betrayal beats translate to power spikes. The player's rage manifests as a new ability.`,
  },

  sacrifice: {
    targetComponent: 'progression',
    ruleTemplate: (beat, bp) => {
      const char = beat.charactersInvolved[0] ?? 'hero';
      const xpBoost = Math.round(beat.emotionalWeight * 500);
      return `// Sacrifice Mechanic — ${char}'s death grants permanent boon\n` +
        `on_event('sacrifice_${char.replace(/\s+/g, '_')}') {\n` +
        `  grant_xp(${xpBoost}); // XP surge from witnessing sacrifice\n` +
        `  unlock_passive('${char.toLowerCase().replace(/\s+/g, '_')}_legacy');\n` +
        `  ${bp.economy.model === 'roguelike' ? 'add_permanent_unlock("sacrifice_memory_buff");' : ''}\n` +
        `}`;
    },
    displayNameTemplate: (beat) => `${beat.charactersInvolved[0] ?? 'Hero'}'s Legacy Passive`,
    justificationTemplate: (beat) => `Sacrifice beats of weight ${(beat.emotionalWeight * 100).toFixed(0)}% create permanent, irreversible progression changes — the character's sacrifice lives on as a mechanic.`,
  },

  discovery: {
    targetComponent: 'world_event',
    ruleTemplate: (beat) => {
      const location = beat.locationHint ?? 'the ancient ruins';
      return `// Discovery Mechanic — reveals hidden world structure\n` +
        `on_enter_region(${JSON.stringify(location)}) {\n` +
        `  trigger_cutscene('discovery_${beat.id}');\n` +
        `  reveal_map_region(${JSON.stringify(location)});\n` +
        `  spawn_lore_collectible('${beat.id}_artifact');\n` +
        `  grant_xp(${Math.round(beat.emotionalWeight * 150)});\n` +
        `}`;
    },
    displayNameTemplate: () => `World Discovery Event`,
    justificationTemplate: (beat) => `Discovery beats translate to world events — gates open, maps reveal, lore unlocks. Emotional weight ${(beat.emotionalWeight * 100).toFixed(0)}% determines reward magnitude.`,
  },

  corruption: {
    targetComponent: 'combat',
    ruleTemplate: (beat, bp) => {
      const darkDamage = Math.round(beat.emotionalWeight * 30);
      return `// Corruption Mechanic — environment becomes hostile\n` +
        `on_corruption_spread('${beat.id}') {\n` +
        `  area_effect('corruption_aura', { damage_type: 'dark', dps: ${darkDamage} });\n` +
        `  spawn_corrupted_enemies(['${bp.enemyArchetypes[0] ?? "Corrupted_Soldier"}']);\n` +
        `  add_status_to_player('corruption_stack', { max_stacks: 5, on_max: 'debuff_heavy' });\n` +
        `}`;
    },
    displayNameTemplate: () => `Corruption Spread — Dark Zone`,
    justificationTemplate: (beat) => `Corruption beats manifest as environmental combat hazards. Emotional weight ${(beat.emotionalWeight * 100).toFixed(0)}% scales the zone damage and enemy strength.`,
  },

  redemption: {
    targetComponent: 'economy',
    ruleTemplate: (beat, bp) => {
      const bonusGold = Math.round(beat.emotionalWeight * 200);
      const curr = bp.economy.currencies[0] ?? 'gold';
      return `// Redemption Mechanic — completing the arc grants economy boon\n` +
        `on_complete_redemption_arc('${beat.id}') {\n` +
        `  grant_currency(${JSON.stringify(curr)}, ${bonusGold});\n` +
        `  ${bp.progression.reputationFactions?.[0] ? `boost_reputation('${bp.progression.reputationFactions[0]}', 250);` : ''}\n` +
        `  unlock_shop_category('redemption_gear');\n` +
        `}`;
    },
    displayNameTemplate: () => `Redemption Arc Completed — Economy Boost`,
    justificationTemplate: (beat) => `Redemption beats are narrative highs — they reward the player economically and reputationally. Weight ${(beat.emotionalWeight * 100).toFixed(0)}% scales the bonus.`,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Translator
// ─────────────────────────────────────────────────────────────────────────────

export class NarrativeToMechanicTranslator {
  translate(
    beats: NarrativeBeat[],
    blueprint: GameplayBlueprint
  ): MechanicTranslation[] {
    log.info('Translating narrative beats to mechanics', { beatCount: beats.length });

    const translations: MechanicTranslation[] = [];

    for (const beat of beats) {
      const template = BEAT_TEMPLATES[beat.type];
      if (!template) continue;

      const translation: MechanicTranslation = {
        narrativeBeatId: beat.id,
        generatedMechanic: {
          targetComponent: template.targetComponent,
          ruleDefinition: template.ruleTemplate(beat, blueprint),
          displayName: template.displayNameTemplate(beat),
        },
        justification: template.justificationTemplate(beat),
        emotionalResonance: beat.emotionalWeight,
      };

      translations.push(translation);
    }

    // Sort by emotional resonance — most impactful mechanics first
    translations.sort((a, b) => b.emotionalResonance - a.emotionalResonance);

    log.info('Narrative translations complete', { count: translations.length });
    return translations;
  }

  /**
   * Generate a narrative arc from a single prompt text.
   */
  inferBeatsFromPrompt(prompt: string): NarrativeBeat[] {
    const beats: NarrativeBeat[] = [];

    const beatPatterns: Array<{ pattern: RegExp; type: NarrativeBeat['type']; weight: number }> = [
      { pattern: /betray|treachery|backstab|deceiv/i, type: 'betrayal', weight: 0.9 },
      { pattern: /sacrifice|die.*for|give.*life|die to save/i, type: 'sacrifice', weight: 0.95 },
      { pattern: /discover|ancient|secret|hidden.*truth/i, type: 'discovery', weight: 0.6 },
      { pattern: /corrupt|darkness spread|taken.*over|evil grows/i, type: 'corruption', weight: 0.8 },
      { pattern: /redemption|atone|forgiv|second chance|rise again/i, type: 'redemption', weight: 0.85 },
    ];

    let beatIndex = 0;
    for (const { pattern, type, weight } of beatPatterns) {
      if (pattern.test(prompt)) {
        beats.push({
          id: `beat_${type}_${beatIndex++}`,
          type,
          emotionalWeight: weight,
          charactersInvolved: ['Hero'],
        });
      }
    }

    return beats;
  }
}

export const narrativeToMechanicTranslator = new NarrativeToMechanicTranslator();
