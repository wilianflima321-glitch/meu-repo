/**
 * Save Manager - split persistence runtime.
 *
 * Save serialization, validation, cloud sync, and React hooks are separated so
 * Studio can lazy-load persistence features without bloating initial shells.
 */

import type { GameState, SaveSerializer } from './types';

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
    return btoa(unescape(encodeURIComponent(data)));
  }
  
  private decompress(data: string): string {
    return decodeURIComponent(escape(atob(data)));
  }
}
