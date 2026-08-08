'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_OPENROUTER_MODEL_ID } from '../../web/lib/ai/openrouter-models'
import { buildLocalDemoChatContent, consumeLocalDemoUsage } from '../../web/lib/ai-chat-local-demo'
import {
  fetchAiProviderStatus,
  type AiProviderStatusResponse,
} from '../../web/lib/ai-provider-status-client'
import { inferAdvancedProfile, requestAdvancedChat } from '../../web/lib/ai-chat-advanced-client'

import {
  buildInlineAIRequestMessage,
  buildContextShiftMessage,
  buildWelcomeMessage,
  createInlineAIMessage,
  extractAdvancedResponseContent,
  extractAdvancedTraceArtifact,
  extractCodeBlocks,
  type InlineAIFileContext,
  type InlineAIMessage,
  type InlineAIProjectContext,
} from './InlineAIChat.helpers'

export function useInlineAIChatSession(
  activeFile?: InlineAIFileContext,
  projectContext?: InlineAIProjectContext,
) {
  const [messages, setMessages] = useState<InlineAIMessage[]>(() => [buildWelcomeMessage(activeFile)])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [showContext, setShowContext] = useState(false)
  const [providerStatus, setProviderStatus] = useState<AiProviderStatusResponse | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const requestAbortRef = useRef<AbortController | null>(null)
  const lastActivePathRef = useRef<string | undefined>(activeFile?.path)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    return () => {
      requestAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      try {
        const status = await fetchAiProviderStatus(controller.signal)
        setProviderStatus(status)
      } catch {
        setProviderStatus(null)
      }
    })()

    return () => controller.abort()
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

      requestAbortRef.current?.abort()

      setMessages((previousMessages) => [
        ...previousMessages,
        createInlineAIMessage('user', nextPrompt),
      ])
      setInput('')
      setIsLoading(true)

      void (async () => {
        try {
          let status = providerStatus
          if (!status) {
            status = await fetchAiProviderStatus()
            setProviderStatus(status)
          }

          const profile = inferAdvancedProfile(nextPrompt)
          const requestMessage = buildInlineAIRequestMessage({
            prompt: nextPrompt,
            activeFile,
            projectContext,
          })

          let responseContent = ''
          let traceArtifact: InlineAIMessage['traceArtifact'] = null

          if (!status?.configured && !status?.demoModeEnabled) {
            const usage = consumeLocalDemoUsage(status?.demoDailyLimit)
            responseContent = usage.allowed
              ? buildLocalDemoChatContent({
                  message: nextPrompt,
                  qualityMode: profile.qualityMode,
                  agentCount: profile.agentCount,
                  enableWebResearch: profile.enableWebResearch,
                  remaining: usage.remaining,
                  limit: usage.limit,
                })
              : `DEMO_LIMIT_REACHED: local demo daily limit reached (${usage.used}/${usage.limit}). Configure a provider at /settings?tab=api or try again at ${usage.resetAt}.`
          } else {
            const controller = new AbortController()
            requestAbortRef.current = controller

            const result = await requestAdvancedChat({
              message: requestMessage,
              model: DEFAULT_OPENROUTER_MODEL_ID,
              messages: [{ role: 'user', content: requestMessage }],
              profileOverride: profile,
              signal: controller.signal,
            })

            responseContent = extractAdvancedResponseContent(result.raw)
            traceArtifact = extractAdvancedTraceArtifact(result.raw)
          }

          setMessages((previousMessages) => [
            ...previousMessages,
            createInlineAIMessage('assistant', responseContent || 'No response from AI.', {
              codeBlocks: extractCodeBlocks(responseContent),
              traceArtifact,
            }),
          ])
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            return
          }

          const fallbackContent = createInlineAIMessage(
            'assistant',
            activeFile
              ? `I could not reach AI right now. I can continue in local mode by explaining or reviewing **${activeFile.path}** if you want to try again.`
              : 'I could not reach AI right now. Try again in a moment or open a file so I can answer with stronger context.',
          )

          setMessages((previousMessages) => [...previousMessages, fallbackContent])
        } finally {
          requestAbortRef.current = null
          setIsLoading(false)
        }
      })()
    },
    [activeFile, input, isLoading, projectContext, providerStatus],
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
