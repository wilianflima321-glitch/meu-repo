'use client'

import { useState, useCallback, useRef, type MouseEvent as ReactMouseEvent } from 'react'

interface ElementInfo {
  tag: string
  id?: string
  className?: string
  textContent?: string
  attributes?: Record<string, string>
  boxModel?: {
    width: number
    height: number
    margin: string
    padding: string
    border: string
  }
  computedStyles?: Record<string, string>
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

  const openMagicWand = useCallback((event: MouseEvent | ReactMouseEvent<HTMLElement>, elementInfo?: ElementInfo) => {
    event.preventDefault()
    event.stopPropagation()
    const nativeEvent = 'nativeEvent' in event ? event.nativeEvent : event
    const target = nativeEvent.target as HTMLElement
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

  const openMagicWandAt = useCallback((position: { x: number; y: number }, elementInfo?: ElementInfo) => {
    setMagicWandState({
      isOpen: true,
      position,
      elementInfo,
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
    openMagicWandAt,
    closeMagicWand,
    handleSendMessage,
  }
}
