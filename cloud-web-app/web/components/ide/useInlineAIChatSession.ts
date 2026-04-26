'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  buildContextShiftMessage,
  buildWelcomeMessage,
  createInlineAIMessage,
  extractCodeBlocks,
  generateMockResponse,
  type InlineAIFileContext,
  type InlineAIMessage,
} from './InlineAIChat.helpers'

export function useInlineAIChatSession(activeFile?: InlineAIFileContext) {
  const [messages, setMessages] = useState<InlineAIMessage[]>(() => [buildWelcomeMessage(activeFile)])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [showContext, setShowContext] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const responseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivePathRef = useRef<string | undefined>(activeFile?.path)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    return () => {
      if (responseTimerRef.current) {
        clearTimeout(responseTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const nextPath = activeFile?.path

    if (nextPath === lastActivePathRef.current) {
      return
    }

    const previousPath = lastActivePathRef.current
    lastActivePathRef.current = nextPath
    setMessages((previousMessages) => [
      ...previousMessages,
      buildContextShiftMessage(activeFile, previousPath),
    ])
  }, [activeFile])

  const sendMessage = useCallback(
    (seedInput?: string) => {
      const nextPrompt = (seedInput ?? input).trim()

      if (!nextPrompt || isLoading) {
        return
      }

      if (responseTimerRef.current) {
        clearTimeout(responseTimerRef.current)
        responseTimerRef.current = null
      }

      setMessages((previousMessages) => [
        ...previousMessages,
        createInlineAIMessage('user', nextPrompt),
      ])
      setInput('')
      setIsLoading(true)

      const responseContent = generateMockResponse(nextPrompt, activeFile)

      responseTimerRef.current = setTimeout(() => {
        setMessages((previousMessages) => [
          ...previousMessages,
          createInlineAIMessage('assistant', responseContent, {
            codeBlocks: extractCodeBlocks(responseContent),
          }),
        ])
        setIsLoading(false)
        responseTimerRef.current = null
      }, 1100)
    },
    [activeFile, input, isLoading],
  )

  const stagePrompt = useCallback((prompt: string) => {
    setInput(prompt)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const toggleExpanded = useCallback(() => {
    setIsExpanded((currentValue) => !currentValue)
  }, [])

  const toggleContext = useCallback(() => {
    setShowContext((currentValue) => !currentValue)
  }, [])

  return {
    messages,
    input,
    setInput,
    isLoading,
    isExpanded,
    showContext,
    messagesEndRef,
    inputRef,
    sendMessage,
    stagePrompt,
    toggleExpanded,
    toggleContext,
  }
}
