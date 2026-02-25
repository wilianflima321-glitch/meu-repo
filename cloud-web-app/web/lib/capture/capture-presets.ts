/**
 * Shared photo filter presets for capture/photo mode.
 */

import type { ScreenshotEffect } from './capture-types';

export const PHOTO_FILTER_PRESETS: Record<string, ScreenshotEffect[]> = {
  'none': [],
  'vivid': [
    { type: 'saturation', value: 1.3 },
    { type: 'contrast', value: 1.1 },
  ],
  'noir': [
    { type: 'grayscale', value: 1 },
    { type: 'contrast', value: 1.2 },
  ],
  'sepia': [
    { type: 'sepia', value: 1 },
  ],
  'vintage': [
    { type: 'sepia', value: 0.3 },
    { type: 'contrast', value: 0.9 },
    { type: 'saturation', value: 0.8 },
    { type: 'vignette', value: 0.4 },
    { type: 'grain', value: 0.2 },
  ],
  'cold': [
    { type: 'saturation', value: 0.8 },
    { type: 'brightness', value: 1.05 },
  ],
  'warm': [
    { type: 'saturation', value: 1.1 },
    { type: 'brightness', value: 1.05 },
  ],
  'dramatic': [
    { type: 'contrast', value: 1.4 },
    { type: 'saturation', value: 0.9 },
    { type: 'vignette', value: 0.5 },
  ],
  'dream': [
    { type: 'brightness', value: 1.1 },
    { type: 'saturation', value: 0.9 },
    { type: 'blur', value: 0.5 },
  ],
  'cinematic': [
    { type: 'contrast', value: 1.2 },
    { type: 'saturation', value: 0.95 },
    { type: 'vignette', value: 0.3 },
  ],
};
