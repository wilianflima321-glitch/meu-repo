// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.

export {
  BLOOM_BLUR_SHADER,
  BLOOM_THRESHOLD_SHADER,
  PBR_FRAGMENT_SHADER,
  PBR_VERTEX_SHADER,
  SSAO_SHADER,
  TONEMAP_SHADER,
} from './pbr-shader-sources';
export type { IBLEnvironment, PBRMaterialParams, PostProcessConfig } from './pbr-shader-pipeline.contracts';
export { PBRMaterial } from './pbr-material-runtime';
export { ShadowMapRenderer } from './pbr-shadow-runtime';
export { PostProcessPipeline } from './pbr-post-process-pipeline';
export { BRDFLUTGenerator } from './pbr-brdf-lut';
export { MaterialPresets } from './pbr-material-presets';
export { ShaderHotReload } from './pbr-shader-hot-reload';
