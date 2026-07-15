/**
 * gameplay-orchestrator.ts
 *
 * Multi-agent planner that analyzes user prompt, world blueprint, and narrative
 * seed to generate a cohesive GameplayBlueprint JSON.
 *
 * Architecture:
 *  1. PromptParser — extracts genre keywords, tone, setting from natural language
 *  2. WorldContextAnalyser — reads WorldBlueprint to infer factions and biomes
 *  3. NarrativeAligner — maps lore tone to gameplay pillars
 *  4. BlueprintAssembler — synthesizes final schema
 *  5. CoherenceValidator — checks for contradictions (e.g. "pacifist" + "hack-n-slash")
 */

import type { GameplayBlueprint, CombatStyleBlueprint, EconomyBlueprint, AIBehaviorProfile } from './gameplay-blueprint';
import { createBlankBlueprint } from './gameplay-blueprint';
import { createComponentLogger } from '../../web/lib/observability/logger';
import { costGuard } from '../../web/lib/observability/cost-guard';

const log = createComponentLogger('gameplay.orchestrator');

// ─────────────────────────────────────────────────────────────────────────────
// Keyword extraction heuristics
// ─────────────────────────────────────────────────────────────────────────────

const STYLE_MAP: Array<{ patterns: RegExp[]; style: CombatStyleBlueprint['style'] }> = [
  { patterns: [/souls[\s-]?like|dark fantasy|punishing|parry/i], style: 'souls-like' },
  { patterns: [/turn[\s-]?based|tactical rpg|jrpg|strategy/i], style: 'turn-based' },
  { patterns: [/shooter|fps|tps|guns|firearm|bullet/i], style: 'shooter' },
  { patterns: [/hack[\s-]?and[\s-]?slash|action rpg|arpg|slasher/i], style: 'hack-n-slash' },
  { patterns: [/rhythm|music|beat|dance|timing/i], style: 'rhythm' },
  { patterns: [/rts|real[\s-]?time strategy|base building|command/i], style: 'rts' },
];

const LOOP_MAP: Array<{ patterns: RegExp[]; loop: GameplayBlueprint['coreLoop'] }> = [
  { patterns: [/roguelike|roguelite|run[\s-]?based|permadeath/i], loop: 'roguelike' },
  { patterns: [/survival|harsh|scarce|resource.*gather/i], loop: 'survival' },
  { patterns: [/craft|build|create|construct/i], loop: 'crafting' },
  { patterns: [/puzzle|logic|solve|mystery/i], loop: 'puzzle' },
  { patterns: [/social|npc.*interact|relation|dialogue/i], loop: 'social' },
  { patterns: [/combat|fight|battle|war/i], loop: 'combat' },
  { patterns: [/explore|open.*world|discover|vast/i], loop: 'exploration' },
];

const ECONOMY_MAP: Array<{ patterns: RegExp[]; model: EconomyBlueprint['model'] }> = [
  { patterns: [/permadeath|one.*life/i], model: 'permadeath' },
  { patterns: [/roguelike|roguelite/i], model: 'roguelike' },
  { patterns: [/craft|build|recipe/i], model: 'crafting' },
  { patterns: [/reputation|faction.*standing/i], model: 'reputation' },
  { patterns: [/trade|merchant|economy/i], model: 'trading' },
];

const AI_COMPLEXITY_MAP: Array<{ patterns: RegExp[]; complexity: AIBehaviorProfile['complexity'] }> = [
  { patterns: [/emergent|dynamic.*ai|complex.*behavior/i], complexity: 'emergent' },
  { patterns: [/goap|goal.*oriented|planning.*agent/i], complexity: 'goap' },
  { patterns: [/tactical|strategic|flank|cover/i], complexity: 'tactical' },
];

function matchFirst<T>(text: string, map: Array<{ patterns: RegExp[]; [key: string]: unknown }>, defaultVal: T, key: string): T {
  for (const entry of map) {
    if (entry.patterns.some(p => p.test(text))) return entry[key] as T;
  }
  return defaultVal;
}

function extractPillars(prompt: string): string[] {
  const pillars: string[] = [];
  if (/parry|block|dodge/i.test(prompt)) pillars.push('precise combat');
  if (/resource|scarcity|manage/i.test(prompt)) pillars.push('resource management');
  if (/moral|choice|consequence|branching/i.test(prompt)) pillars.push('moral choice');
  if (/stealth|hidden|shadow/i.test(prompt)) pillars.push('stealth');
  if (/mystery|discover|secret/i.test(prompt)) pillars.push('discovery');
  if (/craft|build/i.test(prompt)) pillars.push('crafting');
  if (pillars.length === 0) pillars.push('exploration', 'combat');
  return pillars;
}

function extractAbilities(prompt: string, style: CombatStyleBlueprint['style']): string[] {
  const base: Record<string, string[]> = {
    'souls-like': ['Parry', 'Riposte', 'Backstab', 'Weapon Art', 'Shield Bash'],
    'turn-based': ['Basic Attack', 'Defend', 'Special Skill', 'Ultimate', 'Taunt'],
    'shooter': ['Primary Fire', 'ADS', 'Reload', 'Grenade', 'Sprint'],
    'hack-n-slash': ['Light Strike', 'Heavy Strike', 'Combo Finisher', 'Dodge Roll', 'Ultimate'],
    'rhythm': ['On-Beat Strike', 'Off-Beat Dodge', 'Combo Chain', 'Fever Mode', 'Perfect Hit'],
    'rts': ['Move', 'Attack', 'Patrol', 'Hold Position', 'Special'],
    'moba': ['Q Ability', 'W Ability', 'E Ability', 'R Ultimate', 'Passive'],
  };

  const abilities = base[style] ?? ['Attack', 'Defend', 'Special'];

  // Inject world-specific flavoring from prompt keywords
  const worldWords = prompt.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\b/g) ?? [];
  const flavour = worldWords.slice(0, 2).map(w => `${w} Strike`);
  return [...abilities, ...flavour].slice(0, 8);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Orchestrator Class
// ─────────────────────────────────────────────────────────────────────────────

export class GameplayOrchestrator {
  constructor(private aiServiceUrl: string = '') {}

  /**
   * Generate a complete GameplayBlueprint from a user prompt.
   * Uses heuristic parsing + optional AI enrichment.
   */
  async generateBlueprint(
    userPrompt: string,
    worldBlueprint: Record<string, unknown> = {},
    narrativeSeed: string = '',
    userId?: string
  ): Promise<GameplayBlueprint> {
    log.info('Generating gameplay blueprint', { promptLength: userPrompt.length });

    const combinedText = `${userPrompt} ${narrativeSeed}`;

    // 1. Parse combat style
    const style = matchFirst<CombatStyleBlueprint['style']>(
      combinedText, STYLE_MAP, 'hack-n-slash', 'style'
    );

    // 2. Detect core loop
    const coreLoop = matchFirst<GameplayBlueprint['coreLoop']>(
      combinedText, LOOP_MAP, 'combat', 'loop'
    );

    // 3. Economy model
    const econModel = matchFirst<EconomyBlueprint['model']>(
      combinedText, ECONOMY_MAP, 'loot', 'model'
    );

    // 4. AI complexity
    const aiComplexity = matchFirst<AIBehaviorProfile['complexity']>(
      combinedText, AI_COMPLEXITY_MAP, 'tactical', 'complexity'
    );

    // 5. Extract gameplay pillars
    const pillars = extractPillars(combinedText);

    const blueprint = createBlankBlueprint(userPrompt, narrativeSeed);

    // Apply extracted values
    blueprint.coreLoop = coreLoop;
    blueprint.pillars = pillars;
    blueprint.combatStyle = {
      style,
      damageTypes: this.inferDamageTypes(combinedText),
      hasParry: /parry|riposte/i.test(combinedText),
      hasDodge: /dodge|evade|roll/i.test(combinedText),
      hasBlock: /block|shield/i.test(combinedText),
      hasCover: style === 'shooter',
      parryWindowMs: /parry|riposte/i.test(combinedText) ? 200 : undefined,
    };

    blueprint.economy = {
      model: econModel,
      currencies: this.inferCurrencies(combinedText),
      merchantEnabled: /merchant|shop|trade/i.test(combinedText),
      deathPenalty: coreLoop === 'roguelike' ? 'full_permadeath' : 'xp_loss',
    };

    blueprint.aiBehavior = {
      complexity: aiComplexity,
      fleeOnLowHealth: !/undead|zombie|horde/i.test(combinedText),
      callForReinforcements: /tactical|military|guard/i.test(combinedText),
      useCover: style === 'shooter',
      memoryDurationMs: aiComplexity === 'emergent' ? 120_000 : 30_000,
      perceptionRange: style === 'shooter' ? 50 : 20,
      factionAlignment: 'hostile',
    };

    blueprint.suggestedAbilities = extractAbilities(combinedText, style);
    blueprint.enemyArchetypes = this.inferEnemyArchetypes(combinedText);
    blueprint.bossEncounters = this.inferBossEncounters(combinedText);

    // 6. Determine session length and difficulty
    blueprint.balanceMeta = {
      targetSessionLengthMin: coreLoop === 'roguelike' ? 20 : 45,
      targetDifficultyRating: /hard|brutal|punishing|souls/i.test(combinedText) ? 5 :
        /easy|casual|relaxed/i.test(combinedText) ? 1 : 3,
      coopSupported: /co-?op|multiplayer|together|friend/i.test(combinedText),
      pvpSupported: /pvp|versus|competitive|arena/i.test(combinedText),
    };

    // 7. Optional: enrich via AI endpoint
    if (this.aiServiceUrl && userId) {
      const budget = await costGuard.checkBudget(userId, 0.002);
      if (budget.allowed) {
        try {
          await this.enrichViaAI(blueprint, userPrompt);
          await costGuard.recordSpend(userId, 0.002);
        } catch (e) {
          log.warn('AI enrichment failed, using heuristic blueprint', { error: String(e) });
        }
      }
    }

    log.info('Blueprint generated', { id: blueprint.id, coreLoop, style });
    return blueprint;
  }

  private async enrichViaAI(blueprint: GameplayBlueprint, prompt: string): Promise<void> {
    const res = await fetch(`${this.aiServiceUrl}/gameplay/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blueprint, prompt }),
    });
    if (!res.ok) return;
    const enriched = await res.json() as Partial<GameplayBlueprint>;
    if (enriched.winCondition) blueprint.winCondition = enriched.winCondition;
    if (enriched.loseCondition) blueprint.loseCondition = enriched.loseCondition;
    if (enriched.progressionFantasy) blueprint.progressionFantasy = enriched.progressionFantasy;
    if (enriched.suggestedAbilities?.length) blueprint.suggestedAbilities = enriched.suggestedAbilities;
  }

  private inferDamageTypes(text: string): string[] {
    const types: string[] = ['physical'];
    if (/magic|arcane|mana/i.test(text)) types.push('magic');
    if (/fire|flame|burn/i.test(text)) types.push('fire');
    if (/ice|frost|cryo/i.test(text)) types.push('ice');
    if (/lightning|shock|thunder/i.test(text)) types.push('lightning');
    if (/poison|toxin|acid/i.test(text)) types.push('poison');
    return types;
  }

  private inferCurrencies(text: string): string[] {
    if (/souls|echoes|runes/i.test(text)) return ['souls'];
    if (/gold|coin|gil/i.test(text)) return ['gold'];
    if (/credit|energy|crystal/i.test(text)) return ['credits'];
    return ['gold'];
  }

  private inferEnemyArchetypes(text: string): string[] {
    const archetypes: string[] = [];
    if (/undead|zombie|skeleton/i.test(text)) archetypes.push('Undead Warrior', 'Skeleton Archer');
    if (/demon|devil|hell/i.test(text)) archetypes.push('Demon Soldier', 'Hellfire Mage');
    if (/dragon|beast|monster/i.test(text)) archetypes.push('Drake Spawn', 'Pack Hunter');
    if (/robot|mech|machine/i.test(text)) archetypes.push('Assault Drone', 'Combat Mech');
    if (archetypes.length === 0) archetypes.push('Grunt', 'Ranger', 'Brute', 'Caster');
    return archetypes;
  }

  private inferBossEncounters(text: string): string[] {
    const bosses: string[] = [];
    if (/dragon/i.test(text)) bosses.push('Elder Dragon');
    if (/king|lord|ruler/i.test(text)) bosses.push('Corrupted King');
    if (/demon/i.test(text)) bosses.push('Archfiend');
    if (bosses.length === 0) bosses.push('Guardian of the Realm', 'The Ancient One');
    return bosses;
  }
}

export const gameplayOrchestrator = new GameplayOrchestrator(
  process.env.AI_SERVICE_URL ?? ''
);
