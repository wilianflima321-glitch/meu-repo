/**
 * Game State Manager - split persistence runtime.
 *
 * This keeps save/load, migration, compression, and React bindings isolated so
 * editor shells can load only the state surface they need.
 */

export * from './types';
export * from './storage-adapters';
export * from './compressor';
export * from './checksum';
export * from './manager';
export * from './react';
export { default } from './default-export';
