/**
 * Advanced Input System - split runtime modules.
 *
 * Keep input runtime isolated from public route shells; Studio/game surfaces can
 * lazy-load the barrel when they need keyboard, mouse, touch, or gamepad input.
 */

export * from './types';
export * from './device-manager';
export * from './input-buffer';
export * from './combo-detector';
export * from './gesture-recognizer';
export * from './input-recorder';
export * from './input-manager';
export * from './presets';
export { InputManager as default } from './input-manager';
