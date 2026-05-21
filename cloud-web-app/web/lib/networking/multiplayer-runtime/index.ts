/**
 * Networking & Multiplayer System - split runtime modules.
 *
 * Keep this package Studio/runtime-only. Public surfaces should lazy-load it
 * through explicit boundaries rather than importing the multiplayer barrel.
 */

export * from './types';
export * from './websocket-transport';
export * from './state-synchronizer';
export * from './input-predictor';
export * from './lobby-manager';
export * from './network-manager';
export * from './react';
export { default } from './default-export';
