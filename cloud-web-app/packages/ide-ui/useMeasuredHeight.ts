'use client'

import { useEffect, useRef, useState, type MutableRefObject } from 'react'

/**
 * Measures the live pixel height of a flex-filled container via
 * `ResizeObserver`. Needed anywhere a child expects an explicit numeric
 * `height` prop (e.g. `VirtualList`) but the parent only knows `flex: 1`.
 */
export function useMeasuredHeight<T extends HTMLElement>(): [MutableRefObject<T | null>, number] {
  const ref = useRef<T | null>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height)
    })
    observer.observe(element)
    setHeight(element.getBoundingClientRect().height)
    return () => observer.disconnect()
  }, [])

  return [ref, height]
}
