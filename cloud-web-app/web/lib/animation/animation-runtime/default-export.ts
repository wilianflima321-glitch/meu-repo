/**
 * Animation System - split runtime modules.
 *
 * Animation player, state machine, timeline, and hooks are separated so Studio
 * can lazy-load only the animation layer needed by each editor surface.
 */

import { EasingFunctions } from './easing';
import { AnimationPlayer } from './player';
import { useAnimationPlayer, useAnimationTimeline } from './react';
import { AnimationStateMachine } from './state-machine';
import { AnimationTimeline } from './timeline';

const __defaultExport = {
  AnimationPlayer,
  AnimationStateMachine,
  AnimationTimeline,
  EasingFunctions,
};

export default __defaultExport;
