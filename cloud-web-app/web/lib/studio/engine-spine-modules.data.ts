import type { EngineSpineModule } from './engine-spine-modules.types';
import { ENGINE_SPINE_CORE_MODULES } from './engine-spine-modules.core-data';
import { ENGINE_SPINE_PRODUCTION_MODULES } from './engine-spine-modules.production-data';

export const ENGINE_SPINE_MODULES = [
  ...ENGINE_SPINE_CORE_MODULES,
  ...ENGINE_SPINE_PRODUCTION_MODULES,
] satisfies EngineSpineModule[]
