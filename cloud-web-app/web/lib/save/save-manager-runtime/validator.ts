/**
 * Save Manager - split persistence runtime.
 *
 * Save serialization, validation, cloud sync, and React hooks are separated so
 * Studio can lazy-load persistence features without bloating initial shells.
 */

import type { GameState, SaveData } from './types';

export class SaveValidator {
  private static calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
  
  static generateChecksum(state: GameState): string {
    const json = JSON.stringify(state);
    return this.calculateChecksum(json);
  }
  
  static validateChecksum(data: SaveData): boolean {
    const expected = data.metadata.checksum;
    const actual = this.generateChecksum(data.state);
    return expected === actual;
  }
  
  static validateStructure(state: unknown): state is GameState {
    if (!state || typeof state !== 'object') return false;
    
    const s = state as Record<string, unknown>;
    
    if (!s.player || typeof s.player !== 'object') return false;
    if (!s.world || typeof s.world !== 'object') return false;
    if (!Array.isArray(s.quests)) return false;
    if (!s.inventory || typeof s.inventory !== 'object') return false;
    
    return true;
  }
}
