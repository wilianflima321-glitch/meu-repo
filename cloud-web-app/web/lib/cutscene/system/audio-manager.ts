export class CutsceneAudioManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, { buffer: AudioBuffer; source: AudioBufferSourceNode | null; gain: GainNode | null }> = new Map();
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
  }
  
  async loadAudio(id: string, url: string): Promise<void> {
    if (!this.audioContext) return;
    
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    this.sounds.set(id, { buffer: audioBuffer, source: null, gain: null });
  }
  
  play(id: string, options: { volume?: number; loop?: boolean } = {}): void {
    if (!this.audioContext) return;
    
    const sound = this.sounds.get(id);
    if (!sound) return;
    
    // Create source and gain
    const source = this.audioContext.createBufferSource();
    source.buffer = sound.buffer;
    source.loop = options.loop || false;
    
    const gain = this.audioContext.createGain();
    gain.gain.value = options.volume ?? 1;
    
    source.connect(gain);
    gain.connect(this.audioContext.destination);
    
    source.start();
    
    sound.source = source;
    sound.gain = gain;
  }
  
  stop(id: string): void {
    const sound = this.sounds.get(id);
    if (!sound?.source) return;
    
    sound.source.stop();
    sound.source = null;
    sound.gain = null;
  }
  
  fadeIn(id: string, targetVolume: number, duration = 1): void {
    if (!this.audioContext) return;
    
    const sound = this.sounds.get(id);
    if (!sound) return;
    
    // Start playing at 0 volume
    this.play(id, { volume: 0 });
    
    if (sound.gain) {
      sound.gain.gain.linearRampToValueAtTime(
        targetVolume,
        this.audioContext.currentTime + duration
      );
    }
  }
  
  fadeOut(id: string, duration = 1): void {
    if (!this.audioContext) return;
    
    const sound = this.sounds.get(id);
    if (!sound?.gain) return;
    
    sound.gain.gain.linearRampToValueAtTime(
      0,
      this.audioContext.currentTime + duration
    );
    
    setTimeout(() => {
      this.stop(id);
    }, duration * 1000);
  }
  
  stopAll(): void {
    for (const id of this.sounds.keys()) {
      this.stop(id);
    }
  }
  
  dispose(): void {
    this.stopAll();
    this.sounds.clear();
    this.audioContext?.close();
  }
}

// CUTSCENE BUILDER
