/**
 * Replay input serialization helpers.
 */

import type { InputState } from './replay-types';

export class InputSerializer {
  serializeInputs(inputs: Map<string, InputState>): InputState[] {
    const result: InputState[] = [];
    
    for (const [, input] of inputs) {
      result.push({
        playerId: input.playerId,
        keys: new Set(input.keys),
        mousePosition: { ...input.mousePosition },
        mouseButtons: new Set(input.mouseButtons),
        axes: new Map(input.axes),
      });
    }
    
    return result;
  }
  
  deserializeInputs(data: InputState[]): Map<string, InputState> {
    const map = new Map<string, InputState>();
    
    for (const input of data) {
      map.set(input.playerId, {
        playerId: input.playerId,
        keys: new Set(input.keys),
        mousePosition: { ...input.mousePosition },
        mouseButtons: new Set(input.mouseButtons),
        axes: new Map(input.axes),
      });
    }
    
    return map;
  }
  
  toJSON(inputs: InputState[]): string {
    return JSON.stringify(inputs.map(input => ({
      playerId: input.playerId,
      keys: Array.from(input.keys),
      mousePosition: input.mousePosition,
      mouseButtons: Array.from(input.mouseButtons),
      axes: Array.from(input.axes.entries()),
    })));
  }
  
  fromJSON(json: string): InputState[] {
    const data = JSON.parse(json);
    return data.map((input: { 
      playerId: string;
      keys: string[];
      mousePosition: { x: number; y: number };
      mouseButtons: number[];
      axes: [string, number][];
    }) => ({
      playerId: input.playerId,
      keys: new Set(input.keys),
      mousePosition: input.mousePosition,
      mouseButtons: new Set(input.mouseButtons),
      axes: new Map(input.axes),
    }));
  }
}
