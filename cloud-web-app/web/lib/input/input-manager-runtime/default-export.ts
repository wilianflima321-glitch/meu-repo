/**
 * Input Manager - split runtime modules.
 *
 * Keyboard, mouse, touch, and gamepad runtime is isolated from public shells so
 * game/editor surfaces can load it only when interactive controls are needed.
 */

import { InputManager } from './manager';

const __defaultExport = {
  InputManager,
};

export default __defaultExport;
