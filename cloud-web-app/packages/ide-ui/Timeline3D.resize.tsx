import { useEffect, useRef } from 'react'
import { PANEL_BORDER, PANEL_SURFACE, RESIZE_GRIP } from './Timeline3D.styles'

export function TimelineResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const isDragging = useRef(false)
  const lastY = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    lastY.current = e.clientY
    e.preventDefault()
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = lastY.current - e.clientY
      lastY.current = e.clientY
      onResize(delta)
    }
    const onUp = () => {
      isDragging.current = false
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [onResize])

  return (
    <div
      className="group flex h-[5px] w-full cursor-ns-resize items-center justify-center transition-colors"
      style={{ background: PANEL_SURFACE, borderTop: `1px solid ${PANEL_BORDER}` }}
      onMouseDown={handleMouseDown}
      aria-label="Drag to resize timeline panel"
      role="separator"
      aria-orientation="horizontal"
    >
      <div
        className="h-[3px] w-12 rounded-full transition-all duration-200 group-hover:w-20"
        style={{ background: RESIZE_GRIP }}
      />
    </div>
  )
}
