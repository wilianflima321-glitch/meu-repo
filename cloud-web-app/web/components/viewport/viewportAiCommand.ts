import type { ViewportSceneObject } from '@/components/viewport/AethelViewport3D'

function degToRad(degrees: number) {
  return (degrees * Math.PI) / 180
}

function clampScale(scale: [number, number, number]): [number, number, number] {
  return [
    Math.max(0.1, scale[0]),
    Math.max(0.1, scale[1]),
    Math.max(0.1, scale[2]),
  ]
}

export function parseAiViewportCommand(command: string, object: ViewportSceneObject): Partial<ViewportSceneObject> | null {
  const normalized = command.toLowerCase()
  const parsedNumber = Number(normalized.match(/-?\d+(?:\.\d+)?/)?.[0] ?? '1')
  const amount = Number.isFinite(parsedNumber) && parsedNumber !== 0 ? parsedNumber : 1

  if (normalized.includes('up') || normalized.includes('cima')) {
    return { position: [object.position[0], object.position[1] + amount, object.position[2]] }
  }
  if (normalized.includes('down') || normalized.includes('baixo')) {
    return { position: [object.position[0], object.position[1] - amount, object.position[2]] }
  }
  if (normalized.includes('left') || normalized.includes('esquerda')) {
    return { position: [object.position[0] - amount, object.position[1], object.position[2]] }
  }
  if (normalized.includes('right') || normalized.includes('direita')) {
    return { position: [object.position[0] + amount, object.position[1], object.position[2]] }
  }
  if (normalized.includes('forward') || normalized.includes('frente')) {
    return { position: [object.position[0], object.position[1], object.position[2] - amount] }
  }
  if (normalized.includes('back') || normalized.includes('tras')) {
    return { position: [object.position[0], object.position[1], object.position[2] + amount] }
  }
  if (normalized.includes('rotate') || normalized.includes('rotacion')) {
    return { rotation: [object.rotation[0], object.rotation[1] + degToRad(amount), object.rotation[2]] }
  }
  if (normalized.includes('scale') || normalized.includes('bigger') || normalized.includes('maior')) {
    const factor = 1 + amount / 10
    return { scale: clampScale([object.scale[0] * factor, object.scale[1] * factor, object.scale[2] * factor]) }
  }
  if (normalized.includes('smaller') || normalized.includes('menor')) {
    const factor = Math.max(0.1, 1 - amount / 10)
    return { scale: clampScale([object.scale[0] * factor, object.scale[1] * factor, object.scale[2] * factor]) }
  }

  return null
}
