/**
 * Public compatibility barrel for the split pixel streaming runtime.
 * Keep imports from `@/lib/pixel-streaming` stable while the implementation
 * lives in focused modules under `@/lib/pixel-streaming/*`.
 */
export * from './pixel-streaming/types';
export * from './pixel-streaming/codec';
export * from './pixel-streaming/signaling';
export * from './pixel-streaming/session';
export * from './pixel-streaming/cost';
export * from './pixel-streaming/react';
export { PixelStreamingClient as default } from './pixel-streaming/session';
