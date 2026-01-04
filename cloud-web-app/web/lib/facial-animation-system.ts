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

// ============================================================================
// TYPES
// ============================================================================

export interface FacialConfig {
  useFACS: boolean;
  useBlendShapes: boolean;
  useBones: boolean;
  enableLipSync: boolean;
  enableEyeTracking: boolean;
  enableMicroExpressions: boolean;
  enableWrinkles: boolean;
}

// FACS Action Units
export enum ActionUnit {
  // Upper Face
  AU1 = 'InnerBrowRaiser',
  AU2 = 'OuterBrowRaiser',
  AU4 = 'BrowLowerer',
  AU5 = 'UpperLidRaiser',
  AU6 = 'CheekRaiser',
  AU7 = 'LidTightener',
  AU43 = 'EyesClosed',
  AU45 = 'Blink',
  AU46 = 'Wink',
  
  // Lower Face
  AU9 = 'NoseWrinkler',
  AU10 = 'UpperLipRaiser',
  AU11 = 'NasolabialDeepener',
  AU12 = 'LipCornerPuller',
  AU13 = 'CheekPuffer',
  AU14 = 'Dimpler',
  AU15 = 'LipCornerDepressor',
  AU16 = 'LowerLipDepressor',
  AU17 = 'ChinRaiser',
  AU18 = 'LipPucker',
  AU20 = 'LipStretcher',
  AU22 = 'LipFunneler',
  AU23 = 'LipTightener',
  AU24 = 'LipPressor',
  AU25 = 'LipsPart',
  AU26 = 'JawDrop',
  AU27 = 'MouthStretch',
  AU28 = 'LipSuck',
  
  // Head Position
  AU51 = 'HeadTurnLeft',
  AU52 = 'HeadTurnRight',
  AU53 = 'HeadUp',
  AU54 = 'HeadDown',
  AU55 = 'HeadTiltLeft',
  AU56 = 'HeadTiltRight',
  AU57 = 'HeadForward',
  AU58 = 'HeadBack',
  
  // Eye Position
  AU61 = 'EyesLookLeft',
  AU62 = 'EyesLookRight',
  AU63 = 'EyesLookUp',
  AU64 = 'EyesLookDown',
}

// Visemes for lip sync
export enum Viseme {
  Silence = 'sil',      // Silence/rest
  PP = 'PP',            // p, b, m
  FF = 'FF',            // f, v
  TH = 'TH',            // th
  DD = 'DD',            // t, d, n, l
  KK = 'kk',            // k, g, ng
  CH = 'CH',            // ch, j, sh
  SS = 'SS',            // s, z
  NN = 'nn',            // n, l
  RR = 'RR',            // r
  AA = 'aa',            // a (as in "father")
  E = 'E',              // e (as in "bed")
  I = 'I',              // i (as in "see")
  O = 'O',              // o (as in "go")
  U = 'U',              // u (as in "you")
}

export interface FACSPose {
  actionUnits: Map<ActionUnit, number>; // AU -> intensity (0-1)
}

export interface BlendShapeData {
  name: string;
  vertices: THREE.Vector3[];
  normals?: THREE.Vector3[];
}

export interface FacialBone {
  name: string;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
}

export interface EmotionState {
  happiness: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  disgust: number;
  contempt: number;
}

export interface LipSyncData {
  visemes: { time: number; viseme: Viseme; intensity: number }[];
  duration: number;
}

export interface EyeTrackingState {
  leftEyeTarget: THREE.Vector3;
  rightEyeTarget: THREE.Vector3;
  leftEyeOpenness: number;
  rightEyeOpenness: number;
  blinkProgress: number;
}

// ============================================================================
// PHONEME TO VISEME MAPPING
// ============================================================================

const PHONEME_TO_VISEME: Record<string, Viseme> = {
  // Bilabial
  'p': Viseme.PP, 'b': Viseme.PP, 'm': Viseme.PP,
  // Labiodental
  'f': Viseme.FF, 'v': Viseme.FF,
  // Dental
  'th': Viseme.TH, 'dh': Viseme.TH,
  // Alveolar
  't': Viseme.DD, 'd': Viseme.DD, 'n': Viseme.NN, 'l': Viseme.NN,
  's': Viseme.SS, 'z': Viseme.SS,
  // Post-alveolar
  'sh': Viseme.CH, 'zh': Viseme.CH, 'ch': Viseme.CH, 'jh': Viseme.CH,
  // Velar
  'k': Viseme.KK, 'g': Viseme.KK, 'ng': Viseme.KK,
  // Approximants
  'r': Viseme.RR, 'w': Viseme.U, 'y': Viseme.I,
  // Vowels
  'aa': Viseme.AA, 'ae': Viseme.AA, 'ah': Viseme.AA,
  'ao': Viseme.O, 'aw': Viseme.O, 'ax': Viseme.AA,
  'ay': Viseme.AA, 'eh': Viseme.E, 'er': Viseme.E,
  'ey': Viseme.E, 'ih': Viseme.I, 'ix': Viseme.I,
  'iy': Viseme.I, 'ow': Viseme.O, 'oy': Viseme.O,
  'uh': Viseme.U, 'uw': Viseme.U,
  // Silence
  'sil': Viseme.Silence, 'sp': Viseme.Silence,
};

// ============================================================================
// EMOTION TO FACS MAPPING
// ============================================================================

const EMOTION_TO_FACS: Record<keyof EmotionState, { au: ActionUnit; intensity: number }[]> = {
  happiness: [
    { au: ActionUnit.AU6, intensity: 1.0 },  // Cheek raiser
    { au: ActionUnit.AU12, intensity: 1.0 }, // Lip corner puller (smile)
    { au: ActionUnit.AU25, intensity: 0.3 }, // Lips part
  ],
  sadness: [
    { au: ActionUnit.AU1, intensity: 1.0 },  // Inner brow raiser
    { au: ActionUnit.AU4, intensity: 0.5 },  // Brow lowerer
    { au: ActionUnit.AU15, intensity: 1.0 }, // Lip corner depressor
    { au: ActionUnit.AU17, intensity: 0.5 }, // Chin raiser
  ],
  anger: [
    { au: ActionUnit.AU4, intensity: 1.0 },  // Brow lowerer
    { au: ActionUnit.AU5, intensity: 0.5 },  // Upper lid raiser
    { au: ActionUnit.AU7, intensity: 1.0 },  // Lid tightener
    { au: ActionUnit.AU23, intensity: 1.0 }, // Lip tightener
    { au: ActionUnit.AU24, intensity: 0.8 }, // Lip pressor
  ],
  fear: [
    { au: ActionUnit.AU1, intensity: 1.0 },  // Inner brow raiser
    { au: ActionUnit.AU2, intensity: 1.0 },  // Outer brow raiser
    { au: ActionUnit.AU4, intensity: 0.5 },  // Brow lowerer
    { au: ActionUnit.AU5, intensity: 1.0 },  // Upper lid raiser
    { au: ActionUnit.AU20, intensity: 1.0 }, // Lip stretcher
    { au: ActionUnit.AU26, intensity: 0.5 }, // Jaw drop
  ],
  surprise: [
    { au: ActionUnit.AU1, intensity: 1.0 },  // Inner brow raiser
    { au: ActionUnit.AU2, intensity: 1.0 },  // Outer brow raiser
    { au: ActionUnit.AU5, intensity: 1.0 },  // Upper lid raiser
    { au: ActionUnit.AU26, intensity: 1.0 }, // Jaw drop
  ],
  disgust: [
    { au: ActionUnit.AU9, intensity: 1.0 },  // Nose wrinkler
    { au: ActionUnit.AU10, intensity: 1.0 }, // Upper lip raiser
    { au: ActionUnit.AU16, intensity: 0.5 }, // Lower lip depressor
    { au: ActionUnit.AU25, intensity: 0.3 }, // Lips part
  ],
  contempt: [
    { au: ActionUnit.AU12, intensity: 0.5 }, // Asymmetric lip corner puller
    { au: ActionUnit.AU14, intensity: 0.5 }, // Dimpler
  ],
};

// ============================================================================
// VISEME TO BLEND SHAPE MAPPING
// ============================================================================

interface VisemeBlendWeights {
  jawOpen: number;
  mouthWide: number;
  mouthNarrow: number;
  lipsPucker: number;
  lipsOpen: number;
  tongueOut: number;
}

const VISEME_BLEND_WEIGHTS: Record<Viseme, VisemeBlendWeights> = {
  [Viseme.Silence]: { jawOpen: 0, mouthWide: 0, mouthNarrow: 0, lipsPucker: 0, lipsOpen: 0, tongueOut: 0 },
  [Viseme.PP]: { jawOpen: 0, mouthWide: 0, mouthNarrow: 0.2, lipsPucker: 0.8, lipsOpen: 0, tongueOut: 0 },
  [Viseme.FF]: { jawOpen: 0.1, mouthWide: 0.1, mouthNarrow: 0, lipsPucker: 0, lipsOpen: 0.3, tongueOut: 0 },
  [Viseme.TH]: { jawOpen: 0.2, mouthWide: 0.3, mouthNarrow: 0, lipsPucker: 0, lipsOpen: 0.4, tongueOut: 0.6 },
  [Viseme.DD]: { jawOpen: 0.3, mouthWide: 0.2, mouthNarrow: 0, lipsPucker: 0, lipsOpen: 0.3, tongueOut: 0.3 },
  [Viseme.KK]: { jawOpen: 0.4, mouthWide: 0.2, mouthNarrow: 0, lipsPucker: 0, lipsOpen: 0.3, tongueOut: 0 },
  [Viseme.CH]: { jawOpen: 0.3, mouthWide: 0, mouthNarrow: 0.5, lipsPucker: 0.3, lipsOpen: 0.4, tongueOut: 0 },
  [Viseme.SS]: { jawOpen: 0.2, mouthWide: 0.4, mouthNarrow: 0, lipsPucker: 0, lipsOpen: 0.2, tongueOut: 0 },
  [Viseme.NN]: { jawOpen: 0.2, mouthWide: 0.2, mouthNarrow: 0, lipsPucker: 0, lipsOpen: 0.3, tongueOut: 0.2 },
  [Viseme.RR]: { jawOpen: 0.3, mouthWide: 0, mouthNarrow: 0.3, lipsPucker: 0.2, lipsOpen: 0.4, tongueOut: 0 },
  [Viseme.AA]: { jawOpen: 0.8, mouthWide: 0.6, mouthNarrow: 0, lipsPucker: 0, lipsOpen: 0.8, tongueOut: 0 },
  [Viseme.E]: { jawOpen: 0.4, mouthWide: 0.7, mouthNarrow: 0, lipsPucker: 0, lipsOpen: 0.5, tongueOut: 0 },
  [Viseme.I]: { jawOpen: 0.2, mouthWide: 0.8, mouthNarrow: 0, lipsPucker: 0, lipsOpen: 0.3, tongueOut: 0 },
  [Viseme.O]: { jawOpen: 0.5, mouthWide: 0, mouthNarrow: 0.6, lipsPucker: 0.4, lipsOpen: 0.6, tongueOut: 0 },
  [Viseme.U]: { jawOpen: 0.3, mouthWide: 0, mouthNarrow: 0.8, lipsPucker: 0.7, lipsOpen: 0.4, tongueOut: 0 },
};

// ============================================================================
// BLINK CONTROLLER
// ============================================================================

export class BlinkController {
  private blinkInterval: number = 4; // Seconds between blinks
  private blinkDuration: number = 0.15;
  private blinkVariation: number = 2;
  
  private timeSinceLastBlink: number = 0;
  private nextBlinkTime: number;
  private isBlinking: boolean = false;
  private blinkProgress: number = 0;
  
  constructor() {
    this.nextBlinkTime = this.getNextBlinkTime();
  }
  
  private getNextBlinkTime(): number {
    return this.blinkInterval + (Math.random() - 0.5) * this.blinkVariation * 2;
  }
  
  update(deltaTime: number): { leftEye: number; rightEye: number } {
    this.timeSinceLastBlink += deltaTime;
    
    if (!this.isBlinking && this.timeSinceLastBlink >= this.nextBlinkTime) {
      this.isBlinking = true;
      this.blinkProgress = 0;
    }
    
    if (this.isBlinking) {
      this.blinkProgress += deltaTime / this.blinkDuration;
      
      if (this.blinkProgress >= 1) {
        this.isBlinking = false;
        this.timeSinceLastBlink = 0;
        this.nextBlinkTime = this.getNextBlinkTime();
        this.blinkProgress = 0;
      }
    }
    
    // Blink curve: quick close, slower open
    let blinkWeight = 0;
    if (this.isBlinking) {
      const t = this.blinkProgress;
      if (t < 0.3) {
        // Close phase (fast)
        blinkWeight = t / 0.3;
      } else {
        // Open phase (slower)
        blinkWeight = 1 - (t - 0.3) / 0.7;
      }
    }
    
    return {
      leftEye: 1 - blinkWeight,
      rightEye: 1 - blinkWeight,
    };
  }
  
  triggerBlink(): void {
    if (!this.isBlinking) {
      this.isBlinking = true;
      this.blinkProgress = 0;
    }
  }
  
  setBlinkRate(blinksPerMinute: number): void {
    this.blinkInterval = 60 / blinksPerMinute;
  }
}

// ============================================================================
// EYE TRACKING
// ============================================================================

export class EyeTracker {
  private leftEyeBone: string = 'LeftEye';
  private rightEyeBone: string = 'RightEye';
  private headBone: string = 'Head';
  
  private currentTarget: THREE.Vector3 = new THREE.Vector3(0, 1.6, 10);
  private targetVelocity: THREE.Vector3 = new THREE.Vector3();
  
  private saccadeInterval: number = 0.2;
  private saccadeTime: number = 0;
  private saccadeOffset: THREE.Vector2 = new THREE.Vector2();
  
  private maxYaw: number = 30 * Math.PI / 180; // Max horizontal rotation
  private maxPitch: number = 20 * Math.PI / 180; // Max vertical rotation
  
  update(
    deltaTime: number,
    headPosition: THREE.Vector3,
    headRotation: THREE.Quaternion,
    target: THREE.Vector3 | null
  ): { leftEye: THREE.Quaternion; rightEye: THREE.Quaternion } {
    // Update target with smoothing
    if (target) {
      this.currentTarget.lerp(target, Math.min(1, deltaTime * 5));
    }
    
    // Micro-saccades
    this.saccadeTime += deltaTime;
    if (this.saccadeTime >= this.saccadeInterval) {
      this.saccadeTime = 0;
      this.saccadeOffset.set(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      );
    }
    
    // Calculate look direction
    const lookDirection = this.currentTarget.clone().sub(headPosition).normalize();
    
    // Transform to head space
    const headInverse = headRotation.clone().invert();
    lookDirection.applyQuaternion(headInverse);
    
    // Add saccade
    lookDirection.x += this.saccadeOffset.x;
    lookDirection.y += this.saccadeOffset.y;
    
    // Calculate angles
    const yaw = Math.atan2(lookDirection.x, lookDirection.z);
    const pitch = Math.asin(Math.max(-1, Math.min(1, lookDirection.y)));
    
    // Clamp to limits
    const clampedYaw = Math.max(-this.maxYaw, Math.min(this.maxYaw, yaw));
    const clampedPitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, pitch));
    
    // Create rotations
    const eyeRotation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(clampedPitch, clampedYaw, 0, 'YXZ')
    );
    
    // Slight convergence for close targets
    const distance = this.currentTarget.distanceTo(headPosition);
    const convergence = Math.max(0, 0.05 * (1 - distance / 2));
    
    const leftEyeRotation = eyeRotation.clone().multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), convergence)
    );
    
    const rightEyeRotation = eyeRotation.clone().multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -convergence)
    );
    
    return {
      leftEye: leftEyeRotation,
      rightEye: rightEyeRotation,
    };
  }
  
  setTarget(target: THREE.Vector3): void {
    this.currentTarget.copy(target);
  }
  
  setLimits(maxYaw: number, maxPitch: number): void {
    this.maxYaw = maxYaw;
    this.maxPitch = maxPitch;
  }
}

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

export interface WrinkleMapConfig {
  foreheadWrinkle: THREE.Texture | null;
  browWrinkle: THREE.Texture | null;
  noseWrinkle: THREE.Texture | null;
  smileWrinkle: THREE.Texture | null;
  frownWrinkle: THREE.Texture | null;
}

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
