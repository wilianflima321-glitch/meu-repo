// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
import { PHONEME_TO_VISEME, VISEME_BLEND_WEIGHTS } from './facial-animation-mappings';
import type { VisemeBlendWeights } from './facial-animation-mappings';
import { Viseme } from './facial-animation-contracts';
import type { LipSyncData } from './facial-animation-contracts';

export class LipSyncEngine {
  private currentViseme: Viseme = Viseme.Silence;
  private targetViseme: Viseme = Viseme.Silence;
  private blendProgress: number = 0;
  private blendSpeed: number = 15;

  private lipSyncData: LipSyncData | null = null;
  private playbackTime: number = 0;
  private isPlaying: boolean = false;

  private currentWeights: VisemeBlendWeights = { ...VISEME_BLEND_WEIGHTS[Viseme.Silence] };

  update(deltaTime: number): VisemeBlendWeights {
    if (this.isPlaying && this.lipSyncData) {
      this.playbackTime += deltaTime;

      // Find current viseme
      let currentFrame = this.lipSyncData.visemes[0];
      for (const frame of this.lipSyncData.visemes) {
        if (frame.time <= this.playbackTime) {
          currentFrame = frame;
        } else {
          break;
        }
      }

      if (currentFrame.viseme !== this.targetViseme) {
        this.currentViseme = this.targetViseme;
        this.targetViseme = currentFrame.viseme;
        this.blendProgress = 0;
      }

      if (this.playbackTime >= this.lipSyncData.duration) {
        this.stop();
      }
    }

    // Blend between visemes
    this.blendProgress = Math.min(1, this.blendProgress + deltaTime * this.blendSpeed);

    const fromWeights = VISEME_BLEND_WEIGHTS[this.currentViseme];
    const toWeights = VISEME_BLEND_WEIGHTS[this.targetViseme];

    // Smooth interpolation
    const t = this.smoothstep(this.blendProgress);

    this.currentWeights = {
      jawOpen: fromWeights.jawOpen + (toWeights.jawOpen - fromWeights.jawOpen) * t,
      mouthWide: fromWeights.mouthWide + (toWeights.mouthWide - fromWeights.mouthWide) * t,
      mouthNarrow: fromWeights.mouthNarrow + (toWeights.mouthNarrow - fromWeights.mouthNarrow) * t,
      lipsPucker: fromWeights.lipsPucker + (toWeights.lipsPucker - fromWeights.lipsPucker) * t,
      lipsOpen: fromWeights.lipsOpen + (toWeights.lipsOpen - fromWeights.lipsOpen) * t,
      tongueOut: fromWeights.tongueOut + (toWeights.tongueOut - fromWeights.tongueOut) * t,
    };

    return this.currentWeights;
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  play(data: LipSyncData): void {
    this.lipSyncData = data;
    this.playbackTime = 0;
    this.isPlaying = true;
    this.currentViseme = Viseme.Silence;
    this.targetViseme = Viseme.Silence;
  }

  stop(): void {
    this.isPlaying = false;
    this.targetViseme = Viseme.Silence;
    this.lipSyncData = null;
  }

  setViseme(viseme: Viseme): void {
    if (viseme !== this.targetViseme) {
      this.currentViseme = this.targetViseme;
      this.targetViseme = viseme;
      this.blendProgress = 0;
    }
  }

  // Generate lip sync from text (simplified - real would use TTS/STT)
  generateFromText(text: string, duration: number): LipSyncData {
    const words = text.toLowerCase().split(/\s+/);
    const visemes: { time: number; viseme: Viseme; intensity: number }[] = [];

    const timePerChar = duration / text.replace(/\s/g, '').length;
    let currentTime = 0;

    // Add initial silence
    visemes.push({ time: 0, viseme: Viseme.Silence, intensity: 1 });
    currentTime = 0.1;

    for (const word of words) {
      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        let viseme = this.charToViseme(char);

        // Look ahead for digraphs
        if (i < word.length - 1) {
          const digraph = word.substring(i, i + 2);
          const digraphViseme = PHONEME_TO_VISEME[digraph];
          if (digraphViseme) {
            viseme = digraphViseme;
            i++; // Skip next char
          }
        }

        visemes.push({ time: currentTime, viseme, intensity: 1 });
        currentTime += timePerChar;
      }

      // Small pause between words
      currentTime += timePerChar * 0.5;
    }

    // End with silence
    visemes.push({ time: duration - 0.1, viseme: Viseme.Silence, intensity: 1 });

    return { visemes, duration };
  }

  private charToViseme(char: string): Viseme {
    const mappings: Record<string, Viseme> = {
      'a': Viseme.AA, 'e': Viseme.E, 'i': Viseme.I, 'o': Viseme.O, 'u': Viseme.U,
      'b': Viseme.PP, 'p': Viseme.PP, 'm': Viseme.PP,
      'f': Viseme.FF, 'v': Viseme.FF,
      't': Viseme.DD, 'd': Viseme.DD, 'n': Viseme.NN, 'l': Viseme.NN,
      's': Viseme.SS, 'z': Viseme.SS,
      'k': Viseme.KK, 'g': Viseme.KK,
      'r': Viseme.RR,
      'w': Viseme.U, 'y': Viseme.I,
      'j': Viseme.CH, 'c': Viseme.SS, 'h': Viseme.AA,
      'q': Viseme.KK, 'x': Viseme.SS,
    };

    return mappings[char] || Viseme.AA;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentWeights(): VisemeBlendWeights {
    return { ...this.currentWeights };
  }
}

// ============================================================================
// MICRO EXPRESSION GENERATOR
// ============================================================================

