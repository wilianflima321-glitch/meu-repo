/**
 * Animation System - split runtime modules.
 *
 * Animation player, state machine, timeline, and hooks are separated so Studio
 * can lazy-load only the animation layer needed by each editor surface.
 */

export * from './types';
export * from './easing';
export * from './player';
export * from './state-machine';
export * from './timeline';
export * from './react';
export { default } from './default-export';
