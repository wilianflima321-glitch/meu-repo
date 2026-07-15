/**
 * Shared contracts for Aethel feature flags.
 */

// ============================================================================
// TYPES
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
