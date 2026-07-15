import type { Gesture, Touch } from './types'

export function detectTouchGestures(touches: Iterable<Touch>): Gesture[] {
  const activeTouches = Array.from(touches)
  const gestures: Gesture[] = []

  if (activeTouches.length === 2) {
    const [t1, t2] = activeTouches
    const currentDist = Math.hypot(
      t1.position.x - t2.position.x,
      t1.position.y - t2.position.y,
    )
    const startDist = Math.hypot(
      t1.startPosition.x - t2.startPosition.x,
      t1.startPosition.y - t2.startPosition.y,
    )

    if (startDist > 0) {
      const scale = currentDist / startDist
      if (Math.abs(scale - 1) > 0.1) {
        gestures.push({
          type: 'pinch',
          scale,
          position: {
            x: (t1.position.x + t2.position.x) / 2,
            y: (t1.position.y + t2.position.y) / 2,
          },
        })
      }
    }
  }

  return gestures
}
