/**
 * Game State Manager - split persistence runtime.
 *
 * This keeps save/load, migration, compression, and React bindings isolated so
 * editor shells can load only the state surface they need.
 */

import { Checksum } from './checksum';
import { Compressor } from './compressor';
import { GameStateManager } from './manager';
import { GameStateProvider, useGameState } from './react';
import { IndexedDBAdapter, LocalStorageAdapter } from './storage-adapters';

const __defaultExport = {
  GameStateManager,
  GameStateProvider,
  useGameState,
  LocalStorageAdapter,
  IndexedDBAdapter,
  Compressor,
  Checksum,
};

export default __defaultExport;
