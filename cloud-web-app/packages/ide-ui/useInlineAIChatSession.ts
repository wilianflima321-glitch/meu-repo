'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_OPENROUTER_MODEL_ID } from '../../web/lib/ai/openrouter-models'
import { buildLocalDemoChatContent, consumeLocalDemoUsage } from '../../web/lib/ai-chat-local-demo'
import {
  fetchAiProviderStatus,
  type AiProviderStatusResponse,
} from '../../web/lib/ai-provider-status-client'
import {
  inferAdvancedProfile,
  requestAdvancedChat,
  streamPlainChat,
} from '../../web/lib/ai-chat-advanced-client'

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
        let streamingMessageId: string | null = null

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

          // Local demo path — no provider; still renders as a single complete bubble.
          if (!status?.configured && !status?.demoModeEnabled) {
            const usage = consumeLocalDemoUsage(status?.demoDailyLimit)
            const responseContent = usage.allowed
              ? buildLocalDemoChatContent({
                  message: nextPrompt,
                  qualityMode: profile.qualityMode,
                  agentCount: profile.agentCount,
                  enableWebResearch: profile.enableWebResearch,
                  remaining: usage.remaining,
                  limit: usage.limit,
                })
              : `DEMO_LIMIT_REACHED: local demo daily limit reached (${usage.used}/${usage.limit}). Configure a provider at /settings?tab=api or try again at ${usage.resetAt}.`

            setMessages((previousMessages) => [
              ...previousMessages,
              createInlineAIMessage('assistant', responseContent || 'No response from AI.', {
                codeBlocks: extractCodeBlocks(responseContent),
              }),
            ])
            return
          }

          const controller = new AbortController()
          requestAbortRef.current = controller

          const streamingMessage = createInlineAIMessage('assistant', '')
          streamingMessageId = streamingMessage.id
          setMessages((previousMessages) => [...previousMessages, streamingMessage])

          const patchStreaming = (content: string, extras?: Partial<InlineAIMessage>) => {
            setMessages((previousMessages) =>
              previousMessages.map((message) =>
                message.id === streamingMessage.id
                  ? {
                      ...message,
                      content,
                      codeBlocks: extractCodeBlocks(content),
                      ...extras,
                    }
                  : message,
              ),
            )
          }

          let responseContent = ''
          let traceArtifact: InlineAIMessage['traceArtifact'] = null

          try {
            // Prefer real token stream from /api/ai/stream (not a post-hoc typewriter).
            let accumulated = ''
            const streamed = await streamPlainChat({
              messages: [{ role: 'user', content: requestMessage }],
              model: DEFAULT_OPENROUTER_MODEL_ID,
              signal: controller.signal,
              onDelta: (chunk) => {
                accumulated += chunk
                patchStreaming(accumulated)
              },
            })
            responseContent = streamed.content || accumulated
          } catch (streamError) {
            if (streamError instanceof Error && streamError.name === 'AbortError') {
              throw streamError
            }

            // Fail open to advanced chat (non-stream) — still better than a silent empty bubble.
            const result = await requestAdvancedChat({
              message: requestMessage,
              model: DEFAULT_OPENROUTER_MODEL_ID,
              messages: [{ role: 'user', content: requestMessage }],
              profileOverride: profile,
              signal: controller.signal,
            })
            responseContent = extractAdvancedResponseContent(result.raw)
            traceArtifact = extractAdvancedTraceArtifact(result.raw)
            patchStreaming(responseContent || 'No response from AI.', { traceArtifact })
            return
          }

          patchStreaming(responseContent || 'No response from AI.', { traceArtifact })
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            if (streamingMessageId) {
              setMessages((previousMessages) =>
                previousMessages.filter((message) => message.id !== streamingMessageId),
              )
            }
            return
          }

          const fallbackContent = createInlineAIMessage(
            'assistant',
            activeFile
              ? `I could not reach AI right now. I can continue in local mode by explaining or reviewing **${activeFile.path}** if you want to try again.`
              : 'I could not reach AI right now. Try again in a moment or open a file so I can answer with stronger context.',
          )

          if (streamingMessageId) {
            setMessages((previousMessages) =>
              previousMessages.map((message) =>
                message.id === streamingMessageId ? fallbackContent : message,
              ),
            )
          } else {
            setMessages((previousMessages) => [...previousMessages, fallbackContent])
          }
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
