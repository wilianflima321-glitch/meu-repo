/**
 * Material Editor - split runtime modules.
 *
 * Three.js material factory and editor state stay behind Studio/material routes
 * instead of public route imports.
 */

import { MaterialEditor } from './editor';
import { MaterialFactory } from './factory';
import { DEFAULT_PRESETS } from './presets';

const __defaultExport = {
  MaterialFactory,
  MaterialEditor,
  DEFAULT_PRESETS,
};

export default __defaultExport;
