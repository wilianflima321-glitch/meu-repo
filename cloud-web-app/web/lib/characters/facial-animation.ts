/**
 * facial-animation.ts
 *
 * Blendshape-based facial animation engine.
 * Generates procedural expressions tied dynamically to narrative tone,
 * emotional state, and dialogue events.
 *
 * Supports FACS (Facial Action Coding System) blendshapes,
 * ARKit 52 blendshape targets, and custom morph targets.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Blendshape Catalog (ARKit 52 subset + custom)
// ─────────────────────────────────────────────────────────────────────────────

export type BlendshapeKey =
  | 'browDownLeft' | 'browDownRight' | 'browInnerUp'
  | 'browOuterUpLeft' | 'browOuterUpRight'
  | 'cheekPuff' | 'cheekSquintLeft' | 'cheekSquintRight'
  | 'eyeBlinkLeft' | 'eyeBlinkRight'
  | 'eyeLookDownLeft' | 'eyeLookDownRight'
  | 'eyeLookInLeft' | 'eyeLookInRight'
  | 'eyeLookOutLeft' | 'eyeLookOutRight'
  | 'eyeLookUpLeft' | 'eyeLookUpRight'
  | 'eyeSquintLeft' | 'eyeSquintRight'
  | 'eyeWideLeft' | 'eyeWideRight'
  | 'jawForward' | 'jawLeft' | 'jawOpen' | 'jawRight'
  | 'mouthClose'
  | 'mouthDimpleLeft' | 'mouthDimpleRight'
  | 'mouthFrownLeft' | 'mouthFrownRight'
  | 'mouthFunnel' | 'mouthLeft' | 'mouthRight'
  | 'mouthLowerDownLeft' | 'mouthLowerDownRight'
  | 'mouthPressLeft' | 'mouthPressRight'
  | 'mouthPucker' | 'mouthRollLower' | 'mouthRollUpper'
  | 'mouthShrugLower' | 'mouthShrugUpper'
  | 'mouthSmileLeft' | 'mouthSmileRight'
  | 'mouthStretchLeft' | 'mouthStretchRight'
  | 'mouthUpperUpLeft' | 'mouthUpperUpRight'
  | 'noseSneerLeft' | 'noseSneerRight'
  | 'tongueOut';

export type BlendshapeWeights = Partial<Record<BlendshapeKey, number>>;

// ─────────────────────────────────────────────────────────────────────────────
// Emotion → Blendshape Presets
// ─────────────────────────────────────────────────────────────────────────────

export type EmotionType =
  | 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised'
  | 'fearful' | 'disgusted' | 'contempt' | 'determined' | 'grieving';

const EMOTION_PRESETS: Record<EmotionType, BlendshapeWeights> = {
  neutral: {},

  happy: {
    mouthSmileLeft: 0.8, mouthSmileRight: 0.8,
    cheekSquintLeft: 0.6, cheekSquintRight: 0.6,
    eyeSquintLeft: 0.3, eyeSquintRight: 0.3,
  },

  sad: {
    browInnerUp: 0.7,
    mouthFrownLeft: 0.7, mouthFrownRight: 0.7,
    mouthLowerDownLeft: 0.4, mouthLowerDownRight: 0.4,
    eyeLookDownLeft: 0.5, eyeLookDownRight: 0.5,
  },

  angry: {
    browDownLeft: 0.9, browDownRight: 0.9,
    noseSneerLeft: 0.6, noseSneerRight: 0.6,
    mouthStretchLeft: 0.4, mouthStretchRight: 0.4,
    eyeSquintLeft: 0.5, eyeSquintRight: 0.5,
  },

  surprised: {
    eyeWideLeft: 0.9, eyeWideRight: 0.9,
    browOuterUpLeft: 0.8, browOuterUpRight: 0.8,
    browInnerUp: 0.7,
    jawOpen: 0.4,
    mouthOpen: 0.3,
  } as BlendshapeWeights,

  fearful: {
    eyeWideLeft: 0.7, eyeWideRight: 0.7,
    browInnerUp: 0.8,
    mouthStretchLeft: 0.3, mouthStretchRight: 0.3,
    jawOpen: 0.2,
  },

  disgusted: {
    noseSneerLeft: 0.8, noseSneerRight: 0.8,
    mouthShrugLower: 0.5,
    mouthPressLeft: 0.4, mouthPressRight: 0.4,
    eyeSquintLeft: 0.4, eyeSquintRight: 0.4,
  },

  contempt: {
    mouthSmileLeft: 0.4,
    browDownRight: 0.5,
    eyeSquintRight: 0.3,
  },

  determined: {
    browDownLeft: 0.4, browDownRight: 0.4,
    mouthPressLeft: 0.5, mouthPressRight: 0.5,
    eyeSquintLeft: 0.2, eyeSquintRight: 0.2,
  },

  grieving: {
    browInnerUp: 0.9,
    eyeBlinkLeft: 0.3, eyeBlinkRight: 0.3,
    mouthFrownLeft: 0.8, mouthFrownRight: 0.8,
    mouthLowerDownLeft: 0.6, mouthLowerDownRight: 0.6,
    cheekSquintLeft: 0.3, cheekSquintRight: 0.3,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Blendshape Interpolator
// ─────────────────────────────────────────────────────────────────────────────

function lerpWeights(from: BlendshapeWeights, to: BlendshapeWeights, t: number): BlendshapeWeights {
  const allKeys = new Set<BlendshapeKey>([
    ...Object.keys(from) as BlendshapeKey[],
    ...Object.keys(to) as BlendshapeKey[],
  ]);

  const result: BlendshapeWeights = {};
  for (const key of allKeys) {
    const a = from[key] ?? 0;
    const b = to[key] ?? 0;
    const val = a + (b - a) * t;
    if (val > 0.001) result[key] = val;
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Viseme System (for speech lip sync)
// ─────────────────────────────────────────────────────────────────────────────

export type Viseme =
  | 'sil' | 'PP' | 'FF' | 'TH' | 'DD' | 'kk' | 'CH' | 'SS' | 'nn' | 'RR'
  | 'aa' | 'E' | 'ih' | 'oh' | 'ou';

const VISEME_SHAPES: Record<Viseme, BlendshapeWeights> = {
  sil: {},
  PP: { mouthClose: 0.8, mouthPressLeft: 0.6, mouthPressRight: 0.6 },
  FF: { mouthLowerDownLeft: 0.3, mouthLowerDownRight: 0.3, mouthRollUpper: 0.4 },
  TH: { tongueOut: 0.3, jawOpen: 0.1 },
  DD: { jawOpen: 0.15 },
  kk: { jawOpen: 0.2, mouthShrugLower: 0.3 },
  CH: { mouthFunnel: 0.5, jawOpen: 0.25 },
  SS: { mouthDimpleLeft: 0.4, mouthDimpleRight: 0.4 },
  nn: { mouthClose: 0.4 },
  RR: { mouthFunnel: 0.3 },
  aa: { jawOpen: 0.7, mouthShrugLower: 0.4 },
  E: { jawOpen: 0.4, mouthSmileLeft: 0.3, mouthSmileRight: 0.3 },
  ih: { jawOpen: 0.3, mouthStretchLeft: 0.2, mouthStretchRight: 0.2 },
  oh: { jawOpen: 0.5, mouthFunnel: 0.6 },
  ou: { mouthPucker: 0.8, jawOpen: 0.2 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Blink Controller
// ─────────────────────────────────────────────────────────────────────────────

class BlinkController {
  private nextBlinkAt = 0;
  private blinkPhase: 'open' | 'closing' | 'opening' = 'open';
  private blinkProgress = 0;

  tick(nowMs: number, dt: number): BlendshapeWeights {
    if (this.blinkPhase === 'open' && nowMs >= this.nextBlinkAt) {
      this.blinkPhase = 'closing';
      this.blinkProgress = 0;
    }

    if (this.blinkPhase === 'closing') {
      this.blinkProgress += dt * 8; // close in ~125ms
      if (this.blinkProgress >= 1) {
        this.blinkProgress = 1;
        this.blinkPhase = 'opening';
      }
    } else if (this.blinkPhase === 'opening') {
      this.blinkProgress -= dt * 4; // open in ~250ms
      if (this.blinkProgress <= 0) {
        this.blinkProgress = 0;
        this.blinkPhase = 'open';
        // Next blink: 2–6 seconds
        this.nextBlinkAt = nowMs + 2000 + Math.random() * 4000;
      }
    }

    const w = this.blinkPhase === 'open' ? 0 : this.blinkProgress;
    return w > 0 ? { eyeBlinkLeft: w, eyeBlinkRight: w } : {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Facial Animation Controller
// ─────────────────────────────────────────────────────────────────────────────

export class FacialAnimationController {
  private currentEmotion: EmotionType = 'neutral';
  private targetEmotion: EmotionType = 'neutral';
  private emotionBlend = 1.0;
  private transitionSpeed = 2.0; // blend units per second

  private currentViseme: Viseme = 'sil';
  private visemeWeight = 0;
  private blink = new BlinkController();

  private microExpressionTimer = 0;
  private microExpression: BlendshapeWeights = {};

  setEmotion(emotion: EmotionType, blendSpeed = 2.0): void {
    if (emotion === this.currentEmotion) return;
    this.targetEmotion = emotion;
    this.emotionBlend = 0;
    this.transitionSpeed = blendSpeed;
  }

  setViseme(viseme: Viseme, weight = 1.0): void {
    this.currentViseme = viseme;
    this.visemeWeight = weight;
  }

  tick(dt: number, nowMs: number): BlendshapeWeights {
    // 1. Blend emotion transition
    if (this.emotionBlend < 1.0) {
      this.emotionBlend = Math.min(1.0, this.emotionBlend + dt * this.transitionSpeed);
      if (this.emotionBlend >= 1.0) this.currentEmotion = this.targetEmotion;
    }

    const fromWeights = EMOTION_PRESETS[this.currentEmotion];
    const toWeights = EMOTION_PRESETS[this.targetEmotion];
    let weights = lerpWeights(fromWeights, toWeights, this.emotionBlend);

    // 2. Layer viseme on top (speech)
    if (this.visemeWeight > 0.001) {
      const visemeW = VISEME_SHAPES[this.currentViseme];
      for (const [k, v] of Object.entries(visemeW) as [BlendshapeKey, number][]) {
        weights[k] = Math.max(weights[k] ?? 0, v * this.visemeWeight);
      }
    }

    // 3. Layer blink
    const blinkWeights = this.blink.tick(nowMs, dt);
    for (const [k, v] of Object.entries(blinkWeights) as [BlendshapeKey, number][]) {
      weights[k] = v;
    }

    // 4. Micro-expressions (randomized subtle movements)
    this.microExpressionTimer -= dt;
    if (this.microExpressionTimer <= 0) {
      this.microExpression = this.generateMicroExpression();
      this.microExpressionTimer = 2 + Math.random() * 4;
    }
    for (const [k, v] of Object.entries(this.microExpression) as [BlendshapeKey, number][]) {
      weights[k] = (weights[k] ?? 0) + v * 0.3;
    }

    return weights;
  }

  private generateMicroExpression(): BlendshapeWeights {
    const choices: BlendshapeWeights[] = [
      { browInnerUp: 0.2 },
      { mouthDimpleLeft: 0.3 },
      { cheekSquintLeft: 0.2, cheekSquintRight: 0.2 },
      { noseSneerLeft: 0.15 },
      {},
    ];
    return choices[Math.floor(Math.random() * choices.length)]!;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Narrative → Emotion Mapper
// ─────────────────────────────────────────────────────────────────────────────

export function narrativeToneToEmotion(tone: string): EmotionType {
  if (/betrayal|shock/i.test(tone)) return 'surprised';
  if (/sacrifice|grief|loss/i.test(tone)) return 'grieving';
  if (/corruption|evil|threat/i.test(tone)) return 'fearful';
  if (/redemption|hope|victory/i.test(tone)) return 'happy';
  if (/anger|rage|revenge/i.test(tone)) return 'angry';
  if (/discovery|wonder/i.test(tone)) return 'surprised';
  if (/determination|resolve/i.test(tone)) return 'determined';
  return 'neutral';
}
