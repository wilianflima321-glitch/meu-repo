import type { QualityPreset } from './useRenderPipeline.types';
import {
  DEFAULT_GI_CONFIG,
  DEFAULT_PIPELINE_CONFIG,
  DEFAULT_SHADOW_CONFIG,
  LITE_GI_CONFIG,
  LITE_PIPELINE_CONFIG,
  MOBILE_GI_CONFIG,
  MOBILE_PIPELINE_CONFIG,
  type GlobalIlluminationConfig,
  type PostProcessingStack,
  type RenderPipelineConfig,
  type ShadowConfig,
} from '../aaa-render-system';

// ============================================================================
// QUALITY PRESETS
// ============================================================================

export const QUALITY_PRESETS: Record<QualityPreset, {
  pipeline: RenderPipelineConfig;
  gi: GlobalIlluminationConfig;
  shadow: Partial<ShadowConfig>;
  postProcess: Partial<PostProcessingStack>;
}> = {
  ultra: {
    pipeline: DEFAULT_PIPELINE_CONFIG,
    gi: DEFAULT_GI_CONFIG,
    shadow: {
      technique: 'cascaded',
      resolution: 4096,
      cascades: 4,
      contactShadows: true,
    },
    postProcess: {
      antialiasing: 'taa',
    },
  },
  high: {
    pipeline: {
      ...DEFAULT_PIPELINE_CONFIG,
      shadowMapSize: 2048,
      samples: 4,
    },
    gi: {
      ...DEFAULT_GI_CONFIG,
      ssgiSamples: 12,
    },
    shadow: {
      technique: 'cascaded',
      resolution: 2048,
      cascades: 4,
      contactShadows: true,
    },
    postProcess: {
      antialiasing: 'taa',
    },
  },
  medium: {
    pipeline: LITE_PIPELINE_CONFIG,
    gi: LITE_GI_CONFIG,
    shadow: {
      technique: 'pcf',
      resolution: 1024,
      cascades: 2,
      contactShadows: false,
    },
    postProcess: {
      antialiasing: 'fxaa',
    },
  },
  low: {
    pipeline: {
      ...LITE_PIPELINE_CONFIG,
      shadowMapSize: 512,
      hdr: false,
    },
    gi: {
      ...LITE_GI_CONFIG,
      method: 'none',
    },
    shadow: {
      technique: 'basic',
      resolution: 512,
      cascades: 1,
      contactShadows: false,
    },
    postProcess: {
      antialiasing: 'fxaa',
    },
  },
  mobile: {
    pipeline: MOBILE_PIPELINE_CONFIG,
    gi: MOBILE_GI_CONFIG,
    shadow: {
      technique: 'basic',
      resolution: 256,
      cascades: 1,
      contactShadows: false,
    },
    postProcess: {
      antialiasing: 'none',
    },
  },
  custom: {
    pipeline: DEFAULT_PIPELINE_CONFIG,
    gi: DEFAULT_GI_CONFIG,
    shadow: DEFAULT_SHADOW_CONFIG,
    postProcess: {},
  },
};
