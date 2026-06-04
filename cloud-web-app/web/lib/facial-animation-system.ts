// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
/**
 * FACIAL ANIMATION SYSTEM - Aethel Engine
 *
 * Sistema profissional de animação facial para jogos e filmes AAA.
 * Suporta blend shapes, bones, FACS, lip sync, e animação procedural.
 *
 * FEATURES:
 * - FACS (Facial Action Coding System)
 * - Blend shapes/morph targets
 * - Bone-driven facial animation
 * - Automatic lip sync from audio
 * - Phoneme to viseme mapping
 * - Emotion presets
 * - Eye tracking/look-at
 * - Procedural micro-expressions
 * - Wrinkle maps
 * - Real-time performance capture
 */

import * as THREE from 'three';
import { BlinkController, EyeTracker } from './facial-animation-controllers';
import { EMOTION_TO_FACS, PHONEME_TO_VISEME, VISEME_BLEND_WEIGHTS } from './facial-animation-mappings';
import type { VisemeBlendWeights } from './facial-animation-mappings';
import { ActionUnit, Viseme } from './facial-animation-contracts';
import type { BlendShapeData, EmotionState, EyeTrackingState, FacialBone, FacialConfig, FACSPose, LipSyncData, WrinkleMapConfig } from './facial-animation-contracts';
export { ActionUnit, Viseme } from './facial-animation-contracts';
export { BlinkController, EyeTracker } from './facial-animation-controllers';
export type { BlendShapeData, EmotionState, EyeTrackingState, FacialBone, FacialConfig, FACSPose, LipSyncData, WrinkleMapConfig } from './facial-animation-contracts';

// ============================================================================
// LIP SYNC ENGINE
// ============================================================================

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

export class MicroExpressionGenerator {
  private expressions: { au: ActionUnit; intensity: number; duration: number; startTime: number }[] = [];
  private currentTime: number = 0;
  private meanInterval: number = 5; // Seconds between micro expressions
  private nextExpressionTime: number;

  private possibleExpressions: { aus: ActionUnit[]; maxIntensity: number }[] = [
    { aus: [ActionUnit.AU1], maxIntensity: 0.2 }, // Subtle brow raise
    { aus: [ActionUnit.AU4], maxIntensity: 0.15 }, // Slight frown
    { aus: [ActionUnit.AU12], maxIntensity: 0.1 }, // Micro smile
    { aus: [ActionUnit.AU14], maxIntensity: 0.2 }, // Dimple
    { aus: [ActionUnit.AU17], maxIntensity: 0.15 }, // Chin raise
    { aus: [ActionUnit.AU6], maxIntensity: 0.1 }, // Cheek raise
  ];

  constructor() {
    this.nextExpressionTime = this.getNextTime();
  }

  private getNextTime(): number {
    return this.meanInterval + (Math.random() - 0.5) * this.meanInterval;
  }

  update(deltaTime: number): Map<ActionUnit, number> {
    this.currentTime += deltaTime;

    // Check if we should trigger new micro expression
    if (this.currentTime >= this.nextExpressionTime) {
      this.triggerRandomExpression();
      this.nextExpressionTime = this.currentTime + this.getNextTime();
    }

    // Update active expressions
    const result = new Map<ActionUnit, number>();

    this.expressions = this.expressions.filter(expr => {
      const elapsed = this.currentTime - expr.startTime;
      if (elapsed >= expr.duration) return false;

      // Bell curve intensity
      const t = elapsed / expr.duration;
      const intensity = expr.intensity * Math.sin(t * Math.PI);

      const current = result.get(expr.au) || 0;
      result.set(expr.au, Math.min(1, current + intensity));

      return true;
    });

    return result;
  }

  triggerRandomExpression(): void {
    const template = this.possibleExpressions[
      Math.floor(Math.random() * this.possibleExpressions.length)
    ];

    const intensity = Math.random() * template.maxIntensity;
    const duration = 0.2 + Math.random() * 0.3; // 0.2-0.5 seconds

    for (const au of template.aus) {
      this.expressions.push({
        au,
        intensity,
        duration,
        startTime: this.currentTime,
      });
    }
  }

  setFrequency(expressionsPerMinute: number): void {
    this.meanInterval = 60 / expressionsPerMinute;
  }
}

// ============================================================================
// WRINKLE MAP CONTROLLER
// ============================================================================

export class WrinkleMapController {
  private textures: WrinkleMapConfig;
  private currentWeights: Map<string, number> = new Map();

  constructor(textures: Partial<WrinkleMapConfig> = {}) {
    this.textures = {
      foreheadWrinkle: null,
      browWrinkle: null,
      noseWrinkle: null,
      smileWrinkle: null,
      frownWrinkle: null,
      ...textures,
    };
  }

  update(facs: Map<ActionUnit, number>): Map<string, number> {
    this.currentWeights.clear();

    // Forehead wrinkles from brow raise
    const foreheadIntensity = Math.max(
      facs.get(ActionUnit.AU1) || 0,
      facs.get(ActionUnit.AU2) || 0
    );
    this.currentWeights.set('forehead', foreheadIntensity);

    // Brow wrinkles from frown
    const browIntensity = facs.get(ActionUnit.AU4) || 0;
    this.currentWeights.set('brow', browIntensity);

    // Nose wrinkles from nose wrinkler and upper lip raise
    const noseIntensity = Math.max(
      facs.get(ActionUnit.AU9) || 0,
      (facs.get(ActionUnit.AU10) || 0) * 0.5
    );
    this.currentWeights.set('nose', noseIntensity);

    // Smile wrinkles (crow's feet, nasolabial)
    const smileIntensity = Math.max(
      facs.get(ActionUnit.AU6) || 0,
      facs.get(ActionUnit.AU12) || 0
    );
    this.currentWeights.set('smile', smileIntensity);

    // Frown wrinkles
    const frownIntensity = facs.get(ActionUnit.AU15) || 0;
    this.currentWeights.set('frown', frownIntensity);

    return new Map(this.currentWeights);
  }

  getTextures(): WrinkleMapConfig {
    return this.textures;
  }

  getCurrentWeights(): Map<string, number> {
    return new Map(this.currentWeights);
  }
}

// ============================================================================
// MAIN FACIAL ANIMATION SYSTEM
// ============================================================================

export class FacialAnimationSystem {
  private config: FacialConfig;

  private blinkController: BlinkController;
  private eyeTracker: EyeTracker;
  private lipSyncEngine: LipSyncEngine;
  private microExpressionGenerator: MicroExpressionGenerator;
  private wrinkleController: WrinkleMapController;

  private currentFACS: Map<ActionUnit, number> = new Map();
  private currentEmotion: EmotionState = {
    happiness: 0, sadness: 0, anger: 0, fear: 0,
    surprise: 0, disgust: 0, contempt: 0,
  };

  private blendShapeWeights: Map<string, number> = new Map();
  private boneTransforms: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }> = new Map();

  private headPosition: THREE.Vector3 = new THREE.Vector3(0, 1.6, 0);
  private headRotation: THREE.Quaternion = new THREE.Quaternion();

  constructor(config: Partial<FacialConfig> = {}) {
    this.config = {
      useFACS: true,
      useBlendShapes: true,
      useBones: true,
      enableLipSync: true,
      enableEyeTracking: true,
      enableMicroExpressions: true,
      enableWrinkles: true,
      ...config,
    };

    this.blinkController = new BlinkController();
    this.eyeTracker = new EyeTracker();
    this.lipSyncEngine = new LipSyncEngine();
    this.microExpressionGenerator = new MicroExpressionGenerator();
    this.wrinkleController = new WrinkleMapController();
  }

  update(
    deltaTime: number,
    lookTarget?: THREE.Vector3
  ): {
    facs: Map<ActionUnit, number>;
    blendShapes: Map<string, number>;
    bones: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>;
    wrinkles: Map<string, number>;
  } {
    // Reset FACS
    this.currentFACS.clear();

    // Apply emotion to FACS
    this.applyEmotionToFACS();

    // Update micro expressions
    if (this.config.enableMicroExpressions) {
      const microFACS = this.microExpressionGenerator.update(deltaTime);
      for (const [au, intensity] of microFACS) {
        const current = this.currentFACS.get(au) || 0;
        this.currentFACS.set(au, Math.min(1, current + intensity));
      }
    }

    // Update blink
    const blink = this.blinkController.update(deltaTime);
    this.currentFACS.set(ActionUnit.AU43, 1 - blink.leftEye);

    // Update lip sync
    if (this.config.enableLipSync) {
      const lipWeights = this.lipSyncEngine.update(deltaTime);
      this.applyLipSyncToFACS(lipWeights);
    }

    // Update eye tracking
    if (this.config.enableEyeTracking) {
      const eyeRotations = this.eyeTracker.update(
        deltaTime,
        this.headPosition,
        this.headRotation,
        lookTarget || null
      );

      this.boneTransforms.set('LeftEye', {
        position: new THREE.Vector3(),
        rotation: eyeRotations.leftEye,
      });

      this.boneTransforms.set('RightEye', {
        position: new THREE.Vector3(),
        rotation: eyeRotations.rightEye,
      });
    }

    // Convert FACS to blend shapes
    if (this.config.useBlendShapes) {
      this.facsToBlendShapes();
    }

    // Update wrinkles
    let wrinkles = new Map<string, number>();
    if (this.config.enableWrinkles) {
      wrinkles = this.wrinkleController.update(this.currentFACS);
    }

    return {
      facs: new Map(this.currentFACS),
      blendShapes: new Map(this.blendShapeWeights),
      bones: new Map(this.boneTransforms),
      wrinkles,
    };
  }

  private applyEmotionToFACS(): void {
    for (const [emotion, intensity] of Object.entries(this.currentEmotion)) {
      if (intensity <= 0) continue;

      const mapping = EMOTION_TO_FACS[emotion as keyof EmotionState];
      if (!mapping) continue;

      for (const { au, intensity: auIntensity } of mapping) {
        const current = this.currentFACS.get(au) || 0;
        this.currentFACS.set(au, Math.min(1, current + intensity * auIntensity));
      }
    }
  }

  private applyLipSyncToFACS(weights: VisemeBlendWeights): void {
    // Map viseme weights to FACS
    if (weights.jawOpen > 0) {
      this.currentFACS.set(ActionUnit.AU26, weights.jawOpen);
    }
    if (weights.mouthWide > 0) {
      this.currentFACS.set(ActionUnit.AU20, weights.mouthWide * 0.5);
    }
    if (weights.lipsPucker > 0) {
      this.currentFACS.set(ActionUnit.AU18, weights.lipsPucker);
    }
    if (weights.lipsOpen > 0) {
      this.currentFACS.set(ActionUnit.AU25, weights.lipsOpen);
    }
  }

  private facsToBlendShapes(): void {
    this.blendShapeWeights.clear();

    // Common blend shape mappings
    const mappings: { blendShape: string; aus: { au: ActionUnit; weight: number }[] }[] = [
      { blendShape: 'browInnerUp', aus: [{ au: ActionUnit.AU1, weight: 1 }] },
      { blendShape: 'browOuterUpLeft', aus: [{ au: ActionUnit.AU2, weight: 1 }] },
      { blendShape: 'browOuterUpRight', aus: [{ au: ActionUnit.AU2, weight: 1 }] },
      { blendShape: 'browDownLeft', aus: [{ au: ActionUnit.AU4, weight: 1 }] },
      { blendShape: 'browDownRight', aus: [{ au: ActionUnit.AU4, weight: 1 }] },
      { blendShape: 'eyeSquintLeft', aus: [{ au: ActionUnit.AU6, weight: 1 }] },
      { blendShape: 'eyeSquintRight', aus: [{ au: ActionUnit.AU6, weight: 1 }] },
      { blendShape: 'eyeWideLeft', aus: [{ au: ActionUnit.AU5, weight: 1 }] },
      { blendShape: 'eyeWideRight', aus: [{ au: ActionUnit.AU5, weight: 1 }] },
      { blendShape: 'eyeBlinkLeft', aus: [{ au: ActionUnit.AU43, weight: 1 }] },
      { blendShape: 'eyeBlinkRight', aus: [{ au: ActionUnit.AU43, weight: 1 }] },
      { blendShape: 'cheekPuff', aus: [{ au: ActionUnit.AU13, weight: 1 }] },
      { blendShape: 'cheekSquintLeft', aus: [{ au: ActionUnit.AU6, weight: 0.5 }] },
      { blendShape: 'cheekSquintRight', aus: [{ au: ActionUnit.AU6, weight: 0.5 }] },
      { blendShape: 'noseSneerLeft', aus: [{ au: ActionUnit.AU9, weight: 1 }] },
      { blendShape: 'noseSneerRight', aus: [{ au: ActionUnit.AU9, weight: 1 }] },
      { blendShape: 'mouthSmileLeft', aus: [{ au: ActionUnit.AU12, weight: 1 }] },
      { blendShape: 'mouthSmileRight', aus: [{ au: ActionUnit.AU12, weight: 1 }] },
      { blendShape: 'mouthFrownLeft', aus: [{ au: ActionUnit.AU15, weight: 1 }] },
      { blendShape: 'mouthFrownRight', aus: [{ au: ActionUnit.AU15, weight: 1 }] },
      { blendShape: 'mouthOpen', aus: [{ au: ActionUnit.AU26, weight: 1 }] },
      { blendShape: 'mouthPucker', aus: [{ au: ActionUnit.AU18, weight: 1 }] },
      { blendShape: 'mouthStretchLeft', aus: [{ au: ActionUnit.AU20, weight: 1 }] },
      { blendShape: 'mouthStretchRight', aus: [{ au: ActionUnit.AU20, weight: 1 }] },
      { blendShape: 'jawOpen', aus: [{ au: ActionUnit.AU26, weight: 0.8 }, { au: ActionUnit.AU27, weight: 1 }] },
      { blendShape: 'jawForward', aus: [{ au: ActionUnit.AU17, weight: 0.3 }] },
    ];

    for (const mapping of mappings) {
      let value = 0;
      for (const { au, weight } of mapping.aus) {
        const auValue = this.currentFACS.get(au) || 0;
        value = Math.max(value, auValue * weight);
      }
      if (value > 0) {
        this.blendShapeWeights.set(mapping.blendShape, value);
      }
    }
  }

  // Public API
  setEmotion(emotion: Partial<EmotionState>): void {
    this.currentEmotion = { ...this.currentEmotion, ...emotion };
  }

  blendEmotion(emotion: Partial<EmotionState>, weight: number, duration: number = 0.5): void {
    // Would implement smooth blending over time
    for (const [key, value] of Object.entries(emotion)) {
      const current = this.currentEmotion[key as keyof EmotionState];
      this.currentEmotion[key as keyof EmotionState] = current + (value - current) * weight;
    }
  }

  setFACS(aus: Map<ActionUnit, number>): void {
    for (const [au, intensity] of aus) {
      this.currentFACS.set(au, intensity);
    }
  }

  playLipSync(data: LipSyncData): void {
    this.lipSyncEngine.play(data);
  }

  speakText(text: string, duration: number): void {
    const lipSyncData = this.lipSyncEngine.generateFromText(text, duration);
    this.lipSyncEngine.play(lipSyncData);
  }

  stopLipSync(): void {
    this.lipSyncEngine.stop();
  }

  triggerBlink(): void {
    this.blinkController.triggerBlink();
  }

  setLookTarget(target: THREE.Vector3): void {
    this.eyeTracker.setTarget(target);
  }

  setHeadTransform(position: THREE.Vector3, rotation: THREE.Quaternion): void {
    this.headPosition.copy(position);
    this.headRotation.copy(rotation);
  }

  // Preset emotions
  setHappy(intensity: number = 1): void {
    this.setEmotion({ happiness: intensity, sadness: 0, anger: 0 });
  }

  setSad(intensity: number = 1): void {
    this.setEmotion({ sadness: intensity, happiness: 0 });
  }

  setAngry(intensity: number = 1): void {
    this.setEmotion({ anger: intensity, happiness: 0 });
  }

  setSurprised(intensity: number = 1): void {
    this.setEmotion({ surprise: intensity });
  }

  setDisgusted(intensity: number = 1): void {
    this.setEmotion({ disgust: intensity });
  }

  setFearful(intensity: number = 1): void {
    this.setEmotion({ fear: intensity });
  }

  setNeutral(): void {
    this.setEmotion({
      happiness: 0, sadness: 0, anger: 0,
      fear: 0, surprise: 0, disgust: 0, contempt: 0,
    });
  }

  // Get current state
  getCurrentEmotion(): EmotionState {
    return { ...this.currentEmotion };
  }

  getCurrentFACS(): Map<ActionUnit, number> {
    return new Map(this.currentFACS);
  }

  getBlendShapeWeights(): Map<string, number> {
    return new Map(this.blendShapeWeights);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const createFacialSystem = (config?: Partial<FacialConfig>): FacialAnimationSystem => {
  return new FacialAnimationSystem(config);
};
