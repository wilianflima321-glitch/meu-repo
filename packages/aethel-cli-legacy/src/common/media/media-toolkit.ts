/**
 * ═══════════════════════════════════════════════════════════════
 * AETHEL ENGINE - UNIFIED MEDIA TOOLS BRIDGE
 * ═══════════════════════════════════════════════════════════════
 * 
 * Ponte que expõe todas as ferramentas de mídia do Aethel Engine:
 * - VideoTimelineEngine: Edição de vídeo profissional
 * - ImageLayerEngine: Edição de imagem com layers
 * - AudioProcessingEngine: Processamento e mixagem de áudio
 * 
 * Este arquivo serve como ponte entre src/common e o IDE completo.
 */

// ═══════════════════════════════════════════════════════════════
// RE-EXPORTS DO IDE
// ═══════════════════════════════════════════════════════════════

// Nota: Os engines completos estão em:
// cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/common/

// ═══════════════════════════════════════════════════════════════
// TIPOS BÁSICOS - VIDEO
// ═══════════════════════════════════════════════════════════════

export interface VideoClip {
  id: string;
  name: string;
  sourceFile: string;
  startFrame: number;
  endFrame: number;
  sourceIn: number;
  sourceOut: number;
  speed: number;
  volume: number;
  opacity: number;
  effects: VideoEffect[];
}

export interface VideoTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'subtitle' | 'adjustment';
  clips: VideoClip[];
  muted: boolean;
  locked: boolean;
  visible: boolean;
}

export interface VideoEffect {
  id: string;
  type: string;
  parameters: Record<string, number | string | boolean>;
  enabled: boolean;
}

export interface VideoProjectBasic {
  id: string;
  name: string;
  resolution: { width: number; height: number };
  frameRate: number;
  tracks: VideoTrack[];
  duration: number;
}

// ═══════════════════════════════════════════════════════════════
// TIPOS BÁSICOS - IMAGE
// ═══════════════════════════════════════════════════════════════

export type BlendMode = 
  | 'normal' | 'multiply' | 'screen' | 'overlay'
  | 'darken' | 'lighten' | 'color-dodge' | 'color-burn'
  | 'soft-light' | 'hard-light' | 'difference' | 'exclusion';

export interface ImageLayer {
  id: string;
  name: string;
  type: 'raster' | 'vector' | 'text' | 'adjustment' | 'group';
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  position: { x: number; y: number };
  effects: ImageEffect[];
}

export interface ImageEffect {
  id: string;
  type: string;
  parameters: Record<string, number | string | boolean>;
  enabled: boolean;
}

export interface ImageDocumentBasic {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: ImageLayer[];
  colorSpace: string;
  bitDepth: number;
}

// ═══════════════════════════════════════════════════════════════
// TIPOS BÁSICOS - AUDIO
// ═══════════════════════════════════════════════════════════════

export interface AudioClip {
  id: string;
  name: string;
  sourceFile?: string;
  startSample: number;
  endSample: number;
  gain: number;
  fadeIn: number;
  fadeOut: number;
  pitch: number;
  muted: boolean;
}

export interface AudioTrack {
  id: string;
  name: string;
  type: 'audio' | 'midi' | 'instrument' | 'aux';
  clips: AudioClip[];
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  effects: AudioEffect[];
}

export interface AudioEffect {
  id: string;
  type: 'eq' | 'compressor' | 'reverb' | 'delay' | 'chorus' | 'limiter' | 'filter';
  parameters: Record<string, number>;
  enabled: boolean;
  mix: number;
}

export interface AudioProjectBasic {
  id: string;
  name: string;
  sampleRate: number;
  bitDepth: number;
  tempo: number;
  tracks: AudioTrack[];
}

// ═══════════════════════════════════════════════════════════════
// LIGHTWEIGHT MEDIA TOOLKIT
// ═══════════════════════════════════════════════════════════════

/**
 * Kit de ferramentas leve para operações básicas de mídia.
 * Para funcionalidades completas, use os engines do IDE.
 */
export class MediaToolkit {
  // ═══════════════════════════════════════════════════════════════
  // VIDEO OPERATIONS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Cria projeto de vídeo básico
   */
  createVideoProject(
    name: string,
    width: number = 1920,
    height: number = 1080,
    frameRate: number = 24
  ): VideoProjectBasic {
    return {
      id: this.generateId(),
      name,
      resolution: { width, height },
      frameRate,
      tracks: [
        this.createVideoTrack('Video 1', 'video'),
        this.createVideoTrack('Audio 1', 'audio'),
      ],
      duration: 0,
    };
  }
  
  createVideoTrack(name: string, type: VideoTrack['type']): VideoTrack {
    return {
      id: this.generateId(),
      name,
      type,
      clips: [],
      muted: false,
      locked: false,
      visible: true,
    };
  }
  
  addVideoClip(
    track: VideoTrack,
    sourceFile: string,
    startFrame: number,
    durationFrames: number
  ): VideoClip {
    const clip: VideoClip = {
      id: this.generateId(),
      name: this.extractFilename(sourceFile),
      sourceFile,
      startFrame,
      endFrame: startFrame + durationFrames,
      sourceIn: 0,
      sourceOut: durationFrames,
      speed: 1,
      volume: 1,
      opacity: 1,
      effects: [],
    };
    track.clips.push(clip);
    return clip;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // IMAGE OPERATIONS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Cria documento de imagem básico
   */
  createImageDocument(
    name: string,
    width: number = 1920,
    height: number = 1080
  ): ImageDocumentBasic {
    return {
      id: this.generateId(),
      name,
      width,
      height,
      layers: [this.createImageLayer('Background', 'raster')],
      colorSpace: 'sRGB',
      bitDepth: 8,
    };
  }
  
  createImageLayer(name: string, type: ImageLayer['type']): ImageLayer {
    return {
      id: this.generateId(),
      name,
      type,
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'normal',
      position: { x: 0, y: 0 },
      effects: [],
    };
  }
  
  addImageEffect(layer: ImageLayer, type: string, parameters: Record<string, number | string | boolean> = {}): ImageEffect {
    const effect: ImageEffect = {
      id: this.generateId(),
      type,
      parameters,
      enabled: true,
    };
    layer.effects.push(effect);
    return effect;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // AUDIO OPERATIONS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Cria projeto de áudio básico
   */
  createAudioProject(
    name: string,
    sampleRate: number = 48000,
    tempo: number = 120
  ): AudioProjectBasic {
    return {
      id: this.generateId(),
      name,
      sampleRate,
      bitDepth: 24,
      tempo,
      tracks: [
        this.createAudioTrack('Audio 1', 'audio'),
        this.createAudioTrack('Audio 2', 'audio'),
      ],
    };
  }
  
  createAudioTrack(name: string, type: AudioTrack['type']): AudioTrack {
    return {
      id: this.generateId(),
      name,
      type,
      clips: [],
      volume: 1,
      pan: 0,
      mute: false,
      solo: false,
      effects: [],
    };
  }
  
  addAudioEffect(track: AudioTrack, type: AudioEffect['type'], parameters: Record<string, number> = {}): AudioEffect {
    const defaultParams = this.getDefaultAudioEffectParams(type);
    const effect: AudioEffect = {
      id: this.generateId(),
      type,
      parameters: { ...defaultParams, ...parameters },
      enabled: true,
      mix: 1,
    };
    track.effects.push(effect);
    return effect;
  }
  
  private getDefaultAudioEffectParams(type: AudioEffect['type']): Record<string, number> {
    switch (type) {
      case 'eq':
        return { lowGain: 0, midGain: 0, highGain: 0 };
      case 'compressor':
        return { threshold: -20, ratio: 4, attack: 10, release: 100 };
      case 'reverb':
        return { decay: 2, mix: 0.3, preDelay: 20 };
      case 'delay':
        return { time: 250, feedback: 0.3, mix: 0.25 };
      case 'chorus':
        return { rate: 1, depth: 0.5, mix: 0.3 };
      case 'limiter':
        return { ceiling: -0.1, release: 50 };
      case 'filter':
        return { frequency: 1000, resonance: 0.5 };
      default:
        return {};
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
  
  private extractFilename(path: string): string {
    return path.split(/[\\/]/).pop() || 'Untitled';
  }
  
  /**
   * Calcula duração em formato legível
   */
  formatDuration(frames: number, frameRate: number): string {
    const totalSeconds = frames / frameRate;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const remainingFrames = frames % frameRate;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${remainingFrames.toString().padStart(2, '0')}`;
  }
  
  /**
   * Converte dB para linear
   */
  dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }
  
  /**
   * Converte linear para dB
   */
  linearToDb(linear: number): number {
    return 20 * Math.log10(Math.max(linear, 0.0001));
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════

let toolkitInstance: MediaToolkit | null = null;

export function getMediaToolkit(): MediaToolkit {
  if (!toolkitInstance) {
    toolkitInstance = new MediaToolkit();
  }
  return toolkitInstance;
}

export default MediaToolkit;
