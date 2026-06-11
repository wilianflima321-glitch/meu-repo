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
import { EMOTION_TO_FACS } from './facial-animation-mappings';
import type { VisemeBlendWeights } from './facial-animation-mappings';
import { LipSyncEngine } from './facial-animation-lip-sync';
import { MicroExpressionGenerator } from './facial-animation-micro-expressions';
import { ActionUnit, Viseme } from './facial-animation-contracts';
import type { BlendShapeData, EmotionState, EyeTrackingState, FacialBone, FacialConfig, FACSPose, LipSyncData, WrinkleMapConfig } from './facial-animation-contracts';
export { ActionUnit, Viseme } from './facial-animation-contracts';
export { BlinkController, EyeTracker } from './facial-animation-controllers';
export { LipSyncEngine } from './facial-animation-lip-sync';
export { MicroExpressionGenerator } from './facial-animation-micro-expressions';
export type { BlendShapeData, EmotionState, EyeTrackingState, FacialBone, FacialConfig, FACSPose, LipSyncData, WrinkleMapConfig } from './facial-animation-contracts';

// ============================================================================
// LIP SYNC ENGINE
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
