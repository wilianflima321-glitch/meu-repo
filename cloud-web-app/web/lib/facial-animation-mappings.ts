import { ActionUnit, Viseme } from './facial-animation-contracts'
import type { EmotionState } from './facial-animation-contracts'

// ============================================================================
// PHONEME TO VISEME MAPPING
// ============================================================================

export const PHONEME_TO_VISEME: Record<string, Viseme> = {
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

export const EMOTION_TO_FACS: Record<keyof EmotionState, { au: ActionUnit; intensity: number }[]> = {
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

export interface VisemeBlendWeights {
  jawOpen: number;
  mouthWide: number;
  mouthNarrow: number;
  lipsPucker: number;
  lipsOpen: number;
  tongueOut: number;
}

export const VISEME_BLEND_WEIGHTS: Record<Viseme, VisemeBlendWeights> = {
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
