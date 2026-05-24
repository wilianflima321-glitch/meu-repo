import type * as THREE from 'three'

export interface FacialConfig {
  useFACS: boolean
  useBlendShapes: boolean
  useBones: boolean
  enableLipSync: boolean
  enableEyeTracking: boolean
  enableMicroExpressions: boolean
  enableWrinkles: boolean
}

export enum ActionUnit {
  AU1 = 'InnerBrowRaiser', AU2 = 'OuterBrowRaiser', AU4 = 'BrowLowerer', AU5 = 'UpperLidRaiser', AU6 = 'CheekRaiser', AU7 = 'LidTightener', AU43 = 'EyesClosed', AU45 = 'Blink', AU46 = 'Wink',
  AU9 = 'NoseWrinkler', AU10 = 'UpperLipRaiser', AU11 = 'NasolabialDeepener', AU12 = 'LipCornerPuller', AU13 = 'CheekPuffer', AU14 = 'Dimpler', AU15 = 'LipCornerDepressor', AU16 = 'LowerLipDepressor', AU17 = 'ChinRaiser', AU18 = 'LipPucker', AU20 = 'LipStretcher', AU22 = 'LipFunneler', AU23 = 'LipTightener', AU24 = 'LipPressor', AU25 = 'LipsPart', AU26 = 'JawDrop', AU27 = 'MouthStretch', AU28 = 'LipSuck',
  AU51 = 'HeadTurnLeft', AU52 = 'HeadTurnRight', AU53 = 'HeadUp', AU54 = 'HeadDown', AU55 = 'HeadTiltLeft', AU56 = 'HeadTiltRight', AU57 = 'HeadForward', AU58 = 'HeadBack',
  AU61 = 'EyesLookLeft', AU62 = 'EyesLookRight', AU63 = 'EyesLookUp', AU64 = 'EyesLookDown',
}

export enum Viseme {
  Silence = 'sil', PP = 'PP', FF = 'FF', TH = 'TH', DD = 'DD', KK = 'kk', CH = 'CH', SS = 'SS', NN = 'nn', RR = 'RR', AA = 'aa', E = 'E', I = 'I', O = 'O', U = 'U',
}

export interface FACSPose { actionUnits: Map<ActionUnit, number> }

export interface BlendShapeData {
  name: string
  vertices: THREE.Vector3[]
  normals?: THREE.Vector3[]
}

export interface FacialBone {
  name: string
  position: THREE.Vector3
  rotation: THREE.Quaternion
  scale: THREE.Vector3
}

export interface EmotionState {
  happiness: number
  sadness: number
  anger: number
  fear: number
  surprise: number
  disgust: number
  contempt: number
}

export interface LipSyncData {
  visemes: { time: number; viseme: Viseme; intensity: number }[]
  duration: number
}

export interface EyeTrackingState {
  leftEyeTarget: THREE.Vector3
  rightEyeTarget: THREE.Vector3
  leftEyeOpenness: number
  rightEyeOpenness: number
  blinkProgress: number
}

export interface WrinkleMapConfig {
  foreheadWrinkle: THREE.Texture | null
  browWrinkle: THREE.Texture | null
  noseWrinkle: THREE.Texture | null
  smileWrinkle: THREE.Texture | null
  frownWrinkle: THREE.Texture | null
}
