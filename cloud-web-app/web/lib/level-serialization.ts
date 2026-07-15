export * from './level-serialization/types';
export * from './level-serialization/component-serializers';
export * from './level-serialization/serializer';
export * from './level-serialization/compression';
export * from './level-serialization/file-format';
export * from './level-serialization/manager';
export * from './level-serialization/history';

import type { RuntimeLevel } from './level-serialization/types';
import { LevelSerializer } from './level-serialization/serializer';
import { LevelFileFormat } from './level-serialization/file-format';
import { LevelManager } from './level-serialization/manager';
import { LevelHistory } from './level-serialization/history';

export function createLevelManager(): LevelManager {
  return new LevelManager();
}

export function createLevelHistory(): LevelHistory {
  return new LevelHistory();
}

export async function saveLevel(level: RuntimeLevel): Promise<Blob> {
  const serialized = LevelSerializer.serializeLevel(level);
  return LevelFileFormat.save(serialized);
}

export async function loadLevel(blob: Blob): Promise<RuntimeLevel> {
  const serialized = await LevelFileFormat.load(blob);
  return LevelSerializer.deserializeLevel(serialized);
}
