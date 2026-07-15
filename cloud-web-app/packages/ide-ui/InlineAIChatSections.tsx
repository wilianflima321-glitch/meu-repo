'use client'

import React from 'react'
import { tokens } from '../../web/lib/design-tokens'
import { Bot, ChevronDown, ChevronUp, FileText, Loader2, Sparkles, X } from 'lucide-react'

import { buildContextSummary, type InlineAIChatProps } from './InlineAIChat.helpers'
import {
  ACCENT_CYAN,
  BORDER_SECONDARY,
  PRIMARY_GRADIENT,
  SURFACE_QUATERNARY,
  SURFACE_SECONDARY,
  TEXT_INVERSE,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  mixColor,
} from './InlineAIChat.styles'
import { InlineAIComposer, SuggestionStrip } from './InlineAIChatComposerSurface'
import { InlineAIContextPanel, InlineAIStatusCard } from './InlineAIChatContextSurface'
import { InlineAIMessageList } from './InlineAIChatMessageSurface'

export function InlineAIHeader({
  activeFile,
  bodyId,
  contextId,
  conversationalMessageCount,
  isExpanded,
  isLoading,
  onClose,
  onToggleContext,
  onToggleExpanded,
  showContext,
  summary,
}: {
  activeFile?: InlineAIChatProps['activeFile']
  bodyId: string
  contextId: string
  conversationalMessageCount: number
  isExpanded: boolean
  isLoading: boolean
  onClose?: () => void
  onToggleContext: () => void
  onToggleExpanded: () => void
  showContext: boolean
  summary: ReturnType<typeof buildContextSummary>
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        gap: tokens.spacing['2'],
        padding: `${tokens.spacing['3']} ${tokens.spacing['4']}`,
        borderBottom: `1px solid ${BORDER_SECONDARY}`,
        background: mixColor(SURFACE_SECONDARY, 72),
      }}
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={bodyId}
        onClick={onToggleExpanded}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: tokens.spacing['3'],
          padding: 0,
          background: 'transparent',
          border: 'none',
          color: TEXT_PRIMARY,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['3'], minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: tokens.radius.md,
              background: PRIMARY_GRADIENT,
              flexShrink: 0,
            }}
          >
            <Bot size={16} color={TEXT_INVERSE} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: tokens.spacing['2'],
              }}
            >
              <span
                style={{
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.semibold,
                }}
              >
                Inline AI assistant
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: tokens.spacing['1'],
                  padding: `2px ${tokens.spacing['2']}`,
                  borderRadius: tokens.radius.full,
                  background: isLoading ? mixColor(ACCENT_CYAN, 14) : mixColor(SURFACE_QUATERNARY, 68),
                  border: `1px solid ${isLoading ? mixColor(ACCENT_CYAN, 34) : BORDER_SECONDARY}`,
                  color: isLoading ? ACCENT_CYAN : TEXT_SECONDARY,
                  fontSize: tokens.typography.fontSize.xs,
                }}
              >
                {isLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
                {isLoading ? 'Respondendo' : summary.statusLabel}
              </span>
            </div>

            <div
              style={{
                marginTop: tokens.spacing['0.5'],
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing['2'],
                minWidth: 0,
                color: TEXT_TERTIARY,
                fontSize: tokens.typography.fontSize.xs,
              }}
            >
              <FileText size={12} />
              <span
                style={{
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeFile ? activeFile.path : summary.scopeLabel}
              </span>
              <span aria-hidden="true">|</span>
              <span>{conversationalMessageCount} msgs</span>
            </div>
          </div>
        </div>

        {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['2'] }}>
        <button
          type="button"
          aria-pressed={showContext}
          aria-controls={contextId}
          aria-label={showContext ? 'Hide active context details' : 'Show active context details'}
          onClick={onToggleContext}
          style={{
            padding: `${tokens.spacing['1']} ${tokens.spacing['2']}`,
            background: showContext ? mixColor(SURFACE_QUATERNARY, 80) : 'transparent',
            border: `1px solid ${showContext ? BORDER_SECONDARY : BORDER_SECONDARY}`,
            borderRadius: tokens.radius.md,
            color: showContext ? TEXT_PRIMARY : TEXT_TERTIARY,
            fontSize: tokens.typography.fontSize.xs,
            cursor: 'pointer',
          }}
        >
          Context
        </button>

        {onClose && (
          <button
            type="button"
            aria-label="Close inline chat"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: `1px solid ${BORDER_SECONDARY}`,
              borderRadius: tokens.radius.md,
              color: TEXT_TERTIARY,
              cursor: 'pointer',
              padding: tokens.spacing['1'],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

export { InlineAIContextPanel, InlineAIStatusCard } from './InlineAIChatContextSurface'
export { InlineAIMessageList } from './InlineAIChatMessageSurface'
export { SuggestionStrip, InlineAIComposer } from './InlineAIChatComposerSurface'
