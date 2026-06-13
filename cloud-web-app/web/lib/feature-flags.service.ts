import { logger } from '@/lib/observability/logger';
import { DefaultFeatureFlags } from './feature-flags.defaults';
import type { Environment, EvaluationResult, ExperimentResult, FeatureFlag, FeatureRule, UserContext } from './feature-flags.types';

export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private flags: Map<string, FeatureFlag> = new Map();
  private userVariants: Map<string, Map<string, string>> = new Map(); // userId -> flagKey -> variant
  private environment: Environment;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.environment = (process.env.NODE_ENV as Environment) || 'development';
    this.loadDefaultFlags();
  }

  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }
  private loadDefaultFlags(): void {
    for (const flag of DefaultFeatureFlags) {
      this.flags.set(flag.key, flag);
    }
  }
  async syncFromServer(): Promise<void> {
    try {
      const response = await fetch('/api/feature-flags');
      if (response.ok) {
        const flags = await response.json();
        for (const flag of flags) {
          this.flags.set(flag.key, flag);
        }
        this.notifyListeners();
      }
    } catch (e) {
      logger.error('[FeatureFlags] Sync failed:', e);
    }
  }
  evaluate(flagKey: string, user?: UserContext): EvaluationResult {
    const flag = this.flags.get(flagKey);

    if (!flag) {
      return { enabled: false, reason: 'Flag not found' };
    }

    // Kill switch
    if (flag.killSwitch) {
      return { enabled: false, reason: 'Kill switch active' };
    }

    // Flag desabilitada globalmente
    if (!flag.enabled) {
      return { enabled: false, reason: 'Flag disabled' };
    }

    // Verifica override de ambiente
    const envOverride = flag.environments?.[this.environment];
    if (envOverride && !envOverride.enabled) {
      return { enabled: false, reason: 'Disabled in environment' };
    }

    // Verifica dependências
    if (flag.dependsOn) {
      for (const depKey of flag.dependsOn) {
        const depResult = this.evaluate(depKey, user);
        if (!depResult.enabled) {
          return { enabled: false, reason: `Dependency ${depKey} not enabled` };
        }
      }
    }

    // Avalia por tipo
    switch (flag.type) {
      case 'boolean':
        return this.evaluateBoolean(flag);
      case 'percentage':
        return this.evaluatePercentage(flag, user);
      case 'variant':
        return this.evaluateVariant(flag, user);
      case 'user_list':
        return this.evaluateUserList(flag, user);
      case 'rule_based':
        return this.evaluateRules(flag, user);
      default:
        return { enabled: flag.defaultValue ?? false, reason: 'Default value' };
    }
  }
  private evaluateBoolean(flag: FeatureFlag): EvaluationResult {
    return {
      enabled: flag.defaultValue ?? true,
      reason: 'Boolean flag',
    };
  }
  private evaluatePercentage(flag: FeatureFlag, user?: UserContext): EvaluationResult {
    const percentage = flag.environments?.[this.environment]?.percentage ?? flag.percentage ?? 0;

    // Usa hash do userId para consistência
    const hash = user?.id
      ? this.hashString(`${flag.key}:${user.id}`) % 100
      : Math.random() * 100;

    const enabled = hash < percentage;

    return {
      enabled,
      reason: `Percentage rollout (${percentage}%)`,
    };
  }
  private evaluateVariant(flag: FeatureFlag, user?: UserContext): EvaluationResult {
    if (!flag.variants || flag.variants.length === 0) {
      return { enabled: false, reason: 'No variants defined' };
    }

    // Verifica se usuário já tem variante atribuída
    if (user?.id) {
      const userVariants = this.userVariants.get(user.id);
      const existingVariant = userVariants?.get(flag.key);

      if (existingVariant) {
        const variant = flag.variants.find(v => v.id === existingVariant);
        return {
          enabled: true,
          variant: existingVariant,
          payload: variant?.payload,
          reason: 'Cached variant',
        };
      }
    }

    // Seleciona variante baseado nos pesos
    const hash = user?.id
      ? this.hashString(`${flag.key}:${user.id}`) % 100
      : Math.random() * 100;

    let cumulative = 0;
    for (const variant of flag.variants) {
      cumulative += variant.weight;
      if (hash < cumulative) {
        // Salva variante para consistência
        if (user?.id) {
          if (!this.userVariants.has(user.id)) {
            this.userVariants.set(user.id, new Map());
          }
          this.userVariants.get(user.id)!.set(flag.key, variant.id);
        }

        return {
          enabled: true,
          variant: variant.id,
          payload: variant.payload,
          reason: 'Variant selected',
        };
      }
    }

    // Fallback para primeira variante
    return {
      enabled: true,
      variant: flag.variants[0].id,
      payload: flag.variants[0].payload,
      reason: 'Fallback variant',
    };
  }
  private evaluateUserList(flag: FeatureFlag, user?: UserContext): EvaluationResult {
    if (!user?.id) {
      return { enabled: false, reason: 'No user context' };
    }

    // Verifica bloqueio
    if (flag.blockedUsers?.includes(user.id)) {
      return { enabled: false, reason: 'User blocked' };
    }

    // Verifica permissão
    if (flag.allowedUsers?.includes(user.id)) {
      return { enabled: true, reason: 'User in allowed list' };
    }

    return { enabled: false, reason: 'User not in allowed list' };
  }
  private evaluateRules(flag: FeatureFlag, user?: UserContext): EvaluationResult {
    if (!flag.rules || flag.rules.length === 0) {
      return { enabled: flag.defaultValue ?? false, reason: 'No rules defined' };
    }

    if (!user) {
      return { enabled: false, reason: 'No user context for rules' };
    }

    // Ordena regras por prioridade
    const sortedRules = [...flag.rules].sort((a, b) => a.priority - b.priority);

    // Avalia cada regra (AND logic)
    for (const rule of sortedRules) {
      const value = this.getAttributeValue(user, rule.attribute);
      const matches = this.evaluateRule(rule, value);

      if (!matches) {
        return { enabled: false, reason: `Rule ${rule.id} not matched` };
      }
    }

    return { enabled: true, reason: 'All rules matched' };
  }
  private getAttributeValue(user: UserContext, attribute: string): unknown {
    const parts = attribute.split('.');
    let value: unknown = user;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else if (user.attributes && part in user.attributes) {
        value = user.attributes[part];
      } else {
        return undefined;
      }
    }

    return value;
  }
  private evaluateRule(rule: FeatureRule, value: unknown): boolean {
    switch (rule.operator) {
      case 'equals':
        return value === rule.value;
      case 'not_equals':
        return value !== rule.value;
      case 'contains':
        return typeof value === 'string' && value.includes(String(rule.value));
      case 'not_contains':
        return typeof value === 'string' && !value.includes(String(rule.value));
      case 'greater_than':
        return Number(value) > Number(rule.value);
      case 'less_than':
        return Number(value) < Number(rule.value);
      case 'in_list':
        return Array.isArray(rule.value) && rule.value.includes(value);
      case 'not_in_list':
        return Array.isArray(rule.value) && !rule.value.includes(value);
      case 'matches_regex':
        return typeof value === 'string' && new RegExp(String(rule.value)).test(value);
      default:
        return false;
    }
  }
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  // CRUD OPERATIONS
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }
  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }
  async upsertFlag(flag: FeatureFlag): Promise<void> {
    flag.updatedAt = new Date();
    this.flags.set(flag.key, flag);
    this.notifyListeners();

    // Salva no servidor
    await fetch('/api/feature-flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flag),
    });
  }
  async deleteFlag(key: string): Promise<void> {
    this.flags.delete(key);
    this.notifyListeners();

    await fetch(`/api/feature-flags/${key}`, {
      method: 'DELETE',
    });
  }
  async toggleFlag(key: string, enabled: boolean): Promise<void> {
    const flag = this.flags.get(key);
    if (flag) {
      flag.enabled = enabled;
      flag.updatedAt = new Date();
      this.notifyListeners();

      await fetch(`/api/feature-flags/${key}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
    }
  }
  async updateRollout(key: string, percentage: number): Promise<void> {
    const flag = this.flags.get(key);
    if (flag && flag.type === 'percentage') {
      flag.percentage = Math.min(100, Math.max(0, percentage));
      flag.updatedAt = new Date();
      this.notifyListeners();

      await fetch(`/api/feature-flags/${key}/rollout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage }),
      });
    }
  }
  addUserToFlag(key: string, userId: string): void {
    const flag = this.flags.get(key);
    if (flag) {
      if (!flag.allowedUsers) flag.allowedUsers = [];
      if (!flag.allowedUsers.includes(userId)) {
        flag.allowedUsers.push(userId);
        this.notifyListeners();
      }
    }
  }
  removeUserFromFlag(key: string, userId: string): void {
    const flag = this.flags.get(key);
    if (flag?.allowedUsers) {
      flag.allowedUsers = flag.allowedUsers.filter(id => id !== userId);
      this.notifyListeners();
    }
  }
  // LISTENERS

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}
// EXPERIMENTS

export class ExperimentService {
  private service: FeatureFlagService;
  private enrollments: Map<string, ExperimentResult[]> = new Map(); // userId -> experiments

  constructor() {
    this.service = FeatureFlagService.getInstance();
  }
  enroll(experimentKey: string, user: UserContext): ExperimentResult {
    const result = this.service.evaluate(experimentKey, user);

    const experiment: ExperimentResult = {
      experimentId: experimentKey,
      variant: result.variant || 'control',
      enrolled: result.enabled,
      enrolledAt: new Date(),
    };

    // Salva enrollment
    if (user.id) {
      if (!this.enrollments.has(user.id)) {
        this.enrollments.set(user.id, []);
      }
      this.enrollments.get(user.id)!.push(experiment);
    }

    // Track enrollment
    this.trackEnrollment(experiment, user);

    return experiment;
  }
  getVariant(experimentKey: string, user: UserContext): string | null {
    const userEnrollments = this.enrollments.get(user.id);
    const enrollment = userEnrollments?.find(e => e.experimentId === experimentKey);

    if (enrollment) {
      return enrollment.variant;
    }

    return null;
  }
  private trackEnrollment(experiment: ExperimentResult, user: UserContext): void {
    // Envia para analytics
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aethel:experiment', {
        detail: { experiment, user },
      }));
    }
  }
  trackConversion(
    experimentKey: string,
    user: UserContext,
    value?: number
  ): void {
    const variant = this.getVariant(experimentKey, user);
    if (variant) {
      // Envia conversão
      fetch('/api/experiments/conversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experimentKey,
          userId: user.id,
          variant,
          value,
          timestamp: new Date(),
        }),
      }).catch((error) => logger.error(error));
    }
  }
}

export const featureFlagService = FeatureFlagService.getInstance();
export const experimentService = new ExperimentService();
