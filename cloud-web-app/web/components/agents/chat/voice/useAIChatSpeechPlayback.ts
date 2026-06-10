'use client'

import { useCallback, useRef, useState } from 'react'
import type { Message } from '@/components/ide/AIChatPanelPro.types'

interface UseAIChatSpeechPlaybackParams {
  messages: Message[]
}

export function useAIChatSpeechPlayback({ messages }: UseAIChatSpeechPlaybackParams) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speakMessage = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()
    speechSynthRef.current = new SpeechSynthesisUtterance(text)
    speechSynthRef.current.lang = document.documentElement.lang || navigator.language || 'en-US'
    speechSynthRef.current.onend = () => setIsSpeaking(false)
    speechSynthRef.current.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(speechSynthRef.current)
    setIsSpeaking(true)
  }, [])

  const stopSpeaking = useCallback(() => {
    if (!('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [])

  const handleToggleSpeaking = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking()
      return
    }

    const lastAssistantMessage = messages.filter((message) => message.role === 'assistant').pop()
    if (lastAssistantMessage) {
      speakMessage(lastAssistantMessage.content)
    }
  }, [isSpeaking, messages, speakMessage, stopSpeaking])

  return {
    handleToggleSpeaking,
    isSpeaking,
  }
}
