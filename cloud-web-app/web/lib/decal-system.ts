// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
export { DecalGeometry } from './decal-system-geometry';
export { DecalMaterial } from './decal-system-material';
export { DecalManager } from './decal-system-manager';
export { DeferredDecalRenderer } from './decal-system-deferred-renderer';
export type { DecalConfig, DecalInstance, DecalPool } from './decal-system.types';

import { DecalGeometry } from './decal-system-geometry';
import { DecalMaterial } from './decal-system-material';
import { DecalManager } from './decal-system-manager';
import { DeferredDecalRenderer } from './decal-system-deferred-renderer';

const decalSystem = {
  DecalGeometry,
  DecalMaterial,
  DecalManager,
  DeferredDecalRenderer,
};

export default decalSystem;
