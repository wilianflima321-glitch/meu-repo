'use client';

/**
 * Feature flag canonical entrypoint.
 * Service/runtime and React adapter live in focused modules to prevent flag
 * governance from becoming another application-wide monolith.
 */

import { DefaultFeatureFlags } from './feature-flags.defaults';
import { ExperimentService, FeatureFlagService, experimentService, featureFlagService } from './feature-flags.service';
import {
  Feature,
  FeatureFlagProvider,
  Variant,
  useFeatureFlag,
  useFeatureFlags,
  useVariant,
} from './feature-flags.react';

export { DefaultFeatureFlags } from './feature-flags.defaults';
export type {
  EvaluationResult,
  ExperimentResult,
  FeatureFlag,
  FeatureFlagType,
  FeatureRule,
  FeatureVariant,
  Environment,
  RuleOperator,
  UserContext,
} from './feature-flags.types';
export { ExperimentService, FeatureFlagService, experimentService, featureFlagService } from './feature-flags.service';
export { Feature, FeatureFlagProvider, Variant, useFeatureFlag, useFeatureFlags, useVariant } from './feature-flags.react';

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
