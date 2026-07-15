import type { GameState } from './types';

export function serializeGameState(state: GameState): unknown {
  return {
    ...state,
    customSections: Object.fromEntries(state.customSections),
  };
}

export function deserializeGameState(data: unknown): GameState {
  const parsed = data as GameState & { customSections?: Record<string, unknown> };

  return {
    ...parsed,
    customSections: new Map(Object.entries(parsed.customSections || {})),
  };
}

export function cloneGameState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(serializeGameState(state)));
}
