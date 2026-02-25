import type { GameState, SaveData } from './save-manager-types';

export interface SaveSerializer {
  serialize(state: GameState): string;
  deserialize(data: string): GameState;
}

export class JSONSerializer implements SaveSerializer {
  serialize(state: GameState): string {
    return JSON.stringify(state);
  }

  deserialize(data: string): GameState {
    return JSON.parse(data);
  }
}

export class CompressedSerializer implements SaveSerializer {
  private base: SaveSerializer;

  constructor(base: SaveSerializer = new JSONSerializer()) {
    this.base = base;
  }

  serialize(state: GameState): string {
    const json = this.base.serialize(state);
    return this.compress(json);
  }

  deserialize(data: string): GameState {
    const json = this.decompress(data);
    return this.base.deserialize(json);
  }

  private compress(data: string): string {
    // In production, replace with a binary compression codec.
    return btoa(unescape(encodeURIComponent(data)));
  }

  private decompress(data: string): string {
    return decodeURIComponent(escape(atob(data)));
  }
}

export type MigrationFn = (state: GameState) => GameState;

export class SaveMigrator {
  private migrations: Map<number, MigrationFn> = new Map();

  register(fromVersion: number, migration: MigrationFn): void {
    this.migrations.set(fromVersion, migration);
  }

  migrate(state: GameState, fromVersion: number, toVersion: number): GameState {
    let current = state;

    for (let version = fromVersion; version < toVersion; version++) {
      const migration = this.migrations.get(version);
      if (migration) {
        current = migration(current);
      }
    }

    return current;
  }

  hasPath(fromVersion: number, toVersion: number): boolean {
    for (let version = fromVersion; version < toVersion; version++) {
      if (!this.migrations.has(version)) {
        return false;
      }
    }
    return true;
  }
}

export class SaveValidator {
  private static calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash;
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
    if (!state || typeof state !== 'object') {
      return false;
    }

    const candidate = state as Record<string, unknown>;
    if (!candidate.player || typeof candidate.player !== 'object') {
      return false;
    }
    if (!candidate.world || typeof candidate.world !== 'object') {
      return false;
    }
    if (!Array.isArray(candidate.quests)) {
      return false;
    }
    if (!candidate.inventory || typeof candidate.inventory !== 'object') {
      return false;
    }

    return true;
  }
}
