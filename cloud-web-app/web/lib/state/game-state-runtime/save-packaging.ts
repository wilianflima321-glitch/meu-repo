import { Checksum } from './checksum';
import { Compressor } from './compressor';
import { deserializeGameState, serializeGameState } from './serialization';
import type { GameState, SaveData, SaveMetadata } from './types';

export function createSaveMetadata(input: {
  slotIndex: number;
  name: string;
  playTime: number;
  gameState: GameState;
  thumbnail?: string;
}): SaveMetadata {
  return {
    id: `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: input.name,
    slotIndex: input.slotIndex,
    version: 1,
    timestamp: Date.now(),
    playTime: input.playTime,
    thumbnail: input.thumbnail,
    location: input.gameState.world.currentScene,
    playerLevel: input.gameState.player.level,
  };
}

export async function packSaveData(saveData: SaveData): Promise<string> {
  const serialized = JSON.stringify({
    metadata: saveData.metadata,
    gameState: serializeGameState(saveData.gameState),
  });

  const compressed = await Compressor.compress(serialized);
  const checksum = Checksum.calculate(compressed);

  return JSON.stringify({
    compressed: true,
    checksum,
    data: compressed,
  });
}

export async function unpackSaveData(rawData: string): Promise<{
  metadata: SaveMetadata;
  gameState: GameState;
}> {
  const parsed = JSON.parse(rawData);

  if (!Checksum.verify(parsed.data, parsed.checksum)) {
    throw new Error('Save data corrupted - checksum mismatch');
  }

  const decompressed = await Compressor.decompress(parsed.data);
  const saveData = JSON.parse(decompressed);

  return {
    metadata: saveData.metadata,
    gameState: deserializeGameState(saveData.gameState),
  };
}

export function validatePackedSaveData(data: string): void {
  const parsed = JSON.parse(data);

  if (!parsed.data || !parsed.checksum) {
    throw new Error('Invalid save data format');
  }

  if (!Checksum.verify(parsed.data, parsed.checksum)) {
    throw new Error('Save data corrupted');
  }
}
