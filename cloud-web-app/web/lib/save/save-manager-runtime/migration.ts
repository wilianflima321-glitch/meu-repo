/**
 * Save Manager - split persistence runtime.
 *
 * Save serialization, validation, cloud sync, and React hooks are separated so
 * Studio can lazy-load persistence features without bloating initial shells.
 */

import type { GameState } from './types';

export type MigrationFn = (state: GameState) => GameState;

export class SaveMigrator {
  private migrations: Map<number, MigrationFn> = new Map();
  
  register(fromVersion: number, migration: MigrationFn): void {
    this.migrations.set(fromVersion, migration);
  }
  
  migrate(state: GameState, fromVersion: number, toVersion: number): GameState {
    let current = state;
    
    for (let v = fromVersion; v < toVersion; v++) {
      const migration = this.migrations.get(v);
      if (migration) {
        current = migration(current);
      }
    }
    
    return current;
  }
  
  hasPath(fromVersion: number, toVersion: number): boolean {
    for (let v = fromVersion; v < toVersion; v++) {
      if (!this.migrations.has(v)) {
        return false;
      }
    }
    return true;
  }
}
