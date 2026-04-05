'use client'

import { useState, useCallback, useRef } from 'react'

interface ElementInfo {
  tag: string
  id?: string
  className?: string
}

interface MagicWandState {
  isOpen: boolean
  position: { x: number; y: number }
  elementInfo?: ElementInfo
}

export function useMagicWand(onSendMessage: (message: string, context: { elementInfo?: ElementInfo }) => void) {
  const [magicWandState, setMagicWandState] = useState<MagicWandState>({
    isOpen: false,
    position: { x: 0, y: 0 },
  })

  const openMagicWand = useCallback((event: MouseEvent, elementInfo?: ElementInfo) => {
    event.preventDefault()
    event.stopPropagation()
    
    const target = event.target as HTMLElement
    const rect = target.getBoundingClientRect()
    
    setMagicWandState({
      isOpen: true,
      position: {
        x: rect.left + window.scrollX,
        y: rect.bottom + window.scrollY + 8,
      },
      elementInfo: elementInfo || {
        tag: target.tagName.toLowerCase(),
        id: target.id,
        className: target.className,
      },
    })
  }, [])

  const closeMagicWand = useCallback(() => {
    setMagicWandState({
      isOpen: false,
      position: { x: 0, y: 0 },
    })
  }, [])

  const handleSendMessage = useCallback((message: string, context: { elementInfo?: ElementInfo }) => {
    onSendMessage(message, context)
    closeMagicWand()
  }, [onSendMessage, closeMagicWand])

  return {
    magicWandState,
    openMagicWand,
    closeMagicWand,
    handleSendMessage,
  }
}
