import { EventEmitter } from 'events';
import { CutscenePlayer } from './player';
import { type CutsceneDefinition, type CutsceneState } from './types';

export class CutsceneManager extends EventEmitter {
  private definitions: Map<string, CutsceneDefinition> = new Map();
  private player: CutscenePlayer;
  
  constructor() {
    super();
    this.player = new CutscenePlayer();
    
    // Forward player events
    this.player.on('started', (data) => this.emit('started', data));
    this.player.on('completed', (data) => this.emit('completed', data));
    this.player.on('paused', (data) => this.emit('paused', data));
    this.player.on('resumed', () => this.emit('resumed'));
    this.player.on('stopped', () => this.emit('stopped'));
    this.player.on('event', (data) => this.emit('event', data));
    this.player.on('update', (data) => this.emit('update', data));
  }
  
  register(cutscene: CutsceneDefinition): void {
    this.definitions.set(cutscene.id, cutscene);
  }
  
  registerMany(cutscenes: CutsceneDefinition[]): void {
    for (const cs of cutscenes) {
      this.register(cs);
    }
  }
  
  play(cutsceneId: string): boolean {
    const definition = this.definitions.get(cutsceneId);
    if (!definition) return false;
    
    this.player.load(definition);
    this.player.play();
    return true;
  }
  
  pause(): void {
    this.player.pause();
  }
  
  resume(): void {
    this.player.resume();
  }
  
  stop(): void {
    this.player.stop();
  }
  
  skip(): void {
    this.player.skip();
  }
  
  update(deltaTime: number): void {
    this.player.update(deltaTime);
  }
  
  getPlayer(): CutscenePlayer {
    return this.player;
  }
  
  getState(): CutsceneState {
    return this.player.getState();
  }
  
  dispose(): void {
    this.player.dispose();
    this.definitions.clear();
    this.removeAllListeners();
  }
}
