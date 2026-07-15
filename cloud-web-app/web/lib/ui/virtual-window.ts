/**
 * Block 7A.1 — pure virtualization window math.
 * Used by console / list windowing so scroll geometry stays testable without DOM.
 */

export type VirtualWindowInput = {
  itemCount: number
  itemHeight: number
  scrollTop: number
  viewportHeight: number
  overscan?: number
}

export type VirtualWindow = {
  startIndex: number
  endIndex: number
  offsetTop: number
  totalHeight: number
  visibleCount: number
}

export function computeVirtualWindow(input: VirtualWindowInput): VirtualWindow {
  const itemCount = Math.max(0, Math.floor(input.itemCount))
  const itemHeight = Math.max(1, input.itemHeight)
  const viewportHeight = Math.max(0, input.viewportHeight)
  const overscan = Math.max(0, Math.floor(input.overscan ?? 4))
  const totalHeight = itemCount * itemHeight

  if (itemCount === 0 || viewportHeight <= 0) {
    return {
      startIndex: 0,
      endIndex: -1,
      offsetTop: 0,
      totalHeight,
      visibleCount: 0,
    }
  }

  const rawStart = Math.floor(Math.max(0, input.scrollTop) / itemHeight)
  const visibleSlots = Math.ceil(viewportHeight / itemHeight)
  const startIndex = Math.max(0, rawStart - overscan)
  const endIndex = Math.min(itemCount - 1, rawStart + visibleSlots + overscan)
  const offsetTop = startIndex * itemHeight

  return {
    startIndex,
    endIndex,
    offsetTop,
    totalHeight,
    visibleCount: endIndex >= startIndex ? endIndex - startIndex + 1 : 0,
  }
}

/** Cap ring buffer length for console / log panels (5k+ acceptance). */
export const CONSOLE_LOG_CAPACITY = 5000

export function appendCappedLog<T>(prev: T[], next: T, capacity = CONSOLE_LOG_CAPACITY): T[] {
  const cap = Math.max(1, capacity)
  if (prev.length < cap) return [...prev, next]
  return [...prev.slice(prev.length - cap + 1), next]
}
