/**
 * ============================================
 * LEARNING SYSTEM - CONTINUOUS IMPROVEMENT
 * ============================================
 * 
 * Sistema de aprendizado contínuo para IA
 * Permite que a IA melhore com cada interação
 * 
 * Recursos:
 * - Aprendizado por reforço
 * - Memória de longo prazo
 * - Adaptação a preferências do usuário
 * - Otimização de estratégias
 */

import { EventEmitter } from 'events';

// ============================================
// TYPES
// ============================================

export interface Experience {
  id: string;
  type: ExperienceType;
  context: Record<string, unknown>;
  action: string;
  result: ExperienceResult;
  reward: number;
  timestamp: Date;
  tags: string[];
}

export type ExperienceType = 
  | 'task_completion'
  | 'user_feedback'
  | 'error_recovery'
  | 'optimization'
  | 'trading'
  | 'web_automation'
  | 'code_generation'
  | 'conversation';

export interface ExperienceResult {
  success: boolean;
  outcome: unknown;
  metrics?: Record<string, number>;
  error?: string;
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  conditions: PatternCondition[];
  actions: PatternAction[];
  successRate: number;
  usageCount: number;
  lastUsed?: Date;
  created: Date;
}

export interface PatternCondition {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'regex';
  value: unknown;
}

export interface PatternAction {
  type: string;
  parameters: Record<string, unknown>;
  priority: number;
}

export interface UserPreference {
  id: string;
  category: PreferenceCategory;
  key: string;
  value: unknown;
  confidence: number;
  learnedFrom: string[];
  updated: Date;
}

export type PreferenceCategory = 
  | 'communication_style'
  | 'code_style'
  | 'trading_risk'
  | 'automation_level'
  | 'ui_preferences'
  | 'workflow';

export interface KnowledgeEntry {
  id: string;
  domain: string;
  topic: string;
  content: string;
  embedding?: number[];
  confidence: number;
  sources: string[];
  lastVerified?: Date;
  created: Date;
}

export interface Strategy {
  id: string;
  name: string;
  domain: string;
  steps: StrategyStep[];
  performance: StrategyPerformance;
  active: boolean;
  version: number;
}

export interface StrategyStep {
  id: string;
  action: string;
  parameters: Record<string, unknown>;
  successCriteria: string;
  fallbackAction?: string;
}

export interface StrategyPerformance {
  totalExecutions: number;
  successfulExecutions: number;
  averageDuration: number;
  averageReward: number;
  lastExecution?: Date;
}

export interface LearningConfig {
  // Replay buffer
  maxExperiences: number;
  batchSize: number;
  
  // Learning rates
  patternLearningRate: number;
  preferenceLearningRate: number;
  strategyLearningRate: number;
  
  // Exploration
  explorationRate: number;
  explorationDecay: number;
  minExplorationRate: number;
  
  // Reward
  rewardDiscount: number;
  
  // Memory
  longTermMemoryThreshold: number;
  forgettingRate: number;
}

export interface LearningMetrics {
  totalExperiences: number;
  patternsLearned: number;
  preferencesDiscovered: number;
  strategiesOptimized: number;
  averageReward: number;
  improvementRate: number;
  lastLearningCycle: Date;
}

// ============================================
// LEARNING SYSTEM
// ============================================

export class LearningSystem extends EventEmitter {
  private config: LearningConfig;
  
  // Experience replay buffer
  private experiences: Experience[] = [];
  
  // Learned patterns
  private patterns: Map<string, Pattern> = new Map();
  
  // User preferences
  private preferences: Map<string, UserPreference> = new Map();
  
  // Knowledge base
  private knowledge: Map<string, KnowledgeEntry> = new Map();
  
  // Strategies
  private strategies: Map<string, Strategy> = new Map();
  
  // Metrics tracking
  private metricsHistory: LearningMetrics[] = [];
  
  // Exploration state
  private explorationRate: number;
  
  constructor(config: Partial<LearningConfig> = {}) {
    super();
    
    this.config = {
      maxExperiences: 10000,
      batchSize: 32,
      patternLearningRate: 0.01,
      preferenceLearningRate: 0.05,
      strategyLearningRate: 0.001,
      explorationRate: 0.3,
      explorationDecay: 0.995,
      minExplorationRate: 0.05,
      rewardDiscount: 0.99,
      longTermMemoryThreshold: 0.8,
      forgettingRate: 0.001,
      ...config,
    };
    
    this.explorationRate = this.config.explorationRate;
  }

  // ============================================
  // EXPERIENCE COLLECTION
  // ============================================

  recordExperience(experience: Omit<Experience, 'id' | 'timestamp'>): void {
    const newExperience: Experience = {
      ...experience,
      id: this.generateId('exp'),
      timestamp: new Date(),
    };
    
    this.experiences.push(newExperience);
    
    // Manter tamanho máximo
    if (this.experiences.length > this.config.maxExperiences) {
      // Remover experiências antigas com menor reward
      this.experiences.sort((a, b) => b.reward - a.reward);
      this.experiences = this.experiences.slice(0, this.config.maxExperiences);
    }
    
    this.emit('experience_recorded', { experience: newExperience });
    
    // Trigger learning se tiver experiências suficientes
    if (this.experiences.length >= this.config.batchSize) {
      this.triggerLearningCycle();
    }
  }

  // ============================================
  // PATTERN LEARNING
  // ============================================

  private async learnPatterns(): Promise<void> {
    // Agrupar experiências similares
    const groups = this.groupExperiences();
    
    for (const [key, experiences] of groups) {
      if (experiences.length < 3) continue;
      
      // Calcular taxa de sucesso
      const successCount = experiences.filter(e => e.result.success).length;
      const successRate = successCount / experiences.length;
      
      // Extrair condições comuns
      const conditions = this.extractConditions(experiences);
      
      // Extrair ações comuns em sucesso
      const successfulExps = experiences.filter(e => e.result.success);
      const actions = this.extractActions(successfulExps);
      
      if (conditions.length > 0 && actions.length > 0) {
        const existingPattern = this.findMatchingPattern(conditions);
        
        if (existingPattern) {
          // Atualizar padrão existente
          existingPattern.successRate = (existingPattern.successRate + successRate) / 2;
          existingPattern.usageCount++;
          existingPattern.lastUsed = new Date();
        } else {
          // Criar novo padrão
          const pattern: Pattern = {
            id: this.generateId('pat'),
            name: `Pattern_${key.substring(0, 8)}`,
            description: `Learned from ${experiences.length} experiences`,
            conditions,
            actions,
            successRate,
            usageCount: experiences.length,
            created: new Date(),
          };
          
          this.patterns.set(pattern.id, pattern);
          this.emit('pattern_learned', { pattern });
        }
      }
    }
  }

  private groupExperiences(): Map<string, Experience[]> {
    const groups = new Map<string, Experience[]>();
    
    for (const exp of this.experiences) {
      const key = this.computeExperienceKey(exp);
      const group = groups.get(key) || [];
      group.push(exp);
      groups.set(key, group);
    }
    
    return groups;
  }

  private computeExperienceKey(exp: Experience): string {
    // Criar chave baseada no tipo e contexto principal
    const contextKey = Object.keys(exp.context).sort().slice(0, 3).join('_');
    return `${exp.type}_${contextKey}`;
  }

  private extractConditions(experiences: Experience[]): PatternCondition[] {
    const conditions: PatternCondition[] = [];
    
    // Encontrar campos comuns no contexto
    const firstContext = experiences[0].context;
    
    for (const [field, value] of Object.entries(firstContext)) {
      // Verificar se o valor é consistente
      const consistent = experiences.every(e => {
        const v = e.context[field];
        if (typeof value === 'string' && typeof v === 'string') {
          return v.includes(value.substring(0, 10)) || value.includes(v.substring(0, 10));
        }
        return v === value;
      });
      
      if (consistent) {
        conditions.push({
          field,
          operator: typeof value === 'string' ? 'contains' : 'equals',
          value: typeof value === 'string' ? value.substring(0, 20) : value,
        });
      }
    }
    
    return conditions.slice(0, 5); // Limitar a 5 condições
  }

  private extractActions(experiences: Experience[]): PatternAction[] {
    const actionCounts = new Map<string, number>();
    
    for (const exp of experiences) {
      const count = actionCounts.get(exp.action) || 0;
      actionCounts.set(exp.action, count + 1);
    }
    
    // Ordenar por frequência
    const sorted = Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    
    return sorted.slice(0, 3).map(([action], index) => ({
      type: action,
      parameters: {},
      priority: sorted.length - index,
    }));
  }

  private findMatchingPattern(conditions: PatternCondition[]): Pattern | null {
    for (const pattern of this.patterns.values()) {
      const matchCount = conditions.filter(c1 => 
        pattern.conditions.some(c2 => 
          c1.field === c2.field && c1.operator === c2.operator
        )
      ).length;
      
      if (matchCount >= conditions.length * 0.7) {
        return pattern;
      }
    }
    
    return null;
  }

  // ============================================
  // PREFERENCE LEARNING
  // ============================================

  private async learnPreferences(): Promise<void> {
    // Analisar feedback do usuário
    const feedbackExps = this.experiences.filter(e => e.type === 'user_feedback');
    
    for (const exp of feedbackExps) {
      const category = this.inferPreferenceCategory(exp);
      const key = this.inferPreferenceKey(exp);
      const value = exp.result.outcome;
      
      const existingPref = this.findPreference(category, key);
      
      if (existingPref) {
        // Atualizar preferência existente
        existingPref.confidence = Math.min(1, existingPref.confidence + this.config.preferenceLearningRate);
        existingPref.value = this.mergePreferenceValues(existingPref.value, value);
        existingPref.learnedFrom.push(exp.id);
        existingPref.updated = new Date();
      } else {
        // Criar nova preferência
        const preference: UserPreference = {
          id: this.generateId('pref'),
          category,
          key,
          value,
          confidence: 0.5,
          learnedFrom: [exp.id],
          updated: new Date(),
        };
        
        this.preferences.set(preference.id, preference);
        this.emit('preference_discovered', { preference });
      }
    }
  }

  private inferPreferenceCategory(exp: Experience): PreferenceCategory {
    const context = JSON.stringify(exp.context).toLowerCase();
    
    if (context.includes('code') || context.includes('syntax')) {
      return 'code_style';
    }
    if (context.includes('risk') || context.includes('trading')) {
      return 'trading_risk';
    }
    if (context.includes('auto') || context.includes('manual')) {
      return 'automation_level';
    }
    if (context.includes('ui') || context.includes('theme') || context.includes('display')) {
      return 'ui_preferences';
    }
    if (context.includes('workflow') || context.includes('process')) {
      return 'workflow';
    }
    
    return 'communication_style';
  }

  private inferPreferenceKey(exp: Experience): string {
    // Extrair chave do contexto
    const keys = Object.keys(exp.context);
    return keys[0] || 'general';
  }

  private findPreference(category: PreferenceCategory, key: string): UserPreference | null {
    for (const pref of this.preferences.values()) {
      if (pref.category === category && pref.key === key) {
        return pref;
      }
    }
    return null;
  }

  private mergePreferenceValues(existing: unknown, newValue: unknown): unknown {
    // Merge simples - em produção, implementar merge mais sofisticado
    if (typeof existing === 'number' && typeof newValue === 'number') {
      return (existing + newValue) / 2;
    }
    if (typeof existing === 'string' && typeof newValue === 'string') {
      return newValue; // Preferir valor mais recente
    }
    if (Array.isArray(existing) && Array.isArray(newValue)) {
      return [...new Set([...existing, ...newValue])];
    }
    
    return newValue;
  }

  // ============================================
  // STRATEGY OPTIMIZATION
  // ============================================

  private async optimizeStrategies(): Promise<void> {
    // Agrupar experiências por domínio
    const domainExperiences = new Map<string, Experience[]>();
    
    for (const exp of this.experiences) {
      const domain = exp.type;
      const exps = domainExperiences.get(domain) || [];
      exps.push(exp);
      domainExperiences.set(domain, exps);
    }
    
    for (const [domain, experiences] of domainExperiences) {
      const existingStrategy = this.findStrategyByDomain(domain);
      
      if (existingStrategy) {
        // Otimizar estratégia existente
        await this.improveStrategy(existingStrategy, experiences);
      } else if (experiences.length >= 10) {
        // Criar nova estratégia
        const strategy = this.createStrategy(domain, experiences);
        this.strategies.set(strategy.id, strategy);
        this.emit('strategy_created', { strategy });
      }
    }
  }

  private findStrategyByDomain(domain: string): Strategy | null {
    for (const strategy of this.strategies.values()) {
      if (strategy.domain === domain && strategy.active) {
        return strategy;
      }
    }
    return null;
  }

  private createStrategy(domain: string, experiences: Experience[]): Strategy {
    // Extrair sequência de ações mais bem-sucedida
    const successfulExps = experiences
      .filter(e => e.result.success && e.reward > 0)
      .sort((a, b) => b.reward - a.reward);
    
    const steps: StrategyStep[] = [];
    const actionsUsed = new Set<string>();
    
    for (const exp of successfulExps.slice(0, 5)) {
      if (!actionsUsed.has(exp.action)) {
        steps.push({
          id: this.generateId('step'),
          action: exp.action,
          parameters: exp.context,
          successCriteria: 'result.success === true',
        });
        actionsUsed.add(exp.action);
      }
    }
    
    return {
      id: this.generateId('strat'),
      name: `Strategy_${domain}`,
      domain,
      steps,
      performance: {
        totalExecutions: experiences.length,
        successfulExecutions: successfulExps.length,
        averageDuration: 0,
        averageReward: experiences.reduce((sum, e) => sum + e.reward, 0) / experiences.length,
      },
      active: true,
      version: 1,
    };
  }

  private async improveStrategy(strategy: Strategy, experiences: Experience[]): Promise<void> {
    const recentExps = experiences.slice(-50);
    const successRate = recentExps.filter(e => e.result.success).length / recentExps.length;
    
    // Atualizar performance
    strategy.performance.totalExecutions += recentExps.length;
    strategy.performance.successfulExecutions += recentExps.filter(e => e.result.success).length;
    strategy.performance.averageReward = 
      (strategy.performance.averageReward + 
        recentExps.reduce((sum, e) => sum + e.reward, 0) / recentExps.length) / 2;
    strategy.performance.lastExecution = new Date();
    
    // Se taxa de sucesso caiu muito, ajustar estratégia
    if (successRate < 0.5 && strategy.performance.successfulExecutions / strategy.performance.totalExecutions > successRate) {
      // Tentar ajustar passos
      const failedExps = recentExps.filter(e => !e.result.success);
      
      for (const failedExp of failedExps) {
        const failedStep = strategy.steps.find(s => s.action === failedExp.action);
        
        if (failedStep && !failedStep.fallbackAction) {
          // Encontrar ação alternativa
          const alternativeExp = recentExps.find(e => 
            e.result.success && 
            e.action !== failedExp.action &&
            JSON.stringify(e.context).includes(JSON.stringify(failedExp.context).substring(0, 20))
          );
          
          if (alternativeExp) {
            failedStep.fallbackAction = alternativeExp.action;
          }
        }
      }
      
      strategy.version++;
      this.emit('strategy_updated', { strategy });
    }
  }

  // ============================================
  // KNOWLEDGE MANAGEMENT
  // ============================================

  addKnowledge(entry: Omit<KnowledgeEntry, 'id' | 'created'>): void {
    const newEntry: KnowledgeEntry = {
      ...entry,
      id: this.generateId('know'),
      created: new Date(),
    };
    
    this.knowledge.set(newEntry.id, newEntry);
    this.emit('knowledge_added', { entry: newEntry });
  }

  searchKnowledge(query: string, domain?: string): KnowledgeEntry[] {
    const results: KnowledgeEntry[] = [];
    const queryLower = query.toLowerCase();
    
    for (const entry of this.knowledge.values()) {
      if (domain && entry.domain !== domain) continue;
      
      const matchScore = this.calculateTextMatch(queryLower, entry);
      
      if (matchScore > 0.3) {
        results.push(entry);
      }
    }
    
    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
  }

  private calculateTextMatch(query: string, entry: KnowledgeEntry): number {
    const text = `${entry.topic} ${entry.content}`.toLowerCase();
    const words = query.split(' ').filter(w => w.length > 2);
    
    let matches = 0;
    for (const word of words) {
      if (text.includes(word)) matches++;
    }
    
    return words.length > 0 ? matches / words.length : 0;
  }

  // ============================================
  // DECISION MAKING
  // ============================================

  suggestAction(context: Record<string, unknown>): {
    action: string;
    confidence: number;
    reasoning: string;
    alternatives: string[];
  } | null {
    // Exploração vs Exploração
    if (Math.random() < this.explorationRate) {
      return this.exploreAction(context);
    }
    
    // Encontrar padrão matching
    const matchingPattern = this.findBestPattern(context);
    
    if (matchingPattern && matchingPattern.successRate > 0.6) {
      const action = matchingPattern.actions[0];
      
      return {
        action: action.type,
        confidence: matchingPattern.successRate,
        reasoning: `Based on learned pattern "${matchingPattern.name}" with ${(matchingPattern.successRate * 100).toFixed(1)}% success rate`,
        alternatives: matchingPattern.actions.slice(1).map(a => a.type),
      };
    }
    
    // Usar estratégia do domínio
    const contextType = this.inferContextType(context);
    const strategy = this.findStrategyByDomain(contextType);
    
    if (strategy && strategy.steps.length > 0) {
      const step = strategy.steps[0];
      
      return {
        action: step.action,
        confidence: strategy.performance.successfulExecutions / strategy.performance.totalExecutions,
        reasoning: `Following strategy "${strategy.name}" (v${strategy.version})`,
        alternatives: strategy.steps.slice(1, 4).map(s => s.action),
      };
    }
    
    return null;
  }

  private exploreAction(context: Record<string, unknown>): {
    action: string;
    confidence: number;
    reasoning: string;
    alternatives: string[];
  } {
    // Selecionar ação aleatória de experiências passadas
    const actions = [...new Set(this.experiences.map(e => e.action))];
    const randomAction = actions[Math.floor(Math.random() * actions.length)] || 'default_action';
    
    return {
      action: randomAction,
      confidence: 0.3,
      reasoning: 'Exploring new possibilities',
      alternatives: actions.filter(a => a !== randomAction).slice(0, 3),
    };
  }

  private findBestPattern(context: Record<string, unknown>): Pattern | null {
    let bestPattern: Pattern | null = null;
    let bestScore = 0;
    
    for (const pattern of this.patterns.values()) {
      const score = this.calculatePatternMatch(pattern, context);
      
      if (score > bestScore && score > 0.5) {
        bestScore = score;
        bestPattern = pattern;
      }
    }
    
    return bestPattern;
  }

  private calculatePatternMatch(pattern: Pattern, context: Record<string, unknown>): number {
    let matches = 0;
    
    for (const condition of pattern.conditions) {
      const value = context[condition.field];
      
      if (value === undefined) continue;
      
      switch (condition.operator) {
        case 'equals':
          if (value === condition.value) matches++;
          break;
        case 'contains':
          if (String(value).includes(String(condition.value))) matches++;
          break;
        case 'gt':
          if (typeof value === 'number' && value > Number(condition.value)) matches++;
          break;
        case 'lt':
          if (typeof value === 'number' && value < Number(condition.value)) matches++;
          break;
        case 'regex':
          if (new RegExp(String(condition.value)).test(String(value))) matches++;
          break;
      }
    }
    
    return pattern.conditions.length > 0 ? matches / pattern.conditions.length : 0;
  }

  private inferContextType(context: Record<string, unknown>): string {
    const keys = Object.keys(context).join(' ').toLowerCase();
    
    if (keys.includes('trade') || keys.includes('price')) return 'trading';
    if (keys.includes('url') || keys.includes('selector')) return 'web_automation';
    if (keys.includes('code') || keys.includes('file')) return 'code_generation';
    if (keys.includes('message') || keys.includes('user')) return 'conversation';
    
    return 'task_completion';
  }

  // ============================================
  // LEARNING CYCLE
  // ============================================

  private async triggerLearningCycle(): Promise<void> {
    this.emit('learning_started');
    
    try {
      // 1. Aprender padrões
      await this.learnPatterns();
      
      // 2. Aprender preferências
      await this.learnPreferences();
      
      // 3. Otimizar estratégias
      await this.optimizeStrategies();
      
      // 4. Decay exploration rate
      this.explorationRate = Math.max(
        this.config.minExplorationRate,
        this.explorationRate * this.config.explorationDecay
      );
      
      // 5. Aplicar forgetting (remover conhecimento antigo de baixa confiança)
      await this.applyForgetting();
      
      // 6. Registrar métricas
      this.recordMetrics();
      
      this.emit('learning_completed', { metrics: this.getMetrics() });
    } catch (error) {
      this.emit('learning_error', { error });
    }
  }

  private async applyForgetting(): Promise<void> {
    // Remover padrões com baixa taxa de sucesso e pouco uso
    for (const [id, pattern] of this.patterns) {
      if (pattern.successRate < 0.3 && pattern.usageCount < 5) {
        this.patterns.delete(id);
      }
    }
    
    // Reduzir confiança de preferências não utilizadas
    for (const pref of this.preferences.values()) {
      const daysSinceUpdate = (Date.now() - pref.updated.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate > 30) {
        pref.confidence *= (1 - this.config.forgettingRate);
        
        if (pref.confidence < 0.1) {
          this.preferences.delete(pref.id);
        }
      }
    }
  }

  private recordMetrics(): void {
    const metrics: LearningMetrics = {
      totalExperiences: this.experiences.length,
      patternsLearned: this.patterns.size,
      preferencesDiscovered: this.preferences.size,
      strategiesOptimized: this.strategies.size,
      averageReward: this.experiences.length > 0
        ? this.experiences.reduce((sum, e) => sum + e.reward, 0) / this.experiences.length
        : 0,
      improvementRate: this.calculateImprovementRate(),
      lastLearningCycle: new Date(),
    };
    
    this.metricsHistory.push(metrics);
    
    // Manter apenas últimas 100 métricas
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }
  }

  private calculateImprovementRate(): number {
    if (this.metricsHistory.length < 2) return 0;
    
    const recent = this.metricsHistory.slice(-10);
    const old = this.metricsHistory.slice(0, 10);
    
    const recentAvg = recent.reduce((sum, m) => sum + m.averageReward, 0) / recent.length;
    const oldAvg = old.reduce((sum, m) => sum + m.averageReward, 0) / old.length;
    
    return oldAvg > 0 ? (recentAvg - oldAvg) / oldAvg : 0;
  }

  // ============================================
  // QUERIES
  // ============================================

  getMetrics(): LearningMetrics {
    return this.metricsHistory[this.metricsHistory.length - 1] || {
      totalExperiences: 0,
      patternsLearned: 0,
      preferencesDiscovered: 0,
      strategiesOptimized: 0,
      averageReward: 0,
      improvementRate: 0,
      lastLearningCycle: new Date(),
    };
  }

  getPatterns(): Pattern[] {
    return Array.from(this.patterns.values());
  }

  getPreferences(category?: PreferenceCategory): UserPreference[] {
    const prefs = Array.from(this.preferences.values());
    
    if (category) {
      return prefs.filter(p => p.category === category);
    }
    
    return prefs;
  }

  getStrategies(domain?: string): Strategy[] {
    const strategies = Array.from(this.strategies.values());
    
    if (domain) {
      return strategies.filter(s => s.domain === domain);
    }
    
    return strategies;
  }

  getExplorationRate(): number {
    return this.explorationRate;
  }

  // ============================================
  // UTILITIES
  // ============================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================
  // SERIALIZATION
  // ============================================

  exportState(): string {
    return JSON.stringify({
      experiences: this.experiences,
      patterns: Array.from(this.patterns.entries()),
      preferences: Array.from(this.preferences.entries()),
      knowledge: Array.from(this.knowledge.entries()),
      strategies: Array.from(this.strategies.entries()),
      explorationRate: this.explorationRate,
      metricsHistory: this.metricsHistory,
    });
  }

  importState(data: string): void {
    try {
      const state = JSON.parse(data);
      
      this.experiences = state.experiences || [];
      this.patterns = new Map(state.patterns || []);
      this.preferences = new Map(state.preferences || []);
      this.knowledge = new Map(state.knowledge || []);
      this.strategies = new Map(state.strategies || []);
      this.explorationRate = state.explorationRate || this.config.explorationRate;
      this.metricsHistory = state.metricsHistory || [];
      
      this.emit('state_imported');
    } catch (error) {
      this.emit('import_error', { error });
    }
  }
}

// ============================================
// FACTORY
// ============================================

export function createLearningSystem(config?: Partial<LearningConfig>): LearningSystem {
  return new LearningSystem(config);
}

export default LearningSystem;
