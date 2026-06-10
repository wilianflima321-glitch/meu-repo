'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { useMentions } from '@/lib/copilot/mention-parser'
import type {
  AIChatPanelProps,
  Attachment,
  CodebaseContextPreview,
} from '@/components/ide/AIChatPanelPro.types'
import type { AIChatConsoleMode } from '@/components/agents/chat/presets'
import { useChatContextPreviews } from '@/components/agents/chat/context'
import { useVoiceRecording } from '@/components/agents/chat/voice'

interface UseAIChatComposerStateParams {
  allowAttachments: boolean
  agentCount: number
  codebaseContextPreview?: CodebaseContextPreview
  consoleMode: AIChatConsoleMode
  isLoading: boolean
  onSendMessage?: AIChatPanelProps['onSendMessage']
  projectId?: string
}

export function useAIChatComposerState({
  allowAttachments,
  agentCount,
  codebaseContextPreview,
  consoleMode,
  isLoading,
  onSendMessage,
  projectId,
}: UseAIChatComposerStateParams) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const mentionState = useMentions('')
  const input = mentionState.text
  const inputRef = mentionState.inputRef
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const {
    localCodebaseContextPreview,
    mentionContextPreview,
    refreshCodebaseContext: handleRefreshCodebaseContext,
  } = useChatContextPreviews({
    input,
    mentions: mentionState.parsed.mentions,
    projectId,
  })

  const {
    isRecording,
    isTranscribing,
    transcript,
    voiceError,
    startRecording,
    stopRecording,
    clearRecording,
    clearVoiceError,
  } = useVoiceRecording()

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px'
    }
  }, [input, inputRef])

  useEffect(() => {
    if (transcript) {
      const nextValue = input.trim() ? `${input} ${transcript}` : transcript
      mentionState.replaceText(nextValue)
    }
  }, [input, mentionState, transcript])

  const handleSend = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault()
      const normalizedInput = input.trim()
      if (!normalizedInput || isLoading) return

      const hasAgentTag = /@agents:[123]/i.test(normalizedInput)
      const messageWithAgents =
        agentCount > 1 && !hasAgentTag ? `@agents:${agentCount} ${normalizedInput}` : normalizedInput

      onSendMessage?.(messageWithAgents, {
        attachments: allowAttachments && attachments.length > 0 ? attachments : undefined,
        consoleMode,
      })

      mentionState.replaceText('')
      setAttachments([])
      clearRecording()
    },
    [agentCount, allowAttachments, attachments, clearRecording, consoleMode, input, isLoading, mentionState, onSendMessage]
  )

  const handleComposerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      mentionState.handleKeyDown(event)
      if (event.defaultPrevented) return
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        handleSend()
      }
    },
    [handleSend, mentionState]
  )

  const handleFileAttach = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleImageAttach = useCallback(() => {
    imageInputRef.current?.click()
  }, [])

  const handleFileSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
      const file = event.target.files?.[0]

      if (file) {
        const attachment: Attachment = {
          id: crypto.randomUUID(),
          type,
          name: file.name,
          size: file.size,
        }

        if (type === 'image') {
          const reader = new FileReader()
          reader.onload = (loadEvent) => {
            const result = loadEvent.target?.result
            if (typeof result === 'string') {
              attachment.preview = result
            }
            setAttachments((previous) => [...previous, attachment])
          }
          reader.readAsDataURL(file)
        } else {
          setAttachments((previous) => [...previous, attachment])
        }
      }

      event.target.value = ''
    },
    []
  )

  const removeAttachment = useCallback((id: string) => {
    setAttachments((previous) => previous.filter((attachment) => attachment.id !== id))
  }, [])

  const handleQuickPrompt = useCallback(
    (prompt: string) => {
      const nextValue = input ? `${input}\n\n${prompt}` : prompt
      mentionState.replaceText(nextValue)
      inputRef.current?.focus()
    },
    [input, inputRef, mentionState]
  )

  const insertQuickMention = useCallback(
    (mentionValue: string) => {
      const cursorPosition = inputRef.current?.selectionStart ?? input.length
      const nextValue = `${input.slice(0, cursorPosition)}${mentionValue}${input.slice(cursorPosition)}`

      mentionState.replaceText(nextValue)

      requestAnimationFrame(() => {
        if (!inputRef.current) return
        inputRef.current.focus()
        const nextCursor = cursorPosition + mentionValue.length
        inputRef.current.setSelectionRange(nextCursor, nextCursor)
      })
    },
    [input, inputRef, mentionState]
  )

  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      stopRecording()
      return
    }

    void startRecording()
  }, [isRecording, startRecording, stopRecording])

  return {
    attachments,
    clearVoiceError,
    fileInputRef,
    handleComposerKeyDown,
    handleFileAttach,
    handleFileSelect,
    handleImageAttach,
    handleQuickPrompt,
    handleRefreshCodebaseContext,
    handleSend,
    handleVoiceToggle,
    imageInputRef,
    input,
    inputRef,
    insertQuickMention,
    isRecording,
    isTranscribing,
    mentionContextPreview,
    mentionState,
    removeAttachment,
    stopRecording,
    transcript,
    visibleCodebaseContextPreview: codebaseContextPreview ?? localCodebaseContextPreview,
    voiceError,
  }
}
