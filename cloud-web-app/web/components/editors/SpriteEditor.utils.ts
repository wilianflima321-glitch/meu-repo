import type { Color, Frame, Layer } from './SpriteEditor.types'

export const colorToHex = (color: Color): string => {
  const r = color.r.toString(16).padStart(2, '0')
  const g = color.g.toString(16).padStart(2, '0')
  const b = color.b.toString(16).padStart(2, '0')
  const a = Math.round(color.a * 255).toString(16).padStart(2, '0')
  return `#${r}${g}${b}${a}`
}

export const hexToColor = (hex: string): Color => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex)
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: result[4] ? parseInt(result[4], 16) / 255 : 1,
    }
  }
  return { r: 0, g: 0, b: 0, a: 1 }
}

export const colorToRgba = (color: Color): string => {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`
}

export const createEmptyLayer = (id: string, name: string): Layer => ({
  id,
  name,
  visible: true,
  locked: false,
  opacity: 1,
  blendMode: 'normal',
  pixels: new Map(),
})

export const createEmptyFrame = (id: string, layerId: string): Frame => ({
  id,
  duration: 100,
  layers: [createEmptyLayer(layerId, 'Layer 1')],
})
