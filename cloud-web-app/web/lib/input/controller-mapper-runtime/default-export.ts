/**
 * Controller Mapper - split input runtime.
 *
 * Gamepad mapping and hooks are isolated so game/editor surfaces can load them
 * without making public shells pay for controller support.
 */

import { ControllerMapper } from './mapper';
import { DEFAULT_PROFILES } from './profiles';
import { ControllerProvider, useController, useControllerMapper, useControllerProfiles, useControllers, useGameAction, useGamepadAxis, useGamepadButton, useVibration } from './react';

const __defaultExport = {
  ControllerMapper,
  ControllerProvider,
  useControllerMapper,
  useControllers,
  useController,
  useGamepadButton,
  useGamepadAxis,
  useGameAction,
  useControllerProfiles,
  useVibration,
  DEFAULT_PROFILES,
};

export default __defaultExport;
