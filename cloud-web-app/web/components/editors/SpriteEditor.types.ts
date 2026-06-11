export interface Color {
  r: number
  g: number
  b: number
  a: number
}

export interface Pixel {
  x: number
  y: number
  color: Color
}

export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  pixels: Map<string, Color>
}

export interface Frame {
  id: string
  duration: number
  layers: Layer[]
}

export interface Animation {
  id: string
  name: string
  frames: Frame[]
}

export type Tool = 'pencil' | 'eraser' | 'fill' | 'eyedropper' | 'rectangle' | 'circle' | 'line' | 'select' | 'move'
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'

export interface SpriteEditorState {
  width: number
  height: number
  animations: Animation[]
  currentAnimationId: string
  currentFrameIndex: number
  currentLayerId: string
  tool: Tool
  primaryColor: Color
  secondaryColor: Color
  brushSize: number
  zoom: number
  showGrid: boolean
  gridSize: number
  onionSkinning: boolean
  onionSkinFrames: number
  palette: Color[]
}
