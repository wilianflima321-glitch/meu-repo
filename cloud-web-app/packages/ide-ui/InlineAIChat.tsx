'use client';

/**
 * Inline AI Chat - Context-aware chat integration for the editor
 * Productized to separate session logic from rendering and clarify operator affordances.
 */

import React, { useEffect, useId } from 'react'
import { useEditorApplyBridge } from './EditorApplyBridgeContext'
import { tokens } from '../../web/lib/design-tokens'

import { buildContextSummary, getLoadingLabel, type InlineAIChatProps } from './InlineAIChat.helpers'
import {
  InlineAIComposer,
  InlineAIContextPanel,
  InlineAIHeader,
  InlineAIMessageList,
  InlineAIStatusCard,
  SuggestionStrip,
} from './InlineAIChatSections'
import { SURFACE_SECONDARY, TEXT_PRIMARY } from './InlineAIChat.styles'
import { useInlineAIChatSession } from './useInlineAIChatSession'

export function InlineAIChat({
  activeFile,
  projectContext,
  onApplyCode,
  onReviewCode,
  onClose,
}: InlineAIChatProps) {
  const editorBridge = useEditorApplyBridge()
  const {
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
  } = useInlineAIChatSession(activeFile, projectContext)

  const bodyId = useId()
  const contextId = useId()
  const contextSummary = buildContextSummary(activeFile, projectContext)
  const loadingLabel = getLoadingLabel(activeFile, projectContext)
  const conversationalMessageCount = messages.filter((message) => message.role !== 'system').length

  useEffect(() => {
    const textarea = inputRef.current

    if (!textarea) {
      return
    }

    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [input, inputRef])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  const handleReviewCode = (code: string) => {
    if (onReviewCode) {
      onReviewCode(code)
      return
    }

    if (!editorBridge?.activeFilePath) {
      onApplyCode?.(code)
      return
    }

    const result = editorBridge.stageDiffForActiveFile(code)
    if (!result.ok) {
      onApplyCode?.(code)
      return
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('aethel.ide.openChatDiff'))
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: SURFACE_SECONDARY,
        color: TEXT_PRIMARY,
        fontFamily: tokens.typography.fontFamily.sans,
      }}
    >
      <InlineAIHeader
        activeFile={activeFile}
        bodyId={bodyId}
        contextId={contextId}
        conversationalMessageCount={conversationalMessageCount}
        isExpanded={isExpanded}
        isLoading={isLoading}
        onClose={onClose}
        onToggleContext={toggleContext}
        onToggleExpanded={toggleExpanded}
        showContext={showContext}
        summary={contextSummary}
      />

      {showContext && isExpanded && (
        <InlineAIContextPanel
          id={contextId}
          activeFile={activeFile}
          projectContext={projectContext}
        />
      )}

      {isExpanded && (
        <>
          <InlineAIStatusCard
            activeFile={activeFile}
            projectContext={projectContext}
            summary={contextSummary}
          />

          <InlineAIMessageList
            isLoading={isLoading}
            label={loadingLabel}
            messages={messages}
            messagesEndRef={messagesEndRef}
            onApplyCode={onApplyCode}
            onReviewCode={handleReviewCode}
          />

          <SuggestionStrip activeFile={activeFile} onSelect={stagePrompt} />

          <InlineAIComposer
            activeFile={activeFile}
            projectContext={projectContext}
            input={input}
            inputRef={inputRef}
            isLoading={isLoading}
            canApplyDirectly={contextSummary.canApplyDirectly}
            onChange={setInput}
            onKeyDown={handleKeyDown}
            onSend={sendMessage}
          />
        </>
      )}
    </div>
  )
}

export default InlineAIChat
