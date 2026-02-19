// Extracted static facial animation domain data to keep the editor component focused.

export interface BlendShapeValues {
  [key: string]: number
}

export interface Viseme {
  id: string
  label: string
  blendShapes: Partial<BlendShapeValues>
}

export interface LipSyncKeyframe {
  id: string
  time: number
  viseme: string
  intensity: number
}

export interface EmotionPreset {
  name: string
  icon: string
  blendShapes: Partial<BlendShapeValues>
}

export interface FACSActionUnit {
  au: string
  name: string
  description: string
  relatedBlendShapes: string[]
}

export interface BlendShapeCategory {
  name: string
  icon: string
  shapes: string[]
}

// ============================================================================
// ARKIT 52 BLEND SHAPES - ORGANIZED BY CATEGORY
// ============================================================================

export const BLEND_SHAPE_CATEGORIES: BlendShapeCategory[] = [
  {
    name: 'Eye',
    icon: '👁️',
    shapes: [
      'eyeBlinkLeft',
      'eyeBlinkRight',
      'eyeLookDownLeft',
      'eyeLookDownRight',
      'eyeLookInLeft',
      'eyeLookInRight',
      'eyeLookOutLeft',
      'eyeLookOutRight',
      'eyeLookUpLeft',
      'eyeLookUpRight',
      'eyeSquintLeft',
      'eyeSquintRight',
      'eyeWideLeft',
      'eyeWideRight',
    ],
  },
  {
    name: 'Mouth',
    icon: '👄',
    shapes: [
      'jawOpen',
      'jawForward',
      'jawLeft',
      'jawRight',
      'mouthClose',
      'mouthFunnel',
      'mouthPucker',
      'mouthLeft',
      'mouthRight',
      'mouthSmileLeft',
      'mouthSmileRight',
      'mouthFrownLeft',
      'mouthFrownRight',
      'mouthDimpleLeft',
      'mouthDimpleRight',
      'mouthStretchLeft',
      'mouthStretchRight',
      'mouthRollLower',
      'mouthRollUpper',
      'mouthShrugLower',
      'mouthShrugUpper',
      'mouthPressLeft',
      'mouthPressRight',
      'mouthLowerDownLeft',
      'mouthLowerDownRight',
      'mouthUpperUpLeft',
      'mouthUpperUpRight',
    ],
  },
  {
    name: 'Brow',
    icon: '🤨',
    shapes: [
      'browDownLeft',
      'browDownRight',
      'browInnerUp',
      'browOuterUpLeft',
      'browOuterUpRight',
    ],
  },
  {
    name: 'Cheek',
    icon: '😊',
    shapes: [
      'cheekPuff',
      'cheekSquintLeft',
      'cheekSquintRight',
    ],
  },
  {
    name: 'Nose',
    icon: '👃',
    shapes: [
      'noseSneerLeft',
      'noseSneerRight',
    ],
  },
  {
    name: 'Tongue',
    icon: '👅',
    shapes: [
      'tongueOut',
    ],
  },
]

// ============================================================================
// EMOTION PRESETS
// ============================================================================

export const EMOTION_PRESETS: EmotionPreset[] = [
  {
    name: 'Neutral',
    icon: '😐',
    blendShapes: {},
  },
  {
    name: 'Happy',
    icon: '😊',
    blendShapes: {
      mouthSmileLeft: 0.8,
      mouthSmileRight: 0.8,
      cheekSquintLeft: 0.5,
      cheekSquintRight: 0.5,
      eyeSquintLeft: 0.3,
      eyeSquintRight: 0.3,
      browInnerUp: 0.2,
    },
  },
  {
    name: 'Sad',
    icon: '😢',
    blendShapes: {
      mouthFrownLeft: 0.7,
      mouthFrownRight: 0.7,
      browDownLeft: 0.4,
      browDownRight: 0.4,
      browInnerUp: 0.6,
      eyeLookDownLeft: 0.3,
      eyeLookDownRight: 0.3,
    },
  },
  {
    name: 'Angry',
    icon: '😠',
    blendShapes: {
      browDownLeft: 0.8,
      browDownRight: 0.8,
      eyeSquintLeft: 0.5,
      eyeSquintRight: 0.5,
      noseSneerLeft: 0.4,
      noseSneerRight: 0.4,
      mouthFrownLeft: 0.3,
      mouthFrownRight: 0.3,
      jawForward: 0.2,
    },
  },
  {
    name: 'Surprised',
    icon: '😲',
    blendShapes: {
      eyeWideLeft: 0.9,
      eyeWideRight: 0.9,
      browInnerUp: 0.8,
      browOuterUpLeft: 0.7,
      browOuterUpRight: 0.7,
      jawOpen: 0.5,
      mouthFunnel: 0.3,
    },
  },
  {
    name: 'Disgusted',
    icon: '🤢',
    blendShapes: {
      noseSneerLeft: 0.8,
      noseSneerRight: 0.8,
      browDownLeft: 0.4,
      browDownRight: 0.4,
      mouthUpperUpLeft: 0.5,
      mouthUpperUpRight: 0.5,
      eyeSquintLeft: 0.3,
      eyeSquintRight: 0.3,
    },
  },
  {
    name: 'Fear',
    icon: '😨',
    blendShapes: {
      eyeWideLeft: 0.8,
      eyeWideRight: 0.8,
      browInnerUp: 0.9,
      browOuterUpLeft: 0.5,
      browOuterUpRight: 0.5,
      mouthStretchLeft: 0.4,
      mouthStretchRight: 0.4,
      jawOpen: 0.3,
    },
  },
]

// ============================================================================
// VISEMES FOR LIP SYNC
// ============================================================================

export const VISEMES: Viseme[] = [
  {
    id: 'sil',
    label: 'Silence',
    blendShapes: { mouthClose: 0.1 },
  },
  {
    id: 'aa',
    label: 'A',
    blendShapes: { jawOpen: 0.6, mouthFunnel: 0.2 },
  },
  {
    id: 'ee',
    label: 'E',
    blendShapes: { jawOpen: 0.3, mouthSmileLeft: 0.4, mouthSmileRight: 0.4 },
  },
  {
    id: 'ih',
    label: 'I',
    blendShapes: { jawOpen: 0.2, mouthSmileLeft: 0.5, mouthSmileRight: 0.5 },
  },
  {
    id: 'oh',
    label: 'O',
    blendShapes: { jawOpen: 0.5, mouthFunnel: 0.6, mouthPucker: 0.3 },
  },
  {
    id: 'ou',
    label: 'U',
    blendShapes: { jawOpen: 0.3, mouthPucker: 0.7, mouthFunnel: 0.4 },
  },
  {
    id: 'pp',
    label: 'P/B/M',
    blendShapes: { mouthClose: 0.9, mouthPressLeft: 0.5, mouthPressRight: 0.5 },
  },
  {
    id: 'ff',
    label: 'F/V',
    blendShapes: { mouthClose: 0.3, mouthRollLower: 0.6, mouthUpperUpLeft: 0.2, mouthUpperUpRight: 0.2 },
  },
  {
    id: 'th',
    label: 'TH',
    blendShapes: { jawOpen: 0.2, tongueOut: 0.4, mouthClose: 0.1 },
  },
  {
    id: 'dd',
    label: 'D/T/N',
    blendShapes: { jawOpen: 0.15, tongueOut: 0.1, mouthClose: 0.2 },
  },
  {
    id: 'kk',
    label: 'K/G',
    blendShapes: { jawOpen: 0.25, mouthFunnel: 0.1 },
  },
  {
    id: 'ch',
    label: 'CH/SH',
    blendShapes: { jawOpen: 0.2, mouthPucker: 0.4, mouthFunnel: 0.3 },
  },
  {
    id: 'ss',
    label: 'S/Z',
    blendShapes: { jawOpen: 0.1, mouthSmileLeft: 0.2, mouthSmileRight: 0.2 },
  },
  {
    id: 'rr',
    label: 'R',
    blendShapes: { jawOpen: 0.2, mouthPucker: 0.3, mouthFunnel: 0.2 },
  },
  {
    id: 'll',
    label: 'L',
    blendShapes: { jawOpen: 0.25, tongueOut: 0.2 },
  },
]

// ============================================================================
// FACS ACTION UNITS REFERENCE
// ============================================================================

export const FACS_ACTION_UNITS: FACSActionUnit[] = [
  { au: 'AU1', name: 'Inner Brow Raiser', description: 'Raises inner portion of eyebrows', relatedBlendShapes: ['browInnerUp'] },
  { au: 'AU2', name: 'Outer Brow Raiser', description: 'Raises outer portion of eyebrows', relatedBlendShapes: ['browOuterUpLeft', 'browOuterUpRight'] },
  { au: 'AU4', name: 'Brow Lowerer', description: 'Draws eyebrows down and together', relatedBlendShapes: ['browDownLeft', 'browDownRight'] },
  { au: 'AU5', name: 'Upper Lid Raiser', description: 'Opens eyes wide', relatedBlendShapes: ['eyeWideLeft', 'eyeWideRight'] },
  { au: 'AU6', name: 'Cheek Raiser', description: 'Raises cheeks, causes crow\'s feet', relatedBlendShapes: ['cheekSquintLeft', 'cheekSquintRight'] },
  { au: 'AU7', name: 'Lid Tightener', description: 'Tightens eyelids', relatedBlendShapes: ['eyeSquintLeft', 'eyeSquintRight'] },
  { au: 'AU9', name: 'Nose Wrinkler', description: 'Wrinkles nose bridge', relatedBlendShapes: ['noseSneerLeft', 'noseSneerRight'] },
  { au: 'AU10', name: 'Upper Lip Raiser', description: 'Raises upper lip', relatedBlendShapes: ['mouthUpperUpLeft', 'mouthUpperUpRight'] },
  { au: 'AU12', name: 'Lip Corner Puller', description: 'Pulls lip corners up (smile)', relatedBlendShapes: ['mouthSmileLeft', 'mouthSmileRight'] },
  { au: 'AU14', name: 'Dimpler', description: 'Creates dimples', relatedBlendShapes: ['mouthDimpleLeft', 'mouthDimpleRight'] },
  { au: 'AU15', name: 'Lip Corner Depressor', description: 'Pulls lip corners down (frown)', relatedBlendShapes: ['mouthFrownLeft', 'mouthFrownRight'] },
  { au: 'AU16', name: 'Lower Lip Depressor', description: 'Pulls lower lip down', relatedBlendShapes: ['mouthLowerDownLeft', 'mouthLowerDownRight'] },
  { au: 'AU17', name: 'Chin Raiser', description: 'Raises chin, pushes lower lip up', relatedBlendShapes: ['mouthShrugLower'] },
  { au: 'AU18', name: 'Lip Pucker', description: 'Puckers lips', relatedBlendShapes: ['mouthPucker'] },
  { au: 'AU20', name: 'Lip Stretcher', description: 'Stretches lips horizontally', relatedBlendShapes: ['mouthStretchLeft', 'mouthStretchRight'] },
  { au: 'AU22', name: 'Lip Funneler', description: 'Funnels lips outward', relatedBlendShapes: ['mouthFunnel'] },
  { au: 'AU23', name: 'Lip Tightener', description: 'Tightens and narrows lips', relatedBlendShapes: ['mouthPressLeft', 'mouthPressRight'] },
  { au: 'AU24', name: 'Lip Pressor', description: 'Presses lips together', relatedBlendShapes: ['mouthClose'] },
  { au: 'AU25', name: 'Lips Part', description: 'Parts lips', relatedBlendShapes: ['jawOpen'] },
  { au: 'AU26', name: 'Jaw Drop', description: 'Drops jaw', relatedBlendShapes: ['jawOpen'] },
  { au: 'AU27', name: 'Mouth Stretch', description: 'Opens mouth wide', relatedBlendShapes: ['jawOpen', 'mouthStretchLeft', 'mouthStretchRight'] },
  { au: 'AU28', name: 'Lip Suck', description: 'Sucks lips inward', relatedBlendShapes: ['mouthRollLower', 'mouthRollUpper'] },
  { au: 'AU33', name: 'Cheek Blow', description: 'Puffs out cheeks', relatedBlendShapes: ['cheekPuff'] },
  { au: 'AU45', name: 'Blink', description: 'Closes eyelids', relatedBlendShapes: ['eyeBlinkLeft', 'eyeBlinkRight'] },
]
