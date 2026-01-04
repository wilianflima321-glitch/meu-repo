/**
 * Sistema de Feature Flags - Aethel Engine
 * 
 * Sistema completo para:
 * - Feature flags por ambiente
 * - Gradual rollout (percentage)
 * - User targeting
 * - A/B testing
 * - Experiments
 * - Kill switches
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

import { createElement, createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// ============================================================================
// TIPOS
// ============================================================================

export type FeatureFlagType = 
  | 'boolean'      // On/Off simples
  | 'percentage'   // Rollout gradual
  | 'variant'      // A/B/C testing
  | 'user_list'    // Lista de usuários específicos
  | 'rule_based';  // Regras complexas

export type Environment = 'development' | 'staging' | 'production';

export type RuleOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'in_list'
  | 'not_in_list'
  | 'matches_regex';

export interface FeatureRule {
  id: string;
  attribute: string; // user.plan, user.country, etc
  operator: RuleOperator;
  value: unknown;
  priority: number;
}

export interface FeatureVariant {
  id: string;
  name: string;
  weight: number; // 0-100
  payload?: Record<string, unknown>;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  type: FeatureFlagType;
  enabled: boolean;
  
  // Boolean flags
  defaultValue?: boolean;
  
  // Percentage rollout
  percentage?: number;
  
  // Variants for A/B testing
  variants?: FeatureVariant[];
  
  // User targeting
  allowedUsers?: string[];
  blockedUsers?: string[];
  
  // Rule-based
  rules?: FeatureRule[];
  
  // Environment-specific overrides
  environments?: Partial<Record<Environment, {
    enabled: boolean;
    percentage?: number;
  }>>;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags?: string[];
  
  // Kill switch
  killSwitch?: boolean;
  
  // Dependencies
  dependsOn?: string[]; // Outras flags que devem estar ativas
}

export interface UserContext {
  id: string;
  email?: string;
  plan?: string;
  country?: string;
  language?: string;
  createdAt?: Date;
  attributes?: Record<string, unknown>;
}

export interface EvaluationResult {
  enabled: boolean;
  variant?: string;
  payload?: Record<string, unknown>;
  reason: string;
}

export interface ExperimentResult {
  experimentId: string;
  variant: string;
  enrolled: boolean;
  enrolledAt?: Date;
}

// ============================================================================
// FEATURE FLAGS DEFINIDAS
// ============================================================================

export const DefaultFeatureFlags: FeatureFlag[] = [
  // Core features
  {
    id: 'ff_1',
    key: 'new_dashboard',
    name: 'Novo Dashboard',
    description: 'Nova versão do dashboard com melhorias de UX',
    type: 'percentage',
    enabled: true,
    percentage: 50,
    environments: {
      development: { enabled: true, percentage: 100 },
      staging: { enabled: true, percentage: 100 },
      production: { enabled: true, percentage: 50 },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    tags: ['ui', 'dashboard'],
  },
  {
    id: 'ff_2',
    key: 'ai_code_review',
    name: 'AI Code Review',
    description: 'Revisão automática de código com IA',
    type: 'rule_based',
    enabled: true,
    rules: [
      { id: 'r1', attribute: 'user.plan', operator: 'in_list', value: ['pro', 'studio', 'enterprise'], priority: 1 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    tags: ['ai', 'pro-feature'],
  },
  {
    id: 'ff_3',
    key: 'multiplayer_editing',
    name: 'Edição Multiplayer',
    description: 'Colaboração em tempo real no editor',
    type: 'boolean',
    enabled: true,
    defaultValue: true,
    dependsOn: ['new_dashboard'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    tags: ['collaboration'],
  },
  {
    id: 'ff_4',
    key: 'new_checkout_flow',
    name: 'Novo Fluxo de Checkout',
    description: 'A/B test do novo fluxo de pagamento',
    type: 'variant',
    enabled: true,
    variants: [
      { id: 'control', name: 'Controle', weight: 50 },
      { id: 'variant_a', name: 'Variante A - Steps', weight: 25 },
      { id: 'variant_b', name: 'Variante B - Single Page', weight: 25 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    tags: ['billing', 'experiment'],
  },
  {
    id: 'ff_5',
    key: 'beta_features',
    name: 'Features Beta',
    description: 'Acesso a features em beta para usuários selecionados',
    type: 'user_list',
    enabled: true,
    allowedUsers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    tags: ['beta'],
  },
  {
    id: 'ff_6',
    key: 'advanced_analytics',
    name: 'Analytics Avançado',
    description: 'Dashboard de analytics detalhado',
    type: 'rule_based',
    enabled: true,
    rules: [
      { id: 'r1', attribute: 'user.plan', operator: 'equals', value: 'enterprise', priority: 1 },
      { id: 'r2', attribute: 'user.role', operator: 'equals', value: 'admin', priority: 2 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    tags: ['analytics', 'enterprise'],
  },
  {
    id: 'ff_7',
    key: 'dark_mode_v2',
    name: 'Dark Mode v2',
    description: 'Nova implementação do modo escuro',
    type: 'boolean',
    enabled: false,
    defaultValue: false,
    killSwitch: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    tags: ['ui', 'theme'],
  },
  {
    id: 'ff_8',
    key: 'export_webgpu',
    name: 'Export WebGPU',
    description: 'Suporte a export para WebGPU',
    type: 'percentage',
    enabled: true,
    percentage: 10,
    environments: {
      development: { enabled: true, percentage: 100 },
      staging: { enabled: true, percentage: 50 },
      production: { enabled: true, percentage: 10 },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    tags: ['export', 'webgpu'],
  },
];

// ============================================================================
// FEATURE FLAG SERVICE
// ============================================================================

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
  
  /**
   * Carrega flags padrão
   */
  private loadDefaultFlags(): void {
    for (const flag of DefaultFeatureFlags) {
      this.flags.set(flag.key, flag);
    }
  }
  
  /**
   * Sincroniza flags do servidor
   */
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
      console.error('[FeatureFlags] Sync failed:', e);
    }
  }
  
  /**
   * Avalia uma flag para um usuário
   */
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
  
  /**
   * Avalia flag booleana simples
   */
  private evaluateBoolean(flag: FeatureFlag): EvaluationResult {
    return {
      enabled: flag.defaultValue ?? true,
      reason: 'Boolean flag',
    };
  }
  
  /**
   * Avalia rollout por porcentagem
   */
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
  
  /**
   * Avalia variante A/B
   */
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
  
  /**
   * Avalia lista de usuários
   */
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
  
  /**
   * Avalia regras complexas
   */
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
  
  /**
   * Obtém valor de atributo do usuário
   */
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
  
  /**
   * Avalia uma regra individual
   */
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
  
  /**
   * Hash string para consistência
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  // ==========================================================================
  // CRUD OPERATIONS
  // ==========================================================================
  
  /**
   * Obtém todas as flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }
  
  /**
   * Obtém flag por key
   */
  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }
  
  /**
   * Cria ou atualiza flag
   */
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
  
  /**
   * Remove flag
   */
  async deleteFlag(key: string): Promise<void> {
    this.flags.delete(key);
    this.notifyListeners();
    
    await fetch(`/api/feature-flags/${key}`, {
      method: 'DELETE',
    });
  }
  
  /**
   * Toggle rápido de flag
   */
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
  
  /**
   * Atualiza porcentagem de rollout
   */
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
  
  /**
   * Adiciona usuário à lista permitida
   */
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
  
  /**
   * Remove usuário da lista permitida
   */
  removeUserFromFlag(key: string, userId: string): void {
    const flag = this.flags.get(key);
    if (flag?.allowedUsers) {
      flag.allowedUsers = flag.allowedUsers.filter(id => id !== userId);
      this.notifyListeners();
    }
  }
  
  // ==========================================================================
  // LISTENERS
  // ==========================================================================
  
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// ============================================================================
// EXPERIMENTS
// ============================================================================

export class ExperimentService {
  private service: FeatureFlagService;
  private enrollments: Map<string, ExperimentResult[]> = new Map(); // userId -> experiments
  
  constructor() {
    this.service = FeatureFlagService.getInstance();
  }
  
  /**
   * Entra em um experimento
   */
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
  
  /**
   * Verifica variante do experimento
   */
  getVariant(experimentKey: string, user: UserContext): string | null {
    const userEnrollments = this.enrollments.get(user.id);
    const enrollment = userEnrollments?.find(e => e.experimentId === experimentKey);
    
    if (enrollment) {
      return enrollment.variant;
    }
    
    return null;
  }
  
  /**
   * Track enrollment para analytics
   */
  private trackEnrollment(experiment: ExperimentResult, user: UserContext): void {
    // Envia para analytics
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aethel:experiment', {
        detail: { experiment, user },
      }));
    }
  }
  
  /**
   * Track conversão
   */
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
      }).catch(console.error);
    }
  }
}

// ============================================================================
// REACT CONTEXT E HOOKS
// ============================================================================

interface FeatureFlagContextType {
  isEnabled: (key: string) => boolean;
  evaluate: (key: string) => EvaluationResult;
  getVariant: (key: string) => string | null;
  getAllFlags: () => FeatureFlag[];
  isLoading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | null>(null);

export function FeatureFlagProvider({
  children,
  user,
}: {
  children: ReactNode;
  user?: UserContext;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [, forceUpdate] = useState({});
  
  const service = useMemo(() => FeatureFlagService.getInstance(), []);
  
  useEffect(() => {
    service.syncFromServer().finally(() => setIsLoading(false));
    
    const unsubscribe = service.subscribe(() => forceUpdate({}));
    return () => unsubscribe();
  }, [service]);
  
  const isEnabled = useCallback((key: string) => {
    return service.evaluate(key, user).enabled;
  }, [service, user]);
  
  const evaluate = useCallback((key: string) => {
    return service.evaluate(key, user);
  }, [service, user]);
  
  const getVariant = useCallback((key: string) => {
    const result = service.evaluate(key, user);
    return result.variant || null;
  }, [service, user]);
  
  const getAllFlags = useCallback(() => {
    return service.getAllFlags();
  }, [service]);
  
  return createElement(
    FeatureFlagContext.Provider,
    {
      value: {
        isEnabled,
        evaluate,
        getVariant,
        getAllFlags,
        isLoading,
      },
    },
    children
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagProvider');
  }
  return context;
}

export function useFeatureFlag(key: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
}

export function useVariant(key: string): string | null {
  const { getVariant } = useFeatureFlags();
  return getVariant(key);
}

// ============================================================================
// COMPONENTES UTILITÁRIOS
// ============================================================================

interface FeatureProps {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Feature({ flag, children, fallback = null }: FeatureProps) {
  const isEnabled = useFeatureFlag(flag);
  return isEnabled
    ? createElement(Fragment, null, children)
    : createElement(Fragment, null, fallback);
}

interface VariantProps {
  flag: string;
  variant: string;
  children: ReactNode;
}

export function Variant({ flag, variant, children }: VariantProps) {
  const currentVariant = useVariant(flag);
  return currentVariant === variant ? createElement(Fragment, null, children) : null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const featureFlagService = FeatureFlagService.getInstance();
export const experimentService = new ExperimentService();

const featureFlags = {
  FeatureFlagService,
  ExperimentService,
  FeatureFlagProvider,
  useFeatureFlags,
  useFeatureFlag,
  useVariant,
  Feature,
  Variant,
  DefaultFeatureFlags,
};

export default featureFlags;
